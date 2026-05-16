const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCli } = require('../src/cli');

function writePgn(filePath, movetext) {
  const content = `[Event "MaxPly"]\n\n${movetext}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

test('maxPly=1 keeps 1-ply and rejects 2-ply', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-maxply-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  writePgn(path.join(inputDir, 'one-ply.pgn'), '1. e4 *');
  writePgn(path.join(inputDir, 'two-ply.pgn'), '1. e4 e5 *');

  await runCli([
    'node',
    'sorter64',
    '--input',
    inputDir,
    '--out',
    outDir,
    '--dry-run',
    '--max-ply',
    '1'
  ]);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  assert.strictEqual(report.counters.written, 1);
  assert.strictEqual(report.counters.skippedByReason.max_ply, 1);
  assert.strictEqual(report.counters.maxPly.rejected, 1);
  assert.strictEqual(report.counters.maxPly.value, 1);
});

test('empty maxPly does not filter', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-maxply-empty-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  writePgn(path.join(inputDir, 'one-ply.pgn'), '1. e4 *');
  writePgn(path.join(inputDir, 'two-ply.pgn'), '1. e4 e5 *');

  await runCli([
    'node',
    'sorter64',
    '--input',
    inputDir,
    '--out',
    outDir,
    '--dry-run',
    '--max-ply',
    ''
  ]);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  assert.strictEqual(report.counters.written, 2);
  assert.ok(!report.counters.skippedByReason.max_ply);
  assert.strictEqual(report.counters.maxPly.value, null);
  assert.strictEqual(report.counters.maxPly.rejected, 0);
});
