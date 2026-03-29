const crypto = require('crypto');
const { stripCommentsAndVariations, tokenizeSAN, getResultToken } = require('./pgn-utils');

function computeDedupeHash(headers, moveText, firstPlies) {
  const white = (headers.White || '').trim().toLowerCase();
  const black = (headers.Black || '').trim().toLowerCase();
  const date = (headers.Date || '').trim().toLowerCase();
  const result = (headers.Result || getResultToken(moveText) || '').trim().toLowerCase();

  const cleaned = stripCommentsAndVariations(moveText || '');
  const tokens = tokenizeSAN(cleaned);
  const first = tokens.slice(0, firstPlies).join(' ');

  const raw = `${white}|${black}|${date}|${result}|${first}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

module.exports = { computeDedupeHash };
