// FROSTLINE — main: the game loop, screens, wanted heat, saves and demo scenes.
// This file wires config + world + entities + missions + audio + input + render
// into one playable game. No network, no libraries: plain canvas + WebAudio.
// Note: the storm's grip and police sight both scale with game.blizzard.

(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var errors = [];
  window.addEventListener('error', function (e) { errors.push(String(e.message || e.error)); });
  window.addEventListener('unhandledrejection', function (e) { errors.push('rejection: ' + String(e.reason)); });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  var game = {
    screen: 'menu', // menu | playing | paused | busted
    player: makePlayer(SPAWN.x, SPAWN.y),
    traffic: [],
    peds: [],
    policeCars: [],
    policeFoot: [],
    missions: makeMissionState(),
    blizzard: 0.3,
    time: 0,
    cam: { x: 0, y: 0, w: 1280, h: 800 },
    nearCar: false,
    bustedReason: '',
    saveTimer: 0,
    decayTimer: 0,
    hasSave: false,
    menuButtons: null
  };

  // ---- save / load ---------------------------------------------------------

  function saveGame() {
    try {
      var p = game.player;
      var data = {
        mission: game.missions.index, done: game.missions.done,
        money: p.money, hp: p.hp, wanted: p.wanted,
        x: p.x, y: p.y, carColor: p.inCar ? p.inCar.color : null,
        time: game.time
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      game.hasSave = true;
    } catch (e) { /* private mode: play on without saving */ }
  }
  game.save = saveGame;

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (typeof d.mission !== 'number') return false;
      game.missions.index = clamp(d.mission, 0, MISSIONS.length);
      game.missions.done = !!d.done;
      game.missions.heatSet = game.missions.index > 3;
      game.missions.packageTaken = game.missions.index > 2;
      var p = game.player;
      p.money = d.money || 0; p.hp = d.hp || 100; p.wanted = d.wanted || 0;
      p.x = d.x || SPAWN.x; p.y = d.y || SPAWN.y;
      if (d.carColor) {
        var car = makeCar(p.x + 30, p.y, 0, d.carColor, 'player');
        car.topSpeed = CAR_TOP_SPEED;
        p.inCar = car;
      }
      game.time = d.time || 0;
      return true;
    } catch (e) { return false; }
  }

  try { game.hasSave = !!localStorage.getItem(SAVE_KEY); } catch (e) { game.hasSave = false; }

  // ---- setup ----------------------------------------------------------------

  function newGame() {
    World.buildCity();
    game.player = makePlayer(SPAWN.x, SPAWN.y);
    game.traffic = spawnTraffic(14);
    game.peds = spawnPedestrians(20);
    game.policeCars = [];
    game.policeFoot = [];
    game.missions = makeMissionState();
    game.blizzard = 0.3;
    game.time = 0;
    game.decayTimer = 0;
    game.screen = 'playing';
    showToast(game.missions, 'Mara Kessler — Whiteout Crew. Meet Jax at the Neon Lodge.');
    AudioSys.resume();
  }

  // Demo scenes for screenshots: real game states, set up in code, no mocks.
  function applyDemo(name) {
    newGame();
    if (name === 'foot') {
      game.player.x = SPAWN.x; game.player.y = SPAWN.y; // south of the lodge: mission 1 stays open
      game.blizzard = 0.25;
      for (var i = 0; i < 4; i++) {
        game.peds[i].x = SPAWN.x + (i - 2) * 55;
        game.peds[i].y = SPAWN.y + 60;
      }
    } else if (name === 'chase') {
      game.missions.index = 4;
      game.missions.heatSet = true;
      var car = makeCar(1600, 1500, -Math.PI / 2, '#d94f4f', 'player');
      car.topSpeed = CAR_TOP_SPEED; car.speed = 300;
      game.player.inCar = car;
      game.player.x = car.x; game.player.y = car.y; game.player.a = car.a;
      game.player.wanted = 3;
      game.blizzard = 0.75;
      for (var j = 0; j < 3; j++) {
        var pc = spawnPoliceCar(game.player);
        pc.x = 1600 + (j - 1) * 70; pc.y = 1500 + 130 + j * 60;
        game.policeCars.push(pc);
      }
      showToast(game.missions, 'WHITEOUT GETAWAY — reach the mountain pass!');
    } else if (name === 'lake') {
      game.missions.index = 2;
      var car2 = makeCar(LAKE.x - 260, LAKE.y + 60, 0.3, '#37e0ff', 'player');
      car2.topSpeed = CAR_TOP_SPEED; car2.speed = 120;
      game.player.inCar = car2;
      game.player.x = car2.x; game.player.y = car2.y; game.player.a = car2.a;
      game.player.wanted = 1;
      game.blizzard = 0.6;
      var pc2 = spawnPoliceCar(game.player);
      pc2.x = LAKE.x - 700; pc2.y = LAKE.y - 260;
      game.policeCars.push(pc2);
      showToast(game.missions, 'The package is out on the ice — grab it!');
    }
    // 'start' leaves the menu up.
  }

  // ---- wanted / police ------------------------------------------------------

  function nearestPoliceDist() {
    var p = game.player, best = 1e9;
    for (var i = 0; i < game.policeCars.length; i++) {
      best = Math.min(best, dist(p.x, p.y, game.policeCars[i].x, game.policeCars[i].y));
    }
    for (var j = 0; j < game.policeFoot.length; j++) {
      best = Math.min(best, dist(p.x, p.y, game.policeFoot[j].x, game.policeFoot[j].y));
    }
    return best;
  }

  function maintainPolice(dt) {
    var p = game.player;
    // Police cars: one per wanted star, up to four.
    var wantCars = p.wanted > 0 ? Math.min(p.wanted, 4) : 0;
    while (game.policeCars.length < wantCars) game.policeCars.push(spawnPoliceCar(p));
    if (p.wanted === 0) {
      // Heat gone: the cruisers peel off once they are far away.
      game.policeCars = game.policeCars.filter(function (c) {
        return dist(p.x, p.y, c.x, c.y) < 1000;
      });
      if (game.policeCars.length > 0 && game.time % 1 < dt) game.policeCars.shift();
    }
    // Foot cops only hunt Mara when she is on foot.
    var wantFoot = (!p.inCar && p.wanted > 0) ? Math.min(p.wanted, 2) : 0;
    while (game.policeFoot.length < wantFoot) game.policeFoot.push(spawnPoliceFoot(p));
    if (wantFoot === 0) game.policeFoot = [];
  }

  function updateWanted(dt) {
    var p = game.player;
    if (p.wanted <= 0) { game.decayTimer = 0; return; }
    var onLake = World.onLake(p.x, p.y);
    // On the frozen lake the law loses your trail: cops must get very close
    // to spot you. In a whiteout their sight shrinks too.
    var detectR = onLake ? 200 : 550 * (1 - 0.45 * game.blizzard);
    var seen = nearestPoliceDist() < detectR;
    if (seen) { game.decayTimer = 0; return; }
    game.decayTimer += dt;
    var need = onLake ? WANTED_LAKE_DECAY_SECONDS : WANTED_DECAY_SECONDS;
    if (game.decayTimer >= need) {
      p.wanted--;
      game.decayTimer = 0;
      if (p.wanted === 0) showToast(game.missions, 'Clean. The heat is off — for now.');
    }
  }

  function addWanted(n) {
    var p = game.player;
    p.wanted = clamp(p.wanted + n, 0, WANTED_MAX);
  }

  // ---- collisions -----------------------------------------------------------

  function updateCollisions(dt) {
    var p = game.player;
    // Player car vs traffic: bump and slow.
    if (p.inCar) {
      for (var i = 0; i < game.traffic.length; i++) {
        var t = game.traffic[i];
        var d = dist(p.inCar.x, p.inCar.y, t.x, t.y);
        if (d < 44 && d > 0.01) {
          var push = (44 - d) / 2;
          var nx = (p.inCar.x - t.x) / d, ny = (p.inCar.y - t.y) / d;
          p.inCar.x += nx * push; p.inCar.y += ny * push;
          t.x -= nx * push; t.y -= ny * push;
          if (Math.abs(p.inCar.speed) > 200) { AudioSys.crash(0.5); addWanted(0); }
          p.inCar.speed *= 0.85;
        }
      }
      // Player car vs pedestrian: bad news for the pedestrian, and for Mara's record.
      for (var j = 0; j < game.peds.length; j++) {
        var ped = game.peds[j];
        if (ped.state === 'down') continue;
        if (dist(p.inCar.x, p.inCar.y, ped.x, ped.y) < 34 && Math.abs(p.inCar.speed) > 70) {
          ped.state = 'down'; ped.downTimer = 5;
          p.inCar.speed *= 0.55;
          addWanted(1);
          AudioSys.crash(0.7);
          showToast(game.missions, 'You hit a pedestrian! Wanted up.');
        }
      }
    }
    // Police rams.
    for (var k = 0; k < game.policeCars.length; k++) {
      var pc = game.policeCars[k];
      var target = p.inCar ? p.inCar : p;
      if (dist(pc.x, pc.y, target.x, target.y) < 46 && pc.ramCooldown <= 0) {
        pc.ramCooldown = 1.4;
        p.hp -= 6;
        p.hurtTimer = 0.6;
        AudioSys.crash(0.8);
        if (p.inCar) p.inCar.speed *= 0.6;
        if (p.hp <= 0) { bust('WASTED'); return; }
      }
    }
    // Busted: a foot cop holds Mara on foot.
    if (!p.inCar && p.wanted > 0) {
      var held = false;
      for (var m = 0; m < game.policeFoot.length; m++) {
        if (!game.policeFoot[m].down && dist(p.x, p.y, game.policeFoot[m].x, game.policeFoot[m].y) < 30) held = true;
      }
      if (held) {
        p.bustedTimer += dt;
        if (p.bustedTimer > 1.5) { bust('BUSTED'); return; }
      } else {
        p.bustedTimer = Math.max(0, p.bustedTimer - dt * 2);
      }
    }
  }

  function bust(reason) {
    var p = game.player;
    game.bustedReason = reason;
    game.screen = 'busted';
    p.money = Math.floor(p.money * 0.9);
    AudioSys.busted();
    saveGame();
  }

  function respawn() {
    var p = game.player;
    p.hp = 100; p.wanted = 0; p.bustedTimer = 0;
    p.x = SPAWN.x; p.y = SPAWN.y; p.a = -Math.PI / 2;
    p.inCar = null; p.speed = 0;
    game.policeCars = []; game.policeFoot = [];
    game.screen = 'playing';
    showToast(game.missions, reason2text());
    function reason2text() {
      return game.bustedReason === 'BUSTED'
        ? 'The cops let you go at the lodge. Lay low, Mara.'
        : 'Patched up at the lodge. The crew still needs you.';
    }
  }

  // ---- per-frame update -----------------------------------------------------

  function update(dt) {
    game.time += dt;
    // The storm breathes: slow swells plus a faster chop.
    var b = 0.52 + 0.33 * Math.sin(game.time * 0.045) + 0.15 * Math.sin(game.time * 0.013 + 2.1);
    game.blizzard = clamp(b, BLIZZARD_MIN, BLIZZARD_MAX);
    var p = game.player;
    var input = Input.state();

    if (p.punchTimer > 0) p.punchTimer -= dt;
    if (p.punchAnim > 0) p.punchAnim -= dt;
    if (p.hurtTimer > 0) p.hurtTimer -= dt;
    if (game.missions.bannerTimer > 0) game.missions.bannerTimer -= dt;
    if (game.missions.toastTimer > 0) game.missions.toastTimer -= dt;

    // Mute toggle.
    if (Input.wasPressed('mute')) AudioSys.setMuted(!AudioSys.isMuted());

    // Steal / exit car.
    if (Input.wasPressed('action')) {
      if (p.inCar) {
        var old = p.inCar;
        p.x = old.x + Math.cos(old.a + Math.PI / 2) * 34;
        p.y = old.y + Math.sin(old.a + Math.PI / 2) * 34;
        p.inCar = null;
        World.parkedCars().push({ x: old.x, y: old.y, a: old.a, color: old.color, taken: false });
        AudioSys.click();
      } else {
        var stolen = tryStealCar(p, World.parkedCars(), game.traffic);
        if (stolen) {
          p.inCar = stolen;
          p.x = stolen.x; p.y = stolen.y; p.a = stolen.a;
          addWanted(1);
          AudioSys.steal();
          showToast(game.missions, 'Car stolen — wanted level up. Drive!');
        }
      }
    }

    // Punch on foot.
    if (Input.wasPressed('punch') && !p.inCar) {
      var hit = playerPunch(p, game.peds, game.policeFoot);
      if (hit && hit.type === 'ped') { addWanted(1); showToast(game.missions, 'That pedestrian will talk. Wanted up.'); }
      if (hit && hit.type === 'cop') { addWanted(1); }
    }

    if (p.inCar) playerDrive(p, dt, input, game.blizzard);
    else playerWalk(p, dt, input);

    // Traffic, pedestrians, police.
    for (var i = 0; i < game.traffic.length; i++) updateTraffic(game.traffic[i], dt, game.traffic.concat(game.policeCars));
    for (var j = 0; j < game.peds.length; j++) updatePedestrian(game.peds[j], dt, p, game.traffic);
    maintainPolice(dt);
    for (var k = 0; k < game.policeCars.length; k++) {
      var pc = game.policeCars[k];
      // Cops hate the ice: they crawl on the lake and stop at its edge.
      var saved = pc.topSpeed;
      if (World.onLake(p.x, p.y)) pc.topSpeed = POLICE_CAR_SPEED * 0.45;
      updatePoliceCar(pc, dt, p, game.blizzard);
      pc.topSpeed = saved;
    }
    for (var m = 0; m < game.policeFoot.length; m++) {
      var cop = game.policeFoot[m];
      if (!World.onLake(cop.x, cop.y) || dist(cop.x, cop.y, p.x, p.y) < 60) updatePoliceFoot(cop, dt, p);
    }

    updateWanted(dt);
    updateCollisions(dt);
    if (game.screen !== 'playing') return;

    // Cash pickups.
    var cps = World.cashPickups();
    for (var c = 0; c < cps.length; c++) {
      if (!cps[c].taken && dist(p.x, p.y, cps[c].x, cps[c].y) < 30) {
        cps[c].taken = true;
        p.money += cps[c].value;
        AudioSys.pickup();
        showToast(game.missions, '+' + fmtMoney(cps[c].value) + ' found on the street.');
      }
    }

    // Near a stealable car? (drives the E prompt)
    game.nearCar = false;
    if (!p.inCar) {
      var parked = World.parkedCars();
      for (var q = 0; q < parked.length; q++) {
        if (!parked[q].taken && dist(p.x, p.y, parked[q].x, parked[q].y) < 78) { game.nearCar = true; break; }
      }
      if (!game.nearCar) {
        for (var r = 0; r < game.traffic.length; r++) {
          if (game.traffic[r].kind !== 'police' && Math.abs(game.traffic[r].speed) < 60 &&
              dist(p.x, p.y, game.traffic[r].x, game.traffic[r].y) < 70) { game.nearCar = true; break; }
        }
      }
    }

    updateMissions(game.missions, game, dt);

    // Camera follows Mara, clamped to the city.
    game.cam.w = canvas.width; game.cam.h = canvas.height;
    game.cam.x = clamp(p.x - game.cam.w / 2, 0, Math.max(0, WORLD_W - game.cam.w));
    game.cam.y = clamp(p.y - game.cam.h / 2, 0, Math.max(0, WORLD_H - game.cam.h));

    // Engine + wind + siren follow the game.
    AudioSys.update(p.inCar ? Math.abs(p.speed) / CAR_TOP_SPEED : 0, game.blizzard, p.wanted);

    // Autosave.
    game.saveTimer += dt;
    if (game.saveTimer > 20) { game.saveTimer = 0; saveGame(); }
  }

  // ---- per-frame draw -------------------------------------------------------

  function draw() {
    var w = canvas.width, h = canvas.height;
    if (game.screen === 'menu') {
      game.menuButtons = Render.drawMenu(ctx, game, w, h, game.hasSave);
      Render.drawSnow(ctx, { x: 0, y: 0, w: w, h: h }, 0.4, 0.016, game.time);
      return;
    }
    var cam = game.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    Render.drawWorld(ctx, cam, game, game.time);
    // Parked cars.
    var parked = World.parkedCars();
    for (var i = 0; i < parked.length; i++) {
      if (!parked[i].taken) Render.drawCar(ctx, parked[i].x, parked[i].y, parked[i].a, parked[i].color, 'parked', false, game.time);
    }
    // Traffic + police cars.
    for (var j = 0; j < game.traffic.length; j++) {
      var t = game.traffic[j];
      Render.drawCar(ctx, t.x, t.y, t.a, t.color, t.kind, false, game.time);
    }
    for (var k = 0; k < game.policeCars.length; k++) {
      var pc = game.policeCars[k];
      Render.drawCar(ctx, pc.x, pc.y, pc.a, pc.color, 'police', true, game.time);
    }
    // Pedestrians + foot cops.
    for (var m = 0; m < game.peds.length; m++) {
      var ped = game.peds[m];
      Render.drawPerson(ctx, ped.x, ped.y, ped.a, ped.coat, ped.state === 'down', false, 0);
    }
    for (var n = 0; n < game.policeFoot.length; n++) {
      var cop = game.policeFoot[n];
      Render.drawPerson(ctx, cop.x, cop.y, cop.a, '#1c2f6e', cop.down, false, 0);
    }
    // Mara.
    var p = game.player;
    if (!p.inCar) {
      Render.drawPerson(ctx, p.x, p.y, p.a, '#c23b5e', false, true, p.punchAnim);
    } else {
      Render.drawCar(ctx, p.inCar.x, p.inCar.y, p.inCar.a, p.inCar.color, 'player', false, game.time);
    }
    // Mission marker.
    var target = missionTarget(game.missions);
    if (target) Render.drawMarker(ctx, target.x, target.y, target.label, game.time);
    ctx.restore();
    // Storm over everything, then the HUD on top.
    Render.drawSnow(ctx, { x: 0, y: 0, w: w, h: h }, game.blizzard, 0.016, game.time);
    Render.drawHud(ctx, game, w, h);
    if (game.screen === 'paused') Render.drawPaused(ctx, game, w, h);
    if (game.screen === 'busted') Render.drawBusted(ctx, w, h, game.bustedReason);
    // Hurt flash.
    if (p.hurtTimer > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (p.hurtTimer * 0.35).toFixed(2) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ---- menu / pause input ---------------------------------------------------

  function handleMenuInput() {
    var btns = game.menuButtons;
    if (!btns) return;
    var m = Input.mouse;
    // Hit-test against where the click landed, not where the mouse last moved.
    var cx = m.clickX, cy = m.clickY;
    var overNew = cx >= btns.newGame.x && cx <= btns.newGame.x + btns.newGame.w &&
      cy >= btns.newGame.y && cy <= btns.newGame.y + btns.newGame.h;
    var overContinue = btns.continueGame && cx >= btns.continueGame.x && cx <= btns.continueGame.x + btns.continueGame.w &&
      cy >= btns.continueGame.y && cy <= btns.continueGame.y + btns.continueGame.h;
    if (Input.wasPressed('confirm') || (m.clicked && overNew)) {
      AudioSys.click();
      newGame();
    } else if (m.clicked && overContinue) {
      AudioSys.click();
      newGame();
      loadSave();
      game.screen = 'playing';
      showToast(game.missions, 'Welcome back, Mara. ' + missionTitle(game.missions));
    }
  }

  // ---- main loop ------------------------------------------------------------

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.screen === 'menu') {
      game.time += dt;
      handleMenuInput();
    } else if (game.screen === 'playing') {
      if (Input.wasPressed('pause')) {
        game.screen = 'paused';
        saveGame();
        AudioSys.click();
      } else {
        update(dt);
      }
    } else if (game.screen === 'paused') {
      if (Input.wasPressed('pause') || Input.wasPressed('confirm')) {
        game.screen = 'playing';
        AudioSys.click();
      }
    } else if (game.screen === 'busted') {
      if (Input.wasPressed('confirm')) respawn();
    }
    draw();
    Input.endFrame();
    requestAnimationFrame(frame);
  }

  // ---- boot -----------------------------------------------------------------

  Input.attach(canvas);
  World.buildCity();
  game.traffic = spawnTraffic(14);
  game.peds = spawnPedestrians(20);
  game.missions = makeMissionState();

  var params = new URLSearchParams(window.location.search);
  var demo = params.get('demo');
  if (demo && demo !== 'start') applyDemo(demo);
  else game.screen = 'menu';

  requestAnimationFrame(frame);

  // Test hooks: the automated checks drive the game through these.
  window.__frostline = {
    game: game,
    errors: errors,
    state: function () {
      var p = game.player;
      return {
        screen: game.screen, mission: game.missions.index, missionDone: game.missions.done,
        wanted: p.wanted, money: p.money, hp: p.hp,
        x: Math.round(p.x), y: Math.round(p.y), inCar: !!p.inCar,
        blizzard: +game.blizzard.toFixed(2),
        traffic: game.traffic.length, peds: game.peds.length,
        policeCars: game.policeCars.length, policeFoot: game.policeFoot.length,
        errors: errors.slice()
      };
    },
    newGame: newGame,
    setMission: function (i) { game.missions.index = i; game.missions.heatSet = i > 3; game.missions.packageTaken = i > 2; },
    setWanted: function (n) { game.player.wanted = n; },
    teleport: function (x, y) {
      game.player.x = x; game.player.y = y;
      if (game.player.inCar) { game.player.inCar.x = x; game.player.inCar.y = y; }
    },
    applyDemo: applyDemo,
    save: saveGame,
    loadSave: loadSave
  };
})();
