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

function stripCommentsAndVariations(text) {
  let out = '';
  let braceDepth = 0;
  let parenDepth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      i += 1;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      i += 1;
      continue;
    }
    if (braceDepth > 0 || parenDepth > 0) {
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
  tokenizeSAN,
  estimatePlies,
  getResultToken,
  normalizeDate,
  parseGameDate,
  classifyRated,
  summarizeGame
};
