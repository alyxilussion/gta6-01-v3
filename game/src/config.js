// Frostline — shared tuning constants and a seeded random generator.
// The city is a snowy mountain town at night: neon signs on snow, a frozen lake,
// a mountain pass road. Deterministic so every run builds the same city.
export const CFG = {
  WORLD: 3600,            // city is WORLD x WORLD pixels
  ROAD_GAP: 300,          // distance between road centerlines
  ROAD_W: 64,             // road width
  VIEW_W: 1280,
  VIEW_H: 800,
  PLAYER_R: 13,
  WALK_SPEED: 175,
  RUN_SPEED: 265,
  CAR_ACCEL: 420,
  CAR_MAX_SPEED: 520,
  CAR_BRAKE: 700,
  POLICE_MAX: 520,
  WANTED_DECAY_S: 14,    // seconds without crime before one star drops
  SAVE_KEY: 'frostline-save-v1',
};

// mulberry32 — tiny deterministic PRNG so the city never changes between runs.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
// Shortest signed turn from angle a toward angle b.
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

export const CAR_COLORS = ['#d9392b', '#2b7fd9', '#e8b93c', '#39d98a', '#8a5fd9', '#e8e8e8', '#222831', '#ff7a1a'];
export const NEON_SIGNS = [
  { text: 'NEON LODGE', color: '#ff2e88' },
  { text: 'FROSTLINE', color: '#37e0ff' },
  { text: 'SNOW BAR', color: '#ffd23c' },
  { text: 'SKI RENTAL', color: '#7dff5e' },
  { text: '24H DINER', color: '#ff7a1a' },
  { text: 'HOTEL AURORA', color: '#c07dff' },
  { text: 'CASINO PEAK', color: '#ff3b3b' },
  { text: 'GARAGE 9', color: '#3cffce' },
];
