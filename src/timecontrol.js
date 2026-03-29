function parseTimeControl(tc) {
  if (!tc || typeof tc !== 'string') {
    return null;
  }
  const clean = tc.trim();
  if (!clean || clean === '-') {
    return null;
  }
  const match = clean.match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) {
    return null;
  }
  return {
    base: Number.parseInt(match[1], 10),
    increment: Number.parseInt(match[2] || '0', 10)
  };
}

function classifyTimeControl(tc) {
  const parsed = parseTimeControl(tc);
  if (!parsed || !Number.isFinite(parsed.base)) {
    return 'unknown';
  }
  const base = parsed.base;
  if (base < 180) return 'bullet';
  if (base < 480) return 'blitz';
  if (base < 1500) return 'rapid';
  return 'classical';
}

module.exports = { parseTimeControl, classifyTimeControl };
