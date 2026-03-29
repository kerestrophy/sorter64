function parseEloBins(raw) {
  const parts = raw.split(',').map((v) => v.trim()).filter(Boolean);
  const bins = parts.map((part) => {
    const match = part.match(/^(\d+)-(\d+)$/);
    if (!match) {
      throw Object.assign(new Error(`Invalid elo bin: ${part}`), { exitCode: 2 });
    }
    const min = Number.parseInt(match[1], 10);
    const max = Number.parseInt(match[2], 10);
    if (min >= max) {
      throw Object.assign(new Error(`Invalid elo bin range: ${part}`), { exitCode: 2 });
    }
    return { min, max, label: `${String(min).padStart(4, '0')}-${String(max).padStart(4, '0')}` };
  });
  return bins;
}

function pickEloBin(avg, bins) {
  for (const bin of bins) {
    if (avg >= bin.min && avg < bin.max) {
      return bin.label;
    }
  }
  return 'unknown';
}

function parseEloFromHeaders(headers) {
  const white = headers.WhiteElo || headers.WhiteELO || headers.WhiteEloClassic;
  const black = headers.BlackElo || headers.BlackELO || headers.BlackEloClassic;
  const w = Number.parseInt(white, 10);
  const b = Number.parseInt(black, 10);
  if (!Number.isFinite(w) || !Number.isFinite(b)) {
    return { white: w, black: b, avg: null };
  }
  return { white: w, black: b, avg: Math.floor((w + b) / 2) };
}

module.exports = { parseEloBins, pickEloBin, parseEloFromHeaders };
