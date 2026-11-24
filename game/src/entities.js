// FROSTLINE — entities: Mara on foot, cars, traffic, pedestrians and the police.
// All movement, stealing, punching, chasing and heat lives here.

function makePlayer(x, y) {
  return {
    kind: 'player', x: x, y: y, a: -Math.PI / 2, r: 16,
    hp: 100, money: START_MONEY, wanted: 0,
    inCar: null,            // the car object Mara is driving, or null
    speed: 0,               // car speed when driving
    punchTimer: 0, punchAnim: 0,
    bustedTimer: 0,         // how long a cop has held her on foot
    hurtTimer: 0,
    moving: false
  };
}

function makeCar(x, y, a, color, kind) {
  return {
    kind: kind || 'traffic', x: x, y: y, a: a, r: 22,
    w: 46, h: 24, color: color || '#d9d9d9',
    speed: 0, topSpeed: randRange(95, 150),
    // traffic brain: which road, which way, which lane
    axis: 'h', road: 900, dir: 1, lane: 24,
    siren: 0, down: false, ramCooldown: 0
  };
}

function makePedestrian(x, y) {
  return {
    kind: 'ped', x: x, y: y, a: rng() * Math.PI * 2, r: 12,
    speed: randRange(28, 52), state: 'walk', // walk | flee | down
    downTimer: 0, fleeTimer: 0,
    coat: pick(['#e05a5a', '#5aa8e0', '#e0c35a', '#7de08a', '#c98ae0', '#e8e8e8']),
    tx: x, ty: y
  };
}

// --- traffic ---------------------------------------------------------------

function spawnTraffic(n) {
  var cars = [];
  for (var i = 0; i < n; i++) {
    var vertical = rng() < 0.5;
    var car;
    if (vertical) {
      var road = pick(ROAD_V);
      car = makeCar(road + (rng() < 0.5 ? -24 : 24), randRange(100, WORLD_H - 100), rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pick(World.carColors));
      car.axis = 'v'; car.road = road; car.dir = car.a > 0 ? 1 : -1; car.lane = car.x - road;
    } else {
      var road2 = pick(ROAD_H);
      car = makeCar(randRange(100, WORLD_W - 100), road2 + (rng() < 0.5 ? -24 : 24), rng() < 0.5 ? 0 : Math.PI, pick(World.carColors));
      car.axis = 'h'; car.road = road2; car.dir = car.a === 0 ? 1 : -1; car.lane = car.y - road2;
    }
    car.speed = car.topSpeed;
    cars.push(car);
  }
  return cars;
}

function updateTraffic(car, dt, allCars) {
  if (car.kind === 'police') return; // police are driven by updatePolice
  // Slow down for the car ahead on the same road and lane.
  var want = car.topSpeed;
  for (var i = 0; i < allCars.length; i++) {
    var o = allCars[i];
    if (o === car || o.axis !== car.axis || o.road !== car.road || o.lane !== car.lane) continue;
    var along = car.axis === 'v' ? (o.y - car.y) * car.dir : (o.x - car.x) * car.dir;
    if (along > 0 && along < 90) { want = Math.min(want, Math.max(0, (along - 55) * 1.2)); }
  }
  car.speed = lerp(car.speed, want, clamp(dt * 2, 0, 1));
  if (car.axis === 'v') {
    car.y += car.dir * car.speed * dt;
    if (car.y < 60) car.y = WORLD_H - 60;
    if (car.y > WORLD_H - 60) car.y = 60;
  } else {
    car.x += car.dir * car.speed * dt;
    if (car.x < 60) car.x = WORLD_W - 60;
    if (car.x > WORLD_W - 60) car.x = 60;
  }
  // Keep the car glued to its lane.
  if (car.axis === 'v') car.x = car.road + car.lane; else car.y = car.road + car.lane;
}

// --- pedestrians -----------------------------------------------------------

function spawnPedestrians(n) {
  var peds = [];
  for (var i = 0; i < n; i++) {
    var x, y, tries = 0;
    do {
      x = randRange(150, WORLD_W - 150); y = randRange(150, WORLD_H - 150); tries++;
    } while ((World.onRoad(x, y) || World.onLake(x, y) || World.inLodge(x, y)) && tries < 40);
    peds.push(makePedestrian(x, y));
  }
  return peds;
}

function updatePedestrian(p, dt, player, cars) {
  if (p.state === 'down') {
    p.downTimer -= dt;
    if (p.downTimer <= 0) { p.state = 'walk'; p.speed = randRange(28, 52); }
    return;
  }
  // Flee from a fast car or a punching player nearby.
  var threat = null;
  var px = player.inCar ? player.inCar.x : player.x;
  var py = player.inCar ? player.inCar.y : player.y;
  if (dist(p.x, p.y, px, py) < 130) threat = { x: px, y: py };
  if (!threat) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.speed > 60 && dist(p.x, p.y, c.x, c.y) < 110) { threat = { x: c.x, y: c.y }; break; }
    }
  }
  if (threat) { p.state = 'flee'; p.fleeTimer = 1.6; }
  else if (p.state === 'flee') { p.fleeTimer -= dt; if (p.fleeTimer <= 0) p.state = 'walk'; }

  if (p.state === 'flee' && threat) {
    p.a = angleTo(threat.x, threat.y, p.x, p.y);
    p.x += Math.cos(p.a) * 95 * dt;
    p.y += Math.sin(p.a) * 95 * dt;
  } else if (p.state === 'flee') {
    // Still fleeing but the threat is gone this frame: keep running the
    // same way instead of stopping dead.
    p.x += Math.cos(p.a) * 95 * dt;
    p.y += Math.sin(p.a) * 95 * dt;
  } else {
    if (dist(p.x, p.y, p.tx, p.ty) < 24 || rng() < dt * 0.05) {
      var tries = 0;
      do {
        p.tx = clamp(p.x + randRange(-260, 260), 120, WORLD_W - 120);
        p.ty = clamp(p.y + randRange(-260, 260), 120, WORLD_H - 120);
        tries++;
      } while ((World.onRoad(p.tx, p.ty) || World.onLake(p.tx, p.ty)) && tries < 8);
    }
    p.a = angleTo(p.x, p.y, p.tx, p.ty);
    p.x += Math.cos(p.a) * p.speed * dt;
    p.y += Math.sin(p.a) * p.speed * dt;
  }
  var fixed = World.collideCircle(p.x, p.y, p.r);
  p.x = fixed.x; p.y = fixed.y;
}

// --- police ----------------------------------------------------------------

function spawnPoliceCar(player) {
  // Appear on a road a little way off, sirens already going.
  var a = rng() * Math.PI * 2;
  var x = clamp(player.x + Math.cos(a) * randRange(650, 900), 100, WORLD_W - 100);
  var y = clamp(player.y + Math.sin(a) * randRange(650, 900), 100, WORLD_H - 100);
  var road = World.nearestRoad(x, y);
  if (road.axis === 'v') x = road.at + 24; else y = road.at + 24;
  var car = makeCar(x, y, angleTo(x, y, player.x, player.y), '#1c2f6e', 'police');
  car.topSpeed = POLICE_CAR_SPEED;
  car.speed = POLICE_CAR_SPEED * 0.7;
  return car;
}

function spawnPoliceFoot(player) {
  var a = rng() * Math.PI * 2;
  var x = clamp(player.x + Math.cos(a) * randRange(420, 560), 80, WORLD_W - 80);
  var y = clamp(player.y + Math.sin(a) * randRange(420, 560), 80, WORLD_H - 80);
  return { kind: 'cop', x: x, y: y, a: 0, r: 14, hp: 3, down: false, downTimer: 0, speed: POLICE_FOOT_SPEED };
}

function updatePoliceCar(car, dt, player, blizzard) {
  var tx = player.inCar ? player.inCar.x : player.x;
  var ty = player.inCar ? player.inCar.y : player.y;
  // Cops lose the trail on the frozen lake: they hold at the shore and search
  // instead of driving onto the ice after Mara.
  if (World.onLake(tx, ty)) {
    var la = Math.atan2(ty - LAKE.y, tx - LAKE.x);
    tx = LAKE.x + Math.cos(la) * LAKE.rx * 0.98 + Math.sin(la + 1.2) * 40;
    ty = LAKE.y + Math.sin(la) * LAKE.ry * 0.98 + Math.cos(la + 1.2) * 40;
  }
  var want = angleTo(car.x, car.y, tx, ty);
  // In a whiteout the cops lose the trail: they steer worse and slower.
  var grip = 1 - blizzard * 0.45;
  var turn = 2.2 * grip;
  car.a += clamp(angleDiff(car.a, want), -turn * dt, turn * dt);
  car.speed = lerp(car.speed, POLICE_CAR_SPEED * (0.72 + 0.28 * grip), clamp(dt * 1.5, 0, 1));
  car.x += Math.cos(car.a) * car.speed * dt;
  car.y += Math.sin(car.a) * car.speed * dt;
  var fixed = World.collideCircle(car.x, car.y, car.r);
  car.x = fixed.x; car.y = fixed.y;
  car.siren += dt;
  if (car.ramCooldown > 0) car.ramCooldown -= dt;
}

function updatePoliceFoot(cop, dt, player) {
  if (cop.down) {
    cop.downTimer -= dt;
    if (cop.downTimer <= 0) { cop.down = false; cop.hp = 3; }
    return;
  }
  var tx = player.inCar ? player.inCar.x : player.x;
  var ty = player.inCar ? player.inCar.y : player.y;
  cop.a = angleTo(cop.x, cop.y, tx, ty);
  cop.x += Math.cos(cop.a) * cop.speed * dt;
  cop.y += Math.sin(cop.a) * cop.speed * dt;
  var fixed = World.collideCircle(cop.x, cop.y, cop.r);
  cop.x = fixed.x; cop.y = fixed.y;
}

// --- player driving / walking ----------------------------------------------

function playerDrive(player, dt, input, blizzard) {
  var car = player.inCar;
  if (!car) return;
  var grip = 1 - blizzard * 0.5; // the storm makes the roads slick
  if (input.up) car.speed += CAR_ACCEL * grip * dt;
  else if (input.down) car.speed -= CAR_BRAKE * dt;
  else car.speed = lerp(car.speed, 0, clamp(dt * 0.7, 0, 1));
  if (input.down && car.speed < 0) car.speed = Math.max(car.speed, -140);
  car.speed = clamp(car.speed, -150, CAR_TOP_SPEED);
  var steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  var slide = 1 + blizzard * 0.9; // whiteout drift
  car.a += steer * CAR_TURN * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1) * slide * 0.55;
  car.x += Math.cos(car.a) * car.speed * dt;
  car.y += Math.sin(car.a) * car.speed * dt;
  var fixed = World.collideCircle(car.x, car.y, car.r);
  var hitWall = (fixed.x !== car.x || fixed.y !== car.y);
  if (hitWall) {
    if (Math.abs(car.speed) > 240) AudioSys.crash(Math.abs(car.speed) / CAR_TOP_SPEED);
    car.speed *= 0.45;
    car.x = fixed.x; car.y = fixed.y;
  }
  player.x = car.x; player.y = car.y; player.a = car.a; player.speed = car.speed;
}

function playerWalk(player, dt, input) {
  var dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  var dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  var len = Math.sqrt(dx * dx + dy * dy);
  player.moving = len > 0;
  if (len > 0) {
    dx /= len; dy /= len;
    player.a = Math.atan2(dy, dx);
    player.x += dx * WALK_SPEED * dt;
    player.y += dy * WALK_SPEED * dt;
  }
  var fixed = World.collideCircle(player.x, player.y, player.r);
  player.x = fixed.x; player.y = fixed.y;
  player.speed = 0;
}

// Punch: hits the nearest ped or cop in front of Mara.
function playerPunch(player, peds, cops) {
  if (player.punchTimer > 0 || player.inCar) return null;
  player.punchTimer = PUNCH_COOLDOWN;
  player.punchAnim = 0.22;
  var hx = player.x + Math.cos(player.a) * 34;
  var hy = player.y + Math.sin(player.a) * 34;
  var hit = null;
  for (var i = 0; i < peds.length; i++) {
    var p = peds[i];
    if (p.state !== 'down' && dist(hx, hy, p.x, p.y) < PUNCH_RANGE) { hit = p; break; }
  }
  if (hit) { hit.state = 'down'; hit.downTimer = 3.5; AudioSys.punch(); return { type: 'ped', target: hit }; }
  for (var j = 0; j < cops.length; j++) {
    var c = cops[j];
    if (!c.down && dist(hx, hy, c.x, c.y) < PUNCH_RANGE) {
      c.hp -= 1;
      AudioSys.punch();
      if (c.hp <= 0) { c.down = true; c.downTimer = 6; }
      return { type: 'cop', target: c };
    }
  }
  AudioSys.swing();
  return null;
}

// Steal the nearest parked or traffic car (E). Returns the car or null.
function tryStealCar(player, parked, traffic) {
  if (player.inCar) return null;
  var best = null, bd = 78;
  for (var i = 0; i < parked.length; i++) {
    var pc = parked[i];
    if (pc.taken) continue;
    var d = dist(player.x, player.y, pc.x, pc.y);
    if (d < bd) { bd = d; best = { car: pc, parked: true }; }
  }
  if (best) {
    best.car.taken = true;
    var car = makeCar(best.car.x, best.car.y, best.car.a, best.car.color, 'player');
    car.topSpeed = CAR_TOP_SPEED;
    return car;
  }
  for (var j = 0; j < traffic.length; j++) {
    var tc = traffic[j];
    if (tc.kind === 'police') continue;
    var d2 = dist(player.x, player.y, tc.x, tc.y);
    if (d2 < 70 && Math.abs(tc.speed) < 60) {
      tc.kind = 'player'; tc.topSpeed = CAR_TOP_SPEED;
      traffic.splice(j, 1);
      return tc;
    }
  }
  return null;
}
