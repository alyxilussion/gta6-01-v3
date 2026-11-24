// Frostline — the living city: the player (on foot or driving), traffic cars,
// parked cars to steal, pedestrians, and the police who respond to wanted stars.
import { CFG, clamp, dist2, angleTo, angleDiff, makeRng, pick, CAR_COLORS } from './config.js';
import { collideWorld, isRoadAt, onLake } from './world.js';

const rng = makeRng(777);

export function createPlayer(world) {
  return {
    x: world.spawn.x, y: world.spawn.y, angle: -Math.PI / 2, r: CFG.PLAYER_R,
    hp: 100, cash: 150, inCar: null, speed: 0, punchCd: 0, punchAnim: 0,
    hurtCd: 0, dead: false, respawnT: 0,
  };
}

export function makeCar(x, y, angle, opts) {
  return {
    x, y, angle, speed: 0, color: pick(rng, CAR_COLORS),
    w: 46, h: 22, kind: (opts && opts.kind) || 'traffic',
    dir: (opts && opts.dir) || 0,        // traffic heading: 0=E 1=S 2=W 3=N
    cruise: 90 + rng() * 90,             // traffic cruise speed
    brakeT: 0, stuckT: 0, siren: false, hp: 100,
    parked: !!(opts && opts.parked),
  };
}

// Parked cars along the roads plus a few traffic cars to start the city moving.
export function seedCars(world) {
  const cars = [];
  for (const c of world.centers) {
    for (let p = 200; p < CFG.WORLD; p += 450) {
      if (rng() < 0.5) {
        const horizontal = rng() < 0.5;
        const x = horizontal ? p : c + CFG.ROAD_W / 2 - 16;
        const y = horizontal ? c + CFG.ROAD_W / 2 - 16 : p;
        if (onLake(world, x, y)) continue;
        cars.push(makeCar(x, y, horizontal ? 0 : Math.PI / 2, { kind: 'parked', parked: true }));
      }
    }
  }
  for (let i = 0; i < 16; i++) {
    const c = pick(rng, world.centers);
    const along = 150 + rng() * (CFG.WORLD - 300);
    const horizontal = rng() < 0.5;
    const dir = Math.floor(rng() * 4);
    const x = horizontal ? along : c + (dir === 0 ? 14 : -14);
    const y = horizontal ? c + (dir === 1 ? 14 : -14) : along;
    cars.push(makeCar(x, y, [0, Math.PI / 2, Math.PI, -Math.PI / 2][dir], { kind: 'traffic', dir }));
  }
  return cars;
}

export function seedPeds(world) {
  const peds = [];
  for (let i = 0; i < 42; i++) {
    const x = 150 + rng() * (CFG.WORLD - 300);
    const y = 150 + rng() * (CFG.WORLD - 300);
    if (onLake(world, x, y)) continue;
    peds.push({
      x, y, angle: rng() * Math.PI * 2, speed: 22 + rng() * 26,
      r: 10, color: pick(rng, ['#e8b93c', '#39d98a', '#ff7a1a', '#e8e8e8', '#c07dff']),
      wanderT: 1 + rng() * 3, fleeing: false, panicT: 0, hp: 30,
    });
  }
  return peds;
}

function nearestCar(cars, x, y, maxD) {
  let best = null, bestD = maxD * maxD;
  for (const c of cars) {
    const d = dist2(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// --- Player on foot -------------------------------------------------------
export function updatePlayerOnFoot(state, dt, input) {
  const p = state.player;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.punchAnim = Math.max(0, p.punchAnim - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);
  let mx = 0, my = 0;
  if (input.down('w', 'ArrowUp')) my -= 1;
  if (input.down('s', 'ArrowDown')) my += 1;
  if (input.down('a', 'ArrowLeft')) mx -= 1;
  if (input.down('d', 'ArrowRight')) mx += 1;
  const moving = mx !== 0 || my !== 0;
  const speed = input.down('Shift') ? CFG.RUN_SPEED : CFG.WALK_SPEED;
  if (moving) {
    const len = Math.hypot(mx, my);
    p.angle = Math.atan2(my / len, mx / len);
    const pos = collideWorld(state.world, p.x + (mx / len) * speed * dt, p.y + (my / len) * speed * dt, p.r);
    p.x = pos.x; p.y = pos.y;
  }
  // Punch: hurts peds and cops in front of the player.
  if (input.hit('f') && p.punchCd <= 0) {
    p.punchCd = 0.45; p.punchAnim = 0.22;
    state.sfx.punch();
    const px = p.x + Math.cos(p.angle) * 30, py = p.y + Math.sin(p.angle) * 30;
    for (const ped of state.peds) {
      if (dist2(px, py, ped.x, ped.y) < 34 * 34) {
        ped.hp -= 20; ped.fleeing = true; ped.panicT = 3;
        addWanted(state, 1, 'assault');
        state.addFloat('+assault', ped.x, ped.y, '#ff5b5b');
      }
    }
    for (const cop of state.cops) {
      if (dist2(px, py, cop.x, cop.y) < 36 * 36) {
        cop.hp -= 25;
        addWanted(state, 1, 'attacked police');
        state.addFloat('HIT', cop.x, cop.y, '#ffd23c');
      }
    }
  }
  // Enter a nearby car (E): stealing a parked or traffic car raises wanted.
  if (input.hit('e')) {
    const car = nearestCar(state.cars, p.x, p.y, 56);
    if (car) {
      state.cars.splice(state.cars.indexOf(car), 1);
      p.inCar = car;
      car.kind = 'player';
      state.sfx.engineStart();
      if (car.parked) { addWanted(state, 1, 'car theft'); state.toast('Car stolen — the law is coming'); }
      else state.toast('You jacked a moving car!');
    }
  }
}

// --- Driving --------------------------------------------------------------
export function updateDriving(state, dt, input) {
  const p = state.player, car = p.inCar;
  const grip = 1 - state.storm * 0.35; // blizzard makes the snow slick
  if (input.down('w', 'ArrowUp')) car.speed += CFG.CAR_ACCEL * grip * dt;
  if (input.down('s', 'ArrowDown')) car.speed -= (car.speed > 0 ? CFG.CAR_BRAKE : CFG.CAR_ACCEL * 0.6) * dt;
  if (!input.down('w', 'ArrowUp') && !input.down('s', 'ArrowDown')) car.speed *= Math.pow(0.4, dt);
  car.speed = clamp(car.speed, -180, CFG.CAR_MAX_SPEED);
  const steer = (input.down('a', 'ArrowLeft') ? -1 : 0) + (input.down('d', 'ArrowRight') ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 8) {
    car.angle += steer * (car.speed > 0 ? 1 : -1) * 2.1 * grip * dt * clamp(Math.abs(car.speed) / 120, 0.35, 1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const pos = collideWorld(state.world, nx, ny, 20);
  if (pos.x !== nx || pos.y !== ny) {
    if (Math.abs(car.speed) > 120) { state.sfx.crash(); state.shake = 6; addWanted(state, 0, ''); }
    car.speed *= 0.45;
  }
  car.x = pos.x; car.y = pos.y;
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  // Running over a pedestrian is a crime.
  for (const ped of state.peds) {
    if (Math.abs(car.speed) > 60 && dist2(car.x, car.y, ped.x, ped.y) < 30 * 30) {
      ped.hp = 0; ped.fleeing = true;
      addWanted(state, 1, 'hit a pedestrian');
      state.sfx.crash();
      state.addFloat('HIT & RUN', ped.x, ped.y, '#ff5b5b');
    }
  }
  state.sfx.engine(Math.abs(car.speed) / CFG.CAR_MAX_SPEED, true);
  // Exit the car (E).
  if (input.hit('e')) {
    const side = { x: car.x + Math.cos(car.angle + Math.PI / 2) * 34, y: car.y + Math.sin(car.angle + Math.PI / 2) * 34 };
    const pos2 = collideWorld(state.world, side.x, side.y, p.r);
    p.x = pos2.x; p.y = pos2.y;
    car.speed = 0; car.kind = 'parked'; car.parked = true;
    state.cars.push(car);
    p.inCar = null;
    state.sfx.engineStop();
  }
}

// --- Traffic --------------------------------------------------------------
export function updateTraffic(state, dt) {
  const p = state.player;
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    // Slow down for the car ahead on the same road.
    let blocked = false;
    for (const other of state.cars) {
      if (other === car || other.kind === 'parked') continue;
      const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
      const side = Math.abs((other.x - car.x) * Math.sin(car.angle) - (other.y - car.y) * Math.cos(car.angle));
      if (ahead > 0 && ahead < 70 && side < 26) { blocked = true; break; }
    }
    // And for the player standing in the road.
    if (!p.inCar && dist2(car.x, car.y, p.x, p.y) < 70 * 70) {
      const ahead = (p.x - car.x) * Math.cos(car.angle) + (p.y - car.y) * Math.sin(car.angle);
      if (ahead > 0 && ahead < 70) blocked = true;
    }
    const target = blocked ? 0 : car.cruise;
    car.speed += clamp(target - car.speed, -260 * dt, 160 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // At an intersection, sometimes turn; at the city edge, turn around.
    const onCross = isRoadAt(car.x, car.y) && Math.abs(((car.x % CFG.ROAD_GAP) + CFG.ROAD_GAP) % CFG.ROAD_GAP - CFG.ROAD_GAP / 2) < 4;
    if (onCross && rng() < 0.02) {
      const turn = pick(rng, [-Math.PI / 2, Math.PI / 2]);
      car.angle += turn;
      car.dir = (car.dir + (turn > 0 ? 1 : 3)) % 4;
    }
    if (car.x < 60 || car.x > CFG.WORLD - 60 || car.y < 60 || car.y > CFG.WORLD - 60) {
      car.angle += Math.PI;
      car.x = clamp(car.x, 80, CFG.WORLD - 80);
      car.y = clamp(car.y, 80, CFG.WORLD - 80);
    }
  }
  // Keep the streets busy: top traffic back up to 16 cars.
  const traffic = state.cars.filter((c) => c.kind === 'traffic').length;
  if (traffic < 16 && rng() < dt * 0.5) {
    const c = pick(rng, state.world.centers);
    const along = 150 + rng() * (CFG.WORLD - 300);
    const horizontal = rng() < 0.5;
    const dir = Math.floor(rng() * 4);
    state.cars.push(makeCar(
      horizontal ? along : c + (dir === 0 ? 14 : -14),
      horizontal ? c + (dir === 1 ? 14 : -14) : along,
      [0, Math.PI / 2, Math.PI, -Math.PI / 2][dir],
      { kind: 'traffic', dir },
    ));
  }
}

// --- Pedestrians ----------------------------------------------------------
export function updatePeds(state, dt) {
  const p = state.player;
  for (const ped of state.peds) {
    if (ped.hp <= 0) continue;
    ped.wanderT -= dt;
    if (ped.panicT > 0) ped.panicT -= dt;
    const threat = dist2(ped.x, ped.y, p.x, p.y) < 160 * 160 && (state.wanted > 0 || ped.fleeing);
    let sp = ped.speed;
    if (ped.panicT > 0 || threat) {
      sp = ped.speed * 3.2;
      const away = angleTo(p.x, p.y, ped.x, ped.y);
      ped.angle += angleDiff(ped.angle, away) * 6 * dt;
    } else if (ped.wanderT <= 0) {
      ped.wanderT = 2 + rng() * 4;
      ped.angle = rng() * Math.PI * 2;
    }
    const nx = ped.x + Math.cos(ped.angle) * sp * dt;
    const ny = ped.y + Math.sin(ped.angle) * sp * dt;
    const pos = collideWorld(state.world, nx, ny, ped.r);
    ped.x = pos.x; ped.y = pos.y;
  }
  state.peds = state.peds.filter((ped) => ped.hp > 0 || ped.panicT > 0);
  if (state.peds.length < 30 && rng() < dt * 0.4) {
    const x = clamp(p.x + (rng() - 0.5) * 1200, 100, CFG.WORLD - 100);
    const y = clamp(p.y + (rng() - 0.5) * 1200, 100, CFG.WORLD - 100);
    if (!onLake(state.world, x, y)) state.peds.push({ x, y, angle: rng() * Math.PI * 2, speed: 22 + rng() * 26, r: 10, color: pick(rng, ['#e8b93c', '#39d98a', '#ff7a1a']), wanderT: 2, fleeing: false, panicT: 0, hp: 30 });
  }
}

// --- Police ---------------------------------------------------------------
export function spawnPoliceCar(state) {
  const p = state.player;
  const a = rng() * Math.PI * 2;
  const x = clamp(p.x + Math.cos(a) * 700, 100, CFG.WORLD - 100);
  const y = clamp(p.y + Math.sin(a) * 700, 100, CFG.WORLD - 100);
  const car = makeCar(x, y, angleTo(x, y, p.x, p.y), { kind: 'police' });
  car.color = '#1b2a4a'; car.siren = true;
  state.cars.push(car);
  return car;
}

export function spawnCop(state) {
  const p = state.player;
  const a = rng() * Math.PI * 2;
  const cop = {
    x: clamp(p.x + Math.cos(a) * 320, 80, CFG.WORLD - 80),
    y: clamp(p.y + Math.sin(a) * 320, 80, CFG.WORLD - 80),
    angle: 0, r: 12, speed: 200, hp: 60, punchCd: 0, kind: 'cop',
  };
  state.cops.push(cop);
}

export function updatePolice(state, dt) {
  const p = state.player;
  const want = state.wanted;
  // Police cars: one per wanted star, capped at 4.
  const wantCars = Math.min(4, want);
  const haveCars = state.cars.filter((c) => c.kind === 'police').length;
  if (haveCars < wantCars && rng() < dt * 0.8) spawnPoliceCar(state);
  // Foot cops when the player is on foot and wanted.
  if (!p.inCar && want > 0 && state.cops.length < Math.min(3, want) && rng() < dt * 0.5) spawnCop(state);
  state.sfx.siren(want > 0);

  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    const target = p.inCar ? p.inCar : p;
    const desired = angleTo(car.x, car.y, target.x, target.y);
    car.angle += clamp(angleDiff(car.angle, desired), -2.6 * dt, 2.6 * dt);
    const d = Math.sqrt(dist2(car.x, car.y, target.x, target.y));
    const chase = d > 46 ? CFG.POLICE_MAX : 160;
    car.speed += clamp(chase - car.speed, -500 * dt, 380 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const pos = collideWorld(state.world, nx, ny, 20);
    if (pos.x !== nx || pos.y !== ny) car.speed *= 0.5;
    car.x = pos.x; car.y = pos.y;
    // Ram the player: damage on foot, or slow the getaway car (a nudge, not a pin).
    if (d < 44) {
      if (p.inCar) {
        if (rng() < dt * 2.5) { p.inCar.speed *= 0.82; state.sfx.crash(); state.shake = 5; }
        // Shove the player's car sideways so the cop cannot glue itself to it.
        const push = angleTo(car.x, car.y, p.inCar.x, p.inCar.y);
        const shoved = collideWorld(state.world, p.inCar.x + Math.cos(push) * 200 * dt, p.inCar.y + Math.sin(push) * 200 * dt, 20);
        p.inCar.x = shoved.x; p.inCar.y = shoved.y;
      } else if (p.hurtCd <= 0) {
        hurtPlayer(state, 12);
        state.addFloat('-12 HP', p.x, p.y, '#ff5b5b');
      }
    }
  }
  for (const cop of state.cops) {
    cop.punchCd = Math.max(0, cop.punchCd - dt);
    const d = Math.sqrt(dist2(cop.x, cop.y, p.x, p.y));
    if (p.inCar || p.dead) { cop.hp = 0; continue; } // cops give up when you drive off
    cop.angle = angleTo(cop.x, cop.y, p.x, p.y);
    if (d > 26) {
      const pos = collideWorld(state.world, cop.x + Math.cos(cop.angle) * cop.speed * dt, cop.y + Math.sin(cop.angle) * cop.speed * dt, cop.r);
      cop.x = pos.x; cop.y = pos.y;
    } else if (cop.punchCd <= 0 && p.hurtCd <= 0) {
      cop.punchCd = 0.9;
      hurtPlayer(state, 10);
      state.addFloat('-10 HP', p.x, p.y, '#ff5b5b');
    }
  }
  state.cops = state.cops.filter((c) => c.hp > 0);
  // Busted: on foot, surrounded, low health — the cops take you in.
  if (!p.inCar && p.hp <= 25 && want >= 3 && state.cops.length >= 2) {
    bustPlayer(state);
  }
}

export function hurtPlayer(state, dmg) {
  const p = state.player;
  if (p.dead || p.hurtCd > 0) return;
  p.hp -= dmg;
  p.hurtCd = 0.8;
  state.shake = 8;
  state.sfx.crash();
  if (p.hp <= 0) {
    p.dead = true;
    p.respawnT = 2.2;
    state.sfx.busted();
    state.toast('WASTED — the Whiteout Crew drags you to the clinic');
  }
}

export function bustPlayer(state) {
  const p = state.player;
  if (p.dead) return;
  p.dead = true;
  p.respawnT = 2.2;
  const fine = Math.min(p.cash, 200);
  p.cash -= fine;
  state.wanted = 0;
  state.sfx.busted();
  state.toast(`BUSTED — fined $${fine}, the crew bails you out`);
}

export function respawnPlayer(state) {
  const p = state.player;
  p.dead = false;
  p.hp = 100;
  p.x = state.world.hospital.x; p.y = state.world.hospital.y;
  p.inCar = null;
  state.sfx.engineStop();
  state.cops = [];
  state.cars = state.cars.filter((c) => c.kind !== 'police');
  state.wanted = 0;
}

// --- Wanted level ---------------------------------------------------------
export function addWanted(state, stars, why) {
  if (stars <= 0) return;
  const before = state.wanted;
  state.wanted = clamp(state.wanted + stars, 0, 5);
  state.wantedT = 0;
  if (state.wanted > before && why) state.toast(`Wanted level ${state.wanted} — ${why}`);
}

export function updateWanted(state, dt) {
  if (state.wanted === 0) return;
  // Hiding on the frozen lake (out of sight) cools you off twice as fast.
  const hidden = onLake(state.world, state.player.x, state.player.y);
  state.wantedT += dt * (hidden ? 2.2 : 1);
  if (state.wantedT >= CFG.WANTED_DECAY_S) {
    state.wantedT = 0;
    state.wanted -= 1;
    if (state.wanted === 0) state.toast('You lost them — wanted level clear');
  }
}
