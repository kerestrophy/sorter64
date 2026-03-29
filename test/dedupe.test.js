const test = require('node:test');
const assert = require('node:assert');
const { computeDedupeHash } = require('../src/dedupe');

test('computeDedupeHash stable for same headers and moves', () => {
  const headers = { White: 'A', Black: 'B', Date: '2020.01.01', Result: '1-0' };
  const moveText = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0';
  const hash1 = computeDedupeHash(headers, moveText, 6);
  const hash2 = computeDedupeHash(headers, moveText, 6);
  assert.strictEqual(hash1, hash2);
});
