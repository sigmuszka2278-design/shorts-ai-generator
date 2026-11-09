import { Easing, interpolate, spring } from "remotion";
import timelineJson from "./timeline.json";

export type Word = { w: string; start: number; end: number };
export type Segment = {
  id: string;
  number: number | null;
  label: string | null;
  emoji: string | null;
  from: number;
  duration: number;
  voiceAt: number;
  voiceEnd: number;
  words: Word[];
  beats: Record<string, number>;
};
export type Timeline = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  title: string;
  segments: Segment[];
};

export const timeline = timelineJson as Timeline;
export const FPS = timeline.fps;

/** Props every scene receives: absolute time in seconds and its segment. */
export type SceneProps = { t: number; seg: Segment };

/** Clamped 0→1 progress between two times, eased. */
export function prog(t: number, a: number, b: number, easing: (x: number) => number = Easing.inOut(Easing.cubic)) {
  return interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Bouncy 0→1 (overshooting) spring starting at time `at`. */
export function pop(t: number, at: number, damping = 10, stiffness = 170) {
  return spring({ frame: (t - at) * FPS, fps: FPS, config: { damping, stiffness, mass: 0.7 } });
}

/** Decaying shake offset after `at`. */
export function shake(t: number, at: number, amp = 24, dur = 0.45) {
  const d = t - at;
  if (d < 0 || d > dur) return { x: 0, y: 0 };
  const k = (1 - d / dur) ** 2 * amp;
  return { x: Math.sin(d * 97) * k, y: Math.cos(d * 73) * k };
}

/** Deterministic pseudo-random in [0,1). */
export function rand(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
