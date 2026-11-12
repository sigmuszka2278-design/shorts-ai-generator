/**
 * Tiny offline synthesizer used to create the app's sound effects and
 * background music as WAV files – no external assets or paid APIs needed.
 */

export type Samples = Float32Array;

export function encodeWav(samples: Samples, sampleRate: number): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}

export function normalizePeak(samples: Samples, peak = 0.9): Samples {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  if (max === 0) return samples;
  const k = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= k;
  return samples;
}

/** Deterministic noise. */
export function noiseGen(seed = 1) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
}

export type Wave = "sine" | "triangle" | "square" | "saw";

function osc(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "triangle":
      return 1 - 4 * Math.abs(p - 0.5);
    case "square":
      return p < 0.5 ? 1 : -1;
    case "saw":
      return 2 * p - 1;
  }
}

/** Renders a tone whose frequency follows `freq(t)` with an envelope `env(t)`. */
export function tone(
  out: Samples,
  sr: number,
  start: number,
  duration: number,
  freq: (t: number) => number,
  env: (t: number) => number,
  wave: Wave = "sine",
  gain = 1,
) {
  let phase = 0;
  const s0 = Math.floor(start * sr);
  const n = Math.floor(duration * sr);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / sr;
    phase += freq(t) / sr;
    out[s0 + i] += osc(wave, phase) * env(t) * gain;
  }
}

export const expDecay = (rate: number) => (t: number) => Math.exp(-t * rate);
export const attackDecay = (attack: number, rate: number) => (t: number) =>
  t < attack ? t / attack : Math.exp(-(t - attack) * rate);

export function bell(out: Samples, sr: number, start: number, f: number, duration: number, gain = 1) {
  const partials = [
    [1, 1],
    [2.01, 0.5],
    [3.0, 0.25],
    [4.2, 0.12],
  ];
  for (const [mult, amp] of partials) {
    tone(out, sr, start, duration, () => f * mult, attackDecay(0.004, 3.5 + mult), "sine", gain * amp);
  }
}

export const SFX_SAMPLE_RATE = 44100;

export function makeSfx(name: string, sr = SFX_SAMPLE_RATE): Samples {
  const len = (s: number) => new Float32Array(Math.floor(s * sr));
  const noise = noiseGen(42);
  switch (name) {
    case "pop": {
      const out = len(0.18);
      tone(out, sr, 0, 0.18, (t) => 900 * Math.exp(-t * 18) + 220, expDecay(28));
      for (let i = 0; i < 300; i++) out[i] += noise() * 0.3 * (1 - i / 300);
      return normalizePeak(out, 0.85);
    }
    case "bubble": {
      const out = len(0.22);
      tone(out, sr, 0, 0.22, (t) => 300 + 1400 * t * 4, attackDecay(0.01, 16), "sine");
      return normalizePeak(out, 0.8);
    }
    case "boing": {
      const out = len(0.6);
      tone(out, sr, 0, 0.6, (t) => 180 + 140 * Math.sin(t * 2 * Math.PI * 14) * Math.exp(-t * 4) + 120 * t, expDecay(5), "triangle");
      return normalizePeak(out, 0.85);
    }
    case "sparkle": {
      const out = len(0.9);
      const notes = [2093, 2637, 3136, 3520, 4186, 3136, 2637];
      notes.forEach((f, i) => bell(out, sr, i * 0.07, f, 0.5, 0.45));
      return normalizePeak(out, 0.7);
    }
    case "whoosh": {
      const out = len(0.55);
      let lp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / sr;
        const cutoff = 0.02 + 0.25 * Math.sin((Math.PI * t) / 0.55);
        lp += cutoff * (noise() - lp);
        out[i] = lp * Math.sin((Math.PI * t) / 0.55);
      }
      return normalizePeak(out, 0.6);
    }
    case "chime": {
      const out = len(1.6);
      [1318.5, 1568, 2093].forEach((f, i) => bell(out, sr, i * 0.12, f, 1.3, 0.6));
      return normalizePeak(out, 0.75);
    }
    case "magic": {
      const out = len(1.4);
      const scale = [523, 659, 784, 988, 1047, 1319, 1568, 1976, 2093];
      scale.forEach((f, i) => bell(out, sr, i * 0.06, f, 0.8, 0.5));
      tone(out, sr, 0, 1.2, (t) => 400 + 1600 * t, attackDecay(0.3, 3), "sine", 0.15);
      return normalizePeak(out, 0.75);
    }
    case "tada": {
      const out = len(1.6);
      const chord = [523.25, 659.25, 783.99, 1046.5];
      tone(out, sr, 0, 0.12, () => 392, attackDecay(0.005, 10), "square", 0.15);
      chord.forEach((f) => {
        tone(out, sr, 0.14, 1.4, () => f, attackDecay(0.02, 2.2), "triangle", 0.4);
        tone(out, sr, 0.14, 1.4, (t) => f * (1 + 0.004 * Math.sin(t * 30)), attackDecay(0.02, 2.5), "square", 0.06);
      });
      return normalizePeak(out, 0.8);
    }
    case "squeak": {
      const out = len(0.3);
      tone(out, sr, 0, 0.12, (t) => 900 + 2500 * t * 8, attackDecay(0.01, 10), "triangle");
      tone(out, sr, 0.13, 0.15, (t) => 1500 + 1200 * Math.sin(t * 60), attackDecay(0.01, 14), "triangle", 0.8);
      return normalizePeak(out, 0.6);
    }
    case "thump": {
      const out = len(0.25);
      tone(out, sr, 0, 0.25, (t) => 140 * Math.exp(-t * 10) + 50, expDecay(18));
      return normalizePeak(out, 0.9);
    }
    default:
      throw new Error(`Unknown sfx ${name}`);
  }
}

export const SFX_NAMES = ["pop", "bubble", "boing", "sparkle", "whoosh", "chime", "magic", "tada", "squeak", "thump"] as const;

// ── background music ─────────────────────────────────────────────

const NOTE_FREQ = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Track {
  bpm: number;
  /** chord roots (midi) per bar */
  progression: number[][];
  melody: (bar: number, beat: number, rnd: () => number) => number | null;
  lead: Wave;
  swing?: number;
}

export const MUSIC_SAMPLE_RATE = 32000;
export const MUSIC_DURATION = 22;

export function makeMusic(name: string, sr = MUSIC_SAMPLE_RATE, seconds = MUSIC_DURATION): Samples {
  const out = new Float32Array(Math.floor(seconds * sr));
  const rand = noiseGen(name.length * 7919);
  const r01 = () => (rand() + 1) / 2;
  const C = [60, 64, 67];
  const F = [65, 69, 72];
  const G = [67, 71, 74];
  const Am = [57, 60, 64];
  const pent = [60, 62, 64, 67, 69, 72, 74, 76];

  const tracks: Record<string, Track> = {
    wesola: {
      bpm: 120,
      progression: [C, G, Am, F],
      lead: "triangle",
      melody: (bar, beat) => (beat % 1 === 0 || r01() > 0.5 ? pent[Math.floor(r01() * pent.length)] + 12 : null),
    },
    skoczna: {
      bpm: 138,
      progression: [C, F, G, C],
      lead: "square",
      melody: (bar, beat) => (r01() > 0.3 ? pent[Math.floor(r01() * 6)] + 12 : null),
    },
    marzycielska: {
      bpm: 84,
      progression: [F, C, Am, G],
      lead: "sine",
      melody: (bar, beat) => (beat % 1 === 0 && r01() > 0.25 ? pent[Math.floor(r01() * pent.length)] + 12 : null),
    },
  };
  const track = tracks[name];
  if (!track) throw new Error(`Unknown music ${name}`);
  const beat = 60 / track.bpm;
  const barLen = beat * 4;
  const bars = Math.ceil(seconds / barLen);

  for (let bar = 0; bar < bars; bar++) {
    const chord = track.progression[bar % track.progression.length];
    const t0 = bar * barLen;
    // pad / chord
    for (const n of chord) {
      tone(out, sr, t0, barLen, () => NOTE_FREQ(n), (t) => Math.min(1, t * 8) * Math.max(0, 1 - t / barLen) * 0.9 + 0.1, "sine", 0.07);
    }
    // bass on beats 1 and 3
    for (const b of [0, 2]) {
      tone(out, sr, t0 + b * beat, beat * 0.9, () => NOTE_FREQ(chord[0] - 24), attackDecay(0.01, 4), "triangle", 0.28);
    }
    // percussion: soft kick + shaker
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * beat;
      tone(out, sr, tb, 0.15, (t) => 110 * Math.exp(-t * 20) + 45, expDecay(25), "sine", name === "marzycielska" ? 0.12 : 0.35);
      const s0 = Math.floor((tb + beat / 2) * sr);
      for (let i = 0; i < sr * 0.05 && s0 + i < out.length; i++) {
        out[s0 + i] += rand() * 0.04 * Math.exp(-i / (sr * 0.012));
      }
    }
    // melody (eighth notes)
    for (let step = 0; step < 8; step++) {
      const note = track.melody(bar, step / 2, r01);
      if (note == null) continue;
      tone(out, sr, t0 + step * (beat / 2), beat * 0.45, () => NOTE_FREQ(note), attackDecay(0.01, 6), track.lead, track.lead === "square" ? 0.05 : 0.16);
      if (track.lead === "sine") bell(out, sr, t0 + step * (beat / 2), NOTE_FREQ(note) * 2, 0.6, 0.04);
    }
  }
  // fade out last second
  const fade = sr * 1.0;
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return normalizePeak(out, 0.8);
}

export const MUSIC_NAMES = ["wesola", "skoczna", "marzycielska"] as const;
