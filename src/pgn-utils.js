function isHeaderStart(line) {
  return /^\[(Event|Site|Date|Round|White|Black)\s/.test(line);
}

function parseHeaderLine(line) {
  const match = line.match(/^\[([^\s]+)\s+"(.*)"\]\s*$/);
  if (!match) return null;
  return { key: match[1], value: match[2] };
}

function formatGameText(headerLines, moveLines) {
  const headerBlock = headerLines.join('\n');
  const moveBlock = moveLines.join('\n').trim();
  if (!moveBlock) {
    return headerBlock + '\n\n';
  }
  return `${headerBlock}\n\n${moveBlock}\n\n`;
}

function stripCommentsAndVariations(text, options = null) {
  const stripVariations = !options || options.stripVariations !== false;
  let out = '';
  let braceDepth = 0;
  let parenDepth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (braceDepth > 0) {
      if (ch === '{') {
        braceDepth += 1;
      } else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      }
      i += 1;
      continue;
    }

    if (stripVariations && parenDepth > 0) {
      if (ch === '(') {
        parenDepth += 1;
      } else if (ch === ')') {
        parenDepth = Math.max(0, parenDepth - 1);
      }
      i += 1;
      continue;
    }

    if (ch === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (stripVariations && ch === '(') {
      parenDepth += 1;
      i += 1;
      continue;
    }
    if (stripVariations && ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      i += 1;
      continue;
    }
    if (ch === ';') {
      while (i < text.length && text[i] !== '\n') {
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function normalizeWantedFirstMove(wantedFirstMove) {
  if (typeof wantedFirstMove !== 'string') return null;
  const normalized = wantedFirstMove.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAllowedFirstMoves(allowedFirstMoves) {
  if (!allowedFirstMoves) return [];
  const normalized = [];
  for (const move of allowedFirstMoves) {
    if (typeof move !== 'string') continue;
    const clean = move.trim();
    if (clean.length > 0) {
      normalized.push(clean);
    }
  }
  return normalized;
}

function stripTrailingBangQuestion(token) {
  let end = token.length;
  while (end > 0) {
    const ch = token[end - 1];
    if (ch === '!' || ch === '?') {
      end -= 1;
      continue;
    }
    break;
  }
  return end === token.length ? token : token.slice(0, end);
}

function startsWithAny(moveToken, allowedFirstMoves) {
  for (const wanted of allowedFirstMoves) {
    if (moveToken.startsWith(wanted)) {
      return true;
    }
  }
  return false;
}

function hasWantedFirstWhiteMoveFromAllowed(movetext, allowedFirstMoves, options = null) {
  if (typeof movetext !== 'string' || movetext.length === 0) {
    return false;
  }

  const normalizedAllowed = normalizeAllowedFirstMoves(allowedFirstMoves);
  if (normalizedAllowed.length === 0) {
    return false;
  }

  // Default for large Lichess-like pools: mainline-only filtering.
  // This intentionally strips PGN variations (...) for throughput and robustness.
  // Can be disabled later via { mainlineOnly: false } for study/commented datasets.
  const mainlineOnly = !options || options.mainlineOnly !== false;
  const cleaned = stripCommentsAndVariations(movetext, { stripVariations: mainlineOnly });
  const n = cleaned.length;
  let i = 0;
  let expectWhiteMoveAfterOneDot = false;

  while (i < n) {
    while (i < n && /\s/.test(cleaned[i])) {
      i += 1;
    }
    if (i >= n) {
      break;
    }

    let j = i;
    while (j < n && !/\s/.test(cleaned[j])) {
      j += 1;
    }

    let token = cleaned.slice(i, j);
    i = j;

    if (token[0] === '$') {
      continue;
    }

    token = stripTrailingBangQuestion(token);
    if (!token) {
      continue;
    }

    if (expectWhiteMoveAfterOneDot) {
      return startsWithAny(token, normalizedAllowed);
    }

    if (token.startsWith('1.')) {
      const tail = token.slice(2);
      if (tail.length === 0) {
        expectWhiteMoveAfterOneDot = true;
        continue;
      }
      if (tail[0] === '.') {
        continue;
      }
      return startsWithAny(tail, normalizedAllowed);
    }
  }

  return false;
}

function hasWantedFirstWhiteMove(movetext, wantedFirstMove, options = null) {
  const normalizedWanted = normalizeWantedFirstMove(wantedFirstMove);
  if (!normalizedWanted) {
    return false;
  }
  return hasWantedFirstWhiteMoveFromAllowed(movetext, [normalizedWanted], options);
}

function tokenizeSAN(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/\d+\.(\.\.)?/g, ' ');
  const tokens = cleaned.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  return tokens.filter((tok) => {
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) return false;
    if (/^\$\d+$/.test(tok)) return false;
    return true;
  });
}

function estimatePlies(moveText) {
  if (!moveText) return 0;
  const cleaned = stripCommentsAndVariations(moveText);
  const tokens = tokenizeSAN(cleaned);
  return tokens.length;
}

function getResultToken(moveText) {
  if (!moveText) return null;
  const match = moveText.match(/(1-0|0-1|1\/2-1\/2|\*)/);
  return match ? match[1] : null;
}

function normalizeDate(date) {
  if (!date) return null;
  const clean = date.trim();
  const match = clean.match(/^(\d{4})[.-](\d{2})[.-](\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseGameDate(headers) {
  const raw = headers.UTCDate || headers.Date;
  const normalized = normalizeDate(raw || '');
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00Z`);
}

function classifyRated(headers) {
  const value = `${headers.Event || ''} ${headers.Site || ''} ${headers.Rated || ''}`.toLowerCase();
  if (value.includes('rated')) return 'rated';
  if (value.includes('casual') || value.includes('unrated')) return 'unrated';
  return 'unknown';
}

function summarizeGame(game) {
  if (!game || !game.headers) return 'unknown';
  const h = game.headers;
  return [h.Event, h.White, h.Black, h.Date, h.Result].filter(Boolean).join(' | ');
}

module.exports = {
  isHeaderStart,
  parseHeaderLine,
  formatGameText,
  stripCommentsAndVariations,
  hasWantedFirstWhiteMove,
  hasWantedFirstWhiteMoveFromAllowed,
  tokenizeSAN,
  estimatePlies,
  getResultToken,
  normalizeDate,
  parseGameDate,
  classifyRated,
  summarizeGame
};
