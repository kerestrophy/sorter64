const test = require('node:test');
const assert = require('node:assert');
const { classifyTimeControl, parseTimeControl } = require('../src/timecontrol');

test('parseTimeControl', () => {
  assert.deepStrictEqual(parseTimeControl('600+0'), { base: 600, increment: 0 });
  assert.deepStrictEqual(parseTimeControl('180+2'), { base: 180, increment: 2 });
  assert.strictEqual(parseTimeControl('-'), null);
  assert.strictEqual(parseTimeControl('abc'), null);
});

test('classifyTimeControl', () => {
  assert.strictEqual(classifyTimeControl('60+0'), 'bullet');
  assert.strictEqual(classifyTimeControl('300+0'), 'blitz');
  assert.strictEqual(classifyTimeControl('900+0'), 'rapid');
  assert.strictEqual(classifyTimeControl('1800+0'), 'classical');
  assert.strictEqual(classifyTimeControl('-'), 'unknown');
});
