export const MAX_VISIBLE = 96;

export function hashString(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function rand() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Share of the jar interior filled from the bottom. Gentle at ~10, nearly full at 100+. */
export function fillLevel(count) {
  if (count <= 0) return 0;
  const t = 1 - Math.exp(-count / 18);
  return 0.34 + 0.56 * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function layoutPapers(wishes) {
  const list = Array.isArray(wishes) ? wishes : [];
  const count = list.length;
  const visible = list.slice(Math.max(0, count - MAX_VISIBLE));
  const n = visible.length;
  if (!n) return [];

  const fill = fillLevel(count);
  const cols = n <= 4 ? 2 : n <= 14 ? 3 : n <= 32 ? 4 : n <= 60 ? 5 : 6;
  const rows = Math.ceil(n / cols);
  const base = n <= 6 ? 42 : n <= 12 ? 34 : n <= 24 ? 28 : n <= 48 ? 22 : n <= 80 ? 18 : 15;
  const rowSpan = (fill * 100) / rows;

  return visible.map((wish, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rand = mulberry32(hashString(wish.id || String(index)));
    const shift = row % 2 ? 4 : -2;
    const colCenter = ((col + 1) / (cols + 1)) * 100;
    const x = clamp(colCenter + shift + (rand() - 0.5) * 7, 16, 84);
    const y = clamp(row * rowSpan * 0.78 + (rand() - 0.5) * 2.4, 0, 86);
    const rot = (rand() - 0.5) * 16;
    const size = base * (0.9 + rand() * 0.18);
    const palette = Math.floor(rand() * 5);
    return {
      wish,
      x,
      y,
      rot,
      size,
      palette,
      z: row * 10 + col + 1,
    };
  });
}
