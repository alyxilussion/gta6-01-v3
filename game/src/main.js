// Frostline — game glue: the loop, the HUD, saving, the start screen,
// and screenshot presets (?shot=chase|foot|street|start) for the entry's images.
import { CFG, clamp, makeRng } from './config.js';
import { buildWorld } from './world.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import {
  createPlayer, seedCars, seedPeds,
  updatePlayerOnFoot, updateDriving, updateTraffic, updatePeds,
  updatePolice, updateWanted, respawnPlayer,
} from './entities.js';
import { startMissions, updateMissions, missionHint } from './missions.js';
import { render, drawMinimap } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

const input = new Input();
const sfx = new Sfx();

const world = buildWorld();
const state = {
  world,
  player: createPlayer(world),
  cars: seedCars(world),
  peds: seedPeds(world),
  cops: [],
  wanted: 0,
  wantedT: 0,
  missionIdx: 0,
  mission: null,
  missionDone: false,
  storyDone: false,
  storm: 0.4,
  time: 0,
  clock: 23 * 60 + 40, // 23:40, the night the blizzard hits
  shake: 0,
  floats: [],
  flakes: [],
  started: false,
  paused: false,
  sfx,
  toast(msg) { showToast(msg); },
  addFloat(text, x, y, color) { state.floats.push({ text, x, y, color, life: 1.2 }); },
};

const frng = makeRng(4242);
for (let i = 0; i < 260; i++) {
  state.flakes.push({
    x: frng() * CFG.WORLD, y: frng() * CFG.WORLD,
    s: 1 + frng() * 2.4, fall: 30 + frng() * 55, drift: 12 + frng() * 30,
  });
}

// --- HUD ------------------------------------------------------------------
const el = (id) => document.getElementById(id);
let toastTimer = null;
function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
}

function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function updateHud() {
  const p = state.player;
  el('hp-fill').style.width = `${clamp(p.hp, 0, 100)}%`;
  el('cash').textContent = `$${p.cash}`;
  el('wanted').textContent = stars(state.wanted);
  el('wanted').style.color = state.wanted > 0 ? '#ff5b5b' : '#9fb2cc';
  const speed = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.36) : 0;
  el('speed').textContent = p.inCar ? `${speed} km/h` : (p.dead ? 'WASTED' : 'ON FOOT');
  el('objective-text').textContent = state.mission
    ? `M${state.mission.id} ${state.mission.name} — ${missionHint(state)}`
    : (state.storyDone ? 'Free roam — Frostline is yours.' : '');
  const hh = Math.floor(state.clock / 60) % 24;
  const mm = Math.floor(state.clock % 60);
  el('clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  el('storm-fill').style.width = `${Math.round(state.storm * 100)}%`;
  el('storm-label').textContent = state.storm > 0.7 ? 'WHITEOUT' : state.storm > 0.45 ? 'BLIZZARD' : 'SNOW';
  drawMinimap(state, mctx, 168);
}

// --- Save / load ----------------------------------------------------------
function saveGame() {
  if (!state.started) return;
  try {
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      x: state.player.x, y: state.player.y,
      cash: state.player.cash, hp: state.player.hp,
      missionIdx: state.missionIdx, storyDone: state.storyDone,
      clock: state.clock, savedAt: Date.now(),
    }));
  } catch { /* storage unavailable: the game still plays */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const p = state.player;
    p.x = s.x; p.y = s.y; p.cash = s.cash; p.hp = s.hp;
    state.clock = s.clock || state.clock;
    state.missionIdx = s.missionIdx || 0;
    state.storyDone = !!s.storyDone;
    return true;
  } catch { return false; }
}

// --- Start screen ---------------------------------------------------------
function startGame(fromSave) {
  sfx.ensure();
  el('start-screen').classList.add('hidden');
  state.started = true;
  if (fromSave && loadGame()) {
    const { MISSIONS } = missionsModule;
    state.mission = state.storyDone ? null : MISSIONS[state.missionIdx];
    showToast(state.storyDone ? 'Save loaded — free roam' : `Save loaded — Mission ${state.mission.id}: ${state.mission.name}`);
  } else {
    startMissions(state);
  }
  canvas.focus();
}

import * as missionsModule from './missions.js';

el('btn-start').addEventListener('click', () => startGame(false));
el('btn-continue').addEventListener('click', () => startGame(true));
el('btn-mute').addEventListener('click', () => {
  sfx.muted = !sfx.muted;
  el('btn-mute').textContent = sfx.muted ? 'SOUND: OFF' : 'SOUND: ON';
});
if (!localStorage.getItem(CFG.SAVE_KEY)) el('btn-continue').disabled = true;

// --- Screenshot presets ---------------------------------------------------
// ?shot=chase  — getaway in a blizzard, cops on your tail, wanted 3★
// ?shot=foot   — Mara on foot outside the Neon Lodge at night
// ?shot=street — cruising downtown past the neon signs
// ?shot=start  — the title screen (default when the game has not started)
function applyShotPreset() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  state.started = true;
  el('start-screen').classList.add('hidden');
  const p = state.player;
  if (shot === 'chase') {
    startMissions(state);
    state.missionIdx = 3;
    state.mission = missionsModule.MISSIONS[3];
    state.mission.armed = true;
    state.wanted = 3;
    const car = state.cars.find((c) => c.kind === 'parked');
    if (car) {
      state.cars.splice(state.cars.indexOf(car), 1);
      p.inCar = car; car.kind = 'player'; car.parked = false;
      car.x = 1600; car.y = 1800; car.angle = 0; car.speed = 380;
      p.x = car.x; p.y = car.y;
    }
    state.storm = 0.85;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const pc = { x: p.x + Math.cos(a) * 260, y: p.y + Math.sin(a) * 260, angle: 0, speed: 420, color: '#1b2a4a', w: 46, h: 22, kind: 'police', dir: 0, cruise: 400, brakeT: 0, stuckT: 0, siren: true, hp: 100, parked: false };
      state.cars.push(pc);
    }
    state.toast('Mission 4 — Heat Wave: lose the cops, then reach the Lodge');
  } else if (shot === 'foot') {
    startMissions(state);
    p.x = world.lodge.x + 40; p.y = world.lodge.y + 120;
    p.angle = -Math.PI / 2;
    state.storm = 0.45;
  } else if (shot === 'street') {
    startMissions(state);
    state.missionIdx = 1;
    state.mission = missionsModule.MISSIONS[1];
    const car = state.cars.find((c) => c.kind === 'parked');
    if (car) {
      state.cars.splice(state.cars.indexOf(car), 1);
      p.inCar = car; car.kind = 'player'; car.parked = false;
      car.x = 1500; car.y = 1500; car.angle = 0; car.speed = 260;
      p.x = car.x; p.y = car.y;
    }
    state.storm = 0.35;
    state.toast('Mission 2 — Borrowed Wheels: steal a car, any car');
  }
  updateHud();
}

// --- Main loop ------------------------------------------------------------
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let saveT = 0;

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (state.started && !state.paused) {
    state.time += dt;
    state.clock += dt * 0.6; // a game minute every ~100 real seconds
    // The blizzard breathes: slow sine, plus a gust now and then.
    state.storm = clamp(0.45 + 0.35 * Math.sin(state.time / 55) + 0.12 * Math.sin(state.time / 13), 0.15, 1);
    sfx.setWind(state.storm);
    const p = state.player;
    if (p.dead) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) respawnPlayer(state);
    } else if (p.inCar) {
      updateDriving(state, dt, input);
    } else {
      updatePlayerOnFoot(state, dt, input);
    }
    updateTraffic(state, dt);
    updatePeds(state, dt);
    updatePolice(state, dt);
    updateWanted(state, dt);
    updateMissions(state, dt);
    // Health slowly recovers when you are not being hurt.
    if (!p.dead && p.hurtCd <= 0 && p.hp > 0 && p.hp < 100) p.hp = Math.min(100, p.hp + 1.2 * dt);
    state.shake = Math.max(0, state.shake - 30 * dt);
    for (const f of state.floats) f.life -= dt;
    state.floats = state.floats.filter((f) => f.life > 0);
    saveT += dt;
    if (saveT > 15) { saveT = 0; saveGame(); }
    if (input.hit('m')) { sfx.muted = !sfx.muted; el('btn-mute').textContent = sfx.muted ? 'SOUND: OFF' : 'SOUND: ON'; }
    if (input.hit('p', 'Escape')) { state.paused = !state.paused; showToast(state.paused ? 'Paused — press P to resume' : 'Resumed'); }
    updateHud();
  }
  if (state.started) render(state, ctx, canvas.width, canvas.height, state.time);
  input.endFrame();
  requestAnimationFrame(frame);
}

applyShotPreset();
if (new URLSearchParams(location.search).get('shot') === 'start') {
  // Title screen stays up for the start screenshot; the loop still runs behind it.
  state.started = false;
  el('start-screen').classList.remove('hidden');
}
requestAnimationFrame(frame);

// Exposed for the screenshot helper and for debugging in the console.
window.__frostline = { state, saveGame, startGame };
