/**
 * Builds the complete soundtrack of the "portal" Short:
 *   Polish voice-over (eSpeak-NG + MBROLA pl1, processed with ffmpeg) +
 *   synthesised sound effects + loopable mysterious music, ducked under the voice.
 *
 * Outputs:
 *   public/portal-short/soundtrack.wav   – final mix (-14 LUFS)
 *   remotion/portal/captions.json        – word timings for the on-screen captions
 *
 * Requirements: espeak-ng, mbrola + mbrola-pl1 voice, ffmpeg
 *   (Debian/Ubuntu: apt-get install espeak-ng mbrola mbrola-pl1 ffmpeg)
 *
 *   npx tsx scripts/build-portal-audio.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makePortalMusic, makePortalSfx, mixInto, reverb, SR } from "../lib/audio/portal";
import { encodeWav } from "../lib/audio/synth";
import {
  DURATION_SECONDS,
  SFX_CUES,
  T,
  VOICE_LINES,
  type CaptionLine,
  type CaptionWord,
} from "../remotion/portal/timeline";

const root = path.resolve(__dirname, "..");
const tmp = mkdtempSync(path.join(os.tmpdir(), "portal-audio-"));
const VOICE = process.env.PORTAL_VOICE ?? "mb-pl1";
/** Raises pitch (and speed) for a brighter, more energetic narrator. */
const PITCH = 1.07;

function readF32(file: string): Float32Array {
  const b = readFileSync(file);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

function probeDuration(file: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
}

const TRIM = "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03,areverse";

function synthLine(id: string, text: string, maxSeconds: number): Float32Array {
  const raw = path.join(tmp, `${id}-raw.wav`);
  const trimmed = path.join(tmp, `${id}-trim.wav`);
  const out = path.join(tmp, `${id}.f32`);
  execFileSync("espeak-ng", ["-v", VOICE, "-s", "178", "-p", "68", "-a", "170", "-w", raw, text]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", TRIM, trimmed]);
  const natural = probeDuration(trimmed) / PITCH;
  const tempo = Math.min(1.6, Math.max(1.0, natural / maxSeconds));
  const inRate = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", trimmed], { encoding: "utf8" }).trim());
  const chain = [
    `asetrate=${Math.round(inRate * PITCH)}`,
    `aresample=${SR}`,
    `atempo=${tempo.toFixed(3)}`,
    "highpass=f=110",
    "equalizer=f=250:t=q:w=1:g=-2",
    "equalizer=f=3200:t=q:w=1.2:g=5",
    "equalizer=f=7000:t=q:w=1:g=2",
    "acompressor=threshold=-20dB:ratio=4:attack=3:release=80:makeup=6dB",
    "alimiter=limit=0.9",
  ].join(",");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", trimmed, "-af", chain, "-ac", "1", "-f", "f32le", out]);
  const samples = readF32(out);
  console.log(`  ${id}  ${(samples.length / SR).toFixed(2)} s (tempo ×${tempo.toFixed(2)})  „${text}”`);
  return samples;
}

/** Rough syllable count for Polish – vowel groups. */
function syllables(word: string): number {
  const groups = word.toLowerCase().match(/[aeiouyąęó]+/g);
  return Math.max(1, groups?.length ?? 1);
}

function captionTimings(id: string, caption: string, start: number, duration: number): CaptionLine {
  const chunks = caption.split("|").map((c) => c.trim().split(/\s+/));
  const words: Omit<CaptionWord, "start" | "end">[] = [];
  chunks.forEach((chunk, ci) =>
    chunk.forEach((w) => {
      const emph = /^\*.*\*$/.test(w);
      words.push({ text: w.replace(/\*/g, "").toUpperCase(), emph, chunk: ci });
    }),
  );
  // weight = syllables + pause after "…" / "?!" punctuation
  const weights = words.map((w) => syllables(w.text) + (/[…!?,]$/.test(w.text) ? 0.6 : 0.15));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  const timed = words.map((w, i) => {
    const d = (weights[i] / total) * duration;
    const word = { ...w, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return word;
  });
  return { id, start: +start.toFixed(3), end: +(start + duration).toFixed(3), words: timed };
}

function main() {
  const N = Math.round(DURATION_SECONDS * SR);
  const voice = new Float32Array(N);
  const sfx = new Float32Array(N);
  const captions: CaptionLine[] = [];

  console.log("🎙  Lektor:");
  for (const line of VOICE_LINES) {
    const clip = synthLine(line.id, line.text, line.max);
    const dur = clip.length / SR;
    if (line.at + dur > DURATION_SECONDS) throw new Error(`${line.id} ends after the video (${(line.at + dur).toFixed(2)} s)`);
    mixInto(voice, clip, line.at, 1);
    if (line.caption) captions.push(captionTimings(line.id, line.caption, line.at, dur));
  }
  // a touch of room on the voice
  const vWet = reverb(voice, SR, 0.6, 0.6);
  for (let i = 0; i < N; i++) voice[i] += vWet[i] * 0.08;

  console.log("🔊 Efekty dźwiękowe:", SFX_CUES.length);
  const cache = new Map<string, Float32Array>();
  for (const cue of SFX_CUES) {
    if (!cache.has(cue.sfx)) cache.set(cue.sfx, makePortalSfx(cue.sfx));
    mixInto(sfx, cache.get(cue.sfx)!, cue.at, cue.gain, true);
  }
  const sWet = reverb(sfx, SR, 0.9, 0.5, true);
  for (let i = 0; i < N; i++) sfx[i] += sWet[i] * 0.18;

  console.log("🎵 Muzyka…");
  const music = makePortalMusic(DURATION_SECONDS, [T.dragonOut - 0.05, T.dragonOut + 0.55]);

  // duck the music under the voice (envelope follower)
  let env = 0;
  const att = Math.exp(-1 / (0.01 * SR));
  const rel = Math.exp(-1 / (0.25 * SR));
  const mix = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.abs(voice[i]);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    const duck = 1 - 0.5 * Math.min(1, env / 0.12);
    mix[i] = voice[i] * 1.0 + sfx[i] * 0.55 + music[i] * 0.42 * duck;
  }
  // soft clip
  for (let i = 0; i < N; i++) mix[i] = Math.tanh(mix[i] * 1.1) / Math.tanh(1.1);

  const outDir = path.join(root, "public", "portal-short");
  mkdirSync(outDir, { recursive: true });
  const pre = path.join(tmp, "premaster.wav");
  writeFileSync(pre, encodeWav(mix, SR));
  const final = path.join(outDir, "soundtrack.wav");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", String(SR), "-ac", "1", final]);
  console.log("✓", path.relative(root, final), `${probeDuration(final).toFixed(2)} s`);

  const capFile = path.join(root, "remotion", "portal", "captions.json");
  writeFileSync(capFile, JSON.stringify(captions, null, 1) + "\n");
  console.log("✓", path.relative(root, capFile));
  rmSync(tmp, { recursive: true, force: true });
}

main();
