const test = require('node:test');
const assert = require('node:assert');
const { hasWantedFirstWhiteMove, hasWantedFirstWhiteMoveFromAllowed } = require('../src/pgn-utils');

test('hasWantedFirstWhiteMove matches "1. d4 d5"', () => {
  assert.strictEqual(hasWantedFirstWhiteMove('1. d4 d5 2. c4', 'd4'), true);
  assert.strictEqual(hasWantedFirstWhiteMove('1. d4 d5 2. c4', 'e4'), false);
});

test('hasWantedFirstWhiteMove matches "1.d4 d5" and ignores trailing annotations', () => {
  assert.strictEqual(hasWantedFirstWhiteMove('1.d4?! d5 2. c4', 'd4'), true);
});

test('first-move detection ignores comments and variations, and normalizes allowed moves', () => {
  const movetext = '(1. e4 (1... c5) e5) {side note} ;line comment\n1. d4! d5 (1... Nf6) 2. c4';
  const allowed = new Set(['  ', ' e4 ', ' d4  ']);
  assert.strictEqual(hasWantedFirstWhiteMoveFromAllowed(movetext, allowed), true);
  assert.strictEqual(hasWantedFirstWhiteMoveFromAllowed(movetext, ['   ', 'e4']), false);
});
