const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCli } = require('../src/cli');

function makePgn(result) {
  return `[Event "Test"]\n[White "A"]\n[Black "B"]\n[Result "${result}"]\n\n1. e4 e5 ${result}\n`;
}

async function runWithPgns(drawOnly) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-draw-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  fs.writeFileSync(path.join(inputDir, 'win.pgn'), makePgn('1-0'), 'utf8');
  fs.writeFileSync(path.join(inputDir, 'loss.pgn'), makePgn('0-1'), 'utf8');
  fs.writeFileSync(path.join(inputDir, 'draw.pgn'), makePgn('1/2-1/2'), 'utf8');

  const argv = ['node', 'sorter64', '--input', inputDir, '--out', outDir, '--dry-run'];
  if (drawOnly) {
    argv.push('--draw-only');
  }
  await runCli(argv);

  return JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
}

test('drawOnly=false: all three results are kept', async () => {
  const report = await runWithPgns(false);
  // 3 real games written; draw_only filter never fires
  assert.strictEqual(report.counters.written, 3);
  assert.ok(!report.counters.skippedByReason.draw_only);
});

test('drawOnly=true: only 1/2-1/2 is kept, 1-0 and 0-1 are skipped', async () => {
  const report = await runWithPgns(true);
  // 1 real game written (the draw); 2 real games rejected by draw_only
  assert.strictEqual(report.counters.written, 1);
  assert.strictEqual(report.counters.skippedByReason.draw_only, 2);
});
