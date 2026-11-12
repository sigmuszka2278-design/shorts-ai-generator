/**
 * Builds the audio for the contest short "Elektryk – zawód, który włącza przyszłość":
 *   - demo voice-over (offline Polish TTS: espeak-ng + MBROLA pl1),
 *   - subtitle timings (remotion/elektryk/captions.json),
 *   - original synthesized music + sound effects (no copyrighted material),
 *   - two mixes: with voice-over and without (for recording your own voice).
 *
 *   npx tsx scripts/elektryk/build-audio.ts
 *
 * Requires: ffmpeg, espeak-ng, mbrola + mbrola-pl1 (apt-get install espeak-ng mbrola mbrola-pl1).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { attackDecay, bell, encodeWav, expDecay, noiseGen, tone, type Samples } from "../../lib/audio/synth";
import { SEGMENTS, TOTAL_SECONDS } from "../../remotion/elektryk/timeline";

const SR = 44100;
const root = path.resolve(__dirname, "..", "..");
const outDir = path.join(root, "renders", "elektryk");
const work = path.join(tmpdir(), "elektryk-tts");
mkdirSync(outDir, { recursive: true });
mkdirSync(work, { recursive: true });

// ── TTS ──────────────────────────────────────────────────────────

/** Reads any audio file as mono float samples at SR (optionally time-stretched without pitch change). */
function readAudio(file: string, tempo = 1): Samples {
  const filters = tempo !== 1 ? ["-af", `atempo=${tempo.toFixed(3)}`] : [];
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, ...filters, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
    maxBuffer: 1 << 28,
  });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice();
}

let ttsCounter = 0;
/** espeak-ng → phonemes → MBROLA pl1. The "E#" phoneme is missing in pl1, so it is mapped to "e". */
function tts(text: string, speed: number, tempo = 1): Samples {
  const id = ttsCounter++;
  const pho = execFileSync("espeak-ng", ["-v", "mb-pl1", "-s", String(speed), "-q", "--pho", text], { encoding: "utf8" })
    .split("\n")
    .map((l) => l.replace(/^E#\t/, "e\t"))
    .join("\n");
  const phoFile = path.join(work, `${id}.pho`);
  const wavFile = path.join(work, `${id}.wav`);
  writeFileSync(phoFile, pho);
  execFileSync("mbrola", ["-e", "/usr/share/mbrola/pl1/pl1", phoFile, wavFile], { stdio: ["ignore", "ignore", "pipe"] });
  const s = trimSilence(readAudio(wavFile, tempo));
  return s;
}

function trimSilence(s: Samples): Samples {
  const th = 0.01;
  let a = 0;
  let b = s.length - 1;
  while (a < s.length && Math.abs(s[a]) < th) a++;
  while (b > a && Math.abs(s[b]) < th) b--;
  return s.slice(Math.max(0, a - 200), Math.min(s.length, b + 800));
}

export interface Caption {
  start: number;
  end: number;
  text: string;
}

const voice = new Float32Array(TOTAL_SECONDS * SR);
const captions: Caption[] = [];
const GAP = 0.22;

for (const seg of SEGMENTS) {
  const available = seg.end - seg.voiceStart - 0.12;
  let speed = 165;
  let tempo = 1;
  let clips: Samples[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    clips = seg.lines.map((l) => tts(l.say ?? l.text, speed, tempo));
    const total = clips.reduce((sum, c) => sum + c.length / SR, 0) + GAP * (clips.length - 1);
    if (total <= available) break;
    tempo = Math.min(1.35, tempo * (total / available) * 1.02);
  }
  let t = seg.voiceStart;
  seg.lines.forEach((line, i) => {
    const clip = clips[i];
    const s0 = Math.floor(t * SR);
    for (let k = 0; k < clip.length && s0 + k < voice.length; k++) voice[s0 + k] += clip[k];
    const dur = clip.length / SR;
    // split long lines into readable chunks, timed proportionally to characters
    const chunks = splitCaption(line.text);
    const totalChars = chunks.reduce((n, c) => n + c.length, 0);
    let ct = t;
    for (const c of chunks) {
      const d = (dur * c.length) / totalChars;
      captions.push({ start: round(ct), end: round(ct + d), text: c });
      ct += d;
    }
    t += dur + GAP;
  });
  console.log(`✓ ${seg.id.padEnd(10)} lektor ${(t - GAP - seg.voiceStart).toFixed(2)} s / ${available.toFixed(2)} s (tempo ${tempo.toFixed(2)})`);
}

function round(x: number) {
  return Math.round(x * 100) / 100;
}

function splitCaption(text: string): string[] {
  if (text.length <= 34) return [text];
  const parts = text.split(/(?<=[,?!.])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + " " + p).length > 34) {
      out.push(cur);
      cur = p;
    } else cur = cur ? cur + " " + p : p;
  }
  if (cur) out.push(cur);
  return out;
}

// light voice processing: gentle normalization
let peak = 0;
for (const s of voice) peak = Math.max(peak, Math.abs(s));
for (let i = 0; i < voice.length; i++) voice[i] *= 0.92 / peak;

// ── music & sfx ──────────────────────────────────────────────────

const N = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const music = new Float32Array(TOTAL_SECONDS * SR);
const sfx = new Float32Array(TOTAL_SECONDS * SR);
const rnd = noiseGen(2026);

// 0 – 0.7 s: cheerful intro groove, cut by the light switch
function groove(out: Samples, from: number, to: number, bpm: number, energy: number) {
  const beat = 60 / bpm;
  const prog = [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [48, 52, 55], // C
    [55, 59, 62], // G
  ];
  const lead = [69, 72, 76, 74, 72, 69, 67, 69, 72, 74, 76, 79, 76, 74, 72, 74];
  for (let t0 = from, bar = 0; t0 < to; t0 += beat * 4, bar++) {
    const chord = prog[bar % 4];
    const barLen = Math.min(beat * 4, to - t0);
    for (const n of chord) tone(out, SR, t0, barLen, () => N(n), (t) => Math.min(1, t * 6) * 0.8 + 0.2 * Math.cos(t * 3), "sine", 0.05);
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * beat;
      if (tb >= to) break;
      tone(out, SR, tb, 0.18, (t) => 120 * Math.exp(-t * 22) + 42, expDecay(20), "sine", 0.42);
      // off-beat hat
      const h0 = Math.floor((tb + beat / 2) * SR);
      for (let i = 0; i < SR * 0.04 && h0 + i < out.length; i++) out[h0 + i] += rnd() * 0.05 * Math.exp(-i / (SR * 0.008));
      // clap on 2 and 4
      if (b % 2 === 1) {
        const c0 = Math.floor(tb * SR);
        for (let i = 0; i < SR * 0.12 && c0 + i < out.length; i++) out[c0 + i] += rnd() * 0.12 * energy * Math.exp(-i / (SR * 0.03));
      }
      // bass: eighth-note pulse
      for (const off of [0, beat / 2]) {
        if (tb + off < to) tone(out, SR, tb + off, beat * 0.4, () => N(chord[0] - 24), attackDecay(0.005, 7), "saw", 0.07);
      }
    }
    // arpeggio / lead
    for (let st = 0; st < 8; st++) {
      const ts = t0 + st * (beat / 2);
      if (ts >= to) break;
      const note = energy > 0.7 ? lead[(bar * 8 + st) % lead.length] : chord[st % 3] + 12;
      tone(out, SR, ts, beat * 0.42, () => N(note), attackDecay(0.008, 7), "triangle", 0.09 * energy + 0.03);
      if (st % 2 === 0) bell(out, SR, ts, N(note) * 2, 0.4, 0.015);
    }
  }
}

groove(music, 0, 0.72, 120, 0.6);
// 0.7 – 8 s: dark drone (region without electricians)
tone(music, SR, 0.75, 7.4, (t) => 55 + Math.sin(t * 0.7) * 1.5, (t) => Math.min(1, t * 0.8) * Math.max(0, Math.min(1, (7.4 - t) * 1.5)), "sine", 0.32);
tone(music, SR, 0.75, 7.4, () => 82.4, (t) => Math.min(1, t * 0.5) * Math.max(0, Math.min(1, (7.4 - t) * 1.5)), "triangle", 0.08);
{
  let lp = 0;
  for (let i = Math.floor(0.75 * SR); i < 8.1 * SR; i++) {
    const t = i / SR - 0.75;
    lp += 0.01 * (rnd() - lp);
    music[i] += lp * 0.9 * Math.min(1, t) * Math.max(0, Math.min(1, (7.35 - t) * 1.5));
  }
}
// 8 – 52 s: positive groove (ducked under voice later), 52 – 60 s: finale
groove(music, 8, 52, 120, 0.75);
groove(music, 52.2, 60, 120, 1);
// fade out last 1.2 s
for (let i = 0; i < 1.2 * SR; i++) music[music.length - 1 - i] *= i / (1.2 * SR);

// sound effects
function click(at: number) {
  const s0 = Math.floor(at * SR);
  for (let i = 0; i < SR * 0.025; i++) sfx[s0 + i] += rnd() * Math.exp(-i / (SR * 0.003)) * 0.9;
  tone(sfx, SR, at, 0.05, () => 2400, expDecay(90), "square", 0.15);
}
function powerDown(at: number) {
  tone(sfx, SR, at, 0.9, (t) => 420 * Math.exp(-t * 3) + 40, (t) => Math.exp(-t * 2.5), "saw", 0.25);
  tone(sfx, SR, at, 0.5, () => 100, (t) => Math.exp(-t * 6) * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 50)), "square", 0.1);
}
function powerUp(at: number, dur = 0.9) {
  tone(sfx, SR, at, dur, (t) => 80 + 900 * Math.pow(t / dur, 2), (t) => Math.min(1, t * 4) * Math.max(0, 1 - Math.pow(t / dur, 6)), "saw", 0.12);
  tone(sfx, SR, at, dur, (t) => 160 + 1800 * Math.pow(t / dur, 2), (t) => Math.min(1, t * 4) * Math.max(0, 1 - Math.pow(t / dur, 6)), "sine", 0.18);
}
function buzz(at: number, dur: number, gain = 0.06) {
  tone(sfx, SR, at, dur, () => 100, (t) => Math.min(1, t * 10) * Math.max(0, Math.min(1, (dur - t) * 10)) * (0.6 + 0.4 * Math.sin(t * 37)), "saw", gain);
}
function whoosh(at: number) {
  const d = 0.5;
  let lp = 0;
  for (let i = 0; i < d * SR; i++) {
    const t = i / SR;
    lp += (0.03 + 0.3 * Math.sin((Math.PI * t) / d)) * (rnd() - lp);
    sfx[Math.floor(at * SR) + i] += lp * Math.sin((Math.PI * t) / d) * 0.55;
  }
}
function pop(at: number, f = 900) {
  tone(sfx, SR, at, 0.15, (t) => f * Math.exp(-t * 16) + 220, expDecay(30), "sine", 0.5);
}
function chime(at: number) {
  [1318.5, 1568, 2093].forEach((f, i) => bell(sfx, SR, at + i * 0.1, f, 1.2, 0.18));
}
function tick(at: number) {
  tone(sfx, SR, at, 0.03, () => 3000, expDecay(150), "square", 0.08);
}

click(0.7);
powerDown(0.72);
buzz(3.2, 0.6);
buzz(5.6, 0.4, 0.04);
click(8.0);
powerUp(8.0);
for (const t of [10, 12, 14, 16]) whoosh(t - 0.2);
whoosh(17.8);
for (let t = 18.3; t < 20.8; t += 0.5) tick(t);
for (const t of [21, 24, 27]) whoosh(t - 0.2);
chime(28.2);
whoosh(29.8);
for (const t of [30.2, 33.2, 36.2, 39.2]) pop(t, 700);
whoosh(41.8);
for (const t of [42.6, 45.6, 48.6]) pop(t, 1000);
chime(49.6);
click(52.3);
powerUp(52.3, 0.7);
chime(53.2);
[523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(sfx, SR, 57.2, 1.6, () => f, attackDecay(0.02, 2.2), "triangle", 0.07));

// ── mix ──────────────────────────────────────────────────────────

function envelope(s: Samples, windowSec = 0.15): Float32Array {
  const env = new Float32Array(s.length);
  const a = Math.exp(-1 / (0.02 * SR));
  const r = Math.exp(-1 / (windowSec * SR));
  let e = 0;
  for (let i = 0; i < s.length; i++) {
    const x = Math.abs(s[i]);
    e = x > e ? a * e + (1 - a) * x : r * e + (1 - r) * x;
    env[i] = e;
  }
  return env;
}

function mix(withVoice: boolean): Samples {
  const out = new Float32Array(music.length);
  const venv = envelope(voice, 0.35);
  for (let i = 0; i < out.length; i++) {
    const duck = withVoice ? 1 - 0.65 * Math.min(1, venv[i] * 8) : 1;
    out[i] = music[i] * 0.55 * duck + sfx[i] * 0.6 + (withVoice ? voice[i] : 0);
  }
  // soft limiter
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.1) * 0.9;
  return out;
}

writeFileSync(path.join(outDir, "lektor.wav"), encodeWav(voice, SR));
writeFileSync(path.join(outDir, "mix-z-lektorem.wav"), encodeWav(mix(true), SR));
writeFileSync(path.join(outDir, "mix-bez-lektora.wav"), encodeWav(mix(false), SR));
writeFileSync(path.join(root, "remotion", "elektryk", "captions.json"), JSON.stringify(captions, null, 1) + "\n");
console.log(`✓ ${captions.length} napisów → remotion/elektryk/captions.json`);
console.log("✓ audio →", path.relative(root, outDir));
void readFileSync;
