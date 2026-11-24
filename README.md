# FROSTLINE — a snowy neon open-world crime game

Entry for make.fun bounty **gta6-01 — "Make GTA 6"**. A complete open-world
crime game that runs offline in a desktop browser from static files, with no
network requests and no libraries. 100% original: its own city, characters,
vehicles, names, story, art and sounds — nothing from Rockstar Games.

## The game

Frostline is a snowy neon mountain city at night, built around a frozen lake
and a mountain pass. You play **Mara Kessler**, getaway driver of the
**Whiteout Crew**. Five chained missions, then free roam:

1. **Meet Jax** — find Jax under the pink neon of the Neon Lodge.
2. **Steal a Car** — take any parked car (press E beside it).
3. **The Package** — grab the drop off the middle of the frozen lake.
4. **Lose the Heat** — shake a 3-star wanted level. The lake is the one place
   the law loses your trail.
5. **Whiteout Getaway** — punch through the storm to the mountain pass.

After the fifth job, free roam: collect street cash, steal cars, outrun the
law, and survive the blizzard.

## The blizzard

The storm is a live system, not scenery. As it rises, road grip falls (cars
slide), visibility closes in (whiteout fog), and police sight shrinks — which
is exactly how you lose a tail. As it falls, grip returns and the cops see
farther. The frozen lake hides you fastest: wanted stars fade in 3 seconds
there instead of 9.

## Systems

- **On foot and by car** — walk the sidewalks or steal any parked (or slow)
  car; traffic drives the road grid around you.
- **Traffic and pedestrians** — 14 traffic cars on the road network, 20
  pedestrians who stroll, flee from danger, and go down when hit.
- **Wanted level and police** — 0–5 stars. Stealing, punching and hitting
  pedestrians raise the heat; police cruisers chase and ram, foot cops chase
  on foot and can bust Mara. Heat fades when no cop can see you.
- **Combat** — punch (Space) on foot: pedestrians go down, cops take 3 hits.
- **Missions and story** — five chained jobs with a marker, briefing and
  reward, then free roam with street cash to find.
- **HUD with minimap** — mission box, wanted stars, money, health, blizzard
  meter, speed, context prompts, and a live minimap with police, traffic and
  the mission marker.
- **Start screen and save** — New Game / Continue; progress autosaves to
  localStorage (mission, money, health, wanted, position, car).
- **Sound** — everything synthesized in WebAudio: engine hum, wind, sirens,
  punches, crashes, pickup chimes and mission fanfares. M mutes.

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Move on foot, drive |
| E | Steal a car / leave a car |
| Space | Punch (on foot) |
| P / Esc | Pause (saves) |
| Enter | Confirm on menus |
| M | Mute |

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

or serve `game/` with any static HTTP server and open `index.html` in
desktop Chrome. No build step, no network requests.

Screenshots are real renders of this game, taken in headless Chrome from the
running game (`?demo=chase`, `?demo=foot`, `?demo=lake`, `?demo=start` set up
each scene).

## Files

- `main.ts` — the entrypoint: copies `game/` + `screenshots/` to the output
  directory and writes `dossier.json` with the kit's `buildDossier`.
- `game/index.html` — the page; loads the scripts below in order.
- `game/src/config.js` — world constants, palette, helpers, seeded RNG.
- `game/src/world.js` — the city: roads, buildings, lake, pass, lamps, pines.
- `game/src/entities.js` — Mara, cars, traffic, pedestrians, police.
- `game/src/missions.js` — the five chained jobs and their rewards.
- `game/src/audio.js` — synthesized WebAudio: engine, wind, siren, effects.
- `game/src/input.js` — keyboard + menu clicks.
- `game/src/render.js` — canvas drawing: city, cars, people, storm, HUD, menus.
- `game/src/main.js` — game loop, screens, wanted heat, saves, demo scenes.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
