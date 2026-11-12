/**
 * Generates the soundtrack of the "Piracki Token" short into public/pirate
 * (music.wav + sfx.wav, both 40 s and aligned to the video timeline).
 * Run with: npm run pirate:audio
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodeWav, makePirateMusic, makePirateSfxTrack, PIRATE_SR } from "../lib/pirate/audio";

const dir = path.resolve(__dirname, "..", "public", "pirate");
mkdirSync(dir, { recursive: true });
for (const [name, make] of [
  ["music.wav", makePirateMusic],
  ["sfx.wav", makePirateSfxTrack],
] as const) {
  const t0 = Date.now();
  writeFileSync(path.join(dir, name), encodeWav(make(), PIRATE_SR));
  console.log(`✓ public/pirate/${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
