const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCli } = require('../src/cli');

function writePgn(filePath, eventName) {
  const content = `[Event "${eventName}"]\n[White "White"]\n[Black "Black"]\n\n1. e4 e5 1-0\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

test('CLI accepts directory input and streams all PGNs', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sorter64-'));
  const inputDir = path.join(tmpRoot, 'pgns');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(inputDir, { recursive: true });

  writePgn(path.join(inputDir, 'b.pgn'), 'GameB');
  writePgn(path.join(inputDir, 'a.pgn'), 'GameA');

  await runCli([
    'node',
    'sorter64',
    '--input',
    inputDir,
    '--out',
    outDir,
    '--dry-run',
    '--games-per-chunk',
    '1'
  ]);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  assert.strictEqual(report.counters.read, 2);
  assert.strictEqual(report.counters.written, 2);
  assert.strictEqual(report.input, inputDir);
  assert.strictEqual(report.options.prefix, path.basename(inputDir));
});
