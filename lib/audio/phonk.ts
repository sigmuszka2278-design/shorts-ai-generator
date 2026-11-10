/**
 * Offline synthesizer of an original Brazilian-phonk style track for the football edit.
 *
 * Everything (808 slides, pitched cowbell riff, tamborzão-like kick pattern, claps, hats,
 * riser, drop impact, whooshes on every cut, a synthesized "SIUUU" shout) is generated in
 * code from the same beat grid as the video (lib/edit/timeline.ts) → frame-perfect sync,
 * no licensed samples.
 */
import {
  BEAT_SECONDS,
  CUT_FRAMES,
  DROP_FRAME,
  EDIT_DURATION_FRAMES,
  EDIT_FPS,
  IMPACT_FRAMES,
  INTRO_BEATS,
  MONTAGE_BEATS,
  OUTRO_FRAME,
  SHOTS,
} from "../edit/timeline";
import { normalizePeak, type Samples } from "./synth";

export const PHONK_SAMPLE_RATE = 44100;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function noiseGen(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
}

/** RBJ biquad band-pass (constant skirt gain). */
function bandpass(sr: number, f: number, q: number) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b2 = 0, a1 = 0, a2 = 0, a0 = 1;
  const set = (freq: number) => {
    const w = (2 * Math.PI * Math.min(freq, sr * 0.45)) / sr;
    const alpha = Math.sin(w) / (2 * q);
    a0 = 1 + alpha;
    b0 = alpha;
    b2 = -alpha;
    a1 = -2 * Math.cos(w);
    a2 = 1 - alpha;
  };
  set(f);
  return {
    set,
    run(x: number) {
      const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    },
  };
}

export function makePhonk(sr = PHONK_SAMPLE_RATE): Samples {
  const total = EDIT_DURATION_FRAMES / EDIT_FPS;
  const out = new Float32Array(Math.ceil((total + 0.05) * sr));
  const noise = noiseGen(7);
  const beatT = (beat: number) => beat * BEAT_SECONDS;
  const frameT = (frame: number) => frame / EDIT_FPS;
  const step = BEAT_SECONDS / 4; // 16th note
  const dropT = frameT(DROP_FRAME);
  const outroT = frameT(OUTRO_FRAME);
  const at = (t: number) => Math.floor(t * sr);

  const add = (start: number, dur: number, fn: (t: number) => number) => {
    const s0 = at(start);
    const n = Math.floor(dur * sr);
    for (let i = 0; i < n; i++) {
      const k = s0 + i;
      if (k < 0 || k >= out.length) continue;
      out[k] += fn(i / sr);
    }
  };

  // ── instruments ────────────────────────────────────────────────

  const kick = (t0: number, gain = 1) => {
    let ph = 0;
    add(t0, 0.32, (t) => {
      const f = 48 + 190 * Math.exp(-t * 32);
      ph += f / sr;
      const click = t < 0.004 ? noise() * 0.5 * (1 - t / 0.004) : 0;
      return gain * (Math.tanh(2.2 * Math.sin(2 * Math.PI * ph)) * Math.exp(-t * 9) + click);
    });
  };

  /** Distorted 808 with optional glide (phonk slides). */
  const bass808 = (t0: number, dur: number, note: number, glideTo?: number, gain = 0.75) => {
    let ph = 0;
    const f0 = midi(note);
    const f1 = glideTo != null ? midi(glideTo) : f0;
    add(t0, dur, (t) => {
      const g = Math.min(1, t / 0.06);
      const f = f0 + (f1 - f0) * Math.pow(Math.min(1, t / dur), 0.6) * (glideTo != null ? 1 : 0);
      ph += f / sr;
      const env = Math.min(1, t * 300) * Math.exp(-t * 1.4) * Math.min(1, (dur - t) * 30);
      return gain * Math.tanh(3.2 * Math.sin(2 * Math.PI * ph) * env) * (0.6 + 0.4 * g);
    });
  };

  const clap = (t0: number, gain = 0.55) => {
    const bp = bandpass(sr, 1400, 0.9);
    add(t0, 0.25, (t) => {
      const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o === 0.022 ? 18 : 140)) : 0), 0);
      return gain * bp.run(noise()) * bursts * 2.2;
    });
  };

  const hat = (t0: number, gain = 0.12, open = false) => {
    let prev = 0;
    add(t0, open ? 0.2 : 0.05, (t) => {
      const n = noise();
      const hp = n - prev;
      prev = n;
      return gain * hp * Math.exp(-t * (open ? 18 : 90));
    });
  };

  /** The signature phonk cowbell: two detuned square waves, band-passed, short decay. */
  const cowbell = (t0: number, note: number, gain = 0.32, muffled = false) => {
    const f = midi(note);
    const bp = bandpass(sr, f * 1.6, 1.3);
    let p1 = 0, p2 = 0, lp = 0;
    add(t0, 0.42, (t) => {
      p1 += f / sr;
      p2 += (f * 1.4836) / sr;
      const sq = (p1 % 1 < 0.5 ? 1 : -1) + (p2 % 1 < 0.5 ? 1 : -1) * 0.8;
      const env = t < 0.002 ? t / 0.002 : 0.7 * Math.exp(-t * 26) + 0.3 * Math.exp(-t * 6);
      let y = bp.run(sq) * env * 1.6 + sq * env * 0.12;
      if (muffled) {
        lp += 0.06 * (y - lp);
        y = lp * 2.2;
      }
      return gain * Math.tanh(y * 1.4);
    });
  };

  const whoosh = (tCenter: number, len = 0.42, gain = 0.32) => {
    const bp = bandpass(sr, 500, 1.2);
    add(tCenter - len * 0.8, len, (t) => {
      const p = t / len;
      bp.set(400 + 5000 * p * p);
      return gain * bp.run(noise()) * Math.sin(Math.PI * Math.min(1, p * 1.1)) * 2;
    });
  };

  const impact = (t0: number, gain = 0.9, length = 1.6) => {
    let ph = 0;
    let lp = 0;
    add(t0, length, (t) => {
      const f = 34 + 90 * Math.exp(-t * 14);
      ph += f / sr;
      lp += 0.08 * (noise() - lp);
      return gain * (Math.sin(2 * Math.PI * ph) * Math.exp(-t * 2.6) + lp * 1.4 * Math.exp(-t * 4) + noise() * 0.18 * Math.exp(-t * 7));
    });
  };

  /** Synthesized crowd-ish "SIUUU": a hiss "S" followed by an "iii → uuu" vowel (formants). */
  const siuuu = (t0: number, gain = 0.5) => {
    const voices = [0, 1, 2, 3, 4];
    for (const v of voices) {
      const pitch = 210 + v * 23;
      const detune = 1 + (v - 2) * 0.012;
      const hissBp = bandpass(sr, 6000, 1.5);
      const f1 = bandpass(sr, 280, 6);
      const f2 = bandpass(sr, 2250, 9);
      const f3 = bandpass(sr, 2900, 10);
      const start = t0 + v * 0.018;
      add(start, 0.16, (t) => (gain / voices.length) * hissBp.run(noise()) * Math.min(1, t / 0.03) * 1.6);
      let ph = 0;
      const len = 1.35;
      add(start + 0.14, len, (t) => {
        const p = t / len;
        const morph = Math.min(1, Math.max(0, (p - 0.08) / 0.35)); // i → u
        f1.set(280 + 30 * morph);
        f2.set(2250 - 1400 * morph);
        f3.set(2900 - 700 * morph);
        const f = pitch * detune * (1 + 0.05 * Math.sin(t * 34 + v) * Math.min(1, t * 2)) * (1 + 0.06 * Math.sin(Math.PI * p));
        ph += f / sr;
        const src = 2 * (ph % 1) - 1 + noise() * 0.15;
        const env = Math.min(1, t / 0.05) * (p < 0.75 ? 1 : (1 - p) / 0.25);
        return (gain / voices.length) * env * (f1.run(src) * 1.4 + f2.run(src) * 0.8 + f3.run(src) * 0.35) * 3;
      });
    }
  };

  // ── arrangement ────────────────────────────────────────────────
  // Key: A minor (phrygian flavor). 2-bar cowbell riff in 16ths (null = rest).
  const riff: Array<number | null> = [
    81, null, 81, 84, null, 81, 83, null, 81, null, 79, null, 77, null, 79, 81,
    81, null, 81, 84, null, 86, 84, null, 81, null, 82, 81, 79, null, 77, 76,
  ];
  // 808 line per bar (16 steps): [step, note, length in steps, glide target?]
  const bassBars: Array<Array<[number, number, number, number?]>> = [
    [[0, 33, 3], [3, 33, 3], [6, 36, 4, 33], [10, 33, 2], [12, 31, 4, 33]],
    [[0, 33, 3], [3, 33, 3], [6, 38, 4, 36], [10, 36, 2], [12, 29, 4, 33]],
  ];
  const kickSteps = [0, 3, 6, 10, 12];

  // INTRO – dark pad, muffled riff teaser, heartbeat, riser, gap before the drop.
  const introEnd = dropT;
  for (const [n, det] of [[45, 0], [48, 0.07], [52, -0.06], [57, 0.05], [33, 0]] as const) {
    let ph = 0;
    let lp = 0;
    add(0, introEnd - step, (t) => {
      ph += midi(n + det) / sr;
      const saw = 2 * (ph % 1) - 1;
      lp += (0.012 + 0.03 * (t / introEnd)) * (saw - lp);
      return lp * 0.11 * Math.min(1, t / 1.2);
    });
  }
  for (let i = 0; i < INTRO_BEATS * 4 - 6; i++) {
    const note = riff[i % riff.length];
    if (note != null) cowbell(i * step, note, 0.13, true);
  }
  for (let beat = 0; beat < INTRO_BEATS - 1; beat += 2) {
    kick(beatT(beat), 0.55);
    kick(beatT(beat) + 0.16, 0.35);
  }
  // riser over the last 2 beats of the intro
  {
    const len = beatT(2) - step;
    const bp = bandpass(sr, 300, 2);
    let ph = 0;
    add(introEnd - beatT(2), len, (t) => {
      const p = t / len;
      bp.set(300 + 7000 * p * p);
      ph += (110 + 900 * p * p) / sr;
      return (bp.run(noise()) * 1.2 + Math.sin(2 * Math.PI * ph) * 0.15) * p * p * 0.7;
    });
  }

  // DROP + MONTAGE
  impact(dropT, 1.0, 1.8);
  const montageBars = MONTAGE_BEATS / 4;
  for (let bar = 0; bar < montageBars; bar++) {
    const t0 = dropT + bar * 4 * BEAT_SECONDS;
    const lastBar = bar === montageBars - 1;
    for (const s of kickSteps) kick(t0 + s * step, 0.95);
    for (const [s, n, l, g] of bassBars[bar % 2]) bass808(t0 + s * step, l * step, n, g);
    clap(t0 + 4 * step);
    clap(t0 + 12 * step);
    if (bar % 2 === 1) clap(t0 + 15 * step, 0.3);
    for (let s = 0; s < 16; s++) {
      const roll = bar % 2 === 1 && s >= 12;
      if (s % 2 === 0) hat(t0 + s * step, s % 4 === 2 ? 0.16 : 0.1, s === 14 && !roll);
      if (roll) {
        hat(t0 + s * step + step / 2, 0.08);
        hat(t0 + s * step + step / 4, 0.06);
      }
      const note = riff[(bar % 2) * 16 + s];
      if (note != null && !(lastBar && s >= 8)) cowbell(t0 + s * step, note, 0.3);
    }
  }
  // transitions: whoosh into every cut, impact on slow-mo peaks
  for (const f of CUT_FRAMES) {
    if (f === DROP_FRAME) continue;
    whoosh(frameT(f), f === OUTRO_FRAME ? 0.7 : 0.38, f === OUTRO_FRAME ? 0.45 : 0.28);
  }
  for (const f of IMPACT_FRAMES) impact(frameT(f), 0.45, 0.6);
  const siu = SHOTS.find((s) => s.kind === "siuuu");
  // "SIII" while spinning in the air, "UUU" as he lands
  if (siu) siuuu(frameT(siu.startFrame + siu.impact! * siu.durationInFrames) - 0.42, 0.55);

  // OUTRO – big hit on the title, half-time beat, long sliding 808, filtered riff.
  impact(outroT, 1.0, 2.6);
  bass808(outroT, BEAT_SECONDS * 4, 33, 21, 0.8);
  for (let beat = 0; beat < 6; beat++) {
    const tb = outroT + beatT(beat);
    if (beat % 2 === 0) kick(tb, 0.8);
    else clap(tb, 0.45);
    hat(tb + step * 2, 0.08);
  }
  for (let i = 0; i < 20; i++) {
    const note = riff[i];
    if (note != null) cowbell(outroT + beatT(1) + i * step, note, 0.18, true);
  }

  // master: fade the very end, gentle saturation, normalize
  const fadeLen = Math.floor(sr * 1.2);
  const end = at(total);
  for (let i = 0; i < out.length; i++) {
    if (i > end - fadeLen) out[i] *= Math.max(0, (end - i) / fadeLen);
    out[i] = Math.tanh(out[i] * 0.7);
  }
  return normalizePeak(out, 0.92);
}
