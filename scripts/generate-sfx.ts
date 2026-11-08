/**
 * Generates all sound effects and background music into public/sfx and public/music.
 * Run with: npm run sfx
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  encodeWav,
  makeMusic,
  makeSfx,
  MUSIC_NAMES,
  MUSIC_SAMPLE_RATE,
  SFX_NAMES,
  SFX_SAMPLE_RATE,
} from "../lib/audio/synth";

const root = path.resolve(__dirname, "..");
const sfxDir = path.join(root, "public", "sfx");
const musicDir = path.join(root, "public", "music");
mkdirSync(sfxDir, { recursive: true });
mkdirSync(musicDir, { recursive: true });

for (const name of SFX_NAMES) {
  const file = path.join(sfxDir, `${name}.wav`);
  writeFileSync(file, encodeWav(makeSfx(name), SFX_SAMPLE_RATE));
  console.log("✓", path.relative(root, file));
}
for (const name of MUSIC_NAMES) {
  const file = path.join(musicDir, `${name}.wav`);
  writeFileSync(file, encodeWav(makeMusic(name), MUSIC_SAMPLE_RATE));
  console.log("✓", path.relative(root, file));
}
