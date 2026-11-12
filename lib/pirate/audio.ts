/**
 * Offline synthesis of the "Piracki Token" soundtrack:
 *  - music: energetic trap/EDM at 150 BPM with a pirate flavour
 *    (musette accordion, 808 + claps + hi-hat rolls, formant "yo-ho" choir),
 *    silence during the slow-motion chest moment, final chord at the end;
 *  - sfx: every effect placed on the shared timeline (coin, whoosh, pings, chests, sad trombone…).
 * Everything is generated in code – no licensed samples.
 */
import { encodeWav } from "../audio/synth";
import { BEAT_SECONDS, GAME, PIRATE_FPS, PIRATE_SECONDS, SECTIONS, SFX_CUES } from "./timeline";

export const PIRATE_SR = 44100;
export { encodeWav };

type Buf = Float32Array;

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const saw = (p: number) => 2 * (p - Math.floor(p)) - 1;
const sq = (p: number) => (p - Math.floor(p) < 0.5 ? 1 : -1);
const tri = (p: number) => 1 - 4 * Math.abs(p - Math.floor(p) - 0.5);

function add(out: Buf, start: number, src: Buf, gain = 1) {
  const s0 = Math.floor(start * PIRATE_SR);
  for (let i = 0; i < src.length; i++) {
    const j = s0 + i;
    if (j >= 0 && j < out.length) out[j] += src[i] * gain;
  }
}

function sine(p: number) {
  return Math.sin(2 * Math.PI * p);
}

/** Generic oscillator voice. */
function voice(
  seconds: number,
  freq: (t: number) => number,
  env: (t: number) => number,
  wave: (p: number) => number = sine,
  gain = 1,
): Buf {
  const n = Math.max(1, Math.floor(seconds * PIRATE_SR));
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / PIRATE_SR;
    ph += freq(t) / PIRATE_SR;
    out[i] = wave(ph) * env(t) * gain;
  }
  return out;
}

/** RBJ biquad band-pass (0 dB peak), coefficients refreshed when `f` changes. */
class Biquad {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  constructor(private type: "bp" | "lp" | "hp") {}
  set(f: number, q: number) {
    const w = (2 * Math.PI * Math.min(f, PIRATE_SR * 0.45)) / PIRATE_SR;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    if (this.type === "bp") {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    } else if (this.type === "lp") {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = (1 - cos) / 2 / a0;
    } else {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = (1 + cos) / 2 / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

function filtered(src: Buf, type: "bp" | "lp" | "hp", f: (t: number) => number, q = 0.707): Buf {
  const bq = new Biquad(type);
  for (let i = 0; i < src.length; i++) {
    if (i % 32 === 0) bq.set(f(i / PIRATE_SR), q);
    src[i] = bq.run(src[i]);
  }
  return src;
}

function noise(seconds: number, env: (t: number) => number, seed = 7): Buf {
  const r = rng(seed);
  const n = Math.floor(seconds * PIRATE_SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * env(i / PIRATE_SR);
  return out;
}

const ad = (a: number, d: number) => (t: number) => (t < a ? t / a : Math.exp(-(t - a) * d));
const decay = (d: number) => (t: number) => Math.exp(-t * d);

function normalize(buf: Buf, peak: number) {
  let m = 0;
  for (const s of buf) m = Math.max(m, Math.abs(s));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / m;
  return buf;
}

/** Soft clip to glue the mix. */
function saturate(buf: Buf, drive = 1.4) {
  const k = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / k;
  return buf;
}

// ── instruments ──────────────────────────────────────────────────

/** Musette accordion: three detuned reeds, tremolo, gentle low-pass. */
function accordion(f: number, seconds: number, gain = 1): Buf {
  const n = Math.floor(seconds * PIRATE_SR);
  const out = new Float32Array(n);
  let p1 = 0,
    p2 = 0,
    p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / PIRATE_SR;
    const vib = 1 + 0.003 * Math.sin(2 * Math.PI * 5.5 * t);
    p1 += (f * vib) / PIRATE_SR;
    p2 += (f * 1.006 * vib) / PIRATE_SR;
    p3 += (f * 0.994 * vib) / PIRATE_SR;
    const env = Math.min(1, t / 0.015) * Math.min(1, (seconds - t) / 0.04) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 6 * t));
    out[i] = (saw(p1) * 0.5 + saw(p2) * 0.35 + sq(p3) * 0.2) * env * gain;
  }
  return filtered(out, "lp", () => 2600, 0.8);
}

function kick808(f: number, seconds: number): Buf {
  return voice(seconds, (t) => f + 140 * Math.exp(-t * 30), (t) => Math.min(1, t / 0.002) * Math.exp(-t * 2.4), sine);
}

function clap(seed: number): Buf {
  const bursts = noise(0.25, (t) => {
    const b = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 180) : 0), 0);
    return b * 0.6 + (t > 0.022 ? Math.exp(-(t - 0.022) * 22) : 0);
  }, seed);
  return filtered(bursts, "bp", () => 1300, 0.9);
}

function hat(seed: number, open = false): Buf {
  return filtered(noise(open ? 0.18 : 0.05, decay(open ? 22 : 90), seed), "hp", () => 7500, 0.7);
}

function crash(seed: number): Buf {
  return filtered(noise(1.8, ad(0.002, 2.2), seed), "hp", () => 4500, 0.6);
}

/** Formant "choir" singing a syllable ("yo" or "ho") on a pitch. */
function chant(syllable: "yo" | "ho", f0: number, seconds: number, seed: number): Buf {
  const n = Math.floor(seconds * PIRATE_SR);
  const src = new Float32Array(n);
  const r = rng(seed);
  const detunes = [1, 1.008, 0.993, 1.004, 0.996];
  const phases = detunes.map(() => (r() + 1) / 2);
  for (let i = 0; i < n; i++) {
    const t = i / PIRATE_SR;
    const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5 * t + 1);
    let s = 0;
    detunes.forEach((d, k) => {
      phases[k] += (f0 * d * vib) / PIRATE_SR;
      s += saw(phases[k]);
    });
    const breath = r() * (syllable === "ho" && t < 0.07 ? 1.2 : 0.06);
    src[i] = s / detunes.length + breath;
  }
  // formants: "y" ≈ i (270/2290/3010) gliding into "o" (450/800/2830)
  const fm = (a: number[], bb: number[], t: number) => {
    const k = syllable === "yo" ? Math.min(1, t / 0.09) : 1;
    return a.map((v, i) => v + (bb[i] - v) * k);
  };
  const out = new Float32Array(n);
  const gains = [1, 0.6, 0.25];
  for (let f = 0; f < 3; f++) {
    const bq = new Biquad("bp");
    for (let i = 0; i < n; i++) {
      const t = i / PIRATE_SR;
      if (i % 32 === 0) bq.set(fm([270, 2290, 3010], [450, 800, 2830], t)[f], f === 0 ? 6 : 9);
      out[i] += bq.run(src[i]) * gains[f];
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / PIRATE_SR;
    out[i] *= Math.min(1, t / 0.03) * Math.min(1, (seconds - t) / 0.12);
  }
  return out;
}

// ── music ────────────────────────────────────────────────────────

const PROG = [
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [48, 52, 55], // C
  [45, 49, 52], // A
];
/** Shanty motif in D minor over the 4-bar progression: [beat, midi, length in beats]. */
const MELODY: [number, number, number][][] = [
  [
    [0, 69, 1],
    [1, 74, 0.5],
    [1.5, 74, 0.5],
    [2, 74, 1],
    [3, 76, 0.5],
    [3.5, 77, 0.5],
  ],
  [
    [0, 77, 1],
    [1, 74, 1],
    [2, 70, 1],
    [3, 74, 1],
  ],
  [
    [0, 72, 0.5],
    [0.5, 72, 0.5],
    [1, 76, 1],
    [2, 79, 1],
    [3, 76, 1],
  ],
  [
    [0, 76, 1],
    [1, 73, 1],
    [2, 69, 2],
  ],
];

export function makePirateMusic(): Buf {
  const total = PIRATE_SECONDS;
  const out = new Float32Array(Math.floor(total * PIRATE_SR));
  const beat = BEAT_SECONDS;
  const bar = beat * 4;
  const bars = Math.ceil(total / bar);
  const sec = (f: number) => f / PIRATE_FPS;
  const silenceFrom = sec(GAME.slowmo);
  const silenceTo = sec(SECTIONS.tip.from);
  const tipFrom = sec(SECTIONS.tip.from);
  const tipTo = sec(SECTIONS.tip.to);
  const finalChord = sec(SECTIONS.cta.to) - 2 * beat;
  const muted = (t: number) => t >= silenceFrom - 0.05 && t < silenceTo;
  let seed = 100;

  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    const chord = PROG[b % 4];
    const inTip = t0 >= tipFrom - 0.01 && t0 < tipTo;

    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * beat;
      if (tb >= finalChord || muted(tb)) continue;
      // 808: on 1, on the "a" of 2, and on 3 (trap bounce), follows the chord root
      const kicks = inTip ? [0, 2] : [0, 1.75, 2.5];
      for (const kb of kicks) {
        if (Math.floor(kb) !== k) continue;
        const tk = t0 + kb * beat;
        if (muted(tk)) continue;
        add(out, tk, kick808(midi(chord[0] - 12), beat * 1.6), 0.55);
      }
      // claps on 2 and 4
      if (k === 1 || k === 3) add(out, tb, clap(seed++), 0.42);
      // accordion "oom-pah" stabs on the off-beats
      for (const n of chord) add(out, tb + beat / 2, accordion(midi(n + 12), beat * 0.38), inTip ? 0.07 : 0.085);
    }
    // hi-hats: 8ths, with 16th/32nd rolls at the end of every second bar
    for (let s = 0; s < 8; s++) {
      const th = t0 + (s * beat) / 2;
      if (th >= finalChord || muted(th)) continue;
      const roll = b % 2 === 1 && s >= 6;
      if (roll) {
        const subdiv = s === 7 ? 4 : 2;
        for (let r = 0; r < subdiv; r++) add(out, th + (r * beat) / 2 / subdiv, hat(seed++), 0.11 + r * 0.02);
      } else add(out, th, hat(seed++, s % 4 === 2), s % 2 ? 0.1 : 0.14);
    }
    // lead accordion melody (not during the tip, so the narrator is clear)
    if (!inTip) {
      for (const [bt, note, len] of MELODY[b % 4]) {
        const tn = t0 + bt * beat;
        if (tn >= finalChord || muted(tn)) continue;
        add(out, tn, accordion(midi(note), len * beat * 0.92), 0.16);
      }
    }
    // crash at the start of each section block
    if (b % 4 === 0 && !muted(t0)) add(out, t0, crash(seed++), 0.12);
  }

  // "yo-ho!" choir: hook, start of the top-3, the CTA
  const chants = [0.4, sec(SECTIONS.spots.from) - 2 * beat, sec(SECTIONS.cta.from) + beat * 0.5];
  for (const tc of chants) {
    for (const f of [midi(50), midi(57), midi(62)]) {
      add(out, tc, chant("yo", f, beat * 0.9, seed++), 0.22);
      add(out, tc + beat, chant("ho", f, beat * 1.3, seed++), 0.22);
    }
  }

  // re-entry hit when the music comes back after the silence
  add(out, tipFrom, crash(seed++), 0.18);
  add(out, tipFrom, kick808(midi(38), 0.8), 0.6);

  // final chord: big Dm with accordion + 808 + crash, ringing out to the end
  const tail = total - finalChord;
  for (const n of [50, 57, 62, 65, 69, 74]) add(out, finalChord, accordion(midi(n), tail), 0.09);
  add(out, finalChord, kick808(midi(38), tail), 0.6);
  add(out, finalChord, crash(seed++), 0.22);
  for (const f of [midi(50), midi(57), midi(62)]) add(out, finalChord, chant("ho", f, tail * 0.95, seed++), 0.18);

  // silence window (slow motion) – short fades so nothing clicks
  for (let i = 0; i < out.length; i++) {
    const t = i / PIRATE_SR;
    if (t > silenceFrom - 0.08 && t < silenceTo) {
      const g = t < silenceFrom ? (silenceFrom - t) / 0.08 : 0;
      out[i] *= g;
    }
  }
  // fade the last 0.25 s so the loop back to the coin is seamless
  const fade = Math.floor(0.25 * PIRATE_SR);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return normalize(saturate(out, 1.3), 0.89);
}

// ── sound effects ────────────────────────────────────────────────

export function makePirateSfx(name: string, seed = 3): Buf {
  switch (name) {
    case "coin": {
      const out = new Float32Array(Math.floor(1.2 * PIRATE_SR));
      for (const [at, base] of [
        [0, 2350],
        [0.09, 2800],
      ] as const) {
        for (const [m, a] of [
          [1, 1],
          [2.32, 0.6],
          [3.97, 0.4],
          [5.4, 0.25],
        ] as const) {
          add(out, at, voice(1.0, () => base * m, ad(0.001, 5 + m), sine), a * 0.4);
        }
      }
      add(out, 0, filtered(noise(0.02, decay(200), seed), "hp", () => 5000), 0.6);
      return normalize(out, 0.8);
    }
    case "whoosh": {
      const len = 0.6;
      const src = noise(len, (t) => Math.sin((Math.PI * t) / len) ** 2, seed);
      return normalize(filtered(src, "bp", (t) => 400 + 3000 * Math.sin((Math.PI * t) / len), 1.2), 0.6);
    }
    case "bassHit": {
      const out = new Float32Array(Math.floor(1.6 * PIRATE_SR));
      add(out, 0, voice(1.6, (t) => 42 + 120 * Math.exp(-t * 18), (t) => Math.min(1, t / 0.002) * Math.exp(-t * 2.2), sine), 1);
      add(out, 0, filtered(noise(0.3, decay(14), seed), "lp", () => 900), 0.5);
      return normalize(saturate(out, 2), 0.95);
    }
    case "ping": {
      const out = new Float32Array(Math.floor(0.8 * PIRATE_SR));
      add(out, 0, voice(0.8, () => 1760, ad(0.002, 6), sine), 0.6);
      add(out, 0, voice(0.8, () => 2640, ad(0.002, 9), sine), 0.3);
      add(out, 0, voice(0.8, () => 3520, ad(0.002, 12), sine), 0.15);
      return normalize(out, 0.6);
    }
    case "ding": {
      const out = new Float32Array(Math.floor(1.0 * PIRATE_SR));
      [1568, 2093].forEach((f, i) => add(out, i * 0.07, voice(0.9, () => f, ad(0.002, 5), sine), 0.5));
      return normalize(out, 0.6);
    }
    case "tick":
      return normalize(voice(0.03, () => 3200, decay(160), sq), 0.4);
    case "wind": {
      const len = 2.6;
      const src = noise(len, (t) => Math.min(1, t / 0.4) * Math.min(1, (len - t) / 0.6), seed);
      return normalize(filtered(src, "bp", (t) => 500 + 300 * Math.sin(t * 7) + 200 * Math.sin(t * 2.3), 1.6), 0.55);
    }
    case "glider": {
      const out = new Float32Array(Math.floor(0.7 * PIRATE_SR));
      add(out, 0, filtered(noise(0.5, ad(0.01, 9), seed), "lp", () => 1200), 1);
      add(out, 0, voice(0.4, (t) => 90 + 60 * Math.exp(-t * 15), decay(12), sine), 0.8);
      return normalize(out, 0.7);
    }
    case "land": {
      const out = new Float32Array(Math.floor(0.5 * PIRATE_SR));
      add(out, 0, voice(0.4, (t) => 55 + 120 * Math.exp(-t * 25), decay(10), sine), 1);
      add(out, 0, filtered(noise(0.15, decay(30), seed), "lp", () => 2000), 0.5);
      return normalize(out, 0.85);
    }
    case "chest": {
      const out = new Float32Array(Math.floor(1.0 * PIRATE_SR));
      // short wooden creak + lid thud + golden shimmer
      const creak = voice(0.16, (t) => 180 + 220 * t * 6 + 30 * Math.sin(t * 300), ad(0.01, 8), saw);
      add(out, 0, filtered(creak, "bp", () => 1100, 3), 0.5);
      add(out, 0.13, voice(0.2, (t) => 110 + 80 * Math.exp(-t * 30), decay(20), sine), 0.6);
      [2093, 2637, 3136, 4186].forEach((f, i) => add(out, 0.15 + i * 0.045, voice(0.6, () => f, ad(0.002, 7), sine), 0.18));
      return normalize(out, 0.7);
    }
    case "creak": {
      // long slow-motion lid creak: stick-slip friction pulses through a resonant band
      const len = 1.2;
      const n = Math.floor(len * PIRATE_SR);
      const src = new Float32Array(n);
      const r = rng(seed);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / PIRATE_SR;
        const f = 70 + 90 * Math.sin((Math.PI * t) / len) + 25 * r();
        ph += f / PIRATE_SR;
        src[i] = (ph - Math.floor(ph) < 0.08 ? 1 : 0) * Math.sin((Math.PI * t) / len);
      }
      const a = filtered(Float32Array.from(src), "bp", () => 900, 4);
      const b = filtered(src, "bp", () => 2300, 6);
      for (let i = 0; i < n; i++) a[i] += b[i] * 0.6;
      return normalize(a, 0.6);
    }
    case "sadTrombone": {
      // "wah – wah – wah – waaah": muted brass with a wah filter
      const out = new Float32Array(Math.floor(2.0 * PIRATE_SR));
      const notes: [number, number, number][] = [
        [0, 63, 0.26],
        [0.28, 62, 0.26],
        [0.56, 61, 0.26],
        [0.84, 60, 1.0],
      ];
      for (const [at, n, len] of notes) {
        const last = len > 0.5;
        const v = voice(len, (t) => midi(n - 12) * (last ? 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t) * Math.min(1, t * 3) : 1), (t) => Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.08), saw);
        add(out, at, filtered(v, "lp", (t) => 350 + 1100 * Math.sin(Math.PI * Math.min(1, t / Math.min(len, 0.3))), 3), 0.8);
      }
      return normalize(out, 0.75);
    }
    case "scroll": {
      const out = new Float32Array(Math.floor(0.6 * PIRATE_SR));
      for (let i = 0; i < 9; i++) add(out, i * 0.05, filtered(noise(0.06, decay(50), seed + i), "hp", () => 2500), 0.4 + 0.3 * Math.sin(i));
      return normalize(out, 0.45);
    }
    case "confetti": {
      const out = new Float32Array(Math.floor(1.6 * PIRATE_SR));
      add(out, 0, voice(0.3, (t) => 80 + 200 * Math.exp(-t * 30), decay(14), sine), 0.8);
      add(out, 0, filtered(noise(0.25, decay(18), seed), "bp", () => 1500, 0.8), 0.7);
      const r = rng(seed + 5);
      for (let i = 0; i < 26; i++) {
        const at = 0.05 + ((r() + 1) / 2) * 0.9;
        add(out, at, filtered(noise(0.02, decay(250), seed + i), "hp", () => 4000), 0.25);
      }
      [2093, 2637, 3136, 3951, 4186].forEach((f, i) => add(out, 0.1 + i * 0.06, voice(0.6, () => f, ad(0.002, 6), sine), 0.12));
      return normalize(out, 0.75);
    }
    default:
      throw new Error(`Unknown pirate sfx: ${name}`);
  }
}

/** All timeline SFX mixed into one 40 s track aligned with the video. */
export function makePirateSfxTrack(): Buf {
  const out = new Float32Array(Math.floor(PIRATE_SECONDS * PIRATE_SR));
  SFX_CUES.forEach((cue, i) => add(out, cue.at, makePirateSfx(cue.name, 11 + i * 17), cue.gain ?? 1));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.1);
  return out;
}
