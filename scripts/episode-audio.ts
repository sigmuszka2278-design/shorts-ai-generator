/**
 * Builds the music & effects track of episode 1 and the dubbing subtitles.
 *
 *   npm run episode:audio
 *
 * Output:
 *   public/episode/odc01-audio.wav         – full 4:00 mix (music + SFX, dipped under dialogue for the voice-over)
 *   public/episode/odc01-shorts-audio.wav  – audio of the vertical Shorts cut
 *   scenariusze/tosia-01-dialogi.srt       – dialogue with timings for recording voices
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodeWav } from "../lib/audio/synth";
import {
  DIALOGUE,
  EIGHTH,
  EPISODE_SECONDS,
  SFX,
  SONG_CHORDS,
  SONG_INTRO,
  SPEAKERS,
  songTimeline,
  type Sfx,
} from "../remotion/episode/cues";
import { SHORTS_CUTS, SHORTS_SECONDS } from "../remotion/episode/shortsCuts";

const SR = 44100;
type Buf = Float32Array;

// ── primitives ──────────────────────────────────────────────────
let seed = 12345;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 4294967296) * 2 - 1;
};
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
type Wave = "sine" | "tri" | "sq";
const osc = (w: Wave, p: number) => {
  const f = p - Math.floor(p);
  return w === "sine" ? Math.sin(2 * Math.PI * f) : w === "tri" ? 1 - 4 * Math.abs(f - 0.5) : f < 0.5 ? 1 : -1;
};

function tone(out: Buf, start: number, dur: number, freq: (t: number) => number, env: (t: number) => number, w: Wave = "sine", gain = 1) {
  let ph = 0;
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0) continue;
    if (k >= out.length) break;
    const t = i / SR;
    ph += freq(t) / SR;
    out[k] += osc(w, ph) * env(t) * gain;
  }
}

/** One-pole low-passed noise with an envelope. */
function noise(out: Buf, start: number, dur: number, env: (t: number) => number, cutoff: number | ((t: number) => number) = 0.2, gain = 1, hp = false) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0) continue;
    if (k >= out.length) break;
    const t = i / SR;
    const c = typeof cutoff === "number" ? cutoff : cutoff(t);
    const x = rand();
    lp += c * (x - lp);
    out[k] += (hp ? x - lp : lp) * env(t) * gain;
  }
}

const ad = (a: number, rate: number) => (t: number) => (t < a ? t / a : Math.exp(-(t - a) * rate));
const swell = (dur: number) => (t: number) => Math.sin((Math.PI * Math.min(t, dur)) / dur);

function bell(out: Buf, start: number, f: number, dur = 1.2, gain = 1) {
  for (const [m, a] of [
    [1, 1],
    [2.01, 0.45],
    [3.0, 0.22],
    [4.2, 0.1],
  ]) {
    tone(out, start, dur, () => f * m, ad(0.003, 3 + m * 1.2), "sine", gain * a);
  }
}

function xylo(out: Buf, start: number, f: number, gain = 1) {
  tone(out, start, 0.6, () => f, ad(0.002, 9), "sine", gain);
  tone(out, start, 0.25, () => f * 4, ad(0.001, 30), "sine", gain * 0.3);
}

/** Karplus–Strong plucked string (ukulele-like). */
function pluck(out: Buf, start: number, f: number, dur = 1.0, gain = 1) {
  const period = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(period);
  for (let i = 0; i < period; i++) buf[i] = rand() * 0.8;
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k >= out.length) break;
    const next = (idx + 1) % period;
    const v = 0.497 * (buf[idx] + buf[next]);
    const y = buf[idx];
    buf[idx] = v;
    idx = next;
    if (k >= 0) out[k] += y * gain * Math.min(1, (n - i) / (SR * 0.05));
  }
}

const mix = (dst: Buf, src: Buf, at: number, gain = 1) => {
  const s0 = Math.floor(at * SR);
  for (let i = 0; i < src.length; i++) {
    const k = s0 + i;
    if (k >= 0 && k < dst.length) dst[k] += src[i] * gain;
  }
};

const len = (s: number) => new Float32Array(Math.floor(s * SR));

// ── sound effects ───────────────────────────────────────────────
function sfx(name: Sfx): Buf {
  switch (name) {
    case "dzyn": {
      const o = len(1.8);
      bell(o, 0, 1568, 1.7, 0.6);
      bell(o, 0.01, 2349, 1.5, 0.4);
      bell(o, 0.02, 3136, 1.2, 0.25);
      return o;
    }
    case "whoosh": {
      const o = len(0.6);
      noise(o, 0, 0.6, swell(0.6), (t) => 0.03 + 0.3 * Math.sin((Math.PI * t) / 0.6), 0.9);
      return o;
    }
    case "skid": {
      const o = len(0.7);
      noise(o, 0, 0.7, (t) => Math.exp(-t * 3) * (0.7 + 0.3 * Math.sin(t * 90)), 0.35, 0.6, true);
      return o;
    }
    case "sparkle": {
      const o = len(1.2);
      [2093, 2637, 3136, 3520, 4186, 3136, 2637].forEach((f, i) => bell(o, i * 0.07, f, 0.6, 0.22));
      return o;
    }
    case "mlask": {
      const o = len(0.2);
      tone(o, 0, 0.12, (t) => 700 * Math.exp(-t * 25) + 180, ad(0.002, 30), "sine", 0.7);
      noise(o, 0, 0.03, (t) => 1 - t / 0.03, 0.6, 0.4);
      return o;
    }
    case "tirli": {
      const o = len(1.0);
      [72, 76, 79, 84, 88].forEach((m, i) => xylo(o, i * 0.08, midi(m), 0.35));
      return o;
    }
    case "slide_down": {
      const o = len(1.0);
      tone(o, 0, 0.9, (t) => 820 - 560 * (t / 0.9) + Math.sin(t * 35) * 12, (t) => Math.min(1, t * 20) * (1 - t / 0.9), "tri", 0.35);
      return o;
    }
    case "pop": {
      const o = len(0.2);
      tone(o, 0, 0.18, (t) => 900 * Math.exp(-t * 18) + 220, ad(0.002, 26), "sine", 0.7);
      return o;
    }
    case "question": {
      const o = len(1.4);
      bell(o, 0, midi(88), 0.7, 0.35);
      tone(o, 0.22, 0.9, (t) => midi(93) * (1 + 0.06 * Math.min(1, t * 3)), ad(0.01, 3), "sine", 0.35);
      return o;
    }
    case "squeak": {
      const o = len(0.3);
      tone(o, 0, 0.12, (t) => 900 + 20000 * t, ad(0.01, 10), "tri", 0.4);
      tone(o, 0.13, 0.15, (t) => 1500 + 1200 * Math.sin(t * 60), ad(0.01, 14), "tri", 0.3);
      return o;
    }
    case "giggle": {
      const o = len(0.9);
      for (let i = 0; i < 6; i++) {
        const f = i % 2 ? 980 : 1150;
        tone(o, i * 0.12, 0.09, (t) => f * (1 - t * 2), (t) => Math.sin((Math.PI * t) / 0.09), "tri", 0.22);
      }
      return o;
    }
    case "drumroll": {
      const o = len(5.0);
      for (let t = 0; t < 4.7; t += 0.055) {
        const g = 0.08 + 0.35 * (t / 4.7);
        noise(o, t, 0.05, (x) => Math.exp(-x * 60), 0.5, g);
      }
      noise(o, 4.7, 0.3, (x) => Math.exp(-x * 12), 0.6, 0.5, true);
      return o;
    }
    case "boing": {
      const o = len(0.6);
      tone(o, 0, 0.6, (t) => 180 + 140 * Math.sin(t * 2 * Math.PI * 14) * Math.exp(-t * 4) + 160 * t, (t) => Math.exp(-t * 5), "tri", 0.65);
      return o;
    }
    case "tup": {
      const o = len(0.12);
      tone(o, 0, 0.12, (t) => 160 * Math.exp(-t * 18) + 70, ad(0.002, 35), "sine", 0.55);
      return o;
    }
    case "step": {
      const o = len(0.2);
      tone(o, 0, 0.18, (t) => 110 * Math.exp(-t * 14) + 50, ad(0.003, 22), "sine", 0.6);
      noise(o, 0, 0.06, (t) => Math.exp(-t * 60), 0.1, 0.15);
      return o;
    }
    case "rise": {
      const o = len(1.6);
      tone(o, 0, 1.5, (t) => 300 + 1300 * (t / 1.5) ** 1.3, (t) => Math.min(1, t * 6) * (1 - t / 1.5), "tri", 0.3);
      return o;
    }
    case "spin": {
      const o = len(0.5);
      noise(o, 0, 0.5, swell(0.5), (t) => 0.05 + 0.4 * (t / 0.5), 0.6);
      return o;
    }
    case "bum": {
      const o = len(0.7);
      tone(o, 0, 0.6, (t) => 120 * Math.exp(-t * 6) + 45, ad(0.003, 7), "sine", 1);
      noise(o, 0, 0.3, (t) => Math.exp(-t * 14), 0.25, 0.5);
      return o;
    }
    case "rustle": {
      const o = len(0.9);
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * 0.8 + rand() * 0.01;
        noise(o, t, 0.04, (x) => Math.exp(-x * 80), 0.7, 0.25 * (1 - t / 0.9) + 0.05, true);
      }
      return o;
    }
    case "pip": {
      const o = len(0.2);
      tone(o, 0, 0.12, (t) => 1800 + 2500 * t, ad(0.005, 18), "tri", 0.25);
      return o;
    }
    case "plum": {
      const o = len(0.3);
      tone(o, 0, 0.25, (t) => 300 + 5000 * t, ad(0.005, 14), "sine", 0.6);
      return o;
    }
    case "leaf_fall": {
      const o = len(2.4);
      tone(o, 0, 2.3, (t) => 1300 - 500 * (t / 2.3) + Math.sin(t * 9) * 60, (t) => Math.min(1, t * 4) * (1 - t / 2.3), "sine", 0.14);
      return o;
    }
    case "apsik": {
      const o = len(0.7);
      noise(o, 0, 0.6, (t) => (t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 7)), 0.5, 0.9, true);
      tone(o, 0, 0.12, (t) => 500 - 1500 * t, ad(0.002, 20), "tri", 0.3);
      return o;
    }
    case "ding": {
      const o = len(1.5);
      bell(o, 0, 2093, 1.4, 0.55);
      bell(o, 0.005, 3136, 1.0, 0.25);
      return o;
    }
    case "plusk": {
      const o = len(0.8);
      noise(o, 0, 0.35, (t) => Math.exp(-t * 10), 0.4, 0.5, true);
      for (let i = 0; i < 4; i++) tone(o, 0.05 + i * 0.07, 0.15, (t) => 400 + 3000 * t + i * 120, ad(0.005, 18), "sine", 0.35);
      return o;
    }
    case "sad": {
      const o = len(1.8);
      tone(o, 0, 1.7, (t) => midi(79) * Math.pow(2, (-5 * Math.min(1, t / 1.4)) / 12) * (1 + 0.012 * Math.sin(t * 30)), (t) => Math.min(1, t * 6) * Math.max(0, 1 - t / 1.7), "sine", 0.3);
      return o;
    }
    case "blink": {
      const o = len(0.08);
      tone(o, 0, 0.06, () => 2400, ad(0.001, 60), "sine", 0.2);
      return o;
    }
    case "pac": {
      const o = len(0.3);
      tone(o, 0, 0.2, (t) => 90 * Math.exp(-t * 10) + 50, ad(0.002, 20), "sine", 0.8);
      noise(o, 0, 0.12, (t) => Math.exp(-t * 30), 0.2, 0.3);
      return o;
    }
    case "klik": {
      const o = len(0.05);
      noise(o, 0, 0.02, (t) => 1 - t / 0.02, 0.9, 0.5, true);
      tone(o, 0, 0.03, () => 1800, ad(0.001, 120), "sine", 0.3);
      return o;
    }
    case "bip": {
      const o = len(0.8);
      bell(o, 0, midi(81), 0.7, 0.5);
      return o;
    }
    case "bip_hi": {
      const o = len(1.4);
      bell(o, 0, midi(88), 1.3, 0.55);
      bell(o, 0, midi(84), 1.3, 0.3);
      return o;
    }
    case "puf": {
      const o = len(0.4);
      noise(o, 0, 0.35, (t) => Math.exp(-t * 12), 0.08, 1.2);
      return o;
    }
    case "pyk": {
      const o = len(0.2);
      tone(o, 0, 0.15, (t) => 1400 * Math.exp(-t * 20) + 300, ad(0.001, 30), "sine", 0.7);
      return o;
    }
    case "tada": {
      const o = len(1.8);
      tone(o, 0, 0.12, () => 392, ad(0.005, 10), "tri", 0.2);
      for (const f of [523.25, 659.25, 783.99, 1046.5]) {
        tone(o, 0.14, 1.5, () => f, ad(0.02, 2.2), "tri", 0.18);
        xylo(o, 0.14, f * 2, 0.08);
      }
      return o;
    }
    case "tiktak": {
      const o = len(4.4);
      for (let i = 0; i < 8; i++) {
        const t = i * 0.55;
        tone(o, t, 0.05, () => (i % 2 ? 1700 : 2400), ad(0.001, 90), "sine", 0.35);
        noise(o, t, 0.02, (x) => 1 - x / 0.02, 0.8, 0.12, true);
      }
      return o;
    }
    case "burr": {
      const o = len(1.2);
      tone(o, 0, 1.1, (t) => 85 + Math.sin(t * 9) * 15, (t) => Math.min(1, t * 8) * (1 - t / 1.1) * (0.6 + 0.4 * Math.sin(t * 160)), "tri", 0.5);
      return o;
    }
    case "chlup": {
      const o = len(0.6);
      noise(o, 0, 0.4, (t) => Math.exp(-t * 9), 0.15, 0.7);
      tone(o, 0, 0.35, (t) => 500 - 900 * t, ad(0.005, 9), "sine", 0.5);
      return o;
    }
    case "chirp": {
      const o = len(0.6);
      for (let i = 0; i < 2; i++) tone(o, i * 0.2, 0.12, (t) => 3000 + 14000 * t, (t) => Math.sin((Math.PI * t) / 0.12), "sine", 0.3);
      return o;
    }
    case "chew": {
      const o = len(0.5);
      for (let i = 0; i < 3; i++) tone(o, i * 0.14, 0.08, (t) => 380 - 1000 * t, ad(0.002, 35), "sine", 0.35);
      return o;
    }
    case "stuk": {
      const o = len(0.5);
      for (let i = 0; i < 2; i++) {
        tone(o, i * 0.22, 0.12, () => 420, ad(0.001, 40), "sine", 0.5);
        tone(o, i * 0.22, 0.05, () => 1300, ad(0.001, 90), "sine", 0.2);
      }
      return o;
    }
    case "curious": {
      const o = len(1.3);
      tone(o, 0, 1.2, (t) => midi(72) * Math.pow(2, (7 * Math.min(1, t / 0.9)) / 12) * (1 + 0.01 * Math.sin(t * 30)), (t) => Math.min(1, t * 6) * (1 - t / 1.2), "sine", 0.3);
      return o;
    }
    case "end_chime": {
      const o = len(2.0);
      bell(o, 0, midi(84), 1.8, 0.4);
      bell(o, 0.25, midi(91), 1.6, 0.4);
      return o;
    }
  }
}

// ── music ───────────────────────────────────────────────────────
const UKE: Record<string, number[]> = {
  C: [67, 60, 64, 72],
  G: [67, 62, 71, 74],
  Am: [69, 60, 64, 69],
  F: [69, 60, 65, 69],
};

/** Gentle ukulele + xylophone bed (100 BPM, C G Am F). */
function bed(seconds: number): Buf {
  const out = len(seconds);
  const beat = 60 / 100;
  const bar = beat * 4;
  const prog = ["C", "G", "Am", "F"];
  const pent = [72, 74, 76, 79, 81, 84];
  const strum = [0, 1, 3, 4, 6]; // eighth positions
  for (let b = 0; b * bar < seconds; b++) {
    const ch = UKE[prog[b % 4]];
    const t0 = b * bar;
    for (const e of strum) {
      const up = e % 2 === 1;
      ch.forEach((m, i) => pluck(out, t0 + e * (beat / 2) + (up ? 3 - i : i) * 0.012, midi(m), 0.9, up ? 0.08 : 0.12));
    }
    tone(out, t0, beat * 1.8, () => midi(48 + ((ch[1] - 60 + 12) % 12)), ad(0.01, 2.5), "sine", 0.18);
    tone(out, t0 + beat * 2, beat * 1.8, () => midi(48 + ((ch[1] - 60 + 12) % 12)), ad(0.01, 2.5), "sine", 0.14);
    // sparse xylophone melody every other bar
    if (b % 2 === 1) {
      for (let k = 0; k < 3; k++) {
        const m = pent[Math.floor(((Math.sin(b * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1 * pent.length)];
        xylo(out, t0 + k * beat, midi(m), 0.07);
      }
    }
    for (let k = 0; k < 8; k++) noise(out, t0 + k * (beat / 2), 0.04, (x) => Math.exp(-x * 70), 0.9, k % 2 ? 0.025 : 0.015, true);
  }
  return out;
}

/** Bed volume automation (episode time → gain). */
function bedGain(t: number): number {
  const pts: [number, number][] = [
    [0, 0],
    [6.0, 0],
    [7.0, 0.32],
    [25.0, 0.32],
    [25.5, 0.07],
    [29.8, 0.07],
    [30.4, 0.32],
    [35.0, 0.32],
    [35.5, 0.12],
    [40.0, 0.12],
    [40.4, 0.32],
    [55.6, 0.32],
    [56.0, 0.15],
    [60.0, 0.15],
    [60.4, 0.32],
    [100.2, 0.32],
    [100.6, 0.08],
    [104.0, 0.08],
    [105.0, 0.2],
    [110.0, 0.2],
    [110.5, 0.32],
    [145.0, 0.32],
    [145.5, 0.07],
    [149.8, 0.07],
    [150.3, 0.32],
    [159.8, 0.32],
    [160.4, 0.03],
    [169.8, 0.03],
    [170.3, 0.34],
    [189.6, 0.34],
    [190.0, 0],
    [219.9, 0],
    [220.2, 0.26],
    [224.6, 0.26],
    [225.2, 0],
  ];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      return v0 + (v1 - v0) * ((t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return 0;
}

/** The end song "Hop-hop, malinka" (96 BPM), starting at SONG_INTRO. */
function song(): Buf {
  const bars = SONG_CHORDS.length;
  const bar = EIGHTH * 8;
  const out = len(bars * bar + 2);
  const names: Record<number, string> = { 60: "C", 67: "G", 65: "F", 69: "Am" };
  SONG_CHORDS.forEach((root, b) => {
    const ch = UKE[names[root]];
    const t0 = b * bar;
    for (const e of [0, 2, 3, 4, 6, 7]) {
      const up = e % 2 === 1;
      ch.forEach((m, i) => pluck(out, t0 + e * EIGHTH + (up ? 3 - i : i) * 0.01, midi(m), 0.8, up ? 0.09 : 0.14));
    }
    for (const q of [0, 2]) tone(out, t0 + q * 2 * EIGHTH, 2 * EIGHTH * 1.8, () => midi(root - 24), ad(0.01, 3), "tri", 0.3);
    for (const q of [0, 1, 2, 3]) {
      tone(out, t0 + q * 2 * EIGHTH, 0.15, (t) => 110 * Math.exp(-t * 20) + 45, ad(0.002, 25), "sine", 0.4);
      if (q % 2 === 1) noise(out, t0 + q * 2 * EIGHTH, 0.12, (x) => Math.exp(-x * 30), 0.7, 0.18, true); // clap
    }
  });
  // melody: "sung" lead (triangle with vibrato) doubled by a bell an octave up
  for (const s of songTimeline()) {
    if (!s.text) continue;
    const st = s.s - SONG_INTRO;
    const d = s.e - s.s;
    const f = midi(s.midi);
    tone(out, st, d * 0.95, (t) => f * (1 + 0.012 * Math.sin(t * 34) * Math.min(1, t * 4)), (t) => Math.min(1, t * 30) * Math.max(0, 1 - Math.max(0, t - d * 0.7) / (d * 0.3)), "tri", 0.26);
    tone(out, st, d * 0.95, () => f, (t) => Math.min(1, t * 30) * Math.exp(-t * 2), "sine", 0.12);
    bell(out, st, f * 2, 0.6, 0.05);
  }
  // final chord shimmer
  [72, 76, 79, 84].forEach((m, i) => bell(out, bars * bar - bar + i * 0.08, midi(m), 1.6, 0.12));
  return out;
}

/** Mysterious, soft music for the teaser (blue egg). */
function mystery(seconds: number): Buf {
  const out = len(seconds);
  const arp = [69, 72, 76, 79, 76, 72, 65, 69, 72, 77, 72, 69];
  for (let i = 0; i * 0.42 < seconds - 1.5; i++) bell(out, i * 0.42, midi(arp[i % arp.length] + 12), 1.4, 0.08);
  for (const [t0, ch] of [
    [0, [57, 64, 69]],
    [4, [53, 60, 65]],
    [8, [57, 64, 69]],
    [12, [55, 62, 67]],
  ] as [number, number[]][]) {
    for (const m of ch) tone(out, t0, 4.2, () => midi(m), (t) => Math.min(1, t / 1.2) * Math.min(1, (4.2 - t) / 1.2), "sine", 0.05);
  }
  return out;
}

function normalize(buf: Buf, peak = 0.89) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  const k = m > 0 ? peak / m : 1;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
}

/** Soft limiter so loud SFX don't clip while quiet parts stay audible. */
function softClip(buf: Buf) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * 1.1) / Math.tanh(1.1);
}

function buildEpisode(): Buf {
  const out = len(EPISODE_SECONDS);
  // background bed with automation + ducking under dialogue (room for the voice-over)
  const b = bed(EPISODE_SECONDS);
  let duck = 1;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const speaking = DIALOGUE.some((l) => t >= l.s - 0.1 && t < l.e);
    const target = speaking ? 0.6 : 1;
    duck += (target - duck) * 0.0004;
    out[i] += b[i] * bedGain(t) * duck;
  }
  mix(out, song(), SONG_INTRO, 0.42);
  mix(out, mystery(16), 223.2, 0.7);
  for (const [t, name, gain = 1] of SFX) mix(out, sfx(name), t, 0.85 * gain);
  // fade out the last second
  for (let i = 0; i < SR; i++) out[out.length - 1 - i] *= i / SR;
  softClip(out);
  normalize(out);
  return out;
}

function buildShorts(full: Buf): Buf {
  const out = len(SHORTS_SECONDS);
  let at = 0;
  for (const c of SHORTS_CUTS) {
    const s0 = Math.floor(c.from * SR);
    const n = Math.floor((c.to - c.from) * SR);
    const d0 = Math.floor(at * SR);
    const fade = Math.floor(0.04 * SR);
    for (let i = 0; i < n && d0 + i < out.length; i++) {
      const k = Math.min(1, i / fade, (n - i) / fade);
      out[d0 + i] += full[s0 + i] * k;
    }
    at += c.to - c.from;
  }
  // ending sting under the call-to-action
  const tail = len(4);
  bell(tail, 0.1, midi(84), 1.6, 0.4);
  bell(tail, 0.35, midi(88), 1.6, 0.4);
  bell(tail, 0.6, midi(91), 2.0, 0.45);
  mix(out, tail, at, 0.7);
  for (let i = 0; i < SR * 0.5; i++) out[out.length - 1 - i] *= i / (SR * 0.5);
  return out;
}

function srtTime(t: number) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const dir = path.join(root, "public", "episode");
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const full = buildEpisode();
  writeFileSync(path.join(dir, "odc01-audio.wav"), encodeWav(full, SR));
  writeFileSync(path.join(dir, "odc01-shorts-audio.wav"), encodeWav(buildShorts(full), SR));

  const srt = DIALOGUE.map((l, i) => `${i + 1}\n${srtTime(l.s)} --> ${srtTime(l.e)}\n${SPEAKERS[l.who].name.toUpperCase()}: ${l.text}\n`).join("\n");
  writeFileSync(path.join(root, "scenariusze", "tosia-01-dialogi.srt"), srt);
  console.log(`✓ audio + SRT in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main();
