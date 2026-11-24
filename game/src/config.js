// FROSTLINE — config: world constants, palette, helpers.
// A snowy neon mountain city at night. Everything here is original.

// World geometry (pixels, top-down).
var WORLD_W = 3200;
var WORLD_H = 2400;
var ROAD_W = 96;
var ROAD_V = [400, 1000, 1600, 2200, 2800]; // vertical road centre lines (x)
var ROAD_H = [400, 900, 1400, 1900];        // horizontal road centre lines (y)

// The frozen lake (north-east) and the mountain pass (north edge).
var LAKE = { x: 2650, y: 380, rx: 430, ry: 300 };
var PASS = { x: 1600, y: 70 };              // mountain-pass gate marker
var LODGE = { x: 860, y: 280, w: 200, h: 130 }; // Neon Lodge building
var LODGE_DOOR = { x: 960, y: 430 };        // meet Jax here
var SPAWN = { x: 960, y: 560 };             // Mara starts on foot, south of the lodge

// Player tuning.
var WALK_SPEED = 175;
var CAR_TOP_SPEED = 430;
var CAR_ACCEL = 320;
var CAR_BRAKE = 520;
var CAR_TURN = 2.6;
var POLICE_CAR_SPEED = 455;
var POLICE_FOOT_SPEED = 188;
var PUNCH_RANGE = 52;
var PUNCH_COOLDOWN = 0.35;

// Wanted / heat.
var WANTED_MAX = 5;
var WANTED_DECAY_SECONDS = 9;      // one star fades when no cop can see you
var WANTED_LAKE_DECAY_SECONDS = 3; // the frozen lake loses the trail fast

// Blizzard: grip, sight and police detection all ride on this 0..1 value.
var BLIZZARD_MIN = 0.12;
var BLIZZARD_MAX = 1.0;

// Money.
var START_MONEY = 120;
var MISSION_REWARDS = [200, 300, 500, 800, 2000];

var SAVE_KEY = 'frostline-save-v1';

// Palette: night snow, neon signs, sodium streetlight.
var PAL = {
  groundSnow: '#b9c6d8',
  groundSnowDark: '#9fb0c6',
  road: '#232a38',
  roadEdge: '#3a4557',
  lane: '#c8b25a',
  sidewalk: '#7e8ca3',
  building: '#2b3242',
  buildingRoof: '#39415a',
  neonPink: '#ff4d8d',
  neonCyan: '#37e0ff',
  neonAmber: '#ffb347',
  neonGreen: '#59ffa0',
  lakeIce: '#a8dcf0',
  lakeIceDeep: '#7fb8d8',
  pine: '#1d4a33',
  pineSnow: '#dcebf2',
  lampGlow: '#ffd98a',
  hudBg: 'rgba(6, 12, 24, 0.72)',
  hudLine: '#37e0ff',
  text: '#eaf4ff',
  textDim: '#9fb4cc',
  star: '#ffd23e',
  danger: '#ff5252'
};

// ---- helpers ---------------------------------------------------------------

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angleDiff(a, b) {
  var d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function fmtMoney(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }
function fmtClock(seconds) {
  var m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// Deterministic RNG so the city is the same every run (mulberry32).
function makeRng(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rng = makeRng(20261124);

function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function randRange(lo, hi) { return lo + rng() * (hi - lo); }
