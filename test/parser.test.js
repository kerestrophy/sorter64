const test = require('node:test');
const assert = require('node:assert');
const { GameBuilder } = require('../src/parser');

test('GameBuilder splits games by header start', () => {
  const builder = new GameBuilder();
  const lines = [
    '[Event "Game1"]',
    '[White "A"]',
    '',
    '1. e4 e5 1-0',
    '[Event "Game2"]',
    '[White "B"]',
    '',
    '1. d4 d5 0-1'
  ];
  const games = [];
  for (const line of lines) {
    const g = builder.pushLine(line);
    if (g) games.push(g);
  }
  const last = builder.finalize();
  if (last) games.push(last);
  assert.strictEqual(games.length, 2);
  assert.strictEqual(games[0].headers.Event, 'Game1');
  assert.strictEqual(games[1].headers.Event, 'Game2');
});
