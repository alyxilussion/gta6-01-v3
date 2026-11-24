// FROSTLINE — world: the city of Frostline, its roads, buildings, lake and pass.
// Generated once from a fixed seed so every run plays the same map.

var World = (function () {
  var buildings = [];   // {x, y, w, h, hue, neon, sign}
  var lamps = [];       // {x, y}
  var pines = [];       // {x, y, s}
  var cashPickups = []; // {x, y, value, taken}
  var parkedCars = [];  // stealable cars waiting on the streets

  var NEON_SIGNS = ['NOODLE', 'MOTEL', 'ARCADE', 'PIER 9', 'SAUNA', 'DANCE', '24H', 'HOTEL', 'BAR', 'RAMEN'];
  var CAR_COLORS = ['#d94f4f', '#4f7dd9', '#e0a53c', '#7dd94f', '#b06fd9', '#d9d9d9', '#3cc9c9'];

  function onRoad(x, y) {
    for (var i = 0; i < ROAD_V.length; i++) if (Math.abs(x - ROAD_V[i]) < ROAD_W / 2 + 6) return true;
    for (var j = 0; j < ROAD_H.length; j++) if (Math.abs(y - ROAD_H[j]) < ROAD_W / 2 + 6) return true;
    return false;
  }
  function onLake(x, y) {
    var dx = (x - LAKE.x) / LAKE.rx, dy = (y - LAKE.y) / LAKE.ry;
    return dx * dx + dy * dy <= 1;
  }
  function onPass(x, y) { return y < 130 && Math.abs(x - PASS.x) < 220; }
  function inLodge(x, y) {
    return x > LODGE.x && x < LODGE.x + LODGE.w && y > LODGE.y && y < LODGE.y + LODGE.h;
  }

  function buildCity() {
    buildings = []; lamps = []; pines = []; cashPickups = []; parkedCars = [];
    // The Neon Lodge is hand-placed: the story starts here.
    buildings.push({ x: LODGE.x, y: LODGE.y, w: LODGE.w, h: LODGE.h, hue: '#ff4d8d', neon: 'NEON LODGE', lodge: true });
    // One building per city block, kept off roads, lake and pass.
    for (var vi = 0; vi < ROAD_V.length - 1; vi++) {
      for (var hi = 0; hi < ROAD_H.length - 1; hi++) {
        var bx0 = ROAD_V[vi] + ROAD_W / 2 + 26;
        var by0 = ROAD_H[hi] + ROAD_W / 2 + 26;
        var bx1 = ROAD_V[vi + 1] - ROAD_W / 2 - 26;
        var by1 = ROAD_H[hi + 1] - ROAD_W / 2 - 26;
        if (bx1 - bx0 < 90 || by1 - by0 < 90) continue;
        var n = 1 + Math.floor(rng() * 2);
        for (var k = 0; k < n; k++) {
          var w = randRange(90, Math.min(220, bx1 - bx0));
          var h = randRange(80, Math.min(180, by1 - by0));
          var x = randRange(bx0, bx1 - w);
          var y = randRange(by0, by1 - h);
          var cx = x + w / 2, cy = y + h / 2;
          if (onLake(cx, cy) || onPass(cx, cy)) continue;
          if (dist(cx, cy, LODGE_DOOR.x, LODGE_DOOR.y) < 220) continue;
          buildings.push({
            x: x, y: y, w: w, h: h,
            hue: pick(['#37e0ff', '#ff4d8d', '#ffb347', '#59ffa0', '#b06fd9']),
            neon: rng() < 0.55 ? pick(NEON_SIGNS) : ''
          });
        }
      }
    }
    // Street lamps along every road, pines ringing the lake and the pass.
    for (var i = 0; i < ROAD_V.length; i++) {
      for (var y = 120; y < WORLD_H; y += 260) lamps.push({ x: ROAD_V[i] + ROAD_W / 2 + 8, y: y });
    }
    for (var j = 0; j < ROAD_H.length; j++) {
      for (var x = 120; x < WORLD_W; x += 260) lamps.push({ x: x, y: ROAD_H[j] + ROAD_W / 2 + 8 });
    }
    for (var p = 0; p < 46; p++) {
      var a = rng() * Math.PI * 2, r = 1.05 + rng() * 0.35;
      pines.push({ x: LAKE.x + Math.cos(a) * LAKE.rx * r, y: LAKE.y + Math.sin(a) * LAKE.ry * r, s: randRange(0.8, 1.4) });
    }
    for (var q = 0; q < 26; q++) {
      pines.push({ x: randRange(80, WORLD_W - 80), y: randRange(20, 130), s: randRange(0.8, 1.5) });
    }
    // Cash drops the crew left around town.
    for (var c = 0; c < 9; c++) {
      var px = randRange(200, WORLD_W - 200), py = randRange(200, WORLD_H - 200);
      if (onRoad(px, py) || onLake(px, py)) { c--; continue; }
      cashPickups.push({ x: px, y: py, value: pick([50, 75, 100, 150]), taken: false });
    }
    // Parked cars to steal, lined up on side streets.
    var spots = [
      { x: 1060, y: 520, a: Math.PI / 2 }, { x: 1540, y: 960, a: 0 },
      { x: 2140, y: 470, a: -Math.PI / 2 }, { x: 460, y: 1460, a: 0 },
      { x: 2260, y: 1960, a: Math.PI / 2 }, { x: 1060, y: 1960, a: 0 },
      { x: 2860, y: 960, a: -Math.PI / 2 }, { x: 1660, y: 520, a: Math.PI / 2 }
    ];
    for (var s = 0; s < spots.length; s++) {
      parkedCars.push({ x: spots[s].x, y: spots[s].y, a: spots[s].a, color: CAR_COLORS[s % CAR_COLORS.length], taken: false });
    }
  }

  // Circle (player / car) vs building rectangles: push the circle out.
  function collideCircle(px, py, r) {
    var x = px, y = py;
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      var cx = clamp(x, b.x, b.x + b.w), cy = clamp(y, b.y, b.y + b.h);
      var dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 === 0) { x = b.x - r; continue; }
        var d = Math.sqrt(d2);
        x = cx + (dx / d) * r; y = cy + (dy / d) * r;
      }
    }
    x = clamp(x, 30, WORLD_W - 30);
    y = clamp(y, 30, WORLD_H - 30);
    return { x: x, y: y };
  }

  // Nearest road centre to a point (for police spawns and traffic).
  function nearestRoad(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < ROAD_V.length; i++) { var d = Math.abs(x - ROAD_V[i]); if (d < bd) { bd = d; best = { axis: 'v', at: ROAD_V[i] }; } }
    for (var j = 0; j < ROAD_H.length; j++) { var d2 = Math.abs(y - ROAD_H[j]); if (d2 < bd) { bd = d2; best = { axis: 'h', at: ROAD_H[j] }; } }
    return best;
  }

  return {
    buildings: function () { return buildings; },
    lamps: function () { return lamps; },
    pines: function () { return pines; },
    cashPickups: function () { return cashPickups; },
    parkedCars: function () { return parkedCars; },
    carColors: CAR_COLORS,
    onRoad: onRoad,
    onLake: onLake,
    onPass: onPass,
    inLodge: inLodge,
    buildCity: buildCity,
    collideCircle: collideCircle,
    nearestRoad: nearestRoad
  };
})();
