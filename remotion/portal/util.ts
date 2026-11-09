import { Easing } from "remotion";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0→1 progress between a and b (seconds), with optional easing. */
export function prog(t: number, a: number, b: number, ease: (x: number) => number = (x) => x) {
  return ease(clamp01((t - a) / (b - a)));
}

export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeOutBack = Easing.bezier(0.34, 1.56, 0.64, 1);

/** Damped spring 0→1 (overshoots), started at `start` seconds. */
export function springAt(t: number, start: number, stiffness = 14, damping = 7) {
  const x = t - start;
  if (x <= 0) return 0;
  return 1 - Math.exp(-damping * x) * Math.cos(stiffness * x);
}

export type Key = [time: number, value: number, ease?: (x: number) => number];

/** Piecewise interpolation between keys; each key's easing shapes the segment that ends at it. */
export function track(t: number, keys: Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (ease ?? easeInOut)(p);
    }
  }
  return keys[keys.length - 1][1];
}

/** Deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth pseudo-noise in [-1, 1]. */
export function wobble(t: number, seed = 0) {
  return (Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2.1) * 0.3 + Math.sin(t * 23.7 + seed * 0.7) * 0.2);
}

export function starPath(cx: number, cy: number, outer: number, inner: number, points = 4) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
}
