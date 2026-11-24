// FROSTLINE — entrypoint for make.fun bounty gta6-01 ("Make GTA 6").
// Node 22, standard library only. Copies game/ and screenshots/ from this
// repository into the output directory and writes dossier.json with the kit's
// buildDossier, exactly as the bounty requires. No network, no installs.
// Note: dossier caps below mirror the gate limits in the bounty rules.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output; inside it the
// platform sets the output directory itself.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The grader runs this program twice and both runs must write the same bytes,
// so the output directory is emptied before every run. The directory itself
// is never removed: the grader mounts it as a volume, and removing a mount
// point fails the run.
function clearContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

clearContents(outDir);

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The gate's caps, from the bounty rules: 160 KiB of dossier text, at most
// 4 screenshots of 256 KiB each, game/ at most 993 entries and 48 MiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`FROSTLINE: wrote ${outDir} (dossier ${dossier.length} bytes)`);
