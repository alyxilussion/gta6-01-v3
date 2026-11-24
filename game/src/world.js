// Frostline — the city itself: roads, buildings, lamps, trees, the frozen lake
// and the mountain pass. Everything is generated once from a fixed seed.
import { CFG, makeRng, pick, NEON_SIGNS } from './config.js';

function roadCenters() {
  const centers = [];
  for (let c = CFG.ROAD_GAP; c < CFG.WORLD; c += CFG.ROAD_GAP) centers.push(c);
  return centers;
}

// Is this point on a road (within the asphalt, with a small shoulder)?
export function isRoadAt(x, y) {
  const m = CFG.ROAD_GAP, half = CFG.ROAD_W / 2 + 6;
  const rx = ((x % m) + m) % m, ry = ((y % m) + m) % m;
  return Math.min(rx, m - rx) <= half || Math.min(ry, m - ry) <= half;
}

export function buildWorld() {
  const rng = makeRng(20261124);
  const centers = roadCenters();
  const buildings = [];
  const trees = [];
  const lamps = [];
  const signs = [];

  // One building per block, inset from the roads, with a snowy roof and a neon sign downtown.
  for (let i = 0; i < centers.length - 1; i++) {
    for (let j = 0; j < centers.length - 1; j++) {
      const x0 = centers[i] + CFG.ROAD_W / 2 + 14;
      const y0 = centers[j] + CFG.ROAD_W / 2 + 14;
      const w = CFG.ROAD_GAP - CFG.ROAD_W - 28;
      const h = CFG.ROAD_GAP - CFG.ROAD_W - 28;
      // Skip the frozen-lake blocks in the south-west quarter.
      const lake = x0 < 1000 && y0 > 2400;
      if (lake) continue;
      // The mountain-pass corner in the north-east stays open road.
      if (x0 > 2900 && y0 < 900) continue;
      const downtown = x0 > 1200 && x0 < 2400 && y0 > 1200 && y0 < 2400;
      const b = {
        x: x0, y: y0, w, h,
        roof: downtown ? '#3a4a63' : '#2c3a52',
        wall: downtown ? '#4b5a78' : '#39445c',
        snow: '#eef4fb',
        sign: downtown && rng() < 0.75 ? pick(rng, NEON_SIGNS) : null,
        hgt: 18 + Math.floor(rng() * 26),
      };
      buildings.push(b);
      if (b.sign) signs.push({ x: b.x + b.w / 2, y: b.y + 4, text: b.sign.text, color: b.sign.color });
      // A couple of pines beside each building.
      for (let t = 0; t < 2; t++) {
        trees.push({ x: x0 + rng() * w, y: y0 + rng() * h, s: 0.7 + rng() * 0.7 });
      }
    }
  }
  // Street lamps along every road, every 150 px.
  for (const c of centers) {
    for (let p = 100; p < CFG.WORLD; p += 150) {
      lamps.push({ x: c + CFG.ROAD_W / 2 + 4, y: p });
      lamps.push({ x: p, y: c - CFG.ROAD_W / 2 - 4 });
    }
  }
  // Extra pines ringing the mountain pass.
  for (let t = 0; t < 60; t++) {
    trees.push({ x: 2900 + rng() * 650, y: 80 + rng() * 800, s: 0.8 + rng() * 1.1 });
  }

  const lake = { x: 150, y: 2500, w: 850, h: 950 };
  const pass = { x: 3050, y: 150, w: 420, h: 650 }; // mountain-pass clearing (mission 5 target)

  return {
    centers, buildings, trees, lamps, signs, lake, pass,
    spawn: { x: 1650, y: 1650 },          // Neon Lodge plaza, downtown
    lodge: { x: 1650, y: 1450 },          // Neon Lodge front door
    hospital: { x: 1950, y: 2250 },
    garage: { x: 2250, y: 1950 },
  };
}

// Circle-vs-building collision: push the circle out, return corrected position.
export function collideWorld(world, x, y, r) {
  for (const b of world.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { x = b.x - r; continue; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      y = ny + (dy / d) * r;
    }
  }
  const m = 30;
  x = Math.max(m, Math.min(CFG.WORLD - m, x));
  y = Math.max(m, Math.min(CFG.WORLD - m, y));
  return { x, y };
}

// Is the point inside the frozen lake (slippery, and a hiding spot from police)?
export function onLake(world, x, y) {
  const l = world.lake;
  return x > l.x && x < l.x + l.w && y > l.y && y < l.y + l.h;
}
