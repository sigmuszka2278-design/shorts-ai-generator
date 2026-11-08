// Shared scene description used by the generator (server/client),
// the Remotion composition (preview + render) and AI providers.
// Keep this file free of path aliases – it is bundled by Remotion's webpack too.

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;
export const MIN_DURATION = 5;
export const MAX_DURATION = 20;

export type AnimationStyle = "2d" | "3d";

export type ThemeId =
  | "laka"
  | "kosmos"
  | "ocean"
  | "las"
  | "zamek"
  | "cukierkowo"
  | "noc"
  | "niebo";

export type AnimalId =
  | "kot"
  | "pies"
  | "krolik"
  | "mis"
  | "zaba"
  | "kaczka"
  | "jednorozec"
  | "smok"
  | "panda"
  | "lis"
  | "pingwin"
  | "swinka";

export type MagicId =
  | "rozdzka"
  | "gwiazda"
  | "korona"
  | "prezent"
  | "krysztal"
  | "balon"
  | "serce"
  | "ksiezyc"
  | "grzybek"
  | "lizak";

export type Motion =
  | "bounce"
  | "float"
  | "spin"
  | "wiggle"
  | "jump"
  | "pulse"
  | "orbit"
  | "roll";

export type Entrance = "pop" | "drop" | "slide-left" | "slide-right" | "rise";

export type SfxId =
  | "pop"
  | "boing"
  | "sparkle"
  | "whoosh"
  | "chime"
  | "magic"
  | "tada"
  | "squeak"
  | "bubble"
  | "thump";

export type MusicId = "wesola" | "marzycielska" | "skoczna";

export type EffectKind = "confetti" | "sparkles" | "rainbow" | "bubbles" | "stars" | "hearts";

interface ActorBase {
  id: string;
  /** Normalized position (0..1) of the actor's centre in the frame. */
  x: number;
  y: number;
  /** Size in pixels at 1080×1920. */
  size: number;
  color: string;
  enterFrame: number;
  entrance: Entrance;
  motion: Motion;
  /** 0 = far away, 1 = close to the camera. Used for 3D parallax & shading. */
  depth: number;
  /** Phase offset so actors do not move in sync. */
  phase: number;
}

export interface BallActor extends ActorBase {
  kind: "ball";
}

export interface AnimalActor extends ActorBase {
  kind: "animal";
  variant: AnimalId;
  /** Second colour (ears, belly, mane, ...). */
  accent: string;
}

export interface MagicActor extends ActorBase {
  kind: "magic";
  variant: MagicId;
  accent: string;
}

export type Actor = BallActor | AnimalActor | MagicActor;

export interface Effect {
  kind: EffectKind;
  startFrame: number;
  durationInFrames: number;
}

export interface SoundCue {
  frame: number;
  sfx: SfxId;
  volume: number;
}

export interface SceneSpec {
  version: 1;
  prompt: string;
  title: string;
  /** Short ending text displayed at the end of the clip. */
  outro: string;
  seed: number;
  style: AnimationStyle;
  theme: ThemeId;
  durationInSeconds: number;
  fps: number;
  width: number;
  height: number;
  palette: string[];
  actors: Actor[];
  effects: Effect[];
  sounds: SoundCue[];
  music: { track: MusicId; volume: number } | null;
  sfxEnabled: boolean;
  /** Optional AI generated clip used as a background layer. */
  backgroundVideoUrl?: string;
  /** Length of the AI clip – it is looped when shorter than the film. */
  backgroundVideoDurationInSeconds?: number;
  /** Which provider produced the scene. */
  provider: string;
  /** Human readable list of what was understood from the prompt (Polish). */
  detected: string[];
}

export interface GenerateOptions {
  prompt: string;
  durationInSeconds: number;
  style: AnimationStyle;
  theme?: ThemeId | "auto";
  seed?: number;
  sfx?: boolean;
  music?: boolean;
}
