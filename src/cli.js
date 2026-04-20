const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { GameBuilder } = require('./parser');
const { classifyTimeControl } = require('./timecontrol');
const { parseEloBins, pickEloBin, parseEloFromHeaders } = require('./bins');
const { computeDedupeHash } = require('./dedupe');
const {
  estimatePlies,
  normalizeDate,
  parseGameDate,
  classifyRated,
  summarizeGame,
  hasWantedFirstWhiteMove,
  hasWantedFirstWhiteMoveFromAllowed
} = require('./pgn-utils');
const { PgnWriter } = require('./writer');
const { writeReport } = require('./report');

const DEFAULTS = {
  out: 'out',
  gamesPerChunk: 5000,
  progressEvery: 1000,
  rated: 'any',
  zeroPad: 4
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { flags: {} };
  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (!raw.startsWith('--')) {
      throw Object.assign(new Error(`Unexpected argument: ${raw}`), { exitCode: 2 });
    }
    const eq = raw.indexOf('=');
    let key = raw;
    let value = null;
    if (eq !== -1) {
      key = raw.slice(0, eq);
      value = raw.slice(eq + 1);
    }
    switch (key) {
      case '--help':
      case '--dedupe':
      case '--dry-run':
      case '--input-recursive':
      case '--draw-only':
        opts.flags[key.slice(2)] = true;
        break;
      case '--input':
      case '--out':
      case '--games-per-chunk':
      case '--prefix':
      case '--progress-every':
      case '--elo-bins':
      case '--time-controls':
      case '--rated':
      case '--min-moves':
      case '--max-moves':
      case '--since':
      case '--until':
      case '--zero-pad':
      case '--first-white-move':
      case '--first-white-moves':
        if (value === null) {
          value = args[i + 1];
          i += 1;
        }
        if (value === undefined) {
          throw Object.assign(new Error(`Missing value for ${key}`), { exitCode: 2 });
        }
        opts[key.slice(2)] = value;
        break;
      default:
        throw Object.assign(new Error(`Unknown option: ${key}`), { exitCode: 2 });
    }
  }
  return opts;
}

function printHelp() {
  console.log(`sorter64 - PGN Chunker + Sorter + Filter\n\nUsage:\n  node .\\bin\\sorter64.js --input <file-or-folder> [options]\n\nOptions:\n  --input <path>            Required PGN file or directory\n  --input-recursive         Include subfolders when input is a directory\n  --out <dir>               Output directory (default: out)\n  --games-per-chunk <n>     Games per chunk (default: 5000)\n  --prefix <name>           Filename prefix (default: input basename)\n  --progress-every <n>      Progress log interval (default: 1000)\n  --elo-bins <list>         e.g. "800-1200,1200-1600,1600-2000,2000-9999"\n  --time-controls <list>    bullet,blitz,rapid,classical,unknown\n  --rated <mode>            only|exclude|any (default: any)\n  --min-moves <n>           Minimum plies\n  --max-moves <n>           Maximum plies\n  --since <YYYY-MM-DD>      Inclusive date filter\n  --until <YYYY-MM-DD>      Inclusive date filter\n  --first-white-move <san>  Keep games where first white move starts with value\n  --first-white-moves <csv> Keep games where first white move starts with any csv value\n  --dedupe                  Skip duplicate games\n  --dry-run                 Count/report only, no chunk output\n  --zero-pad <n>            Chunk index padding (default: 4)\n  --draw-only               Keep only drawn games (Result 1/2-1/2)\n  --help                    Show help\n\nExamples:\n  node .\\bin\\sorter64.js --input lichess.pgn --games-per-chunk 5000\n  node .\\bin\\sorter64.js --input lichess.pgn --elo-bins "800-1200,1200-1600" --time-controls blitz,rapid\n  node .\\bin\\sorter64.js --input lichess.pgn --dedupe --rated only --since 2021-01-01 --until 2021-12-31\n  node .\\bin\\sorter64.js --input .\\pgns --input-recursive --games-per-chunk 200\n  node .\\bin\\sorter64.js --input lichess.pgn --first-white-move d4\n`);
}

function coerceInt(value, name) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error(`Invalid ${name}: ${value}`), { exitCode: 2 });
  }
  return n;
}

function buildOptions(parsed) {
  const opts = {
    input: parsed.input,
    out: parsed.out || DEFAULTS.out,
    gamesPerChunk: parsed['games-per-chunk'] ? coerceInt(parsed['games-per-chunk'], 'games-per-chunk') : DEFAULTS.gamesPerChunk,
    prefix: parsed.prefix || null,
    progressEvery: parsed['progress-every'] ? coerceInt(parsed['progress-every'], 'progress-every') : DEFAULTS.progressEvery,
    eloBins: parsed['elo-bins'] || null,
    timeControls: parsed['time-controls'] || null,
    rated: parsed.rated || DEFAULTS.rated,
    minMoves: parsed['min-moves'] ? coerceInt(parsed['min-moves'], 'min-moves') : null,
    maxMoves: parsed['max-moves'] ? coerceInt(parsed['max-moves'], 'max-moves') : null,
    since: parsed.since || null,
    until: parsed.until || null,
    firstWhiteMove: parsed['first-white-move'] || null,
    firstWhiteMoves: parsed['first-white-moves'] || null,
    dedupe: Boolean(parsed.flags && parsed.flags.dedupe),
    dryRun: Boolean(parsed.flags && parsed.flags['dry-run']),
    zeroPad: parsed['zero-pad'] ? coerceInt(parsed['zero-pad'], 'zero-pad') : DEFAULTS.zeroPad,
    inputRecursive: Boolean(parsed.flags && parsed.flags['input-recursive']),
    drawOnly: Boolean(parsed.flags && parsed.flags['draw-only'])
  };

  if (!opts.input) {
    throw Object.assign(new Error('Missing --input'), { exitCode: 2 });
  }
  if (!['only', 'exclude', 'any'].includes(opts.rated)) {
    throw Object.assign(new Error('Invalid --rated (only|exclude|any)'), { exitCode: 2 });
  }
  if (opts.minMoves && opts.maxMoves && opts.minMoves > opts.maxMoves) {
    throw Object.assign(new Error('min-moves cannot exceed max-moves'), { exitCode: 2 });
  }
  if (opts.since && !normalizeDate(opts.since)) {
    throw Object.assign(new Error('Invalid --since date (YYYY-MM-DD)'), { exitCode: 2 });
  }
  if (opts.until && !normalizeDate(opts.until)) {
    throw Object.assign(new Error('Invalid --until date (YYYY-MM-DD)'), { exitCode: 2 });
  }
  if (opts.timeControls) {
    opts.timeControls = opts.timeControls.split(',').map((v) => v.trim()).filter(Boolean);
  }
  if (opts.firstWhiteMoves) {
    opts.firstWhiteMoves = opts.firstWhiteMoves.split(',').map((v) => v.trim()).filter(Boolean);
  }
  if (opts.firstWhiteMove && opts.firstWhiteMove.trim()) {
    const normalizedSingle = opts.firstWhiteMove.trim();
    opts.firstWhiteMoves = (opts.firstWhiteMoves || []).concat([normalizedSingle]);
  }
  if (!opts.firstWhiteMoves || opts.firstWhiteMoves.length === 0) {
    opts.firstWhiteMoves = null;
  }
  if (opts.eloBins) {
    opts.eloBins = parseEloBins(opts.eloBins);
  }
  return opts;
}

function listPgnFiles(dirPath, recursive) {
  const results = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en', { sensitivity: 'base' }));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          stack.push(fullPath);
        }
        continue;
      }
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pgn') {
        results.push(fullPath);
      }
    }
  }
  results.sort((a, b) => {
    const aName = path.basename(a).toLowerCase();
    const bName = path.basename(b).toLowerCase();
    const byName = aName.localeCompare(bName, 'en', { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });
  });
  return results;
}

async function runCli(argv) {
  const parsed = parseArgs(argv);
  if (parsed.flags && parsed.flags.help) {
    printHelp();
    return;
  }
  const opts = buildOptions(parsed);
  if (!fs.existsSync(opts.input)) {
    throw Object.assign(new Error(`Input not found: ${opts.input}`), { exitCode: 2 });
  }

  const inputStat = fs.statSync(opts.input);
  const inputIsDir = inputStat.isDirectory();
  const inputPath = path.resolve(opts.input);
  let inputFiles = [inputPath];
  if (inputIsDir) {
    inputFiles = listPgnFiles(inputPath, opts.inputRecursive);
    if (inputFiles.length === 0) {
      throw Object.assign(new Error(`No .pgn files found in: ${inputPath}`), { exitCode: 2 });
    }
    console.log(`input directory: ${inputPath} (${inputFiles.length} .pgn files)`);
  }

  const inputBase = path.basename(inputPath, path.extname(inputPath));
  if (!opts.prefix) {
    opts.prefix = inputBase;
  }

  const outDir = path.resolve(opts.out);
  const skippedPath = path.join(outDir, 'skipped.txt');
  const reportPath = path.join(outDir, 'report.json');

  fs.mkdirSync(outDir, { recursive: true });

  const skippedStream = fs.createWriteStream(skippedPath, { flags: 'a' });
  const writer = new PgnWriter({
    outDir,
    prefix: opts.prefix,
    gamesPerChunk: opts.gamesPerChunk,
    eloBins: opts.eloBins,
    zeroPad: opts.zeroPad,
    dryRun: opts.dryRun
  });

  const report = {
    startedAt: new Date().toISOString(),
    input: opts.input,
    out: outDir,
    options: opts,
    counters: {
      read: 0,
      written: 0,
      skipped: 0,
      skippedByReason: {},
      filteredByReason: {},
      bins: {},
      chunks: {}
    }
  };

  const dedupeSet = new Set();
  let lastWrite = null;

  const builder = new GameBuilder();

  function recordSkip(reason, game) {
    report.counters.skipped += 1;
    report.counters.skippedByReason[reason] = (report.counters.skippedByReason[reason] || 0) + 1;
    const summary = summarizeGame(game);
    skippedStream.write(`${reason}\t${summary}\n`);
  }

  function recordFilter(reason) {
    report.counters.filteredByReason[reason] = (report.counters.filteredByReason[reason] || 0) + 1;
  }

  function applyFilters(game) {
    const headers = game.headers || {};

    if (!game.headerLines || game.headerLines.length === 0) {
      return { keep: false, reason: 'bad_headers' };
    }
    if (!game.moveText || game.moveText.trim().length === 0) {
      return { keep: false, reason: 'no_moves' };
    }

    if (opts.drawOnly && headers.Result !== '1/2-1/2') {
      return { keep: false, reason: 'draw_only' };
    }

    if (opts.firstWhiteMoves) {
      const keepByMove = opts.firstWhiteMoves.length === 1
        ? hasWantedFirstWhiteMove(game.moveText, opts.firstWhiteMoves[0], { mainlineOnly: true })
        : hasWantedFirstWhiteMoveFromAllowed(game.moveText, opts.firstWhiteMoves, { mainlineOnly: true });
      if (!keepByMove) {
        return { keep: false, reason: 'first_white_move' };
      }
    }

    if (opts.timeControls) {
      const tc = headers.TimeControl || headers.Timecontrol || headers.Time;
      const tcClass = classifyTimeControl(tc || '');
      if (!opts.timeControls.includes(tcClass)) {
        return { keep: false, reason: `time_control_${tcClass}` };
      }
    }

    if (opts.rated !== 'any') {
      const rated = classifyRated(headers);
      if (opts.rated === 'only' && rated !== 'rated') {
        return { keep: false, reason: `rated_${rated}` };
      }
      if (opts.rated === 'exclude' && rated === 'rated') {
        return { keep: false, reason: 'rated_rated' };
      }
    }

    const plies = estimatePlies(game.moveText);
    if (opts.minMoves && plies < opts.minMoves) {
      return { keep: false, reason: 'min_moves' };
    }
    if (opts.maxMoves && plies > opts.maxMoves) {
      return { keep: false, reason: 'max_moves' };
    }

    if (opts.since || opts.until) {
      const gameDate = parseGameDate(headers);
      if (!gameDate) {
        return { keep: false, reason: 'date_unknown' };
      }
      const since = opts.since ? new Date(`${opts.since}T00:00:00Z`) : null;
      const until = opts.until ? new Date(`${opts.until}T23:59:59Z`) : null;
      if (since && gameDate < since) {
        return { keep: false, reason: 'date_before' };
      }
      if (until && gameDate > until) {
        return { keep: false, reason: 'date_after' };
      }
    }

    return { keep: true };
  }

  function handleGame(game, sourceFile) {
    report.counters.read += 1;
    try {
      const filterResult = applyFilters(game);
      if (!filterResult.keep) {
        recordSkip(filterResult.reason, game);
        recordFilter(filterResult.reason);
        return;
      }

    let binLabel = 'chunks';
      if (opts.eloBins) {
        const elos = parseEloFromHeaders(game.headers);
        if (elos.avg === null) {
          binLabel = 'unknown';
        } else {
          binLabel = pickEloBin(elos.avg, opts.eloBins);
        }
      }

      if (opts.dedupe) {
        const hash = computeDedupeHash(game.headers, game.moveText, 12);
        if (dedupeSet.has(hash)) {
          recordSkip('duplicate', game);
          return;
        }
        dedupeSet.add(hash);
      }

      if (!opts.dryRun) {
        lastWrite = writer.writeGame(game.rawText, binLabel);
        report.counters.written += 1;
        report.counters.bins[binLabel] = (report.counters.bins[binLabel] || 0) + 1;
        if (lastWrite) {
          report.counters.chunks[lastWrite.path] = lastWrite.chunkIndex;
        }
      } else {
        report.counters.written += 1;
        report.counters.bins[binLabel] = (report.counters.bins[binLabel] || 0) + 1;
        lastWrite = writer.previewPath(binLabel);
      }

      if (opts.progressEvery && report.counters.read % opts.progressEvery === 0) {
        const pathHint = lastWrite && lastWrite.path ? lastWrite.path : 'n/a';
        const chunkHint = lastWrite && lastWrite.chunkIndex ? lastWrite.chunkIndex : 0;
        console.log(`progress read=${report.counters.read} written=${report.counters.written} skipped=${report.counters.skipped} chunk=${chunkHint} path=${pathHint}`);
      }
    } catch (err) {
      const sourceHint = sourceFile ? ` (${sourceFile})` : '';
      console.error(`error parsing game${sourceHint}: ${err.message}`);
      recordSkip('parse_error', game);
    }
  }

  async function processFile(filePath) {
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      const emitted = builder.pushLine(line);
      if (emitted) {
        handleGame(emitted, filePath);
      }
    });
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      rl.on('close', resolve);
      rl.on('error', reject);
    });
  }

  for (const filePath of inputFiles) {
    await processFile(filePath);
  }

  const finalGame = builder.finalize();
  if (finalGame) {
    handleGame(finalGame, inputFiles[inputFiles.length - 1]);
  }

  writer.closeAll();
  skippedStream.end();

  report.finishedAt = new Date().toISOString();
  writeReport(reportPath, report);
  console.log(`done read=${report.counters.read} written=${report.counters.written} skipped=${report.counters.skipped}`);
  const chunksWritten = Object.keys(report.counters.chunks || {}).length;
  const filesCount = inputIsDir ? inputFiles.length : 1;
  console.log(`summary inputMode=${inputIsDir ? 'folder' : 'file'} files=${filesCount} gamesRead=${report.counters.read} gamesWritten=${report.counters.written} chunksWritten=${chunksWritten} skippedGames=${report.counters.skipped}`);
}

module.exports = { runCli };
