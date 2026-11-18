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

/**
 * Share of the jar interior filled from the bottom.
 * A handful spans the floor; around forty wishes reach just below the neck.
 * Past that, the pile tightens instead of overflowing.
 */
export function fillLevel(count) {
  if (count <= 0) return 0;
  if (count <= 11) return 0.34 + 0.18 * (count / 11);
  if (count <= 40) return 0.52 + 0.36 * ((count - 11) / 29);
  const t = 1 - Math.exp(-(count - 40) / 50);
  return Math.min(0.94, 0.88 + 0.06 * t);
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
  const cols =
    n <= 2 ? n : n <= 5 ? 2 : n <= 18 ? 3 : n <= 36 ? 4 : n <= 64 ? 5 : 6;
  const rows = Math.ceil(n / cols);
  const base =
    n <= 6 ? 56 : n <= 14 ? 52 : n <= 24 ? 42 : n <= 40 ? 36 : n <= 64 ? 28 : 22;

  return visible.map((wish, index) => {
    const row = Math.floor(index / cols);
    const itemsInRow = Math.min(cols, n - row * cols);
    const col = index % cols;
    const rand = mulberry32(hashString(wish.id || String(index)));
    const colT = itemsInRow === 1 ? 0.5 : (col + 0.5) / itemsInRow;
    const brick = (row % 2 ? 1 : -1) * (7 / cols);
    const size = base * (0.9 + rand() * 0.22);
    const x = clamp(colT * 100 + brick + (rand() - 0.5) * 10, 12, 88);
    const heightPct = size * 0.5;
    const maxY = clamp(92 - heightPct * 0.4, 52, 88);
    const rowT = rows === 1 ? 0 : row / (rows - 1);
    const y = clamp(rowT * fill * maxY + (rand() - 0.5) * 3.2, 0, maxY);
    const rot = (rand() - 0.5) * 28;
    const lit = 0.9 + rand() * 0.22;
    const palette = Math.floor(rand() * 5);
    return {
      wish,
      x,
      y,
      rot,
      size,
      lit,
      palette,
      z: row * 10 + col + 1,
    };
  });
}
