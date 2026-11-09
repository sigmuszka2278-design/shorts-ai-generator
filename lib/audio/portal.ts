/**
 * Sound design for the "portal" Short: extra sound effects, a mysterious
 * loopable soundtrack and a small mixing toolkit. Everything is synthesised
 * in code (no samples), so the audio is free to use anywhere.
 */
import { attackDecay, bell, expDecay, makeSfx, noiseGen, normalizePeak, NOTE_FREQ, tone, type Samples } from "./synth";

export const SR = 44100;

// ── DSP helpers ───────────────────────────────────────────────────

/** RBJ biquad filter, applied in place. */
export function biquad(x: Samples, sr: number, type: "lp" | "hp" | "bp", freq: number | ((i: number) => number), q = 0.707) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = Math.min(sr * 0.45, Math.max(20, typeof freq === "number" ? freq : freq(i)));
    const w = (2 * Math.PI * f) / sr;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === "lp") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else if (type === "hp") {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    const xi = x[i];
    const y = (b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** Small Schroeder reverb (4 combs + 2 allpasses). Returns the wet signal. */
export function reverb(x: Samples, sr: number, size = 1, damp = 0.4, circular = false): Samples {
  const n = x.length;
  const wet = new Float32Array(n);
  const combs = [1116, 1188, 1277, 1356].map((d) => Math.round((d * size * sr) / 44100));
  const passes = circular ? 2 : 1;
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < n; i++) {
        const out = buf[idx];
        lp = out * (1 - damp) + lp * damp;
        buf[idx] = x[i] + lp * 0.84;
        idx = (idx + 1) % d;
        if (p === passes - 1) wet[i] += out * 0.25;
      }
    }
  }
  for (const d of [556, 441].map((v) => Math.round((v * sr) / 44100))) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const b = buf[idx];
      const y = -wet[i] + b;
      buf[idx] = wet[i] + b * 0.5;
      idx = (idx + 1) % d;
      wet[i] = y;
    }
  }
  return wet;
}

/** Mixes `src` into `dst` at `atSeconds` (wrapping around when `wrap` – used for the seamless loop). */
export function mixInto(dst: Samples, src: Samples, atSeconds: number, gain = 1, wrap = false) {
  const s0 = Math.round(atSeconds * SR);
  for (let i = 0; i < src.length; i++) {
    let j = s0 + i;
    if (j < 0) continue;
    if (j >= dst.length) {
      if (!wrap) break;
      j %= dst.length;
    }
    dst[j] += src[i] * gain;
  }
}

const len = (s: number) => new Float32Array(Math.floor(s * SR));

function noiseBuf(seconds: number, seed: number) {
  const out = len(seconds);
  const r = noiseGen(seed);
  for (let i = 0; i < out.length; i++) out[i] = r();
  return out;
}

function envelope(x: Samples, env: (t: number) => number) {
  for (let i = 0; i < x.length; i++) x[i] *= env(i / SR);
  return x;
}

// ── Sound effects ─────────────────────────────────────────────────

export function makePortalSfx(name: string): Samples {
  switch (name) {
    case "whoosh":
      return makeSfx("whoosh", SR);
    case "pop":
      return makeSfx("pop", SR);
    case "boing":
      return makeSfx("boing", SR);
    case "sparkle":
      return makeSfx("sparkle", SR);
    case "tada":
      return makeSfx("tada", SR);
    case "bigWhoosh": {
      const d = 1.1;
      const out = noiseBuf(d, 7);
      biquad(out, SR, "bp", (i) => 250 + 3500 * Math.pow(i / out.length, 2), 0.9);
      envelope(out, (t) => Math.pow(Math.sin((Math.PI * t) / d), 1.5) * (t / d + 0.3));
      const sub = len(d);
      tone(sub, SR, 0.4, 0.7, (t) => 90 - 50 * t, (t) => Math.sin((Math.PI * t) / 0.7), "sine", 0.8);
      for (let i = 0; i < out.length; i++) out[i] += sub[i];
      return normalizePeak(out, 0.85);
    }
    case "balloonPop": {
      const out = noiseBuf(0.18, 31);
      biquad(out, SR, "lp", 5000);
      envelope(out, expDecay(40));
      tone(out, SR, 0, 0.08, (t) => 300 - 1500 * t, expDecay(50), "sine", 0.6);
      return normalizePeak(out, 0.9);
    }
    case "tick": {
      const out = len(0.12);
      tone(out, SR, 0, 0.12, () => 1900, expDecay(60), "sine", 1);
      tone(out, SR, 0, 0.12, () => 2850, expDecay(80), "sine", 0.5);
      return normalizePeak(out, 0.8);
    }
    case "hit": {
      const out = len(0.9);
      tone(out, SR, 0, 0.9, (t) => 130 * Math.exp(-t * 14) + 45, expDecay(5), "sine", 1);
      const click = noiseBuf(0.9, 3);
      biquad(click, SR, "lp", 2500);
      envelope(click, expDecay(30));
      for (let i = 0; i < out.length; i++) out[i] += click[i] * 0.5;
      [440, 554, 659].forEach((f) => tone(out, SR, 0, 0.7, () => f, attackDecay(0.005, 5), "triangle", 0.12));
      return normalizePeak(out, 0.95);
    }
    case "riser": {
      const d = 1.0;
      const out = noiseBuf(d, 11);
      biquad(out, SR, "bp", (i) => 400 + 4000 * (i / out.length), 2);
      envelope(out, (t) => Math.pow(t / d, 2));
      tone(out, SR, 0, d, (t) => 220 * Math.pow(4, t / d), (t) => Math.pow(t / d, 1.5), "saw", 0.12);
      return normalizePeak(out, 0.7);
    }
    case "portalOpen": {
      const d = 1.0;
      const out = len(d);
      tone(out, SR, 0, d, (t) => 90 + 600 * Math.pow(t, 1.5) + 40 * Math.sin(t * 40), (t) => Math.min(1, t * 8) * Math.exp(-t * 2.5), "triangle", 0.8);
      tone(out, SR, 0, d, (t) => 180 + 1200 * t, (t) => Math.min(1, t * 6) * Math.exp(-t * 3), "sine", 0.4);
      const n = noiseBuf(d, 5);
      biquad(n, SR, "bp", (i) => 300 + 2500 * (i / n.length), 1.2);
      envelope(n, (t) => Math.sin((Math.PI * t) / d) * 0.6);
      for (let i = 0; i < out.length; i++) out[i] += n[i];
      [1047, 1319, 1568, 2093].forEach((f, i) => bell(out, SR, 0.25 + i * 0.06, f, 0.6, 0.25));
      return normalizePeak(out, 0.85);
    }
    case "squeak": {
      // rubber toy squeeze: bright pitched "eeek" with fast wobble, through a resonant body
      const d = 0.42;
      const out = len(d);
      tone(
        out,
        SR,
        0,
        d,
        (t) => 1150 + 700 * Math.sin(Math.min(1, t / d) * Math.PI) + 60 * Math.sin(t * 2 * Math.PI * 28),
        (t) => Math.min(1, t * 30) * (t < d * 0.75 ? 1 : (d - t) / (d * 0.25)),
        "square",
        0.5,
      );
      biquad(out, SR, "bp", 1900, 2.5);
      const air = noiseBuf(d, 13);
      biquad(air, SR, "bp", 3000, 1);
      envelope(air, (t) => 0.12 * Math.sin((Math.PI * t) / d));
      for (let i = 0; i < out.length; i++) out[i] += air[i];
      return normalizePeak(out, 0.8);
    }
    case "quack": {
      const out = len(0.75);
      for (const [start, f0] of [
        [0, 330],
        [0.32, 300],
      ]) {
        const q = len(0.28);
        tone(q, SR, 0, 0.28, (t) => f0 * (1 - t * 0.7), (t) => Math.min(1, t * 40) * Math.exp(-t * 6), "saw", 1);
        biquad(q, SR, "bp", (i) => 1400 - 2200 * (i / SR), 3);
        biquad(q, SR, "hp", 250);
        mixInto(out, q, start, 1);
      }
      return normalizePeak(out, 0.85);
    }
    case "balloonBurst": {
      const d = 1.9;
      const out = len(d);
      const w = noiseBuf(d, 21);
      biquad(w, SR, "bp", (i) => 600 + 2500 * Math.sin(Math.min(1, i / w.length) * Math.PI), 1);
      envelope(w, (t) => Math.min(1, t * 10) * Math.exp(-t * 1.6) * 0.7);
      for (let i = 0; i < out.length; i++) out[i] += w[i];
      const r = noiseGen(99);
      for (let k = 0; k < 22; k++) {
        const t0 = Math.abs(r()) * 1.4;
        const f0 = 350 + Math.abs(r()) * 500;
        tone(out, SR, t0, 0.16, (t) => f0 + 2600 * t * 4, attackDecay(0.008, 18), "sine", 0.35);
      }
      return normalizePeak(out, 0.85);
    }
    case "rumble": {
      const d = 2.2;
      const out = noiseBuf(d, 17);
      biquad(out, SR, "lp", 160, 1.2);
      biquad(out, SR, "lp", 200);
      envelope(out, (t) => Math.pow(Math.min(1, t / d), 1.3) * (t > d - 0.15 ? (d - t) / 0.15 : 1));
      tone(out, SR, 0, d, (t) => 48 + 6 * Math.sin(t * 9), (t) => Math.pow(t / d, 1.5) * (t > d - 0.15 ? (d - t) / 0.15 : 1), "sine", 0.06);
      return normalizePeak(out, 0.9);
    }
    case "shimmer": {
      const d = 2.6;
      const out = len(d);
      // "aah" choir: detuned saws through vowel formants
      for (const midi of [72, 76, 79, 84]) {
        for (const det of [-0.006, 0, 0.007]) {
          tone(out, SR, 0, d, (t) => NOTE_FREQ(midi) * (1 + det + 0.004 * Math.sin(t * 33 + midi)), (t) => Math.min(1, t * 3) * Math.min(1, (d - t) * 1.2), "saw", 0.05);
        }
      }
      const a = Float32Array.from(out);
      biquad(out, SR, "bp", 800, 2);
      biquad(a, SR, "bp", 1250, 3);
      for (let i = 0; i < out.length; i++) out[i] = out[i] + a[i] * 0.7;
      [2093, 2637, 3136, 4186, 3520, 2637, 3136, 4186].forEach((f, i) => bell(out, SR, 0.05 + i * 0.11, f, 1.0, 0.12));
      return normalizePeak(out, 0.75);
    }
    case "scratch": {
      const d = 0.5;
      const out = noiseBuf(d, 41);
      // back-and-forth stroke: the band sweeps up, down, up
      biquad(out, SR, "bp", (i) => {
        const t = i / SR;
        return 500 + 2600 * Math.abs(Math.sin((t / d) * Math.PI * 2.2));
      }, 4);
      envelope(out, (t) => Math.min(1, t * 60) * (0.6 + 0.4 * Math.abs(Math.sin(t * 25))) * Math.exp(-t * 2.5));
      return normalizePeak(out, 0.85);
    }
    case "giggle": {
      const out = len(0.75);
      [0, 0.15, 0.3, 0.45].forEach((t0, i) => {
        tone(out, SR, t0, 0.12, (t) => 950 + i * 60 + 300 * Math.sin(t * 60), (t) => Math.sin((Math.PI * t) / 0.12), "triangle", 0.8);
      });
      biquad(out, SR, "bp", 1800, 1.2);
      return normalizePeak(out, 0.75);
    }
    case "zap": {
      const out = len(0.9);
      tone(out, SR, 0, 0.5, (t) => 2400 * Math.exp(-t * 5) + 300, (t) => Math.min(1, t * 50) * Math.exp(-t * 5), "triangle", 0.5);
      [1568, 2093, 2637, 3136, 4186].forEach((f, i) => bell(out, SR, i * 0.04, f, 0.6, 0.3));
      return normalizePeak(out, 0.75);
    }
    case "poof": {
      const d = 0.7;
      const out = noiseBuf(d, 57);
      biquad(out, SR, "lp", (i) => 3000 * Math.exp(-(i / SR) * 4) + 300);
      envelope(out, (t) => Math.min(1, t * 80) * Math.exp(-t * 6));
      tone(out, SR, 0, 0.3, (t) => 160 * Math.exp(-t * 6) + 60, expDecay(10), "sine", 0.5);
      return normalizePeak(out, 0.85);
    }
    case "candy": {
      const out = len(1.0);
      tone(out, SR, 0, 0.22, (t) => 300 + 1400 * t * 4, attackDecay(0.01, 16), "sine", 0.7);
      [1319, 1568, 2093].forEach((f, i) => bell(out, SR, 0.12 + i * 0.09, f, 0.8, 0.45));
      return normalizePeak(out, 0.8);
    }
    default:
      throw new Error(`Unknown portal sfx: ${name}`);
  }
}

// ── Music: mysterious, loopable, 115.2 BPM = exactly 12 bars in 25 s ──

export const MUSIC_BPM = 115.2;

/**
 * @param seconds track length (25 s); notes that ring past the end wrap to the start,
 *                so the track loops without a click.
 * @param cut     [start, end] in seconds where the music stops (record-scratch gag).
 */
export function makePortalMusic(seconds: number, cut: [number, number]): Samples {
  const out = len(seconds);
  const beat = 60 / MUSIC_BPM;
  const bar = beat * 4;
  // chords (midi): Am F G E | Am F G E | F E | C E  → bar 11 (E) resolves into bar 0 (Am)
  const Am = [57, 60, 64];
  const F = [53, 57, 60];
  const G = [55, 59, 62];
  const E = [52, 56, 59];
  const C = [48, 52, 55, 60];
  const prog = [Am, F, G, E, Am, F, G, E, F, E, C, E];
  // per-bar intensity 0..1
  const energy = [0.55, 0.6, 0.75, 0.85, 0.8, 0.85, 0.85, 0.9, 0.8, 1.0, 1.0, 0.9];
  // mysterious celesta motif (bar, step(16th), midi)
  const motif: [number, number, number][] = [
    [0, 0, 81], [0, 3, 84], [0, 6, 88], [0, 10, 86], [0, 12, 84],
    [1, 0, 81], [1, 4, 77], [1, 8, 76],
    [2, 0, 79], [2, 3, 83], [2, 6, 86], [2, 10, 84], [2, 12, 83],
    [3, 0, 80], [3, 4, 83], [3, 8, 88], [3, 12, 86],
    [10, 0, 84], [10, 2, 88], [10, 4, 91], [10, 6, 96], [10, 8, 91], [10, 10, 88], [10, 12, 91],
    [11, 0, 92], [11, 4, 88], [11, 8, 83], [11, 12, 80],
  ];

  for (let b = 0; b < prog.length; b++) {
    const chord = prog[b];
    const t0 = b * bar;
    const e = energy[b];
    // pad: warm detuned triangles
    const pad = len(bar + 0.6);
    for (const n of chord) {
      for (const det of [-0.004, 0.004]) {
        tone(pad, SR, 0, bar + 0.6, (t) => NOTE_FREQ(n) * (1 + det + 0.002 * Math.sin(t * 5)), (t) => Math.min(1, t * 2.5) * Math.min(1, (bar + 0.6 - t) * 2), "triangle", 0.05);
      }
    }
    biquad(pad, SR, "lp", 1800);
    mixInto(out, pad, t0, 1, true);
    // bass pulse (eighths, root)
    for (let s = 0; s < 8; s++) {
      const accent = s % 2 === 0 ? 1 : 0.6;
      const bass = len(beat * 0.5);
      tone(bass, SR, 0, beat * 0.48, () => NOTE_FREQ(chord[0] - 12), attackDecay(0.005, 7), "triangle", 0.3 * accent * e);
      tone(bass, SR, 0, beat * 0.48, () => NOTE_FREQ(chord[0] - 24), attackDecay(0.005, 5), "sine", 0.35 * accent * e);
      mixInto(out, bass, t0 + s * beat * 0.5, 1, true);
    }
    // arpeggio (16ths), mysterious pluck
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    for (let s = 0; s < 16; s++) {
      if (e < 0.7 && s % 2 === 1) continue;
      const n = chord[arp[s % arp.length] % chord.length] + 12 + (s >= 8 && b >= 9 ? 12 : 0);
      const pl = len(0.35);
      tone(pl, SR, 0, 0.35, () => NOTE_FREQ(n), attackDecay(0.003, 14), "square", 0.035);
      tone(pl, SR, 0, 0.35, () => NOTE_FREQ(n) * 2, attackDecay(0.003, 18), "sine", 0.04);
      biquad(pl, SR, "lp", 2600);
      mixInto(out, pl, t0 + s * beat * 0.25, 0.9 * e, true);
    }
    // drums
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * beat;
      const kick = len(0.3);
      tone(kick, SR, 0, 0.3, (t) => 120 * Math.exp(-t * 22) + 42, expDecay(14), "sine", 0.55 * e);
      mixInto(out, kick, tb, 1, true);
      if (k % 2 === 1 && e >= 0.75) {
        const snare = noiseBuf(0.25, 100 + b * 4 + k);
        biquad(snare, SR, "bp", 1800, 0.8);
        envelope(snare, expDecay(18));
        tone(snare, SR, 0, 0.1, () => 190, expDecay(30), "triangle", 0.4);
        mixInto(out, snare, tb, 0.16 * e, true);
      }
      for (const off of [0.5, 0.75]) {
        const hat = noiseBuf(0.06, 300 + b * 8 + k * 2 + off * 4);
        biquad(hat, SR, "hp", 7000);
        envelope(hat, expDecay(70));
        mixInto(out, hat, tb + off * beat, (off === 0.5 ? 0.09 : 0.04) * e, true);
      }
    }
  }
  // celesta motif
  for (const [b, s, n] of motif) {
    const c = len(1.4);
    bell(c, SR, 0, NOTE_FREQ(n), 1.3, 0.22);
    mixInto(out, c, b * bar + s * beat * 0.25, 1, true);
  }

  const wet = reverb(out, SR, 1.1, 0.45, true);
  for (let i = 0; i < out.length; i++) out[i] += wet[i] * 0.35;

  // record-scratch gag: the music stops dead and fades back in
  const [c0, c1] = cut;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (t < c0 || t >= c1) continue;
    const fadeOut = Math.max(0, 1 - (t - c0) / 0.006);
    const fadeIn = t > c1 - 0.3 ? (t - (c1 - 0.3)) / 0.3 : 0;
    out[i] *= Math.max(fadeOut, fadeIn);
  }
  return normalizePeak(out, 0.8);
}
