import type { Motion } from "./types";

/** Period (in frames) of every looping motion. Shared by the generator (sound sync) and the composition. */
export const MOTION_PERIOD: Record<Motion, number> = {
  bounce: 30,
  jump: 36,
  float: 90,
  spin: 75,
  wiggle: 24,
  pulse: 40,
  orbit: 120,
  roll: 120,
};

export interface MotionState {
  dx: number;
  dy: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Pure motion function – returns offsets (in px) for an actor `t` frames after it entered.
 * `size` scales amplitudes so big and small actors move proportionally.
 */
export function motionAt(motion: Motion, t: number, size: number, phase: number): MotionState {
  const period = MOTION_PERIOD[motion];
  const local = t + phase;
  const p = ((local % period) + period) % period / period; // 0..1
  const state: MotionState = { dx: 0, dy: 0, rotate: 0, scaleX: 1, scaleY: 1 };
  switch (motion) {
    case "bounce":
    case "jump": {
      const height = motion === "jump" ? size * 0.55 : size * 0.9;
      const arc = Math.sin(Math.PI * p);
      state.dy = -height * arc;
      // squash on landing, stretch in the air
      const squash = Math.max(0, 1 - Math.min(p, 1 - p) * 8); // 1 near landing
      state.scaleX = 1 + 0.18 * squash;
      state.scaleY = 1 - 0.16 * squash + 0.06 * arc;
      break;
    }
    case "float": {
      state.dy = Math.sin(p * Math.PI * 2) * size * 0.12;
      state.dx = Math.cos(p * Math.PI * 2) * size * 0.05;
      state.rotate = Math.sin(p * Math.PI * 2) * 6;
      break;
    }
    case "spin": {
      state.rotate = p * 360;
      state.dy = Math.sin(p * Math.PI * 2) * size * 0.05;
      break;
    }
    case "wiggle": {
      state.rotate = Math.sin(p * Math.PI * 2) * 12;
      state.dy = -Math.abs(Math.sin(p * Math.PI * 2)) * size * 0.08;
      state.dx = Math.sin(p * Math.PI * 2) * size * 0.06;
      break;
    }
    case "pulse": {
      const s = 1 + Math.sin(p * Math.PI * 2) * 0.1;
      state.scaleX = s;
      state.scaleY = s;
      state.rotate = Math.sin(p * Math.PI * 2) * 4;
      break;
    }
    case "orbit": {
      state.dx = Math.cos(p * Math.PI * 2) * size * 0.6;
      state.dy = Math.sin(p * Math.PI * 2) * size * 0.3;
      break;
    }
    case "roll": {
      state.dx = Math.sin(p * Math.PI * 2) * size * 0.9;
      state.rotate = (Math.sin(p * Math.PI * 2) * size * 0.9) / (size / 2) * (180 / Math.PI);
      break;
    }
  }
  return state;
}

/** Frames (relative to the entrance) at which a jumping/bouncing actor lands. */
export function landingFrames(motion: Motion, phase: number, from: number, to: number): number[] {
  if (motion !== "jump" && motion !== "bounce") return [];
  const period = MOTION_PERIOD[motion];
  const result: number[] = [];
  // landing when (t + phase) % period === 0
  let t = (period - (((phase % period) + period) % period)) % period;
  for (; t <= to; t += period) if (t >= from) result.push(t);
  return result;
}
