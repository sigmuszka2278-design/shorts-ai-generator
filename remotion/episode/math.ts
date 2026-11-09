// Small animation helpers for the episode (pure functions, time in seconds).

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Progress 0..1 of `t` between `a` and `b`. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x: number) => x * x * x;

export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Piecewise keyframes [time, value] with ease-in-out between them. */
export function kf(t: number, points: [number, number][], ease: (x: number) => number = easeInOut): number {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    const [t0, v0] = points[i - 1];
    if (t <= t1) return lerp(v0, v1, ease(seg(t, t0, t1)));
  }
  return points[points.length - 1][1];
}

/** Parabolic hop: height above the ground at time t for a hop starting at `start` lasting `dur`. */
export function hop(t: number, start: number, dur: number, h: number): number {
  const u = (t - start) / dur;
  if (u <= 0 || u >= 1) return 0;
  return 4 * h * u * (1 - u);
}

/** Squash & stretch around a hop: stretched in the air, squashed at take-off/landing. */
export function hopSquash(t: number, start: number, dur: number): number {
  const before = start - t;
  const after = t - (start + dur);
  if (before > 0 && before < 0.15) return 1 - 0.18 * (1 - before / 0.15);
  if (after > 0 && after < 0.18) return 1 - 0.2 * (1 - after / 0.18);
  const u = (t - start) / dur;
  if (u > 0 && u < 1) return 1 + 0.1 * Math.sin(Math.PI * u);
  return 1;
}

/** Mouth openness while talking (0..1), a lively deterministic flap. */
export function talkFlap(t: number): number {
  const v = Math.abs(Math.sin(t * 13.5)) * 0.7 + Math.abs(Math.sin(t * 7.1 + 1.3)) * 0.3;
  return 0.25 + 0.75 * v;
}

/** Deterministic pseudo random 0..1 */
export function rnd(i: number, salt = 0): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
