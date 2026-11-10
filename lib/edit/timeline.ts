/**
 * Beat grid of the "CR7 – THE GOAT" football edit.
 *
 * Single source of truth for BOTH the synthesized Brazilian phonk track and the
 * Remotion composition, so every cut, flash, shake and zoom lands exactly on a beat
 * ("perfect beat sync" – frame accurate at 60 fps).
 */

export const EDIT_FPS = 60;
/** 28 frames per beat at 60 fps = 128.57 BPM (a beat is an integer number of frames → no drift). */
export const BEAT_FRAMES = 28;
export const BPM = (60 * EDIT_FPS) / BEAT_FRAMES;
export const BEAT_SECONDS = BEAT_FRAMES / EDIT_FPS;

/** Base composition size (9:16). Rendered with scale 2 → 2160×3840 (4K UHD vertical). */
export const EDIT_WIDTH = 1080;
export const EDIT_HEIGHT = 1920;
export const EDIT_RENDER_SCALE = 2;

export const INTRO_BEATS = 8;
export const MONTAGE_BEATS = 24;
export const OUTRO_BEATS = 7;

export const DROP_FRAME = INTRO_BEATS * BEAT_FRAMES; // 224 → 3.73 s
export const OUTRO_FRAME = DROP_FRAME + MONTAGE_BEATS * BEAT_FRAMES; // 896 → 14.93 s
export const EDIT_DURATION_FRAMES = OUTRO_FRAME + OUTRO_BEATS * BEAT_FRAMES; // 1092 → 18.2 s

export type ShotKind =
  | "intro" // slow motion, serious stare, dark cinematic
  | "bicycle" // overhead kick
  | "stepovers" // dribbling
  | "freekick" // knuckleball free kick
  | "ucl" // Champions League nights
  | "header" // towering header
  | "net" // ball hits the net
  | "strike" // close-up power shot
  | "siuuu" // the celebration
  | "goat"; // final title card

export type Team = "real" | "united" | "portugal" | "ucl" | "neutral";

export interface Shot {
  id: string;
  kind: ShotKind;
  team: Team;
  /** big kinetic caption shown during the shot */
  caption?: string;
  startFrame: number;
  durationInFrames: number;
  /**
   * Speed ramp: playback speed (1 = real time) at normalized shot positions.
   * Fast → slow-mo at the key moment → fast again.
   */
  ramp: Array<[position: number, speed: number]>;
  /** normalized moment of impact (gets an extra flash/shake + slow-mo) */
  impact?: number;
}

const b = (beat: number) => beat * BEAT_FRAMES;

const montage: Array<Omit<Shot, "startFrame" | "durationInFrames"> & { beats: number }> = [
  { id: "bicycle", kind: "bicycle", team: "real", caption: "REAL MADRID", beats: 4, impact: 0.5, ramp: [[0, 2.2], [0.38, 1.4], [0.5, 0.18], [0.7, 0.35], [0.85, 2.4], [1, 3]] },
  { id: "stepovers", kind: "stepovers", team: "real", beats: 2, ramp: [[0, 1.6], [0.5, 2.4], [1, 1.2]] },
  { id: "freekick", kind: "freekick", team: "united", caption: "MAN UNITED", beats: 4, impact: 0.42, ramp: [[0, 1.8], [0.32, 1.2], [0.42, 0.15], [0.6, 0.4], [0.75, 2.6], [1, 3.2]] },
  { id: "ucl", kind: "ucl", team: "ucl", caption: "CHAMPIONS LEAGUE", beats: 2, ramp: [[0, 0.6], [1, 1.2]] },
  { id: "header", kind: "header", team: "portugal", caption: "PORTUGAL", beats: 4, impact: 0.5, ramp: [[0, 2], [0.4, 1.3], [0.5, 0.16], [0.68, 0.35], [0.82, 2.2], [1, 2.8]] },
  { id: "net", kind: "net", team: "real", beats: 1, impact: 0.3, ramp: [[0, 2.5], [0.3, 0.6], [1, 1.5]] },
  { id: "stepovers-2", kind: "stepovers", team: "united", beats: 1, ramp: [[0, 3], [1, 3]] },
  { id: "strike", kind: "strike", team: "portugal", beats: 1, impact: 0.45, ramp: [[0, 2.4], [0.45, 0.4], [1, 2.4]] },
  { id: "ucl-2", kind: "ucl", team: "ucl", beats: 1, ramp: [[0, 1.6], [1, 1.6]] },
  { id: "siuuu", kind: "siuuu", team: "real", caption: "SIUUU", beats: 4, impact: 0.62, ramp: [[0, 1.8], [0.3, 1.2], [0.45, 0.3], [0.62, 0.22], [0.75, 0.6], [1, 1]] },
];

function buildShots(): Shot[] {
  const shots: Shot[] = [
    { id: "intro", kind: "intro", team: "neutral", startFrame: 0, durationInFrames: DROP_FRAME, ramp: [[0, 0.35], [1, 0.35]] },
  ];
  let beat = INTRO_BEATS;
  for (const { beats, ...shot } of montage) {
    shots.push({ ...shot, startFrame: b(beat), durationInFrames: b(beats) });
    beat += beats;
  }
  shots.push({
    id: "goat",
    kind: "goat",
    team: "neutral",
    caption: "CR7 🐐 THE GOAT",
    startFrame: b(beat),
    durationInFrames: b(OUTRO_BEATS),
    ramp: [[0, 0.4], [1, 0.4]],
  });
  return shots;
}

export const SHOTS: Shot[] = buildShots();

/** Every beat (frame numbers) from the drop to the end – used for zoom punches / shakes. */
export const BEATS_AFTER_DROP: number[] = Array.from(
  { length: MONTAGE_BEATS + OUTRO_BEATS },
  (_, i) => DROP_FRAME + i * BEAT_FRAMES,
);

/** Frames of hard cuts (start of every shot after the intro). */
export const CUT_FRAMES: number[] = SHOTS.slice(1).map((s) => s.startFrame);

/** Impact moments (frame numbers, rounded) – slow-mo peaks of the speed ramps. */
export const IMPACT_FRAMES: number[] = SHOTS.filter((s) => s.impact != null).map((s) =>
  Math.round(s.startFrame + s.impact! * s.durationInFrames),
);

export function shotAt(frame: number): Shot {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (frame >= SHOTS[i].startFrame) return SHOTS[i];
  return SHOTS[0];
}

/** Piecewise-linear speed of a ramp at normalized position p. */
export function rampSpeed(ramp: Shot["ramp"], p: number): number {
  if (p <= ramp[0][0]) return ramp[0][1];
  for (let i = 1; i < ramp.length; i++) {
    const [p1, s1] = ramp[i];
    const [p0, s0] = ramp[i - 1];
    if (p <= p1) return s0 + ((s1 - s0) * (p - p0)) / (p1 - p0 || 1);
  }
  return ramp[ramp.length - 1][1];
}

/**
 * Time remap of a speed-ramped shot: local frame → "source" frame
 * (integral of the speed curve). Deterministic, so any frame can be rendered independently.
 */
export function remapFrame(shot: Shot, localFrame: number): number {
  let acc = 0;
  const steps = Math.max(0, localFrame);
  const whole = Math.floor(steps);
  for (let f = 0; f < whole; f++) acc += rampSpeed(shot.ramp, (f + 0.5) / shot.durationInFrames);
  acc += (steps - whole) * rampSpeed(shot.ramp, (whole + 0.5) / shot.durationInFrames);
  return acc;
}

/** Total source length (in frames) a shot consumes – used to normalize animations. */
export function sourceLength(shot: Shot): number {
  return remapFrame(shot, shot.durationInFrames);
}

/** Frames since the most recent beat (from the drop on); Infinity before the drop. */
export function framesSinceBeat(frame: number): number {
  if (frame < DROP_FRAME) return Infinity;
  return (frame - DROP_FRAME) % BEAT_FRAMES;
}
