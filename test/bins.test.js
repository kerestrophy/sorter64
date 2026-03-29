const test = require('node:test');
const assert = require('node:assert');
const { parseEloBins, pickEloBin, parseEloFromHeaders } = require('../src/bins');

test('parseEloBins', () => {
  const bins = parseEloBins('800-1200,1200-1600');
  assert.strictEqual(bins.length, 2);
  assert.strictEqual(bins[0].label, '0800-1200');
});

test('pickEloBin', () => {
  const bins = parseEloBins('800-1200,1200-1600');
  assert.strictEqual(pickEloBin(1000, bins), '0800-1200');
  assert.strictEqual(pickEloBin(1200, bins), '1200-1600');
  assert.strictEqual(pickEloBin(1700, bins), 'unknown');
});

test('parseEloFromHeaders', () => {
  const data = parseEloFromHeaders({ WhiteElo: '1500', BlackElo: '1600' });
  assert.strictEqual(data.avg, 1550);
  const missing = parseEloFromHeaders({ WhiteElo: '1500' });
  assert.strictEqual(missing.avg, null);
});
