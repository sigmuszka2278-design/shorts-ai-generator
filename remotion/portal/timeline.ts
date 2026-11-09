/**
 * Shared timeline of the "Tylko jeden portal prowadzi do skarbu!" Short.
 * Used by the audio builder (voice-over, sound effects, music) and by the
 * Remotion composition (captions, animation), so picture and sound stay in sync.
 */

export const PORTAL_SHORT_ID = "PortalShort";
export const FPS = 30;
export const DURATION_SECONDS = 25;
export const DURATION_FRAMES = FPS * DURATION_SECONDS;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const TITLE = "TYLKO JEDEN PORTAL PROWADZI DO SKARBU! 😱💎";

/** Scene boundaries in seconds. */
export const SCENES = {
  choose: [0, 3],
  countdown: [3, 7],
  duck: [7, 12],
  balloons: [12, 17],
  treasure: [17, 22],
  dragon: [22, 25],
} as const;

/** Key moments (seconds) – animation and sound effects both hang off these. */
export const T = {
  bannerIn: 0.25,
  pushIn: 3.05,
  count3: 4.4,
  count2: 5.2,
  count1: 6.0,
  panRed: 6.85,
  redOpen: 7.25,
  duckOut: 7.5,
  duckBounce: 10.1,
  panBlue: 11.85,
  blueOpen: 12.2,
  balloonsOut: 12.35,
  panGold: 16.85,
  goldCharge: 17.2,
  flyIn: 18.95,
  reveal: 19.3,
  dragonOut: 22.0,
  funnyFace: 22.55,
  zap: 23.05,
  candy: 23.3,
  loopBack: 24.4,
} as const;

/**
 * Voice-over lines. `text` is spoken (eSpeak-NG + MBROLA pl1), `caption` is shown on screen.
 * Caption words map 1:1 to spoken words; `|` splits a line into caption chunks,
 * `*word*` marks an emphasised (highlighted) word. A line without caption is shown
 * by the big countdown instead.
 */
export interface VoiceLine {
  id: string;
  at: number;
  /** Max length in seconds – the clip is sped up to fit. */
  max: number;
  text: string;
  caption: string | null;
}

export const VOICE_LINES: VoiceLine[] = [
  { id: "v01", at: 0.05, max: 2.3, text: "Tylko jeden z tych portali prowadzi do miliona diamentów!", caption: "Tylko jeden z tych portali | prowadzi do *miliona* *diamentów!*" },
  { id: "v02", at: 2.35, max: 0.75, text: "Który wybierasz?!", caption: "Który *wybierasz?!*" },
  { id: "v03", at: 3.15, max: 1.2, text: "Masz tylko trzy sekundy!", caption: "Masz tylko *3* sekundy!" },
  { id: "v04", at: T.count3, max: 0.6, text: "Trzy!", caption: null },
  { id: "v05", at: T.count2, max: 0.6, text: "Dwa!", caption: null },
  { id: "v06", at: T.count1, max: 0.7, text: "Jeden!", caption: null },
  { id: "v07", at: 7.2, max: 1.2, text: "Portal numer jeden?!", caption: "Portal numer *jeden?!*" },
  { id: "v08", at: 8.55, max: 0.7, text: "O nie!", caption: "*O* *NIE!*" },
  { id: "v09", at: 9.4, max: 1.5, text: "To gigantyczna kaczka!", caption: "To *gigantyczna* *kaczka!*" },
  { id: "v10", at: 12.25, max: 0.9, text: "Numer dwa?!", caption: "Numer *dwa?!*" },
  { id: "v11", at: 13.35, max: 1.0, text: "Tylko balony?!", caption: "Tylko *balony?!*" },
  { id: "v12", at: 17.2, max: 1.5, text: "A portal numer trzy...", caption: "A *portal* *numer* *trzy…*" },
  { id: "v13", at: 19.35, max: 1.35, text: "To prawdziwy skarb!", caption: "To *prawdziwy* *skarb!*" },
  { id: "v14", at: 22.05, max: 1.1, text: "Czekaj... co?!", caption: "*Czekaj…* *co?!*" },
  { id: "v15", at: 23.3, max: 1.25, text: "A ty dobrze wybrałeś?!", caption: "A ty dobrze *wybrałeś?!*" },
];

export type PortalSfx =
  | "whoosh"
  | "bigWhoosh"
  | "pop"
  | "balloonPop"
  | "tick"
  | "hit"
  | "riser"
  | "portalOpen"
  | "boing"
  | "squeak"
  | "quack"
  | "balloonBurst"
  | "rumble"
  | "shimmer"
  | "tada"
  | "sparkle"
  | "scratch"
  | "giggle"
  | "zap"
  | "poof"
  | "candy";

export const SFX_CUES: { at: number; sfx: PortalSfx; gain: number }[] = [
  { at: T.bannerIn, sfx: "pop", gain: 0.55 },
  { at: 0.3, sfx: "sparkle", gain: 0.3 },
  { at: T.pushIn - 0.1, sfx: "whoosh", gain: 0.45 },
  { at: T.count3 - 0.02, sfx: "hit", gain: 0.8 },
  { at: T.count3 + 0.4, sfx: "tick", gain: 0.45 },
  { at: T.count2 - 0.02, sfx: "hit", gain: 0.85 },
  { at: T.count2 + 0.4, sfx: "tick", gain: 0.45 },
  { at: T.count1 - 0.02, sfx: "hit", gain: 0.9 },
  { at: T.count1 + 0.05, sfx: "riser", gain: 0.5 },
  { at: T.panRed - 0.05, sfx: "whoosh", gain: 0.6 },
  { at: T.redOpen, sfx: "portalOpen", gain: 0.7 },
  { at: T.duckOut, sfx: "boing", gain: 0.75 },
  { at: T.duckOut + 0.25, sfx: "squeak", gain: 0.6 },
  { at: 8.55, sfx: "squeak", gain: 0.45 },
  { at: 9.05, sfx: "quack", gain: 0.55 },
  { at: T.duckBounce, sfx: "boing", gain: 0.6 },
  { at: 11.0, sfx: "quack", gain: 0.6 },
  { at: 11.3, sfx: "squeak", gain: 0.5 },
  { at: T.panBlue - 0.05, sfx: "whoosh", gain: 0.6 },
  { at: T.blueOpen, sfx: "portalOpen", gain: 0.6 },
  { at: T.balloonsOut, sfx: "balloonBurst", gain: 0.7 },
  { at: 14.5, sfx: "balloonPop", gain: 0.5 },
  { at: 14.85, sfx: "balloonPop", gain: 0.45 },
  { at: 15.3, sfx: "balloonPop", gain: 0.55 },
  { at: 15.55, sfx: "balloonPop", gain: 0.4 },
  { at: 15.95, sfx: "balloonPop", gain: 0.5 },
  { at: 16.3, sfx: "balloonPop", gain: 0.45 },
  { at: T.panGold - 0.05, sfx: "whoosh", gain: 0.6 },
  { at: T.goldCharge, sfx: "rumble", gain: 0.75 },
  { at: T.goldCharge + 0.1, sfx: "riser", gain: 0.45 },
  { at: T.flyIn - 0.15, sfx: "bigWhoosh", gain: 0.8 },
  { at: T.reveal, sfx: "tada", gain: 0.55 },
  { at: T.reveal, sfx: "shimmer", gain: 0.6 },
  { at: 20.5, sfx: "sparkle", gain: 0.35 },
  { at: 21.4, sfx: "sparkle", gain: 0.3 },
  { at: T.dragonOut - 0.05, sfx: "scratch", gain: 0.7 },
  { at: T.dragonOut + 0.1, sfx: "boing", gain: 0.65 },
  { at: T.funnyFace, sfx: "giggle", gain: 0.55 },
  { at: T.zap, sfx: "zap", gain: 0.55 },
  { at: T.candy, sfx: "poof", gain: 0.65 },
  { at: T.candy + 0.12, sfx: "candy", gain: 0.55 },
  { at: 24.0, sfx: "sparkle", gain: 0.3 },
  { at: T.loopBack, sfx: "whoosh", gain: 0.55 },
];

/** Output of the audio builder: precise word timings for the captions. */
export interface CaptionWord {
  text: string;
  start: number;
  end: number;
  emph: boolean;
  chunk: number;
}
export interface CaptionLine {
  id: string;
  start: number;
  end: number;
  words: CaptionWord[];
}
