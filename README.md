# Frostline — a snowy open-world crime game

An original open-world crime game for the make.fun **gta6-01** bounty ("Make GTA 6").
No Rockstar names, characters, maps or assets anywhere — the city, the crew and the
story are all invented here.

## The game

You are **Mara Kessler**, getaway driver of the Whiteout Crew. On the night a blizzard
rolls over **Frostline** — a neon mountain city buried in snow — the crew hits the
Aurora vault. Five story missions:

1. **Cold Open** — meet Jax at the Neon Lodge.
2. **Borrowed Wheels** — steal a car (any car).
3. **The Frozen Drop** — drive to the frozen lake and grab the package.
4. **Heat Wave** — the alarm trips; lose the cops, then reach the Lodge.
5. **Whiteout Run** — final getaway through the blizzard to the mountain pass.

Then free roam. The blizzard is the hook: storm intensity changes road grip,
visibility and how fast the police find you, and the frozen lake is the one place
the law loses your trail.

## What's in it

- A city to explore **on foot and by car**: a 3600×3600 grid city with roads,
  neon-signed buildings, pines, street lamps and a frozen lake, all generated
  from a fixed seed.
- **Traffic** that follows the roads and brakes for you, **pedestrians** who
  wander and flee, and **parked cars to steal** (press E).
- A **wanted level (0–5 stars)** with police cars that chase and ram you and
  foot cops who chase and punch you; wanted decays over time, twice as fast
  while you hide on the frozen lake.
- **Combat** on foot (F to punch), **missions with a story**, cash rewards,
  a **HUD with a minimap**, health, cash, wanted stars, speed, a clock and a
  storm meter, a **start screen**, and **saves** (localStorage, auto-saved).
- **Sound, all synthesized** with WebAudio (engine hum, sirens, wind, punches,
  crashes, chimes) — no audio files, no network requests.
- Polish: snowfall, headlight cones, flashing police light bars, screen shake,
  floating combat text, a pulsing mission beacon, day-cycle clock.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot / drive |
| E | Enter a car, steal a parked car, exit a car |
| F | Punch |
| Shift | Run |
| P / Esc | Pause |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies. `game/index.html` opens in desktop Chrome and
plays with no network request; every file it loads lives under `game/`.

## Files

- `main.ts` — the entry program (Node 22): copies `game/` and `screenshots/`
  to `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page: canvas, HUD, start screen.
- `game/src/config.js` — tuning constants and the seeded RNG.
- `game/src/world.js` — city generation and collision.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized WebAudio sound.
- `game/src/entities.js` — player, traffic, pedestrians, police, wanted level.
- `game/src/missions.js` — the five-mission story.
- `game/src/render.js` — canvas drawing and the minimap.
- `game/src/main.js` — the loop, HUD, saving, screenshot presets.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `screenshots/` — 4 real renders of the game's own code (cover first).

## License

MIT — see `LICENSE`.
