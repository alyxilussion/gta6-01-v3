// Frostline — the story: five chained missions for Mara Kessler, getaway driver
// of the Whiteout Crew, on the night the blizzard hits Frostline.
export const MISSIONS = [
  {
    id: 1,
    name: 'Cold Open',
    brief: 'Meet Jax at the Neon Lodge. The crew is waiting.',
    target: (w) => ({ x: w.lodge.x, y: w.lodge.y, r: 70, label: 'NEON LODGE' }),
    done: 'Jax: "Tonight we take the Aurora vault. First, wheels."',
    reward: 100,
  },
  {
    id: 2,
    name: 'Borrowed Wheels',
    brief: 'Steal a car — any car. Press E next to one. The crew needs wheels, not manners.',
    target: (w) => ({ x: w.garage.x, y: w.garage.y, r: 120, label: 'GARAGE 9' }),
    done: 'Nice. A stolen car is a fast car. Now the package.',
    reward: 150,
    needsCar: true,
  },
  {
    id: 3,
    name: 'The Frozen Drop',
    brief: 'Drive to the frozen lake and grab the package. Cops patrol the shore — stay cold.',
    target: (w) => ({ x: w.lake.x + w.lake.w / 2, y: w.lake.y + w.lake.h / 2, r: 110, label: 'FROZEN LAKE' }),
    done: 'Package secured. The vault crew is in position.',
    reward: 300,
    needsCar: true,
  },
  {
    id: 4,
    name: 'Heat Wave',
    brief: 'The alarm tripped. Lose the cops — drop your wanted level to zero, then reach the Lodge.',
    target: (w) => ({ x: w.lodge.x, y: w.lodge.y, r: 70, label: 'NEON LODGE' }),
    done: 'Clean. The heat is off us. One last run.',
    reward: 400,
    needsClean: true,
  },
  {
    id: 5,
    name: 'Whiteout Run',
    brief: 'Final getaway: drive the package through the blizzard to the mountain pass. Do not stop.',
    target: (w) => ({ x: w.pass.x + w.pass.w / 2, y: w.pass.y + w.pass.h / 2, r: 130, label: 'MOUNTAIN PASS' }),
    done: 'You made it through the whiteout. The Whiteout Crew owns Frostline tonight.',
    reward: 1000,
    needsCar: true,
    final: true,
  },
];

export function startMissions(state) {
  state.missionIdx = 0;
  state.mission = MISSIONS[0];
  state.missionDone = false;
  state.storyDone = false;
  state.toast('Mission 1 — Cold Open: meet Jax at the Neon Lodge');
  state.sfx.mission();
}

// Returns true when the mission list is finished.
export function updateMissions(state, dt) {
  if (state.storyDone || !state.mission) return true;
  const m = state.mission;
  const t = m.target(state.world);
  const p = state.player;
  // Mission 4 starts hot: the alarm trips the moment it begins.
  if (m.id === 4 && !m.armed) {
    m.armed = true;
    state.wanted = Math.max(state.wanted, 3);
    state.toast('ALARM TRIPPED — wanted level 3!');
  }
  const inTarget = Math.hypot(p.x - t.x, p.y - t.y) < t.r;
  const carOk = !m.needsCar || p.inCar;
  const cleanOk = !m.needsClean || state.wanted === 0;
  if (inTarget && carOk && cleanOk) {
    p.cash += m.reward;
    state.sfx.coin();
    state.toast(`Mission complete — ${m.name} (+$${m.reward})`);
    state.addFloat(`+$${m.reward}`, p.x, p.y - 30, '#7dff5e');
    state.missionIdx += 1;
    if (state.missionIdx >= MISSIONS.length) {
      state.mission = null;
      state.storyDone = true;
      state.sfx.mission();
      state.toast('STORY COMPLETE — Frostline is yours. Free roam!');
      return true;
    }
    state.mission = MISSIONS[state.missionIdx];
    state.sfx.mission();
    state.toast(`Mission ${state.mission.id} — ${state.mission.name}: ${state.mission.brief}`);
  }
  return false;
}

export function missionHint(state) {
  const m = state.mission;
  if (!m) return state.storyDone ? 'Free roam — Frostline is yours.' : '';
  const p = state.player;
  if (m.needsCar && !p.inCar) return `${m.brief} (you need a car — press E near one)`;
  if (m.needsClean && state.wanted > 0) return `${m.brief} (wanted ${state.wanted}★ — hide on the frozen lake to cool off)`;
  return m.brief;
}
