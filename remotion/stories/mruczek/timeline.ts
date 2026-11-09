/**
 * Timeline for the scripted story "Mruczek i jego wąsy".
 *
 * Scene lengths follow the recorded Polish voiceover (public/stories/mruczek/*.mp3,
 * word timings in timings.json) so the narration is never cut and every scene
 * gets a short breath of silence before the next one starts.
 */
import timings from "../../../public/stories/mruczek/timings.json";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Silence before the voice starts inside each scene (s). */
const LEAD = 0.15;
/** Extra time after the last spoken word of each scene (s) – gives the visuals room to finish. */
const TAIL: Record<SceneId, number> = { s1: 0.35, s2: 0.45, s3: 0.65, s4: 0.75, s5: 0.45, s6: 0.9 };

export type SceneId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6";
export const SCENE_IDS: SceneId[] = ["s1", "s2", "s3", "s4", "s5", "s6"];

export interface Word {
  /** Word exactly as written in the script (with punctuation). */
  text: string;
  /** Bare word as spoken. */
  spoken: string;
  /** Seconds from the start of the scene. */
  start: number;
  end: number;
  key: boolean;
}

export interface SceneTiming {
  id: SceneId;
  text: string;
  /** Global start / length in frames. */
  from: number;
  durationInFrames: number;
  /** Frame (relative to scene) where the voice clip starts. */
  voiceFrom: number;
  words: Word[];
}

/** Words highlighted in yellow in the subtitles (lower-case, bare). */
export const KEY_WORDS = new Set([
  "mruczek",
  "wąsy",
  "wąsów",
  "wąsami",
  "ozdoby",
  "szerokie",
  "kotek",
  "zmieści",
  "ciasnej",
  "dziurce",
  "ciemności",
  "ruch",
  "powietrza",
  "przeszkody",
  "złapać",
  "zabawkę",
  "hop",
  "nigdy",
  "obcinamy",
  "ciągniemy",
  "ważne",
  "pa",
]);

export const bare = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "");

type RawScene = { text: string; duration: number; words: { text: string; start: number; end: number }[] };

export function buildTimeline(raw: Record<string, RawScene> = timings.scenes as Record<string, RawScene>) {
  let cursor = 0;
  const scenes: SceneTiming[] = SCENE_IDS.map((id) => {
    const s = raw[id];
    const tokens = s.text.split(/\s+/).filter(Boolean);
    if (tokens.length !== s.words.length) {
      throw new Error(`Scene ${id}: ${tokens.length} tokens vs ${s.words.length} timed words`);
    }
    const words: Word[] = tokens.map((text, i) => {
      const w = s.words[i];
      if (bare(text) !== bare(w.text)) throw new Error(`Scene ${id}: "${text}" ≠ "${w.text}"`);
      return {
        text,
        spoken: w.text,
        start: LEAD + w.start,
        end: LEAD + w.end,
        key: KEY_WORDS.has(bare(text).toLowerCase()),
      };
    });
    const seconds = LEAD + s.words[s.words.length - 1].end + TAIL[id];
    const durationInFrames = Math.round(seconds * FPS);
    const scene: SceneTiming = { id, text: s.text, from: cursor, durationInFrames, voiceFrom: Math.round(LEAD * FPS), words };
    cursor += durationInFrames;
    return scene;
  });
  return { scenes, durationInFrames: cursor };
}

export interface Caption {
  words: Word[];
  /** Global frames. */
  from: number;
  to: number;
}

/** Polish one-letter words that must not end a subtitle line (they belong to the next word). */
const CLINGY = new Set(["w", "z", "i", "a", "o", "u"]);

/**
 * Groups words into captions of 2–3 words. Breaks after sentence punctuation,
 * never leaves a one-letter preposition/conjunction at the end of a caption,
 * and avoids single-word captions unless the word stands alone ("Hop!").
 */
export function chunkWords(words: Word[]): Word[][] {
  // 1. Sentences.
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.!?:]$/.test(w.text)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);

  const chunks: Word[][] = [];
  for (const sentence of sentences) {
    // 2. Units: a one-letter word is glued to the word after it ("w ciasnej", "i nie").
    const units: Word[][] = [];
    for (let i = 0; i < sentence.length; i++) {
      const unit = [sentence[i]];
      while (CLINGY.has(bare(unit[unit.length - 1].text).toLowerCase()) && i + 1 < sentence.length) {
        unit.push(sentence[++i]);
      }
      units.push(unit);
    }
    // 3. Optimal partition into captions of 2–3 words (DP over unit boundaries).
    const n = units.length;
    const best: number[] = Array(n + 1).fill(Infinity);
    const prev: number[] = Array(n + 1).fill(-1);
    best[0] = 0;
    for (let end = 1; end <= n; end++) {
      for (let start = end - 1; start >= 0; start--) {
        const group = units.slice(start, end).flat();
        const count = group.length;
        if (count > 3 && end - start > 1) break;
        let cost = count === 3 ? 0 : count === 2 ? 0.3 : sentence.length === 1 ? 0 : 3;
        if (count > 3) cost += 1;
        // Prefer breaking after a comma, avoid commas in the middle of a caption.
        if (group.slice(0, -1).some((w) => /,$/.test(w.text))) cost += 0.8;
        if (/,$/.test(group[group.length - 1].text)) cost -= 0.4;
        if (best[start] + cost < best[end]) {
          best[end] = best[start] + cost;
          prev[end] = start;
        }
      }
    }
    const groups: Word[][] = [];
    for (let end = n; end > 0; end = prev[end]) groups.unshift(units.slice(prev[end], end).flat());
    chunks.push(...groups);
  }
  return chunks;
}

export function buildCaptions(scenes: SceneTiming[]): Caption[] {
  const captions: Caption[] = [];
  for (const scene of scenes) {
    const chunks = chunkWords(scene.words);
    chunks.forEach((chunk, i) => {
      const from = scene.from + Math.round(chunk[0].start * FPS) - 2;
      const nextStart = chunks[i + 1] ? scene.from + Math.round(chunks[i + 1][0].start * FPS) - 2 : Infinity;
      const naturalEnd = scene.from + Math.round(chunk[chunk.length - 1].end * FPS) + 10;
      const sceneEnd = scene.from + scene.durationInFrames - 2;
      captions.push({ words: chunk, from, to: Math.min(nextStart, Math.max(naturalEnd, from + 18), sceneEnd) });
    });
  }
  return captions;
}

/** Time (s, relative to scene) when the given bare word is first spoken; falls back to `fallback`. */
export function wordTime(scene: SceneTiming, word: string, fallback = 0, which: "start" | "end" = "start"): number {
  const w = scene.words.find((x) => bare(x.text).toLowerCase() === word.toLowerCase());
  return w ? w[which] : fallback;
}
