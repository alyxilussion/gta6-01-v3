// FROSTLINE — missions: Mara Kessler and the Whiteout Crew, five chained jobs.
// Mission 0 meet Jax — 1 steal a car — 2 the package on the lake —
// 3 lose a 3-star heat — 4 the whiteout getaway to the pass — then free roam.

var MISSIONS = [
  {
    id: 'meet-jax',
    name: '1 — Meet Jax',
    title: 'Meet Jax at the Neon Lodge',
    brief: 'Jax is waiting under the pink neon. The crew’s last job starts tonight.',
    target: function () { return { x: LODGE_DOOR.x, y: LODGE_DOOR.y, label: 'NEON LODGE' }; },
    reward: MISSION_REWARDS[0],
    hint: 'Follow the pink marker. Walk with WASD / arrows.'
  },
  {
    id: 'steal-car',
    name: '2 — Steal a Car',
    title: 'Steal a car',
    brief: 'No wheels, no job. Take any parked car — press E beside it.',
    target: function () { return { x: 1060, y: 520, label: 'PARKED CAR' }; },
    reward: MISSION_REWARDS[1],
    hint: 'Press E next to a parked car. Stealing raises your wanted level.'
  },
  {
    id: 'lake-package',
    name: '3 — The Package',
    title: 'Grab the package off the frozen lake',
    brief: 'The drop is out on the ice. Drive on — the lake is the one place the law loses your trail.',
    target: function () { return { x: LAKE.x, y: LAKE.y, label: 'PACKAGE' }; },
    reward: MISSION_REWARDS[2],
    hint: 'The package sits in the middle of the frozen lake.'
  },
  {
    id: 'lose-heat',
    name: '4 — Lose the Heat',
    title: 'Lose the 3-star wanted level',
    brief: 'The package tripped an alarm. Three stars. Break line of sight — hide out on the lake until it fades.',
    target: function () { return { x: LAKE.x, y: LAKE.y, label: 'HIDE ON THE LAKE' }; },
    reward: MISSION_REWARDS[3],
    hint: 'Wanted fades when no cop can see you — fastest on the frozen lake.'
  },
  {
    id: 'whiteout-getaway',
    name: '5 — Whiteout Getaway',
    title: 'Reach the mountain pass in the whiteout',
    brief: 'One last run through the storm. The pass is north — the crew is waiting on the other side.',
    target: function () { return { x: PASS.x, y: PASS.y, label: 'MOUNTAIN PASS' }; },
    reward: MISSION_REWARDS[4],
    hint: 'Drive north. The blizzard is at its worst — grip is low, but so is police sight.'
  }
];

function makeMissionState() {
  return {
    index: 0,                 // which mission is active (5 = free roam)
    done: false,              // all five finished
    banner: '', bannerTimer: 0,
    toast: '', toastTimer: 0,
    packageTaken: false,
    heatSet: false
  };
}

function currentMission(ms) {
  return ms.index < MISSIONS.length ? MISSIONS[ms.index] : null;
}

function missionTarget(ms) {
  var m = currentMission(ms);
  return m ? m.target() : null;
}

function missionTitle(ms) {
  var m = currentMission(ms);
  return m ? m.title : 'Free roam — Frostline is yours';
}

function showBanner(ms, text) { ms.banner = text; ms.bannerTimer = 3.2; }
function showToast(ms, text) { ms.toast = text; ms.toastTimer = 4; }

// Advance the mission state. Returns 'complete' when a mission finishes.
function updateMissions(ms, game, dt) {
  var p = game.player;
  var m = currentMission(ms);
  if (!m) return null;
  var t = m.target();
  var done = false;

  if (ms.index === 0) {
    done = dist(p.x, p.y, t.x, t.y) < 95;
  } else if (ms.index === 1) {
    done = !!p.inCar;
  } else if (ms.index === 2) {
    done = dist(p.x, p.y, t.x, t.y) < 80;
    if (done) { ms.packageTaken = true; p.wanted = Math.max(p.wanted, 1); }
  } else if (ms.index === 3) {
    if (!ms.heatSet) { p.wanted = 3; ms.heatSet = true; showToast(ms, '3 STARS — break line of sight!'); }
    done = p.wanted <= 0;
  } else if (ms.index === 4) {
    done = World.onPass(p.x, p.y) || dist(p.x, p.y, t.x, t.y) < 110;
  }

  if (done) {
    p.money += m.reward;
    AudioSys.missionComplete();
    if (ms.index === MISSIONS.length - 1) {
      ms.done = true;
      ms.index = MISSIONS.length;
      showBanner(ms, 'WHITEOUT CREW — FREE ROAM');
      showToast(ms, 'All five jobs done. Frostline is yours, Mara.');
    } else {
      ms.index++;
      var next = MISSIONS[ms.index];
      showBanner(ms, 'JOB DONE  +' + fmtMoney(m.reward));
      showToast(ms, 'Next: ' + next.title);
      AudioSys.pickup();
    }
    game.save();
    return 'complete';
  }
  return null;
}
