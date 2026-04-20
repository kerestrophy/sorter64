const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCli } = require('../src/cli');

function writePgn(filePath, body) {
  fs.writeFileSync(filePath, body, 'utf8');
}

function game(result, movetext) {
  return `[Event "T"]\n[Result "${result}"]\n\n${movetext} ${result}\n`;
}

test('CLI --first-white-move keeps only matching first white move (mainline-only)', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-firstmove-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  writePgn(path.join(inputDir, 'a_d4.pgn'), game('1-0', '1. d4 d5 2. c4'));
  writePgn(path.join(inputDir, 'b_d4_compact.pgn'), game('0-1', '1.d4?! Nf6 2. c4'));
  writePgn(path.join(inputDir, 'c_variation_before.pgn'), game('1/2-1/2', '(1. e4 e5 (1... c5)) 1. d4 d5 2. c4'));
  writePgn(path.join(inputDir, 'd_e4.pgn'), game('*', '1. e4 e5 2. Nf3'));

  await runCli([
    'node',
    'sorter64',
    '--input',
    inputDir,
    '--out',
    outDir,
    '--dry-run',
    '--first-white-move',
    'd4'
  ]);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  assert.strictEqual(report.counters.read, 4);
  assert.strictEqual(report.counters.written, 3);
  assert.strictEqual(report.counters.skippedByReason.first_white_move, 1);
});

test('CLI --first-white-moves accepts csv values and ignores empty entries', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-firstmoves-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  writePgn(path.join(inputDir, 'a_e4.pgn'), game('1-0', '1. e4 e5 2. Nf3'));
  writePgn(path.join(inputDir, 'b_nf3.pgn'), game('0-1', '1. Nf3 d5 2. g3'));
  writePgn(path.join(inputDir, 'c_d4.pgn'), game('1/2-1/2', '1. d4 d5 2. c4'));

  await runCli([
    'node',
    'sorter64',
    '--input',
    inputDir,
    '--out',
    outDir,
    '--dry-run',
    '--first-white-moves',
    ' e4 , , Nf3 '
  ]);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  assert.strictEqual(report.counters.read, 3);
  assert.strictEqual(report.counters.written, 2);
  assert.strictEqual(report.counters.skippedByReason.first_white_move, 1);
});
