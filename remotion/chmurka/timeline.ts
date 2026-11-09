/**
 * Timeline + subtitles for the "Chmurka – dlaczego niebo jest niebieskie?" short.
 *
 * The storyboard asks for scenes of 4/8/10/8/6/4 s (40 s). A slow, bedtime-story narration
 * does not fit into scenes 1, 5 and 6, so the scenes that need more room borrow it from the
 * scenes with spare time (2, 3, 4). The total stays at exactly 40 s and the order of scenes
 * is unchanged.
 */
import voiceover from "./voiceover.json";

export const CHMURKA_COMPOSITION_ID = "ChmurkaShort";
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_SECONDS = 40;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

/** Durations from the storyboard. */
export const STORYBOARD_SECONDS = [4, 8, 10, 8, 6, 4];
/** Silence before the narrator starts in each scene. */
export const LEAD_SECONDS = 0.35;
/** Minimum pause after the last word of a scene. */
export const TAIL_SECONDS = 0.6;

export interface VoWord {
  text: string;
  start: number;
  end: number;
}

export interface VoScene {
  text: string;
  file: string;
  duration: number;
  speechEnd: number;
  words: VoWord[];
}

export const VO: VoScene[] = (voiceover as { scenes: VoScene[] }).scenes;

export interface SceneTiming {
  index: number;
  startFrame: number;
  durationInFrames: number;
  /** Absolute frame at which the voiceover of this scene starts. */
  voFrame: number;
}

/** Fits the storyboard durations to the narration while keeping the total length. */
export function fitDurations(storyboard: number[], needed: number[], total: number): number[] {
  const deficit = storyboard.map((s, i) => Math.max(0, needed[i] - s));
  const spare = storyboard.map((s, i) => Math.max(0, s - needed[i]));
  const totalDeficit = deficit.reduce((a, b) => a + b, 0);
  const totalSpare = spare.reduce((a, b) => a + b, 0);
  const take = Math.min(totalDeficit, totalSpare);
  const out = storyboard.map((s, i) => {
    if (deficit[i] > 0) return s + (totalDeficit ? (deficit[i] * take) / totalDeficit : 0);
    return s - (totalSpare ? (spare[i] * take) / totalSpare : 0);
  });
  const sum = out.reduce((a, b) => a + b, 0);
  return out.map((d) => (d * total) / sum);
}

export function buildTimeline(vo: VoScene[] = VO): SceneTiming[] {
  const needed = vo.map((s) => LEAD_SECONDS + s.speechEnd + TAIL_SECONDS);
  const seconds = fitDurations(STORYBOARD_SECONDS, needed, TOTAL_SECONDS);
  const timings: SceneTiming[] = [];
  let start = 0;
  let acc = 0;
  seconds.forEach((d, index) => {
    acc += d;
    const end = index === seconds.length - 1 ? TOTAL_FRAMES : Math.round(acc * FPS);
    timings.push({
      index,
      startFrame: start,
      durationInFrames: end - start,
      voFrame: start + Math.round(LEAD_SECONDS * FPS),
    });
    start = end;
  });
  return timings;
}

export const TIMELINE = buildTimeline();

/** Frame (relative to the scene start) when word `i` of scene `scene` starts being spoken. */
export function wordFrame(scene: number, i: number): number {
  const w = VO[scene].words[Math.min(i, VO[scene].words.length - 1)];
  return Math.round((LEAD_SECONDS + w.start) * FPS);
}

// ── Subtitles ─────────────────────────────────────────────────────

/** Key words shown in yellow (compared without punctuation, case-insensitive). */
export const KEYWORDS = new Set([
  "chmurka",
  "niebo",
  "niebieskie",
  "niebieski",
  "słoneczko",
  "biało",
  "kolory",
  "tęczy",
  "światło",
  "powietrze",
  "górę",
  "pomarańczowe",
  "zagadka",
  "kolor",
]);

const clean = (w: string) => w.toLowerCase().replace(/[.,!?;:„”"]/g, "");

export interface CaptionWord {
  text: string;
  start: number; // seconds, relative to the voiceover file
  end: number;
  highlight: boolean;
}

export interface Caption {
  words: CaptionWord[];
  start: number;
  end: number;
}

/**
 * Hand-made caption chunks ("/" separates captions): 2–3 words that belong together,
 * never crossing a sentence boundary. Joined, each line must equal the voiceover text.
 */
export const CAPTION_LAYOUT = [
  "Cześć! / Jestem Chmurka. / Czy wiesz, / dlaczego niebo / jest niebieskie?",
  "Słoneczko świeci / na biało. / Ale w tym / świetle ukryły się / wszystkie kolory tęczy!",
  "Kiedy światło / leci przez powietrze, / niebieski kolor / odbija się / na wszystkie strony. / Najbardziej ze wszystkich!",
  "Dlatego, gdy patrzysz / w górę, / widzisz wszędzie niebieski!",
  "A wieczorem niebo / bywa pomarańczowe. / Ale to / już zagadka / na inny raz!",
  "Pa, pa! / Spójrz dziś / na niebo / i powiedz, / jaki ma kolor!",
];

/** Builds captions from the layout and the TTS word timings. */
export function buildCaptions(scene: VoScene, layout: string): Caption[] {
  const groups = layout.split("/").map((g) => g.trim().split(/\s+/));
  const tokens = groups.flat();
  if (tokens.join(" ") !== scene.text) throw new Error(`Caption layout does not match voiceover: ${layout}`);
  if (tokens.length !== scene.words.length) {
    throw new Error(`Subtitle tokens (${tokens.length}) do not match TTS words (${scene.words.length}): ${scene.text}`);
  }
  let i = 0;
  return groups.map((g) => {
    const words = g.map((t) => {
      const w = scene.words[i++];
      return { text: t, start: w.start, end: w.end, highlight: KEYWORDS.has(clean(t)) };
    });
    return { words, start: words[0].start, end: words[words.length - 1].end };
  });
}

export const CAPTIONS: Caption[][] = VO.map((s, i) => buildCaptions(s, CAPTION_LAYOUT[i]));
