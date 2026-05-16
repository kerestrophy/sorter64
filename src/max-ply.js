const { estimatePlies } = require('./pgn-utils');

function parseOptionalMaxPly(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }
  const text = String(raw).trim();
  if (!text) {
    return null;
  }
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function tryCountFromField(taskOrGame, fieldName) {
  if (!taskOrGame || !(fieldName in taskOrGame)) {
    return null;
  }
  const value = taskOrGame[fieldName];
  if (Array.isArray(value)) {
    return { known: true, plies: value.length, source: fieldName };
  }
  if (typeof value === 'string') {
    return { known: true, plies: estimatePlies(value), source: fieldName };
  }
  return null;
}

function detectSolutionPly(taskOrGame) {
  const candidates = ['solution', 'moves', 'line', 'expectedUserMoves'];
  for (const field of candidates) {
    const hit = tryCountFromField(taskOrGame, field);
    if (hit) {
      return hit;
    }
  }

  if (taskOrGame && typeof taskOrGame.moveText === 'string') {
    return {
      known: true,
      plies: estimatePlies(taskOrGame.moveText),
      source: 'moveText'
    };
  }

  return { known: false, plies: null, source: 'unknown' };
}

module.exports = {
  parseOptionalMaxPly,
  detectSolutionPly
};