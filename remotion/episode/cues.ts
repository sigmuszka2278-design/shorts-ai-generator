// Timeline of episode 1 "Tosia i największa malina w lesie" (times in seconds).
// Shared by the video composition, the audio mixer (scripts/episode-audio.ts) and the dubbing subtitles.

export const EPISODE_FPS = 30;
export const EPISODE_SECONDS = 240;

export type Speaker = "T" | "B" | "N";

export const SPEAKERS: Record<Speaker, { name: string; color: string }> = {
  T: { name: "Tosia", color: "#ff7a2f" },
  B: { name: "Bruno", color: "#4c8ff5" },
  N: { name: "Narrator", color: "#9b6bff" },
};

export interface Line {
  s: number;
  e: number;
  who: Speaker;
  text: string;
}

export const DIALOGUE: Line[] = [
  { s: 3.2, e: 6.0, who: "T", text: "Oooo! Co to jest?!" },
  { s: 6.3, e: 9.8, who: "N", text: "To malina! Największa w całym lesie!" },
  { s: 10.5, e: 14.5, who: "T", text: "Mniam! Ta malina będzie tylko moja!" },
  { s: 15.5, e: 19.5, who: "T", text: "Ojej… Malina wisi za wysoko!" },
  { s: 25.3, e: 28.0, who: "N", text: "Jak myślisz, czy Tosia dosięgnie?" },
  { s: 30.5, e: 33.5, who: "T", text: "Wiem! Podskoczę!" },
  { s: 35.5, e: 39.0, who: "N", text: "Gotowa… do skoku!" },
  { s: 41.0, e: 44.5, who: "N", text: "Hop! Oj, za nisko." },
  { s: 47.4, e: 49.6, who: "T", text: "Hop-hop! Wyżej!" },
  { s: 50.3, e: 54.0, who: "T", text: "Hop-hop, nie poddaję się!" },
  { s: 57.0, e: 59.8, who: "N", text: "Prawie! Jeszcze kawałeczek!" },
  { s: 60.5, e: 63.5, who: "T", text: "Ojojoj!" },
  { s: 70.5, e: 74.5, who: "N", text: "Oj! A gdzie jest Tosia?" },
  { s: 80.3, e: 82.6, who: "T", text: "A… a… APSIK!" },
  { s: 85.5, e: 89.5, who: "N", text: "Nic się nie stało. Spróbujmy inaczej!" },
  { s: 90.3, e: 92.6, who: "T", text: "Hop-hop, nie poddaję się!" },
  { s: 92.8, e: 94.8, who: "T", text: "Stanę na kamieniu!" },
  { s: 100.5, e: 104.0, who: "T", text: "Ojej… dalej za nisko." },
  { s: 105.5, e: 109.5, who: "N", text: "Ciii… Kto tam szeleści?" },
  { s: 110.5, e: 114.8, who: "B", text: "Dzień dobry, Tosiu. Co się stało?" },
  { s: 115.3, e: 119.0, who: "T", text: "Malina wisi za wysoko!" },
  { s: 120.5, e: 124.5, who: "B", text: "Hmmm… mam pomysł!" },
  { s: 125.3, e: 129.8, who: "B", text: "Stań na moim plecaczku. Potrzymam cię za łapkę." },
  { s: 130.3, e: 132.2, who: "N", text: "Policzmy razem!" },
  { s: 132.5, e: 133.9, who: "N", text: "Raz…" },
  { s: 134.2, e: 135.7, who: "N", text: "dwa…" },
  { s: 136.0, e: 137.8, who: "N", text: "TRZY!" },
  { s: 138.0, e: 140.0, who: "T", text: "Hop-hop, nie poddaję się!" },
  { s: 141.2, e: 144.5, who: "T", text: "Mam ją!" },
  { s: 145.3, e: 148.0, who: "N", text: "Spójrz na malinę. Jaki ma kolor?" },
  { s: 150.3, e: 154.5, who: "N", text: "Czerwony! Brawo! Malina jest czerwona." },
  { s: 155.5, e: 159.0, who: "T", text: "Moja malina!" },
  { s: 160.5, e: 163.5, who: "T", text: "Hmm…" },
  { s: 170.3, e: 174.8, who: "T", text: "Bruno, podzielmy się! Pół dla ciebie!" },
  { s: 180.3, e: 184.8, who: "B", text: "Mniam! Najsłodsza malina na świecie!" },
  { s: 185.3, e: 189.8, who: "N", text: "Starczyło nawet dla małego ptaszka!" },
  { s: 190.3, e: 194.5, who: "T", text: "Razem jest smaczniej! Zatańczmy!" },
  { s: 215.3, e: 219.8, who: "N", text: "Gdy się dzielimy, wszystko smakuje lepiej!" },
  { s: 220.5, e: 224.5, who: "T", text: "Ooo? Coś tam błyszczy!" },
  { s: 225.3, e: 229.8, who: "N", text: "Niebieskie jajko! Nie dotykamy, tylko patrzymy." },
  { s: 230.3, e: 232.5, who: "T", text: "Co z niego wyjdzie?" },
  { s: 232.8, e: 234.8, who: "B", text: "Hmmm…" },
  { s: 235.2, e: 238.0, who: "N", text: "Zobaczymy w następnej przygodzie!" },
  { s: 238.1, e: 239.8, who: "T", text: "Pa-pa!" },
];

export function activeLine(t: number): Line | undefined {
  return DIALOGUE.find((l) => t >= l.s && t < l.e);
}

/** 0..1 mouth openness for a speaker at time t (0 when silent). */
export function talking(t: number, who: Speaker): number {
  const l = DIALOGUE.find((x) => x.who === who && t >= x.s && t < x.e - 0.15);
  if (!l) return 0;
  const v = Math.abs(Math.sin(t * 13.5)) * 0.7 + Math.abs(Math.sin(t * 7.1 + 1.3)) * 0.3;
  return 0.2 + 0.8 * v;
}

// ── sound effects ───────────────────────────────────────────────
export type Sfx =
  | "dzyn"
  | "whoosh"
  | "skid"
  | "sparkle"
  | "mlask"
  | "tirli"
  | "slide_down"
  | "pop"
  | "question"
  | "squeak"
  | "giggle"
  | "drumroll"
  | "boing"
  | "tup"
  | "rise"
  | "spin"
  | "bum"
  | "rustle"
  | "pip"
  | "plum"
  | "leaf_fall"
  | "apsik"
  | "ding"
  | "plusk"
  | "sad"
  | "step"
  | "blink"
  | "pac"
  | "klik"
  | "bip"
  | "bip_hi"
  | "puf"
  | "pyk"
  | "tada"
  | "tiktak"
  | "burr"
  | "chlup"
  | "chirp"
  | "chew"
  | "stuk"
  | "curious"
  | "end_chime";

export const SFX: [number, Sfx, number?][] = [
  [0.05, "dzyn"],
  [3.0, "whoosh"],
  [3.6, "skid"],
  [6.3, "sparkle"],
  [10.3, "mlask"],
  [12.0, "whoosh", 0.6],
  [12.2, "tirli"],
  [17.6, "slide_down"],
  [22.5, "pop"],
  [25.2, "question"],
  [30.4, "squeak"],
  [31.3, "squeak"],
  [32.4, "giggle", 0.7],
  [35.2, "drumroll"],
  [40.3, "boing"],
  [40.95, "tup"],
  [45.4, "boing"],
  [46.3, "boing"],
  [47.1, "tup"],
  [52.2, "tup"],
  [52.45, "tup"],
  [52.7, "tup"],
  [52.95, "tup"],
  [55.2, "tup"],
  [55.45, "tup"],
  [55.7, "tup"],
  [55.85, "rise"],
  [57.2, "sparkle", 0.5],
  [60.2, "spin"],
  [61.4, "spin"],
  [62.6, "spin"],
  [65.1, "bum"],
  [65.15, "rustle"],
  [71.0, "pip"],
  [75.3, "plum"],
  [76.0, "leaf_fall"],
  [82.0, "apsik"],
  [82.05, "rustle"],
  [85.4, "giggle"],
  [87.0, "rustle", 0.5],
  [90.15, "ding"],
  [93.4, "tup"],
  [93.7, "tup"],
  [94.0, "tup"],
  [94.3, "tup"],
  [95.4, "boing"],
  [95.95, "plusk"],
  [100.5, "sad"],
  [105.4, "rustle"],
  [106.6, "rustle"],
  [107.5, "pip"],
  [110.4, "step"],
  [111.1, "step"],
  [111.8, "step"],
  [112.5, "step"],
  [116.3, "blink"],
  [117.0, "blink"],
  [120.4, "ding"],
  [125.6, "klik"],
  [127.9, "pac"],
  [132.5, "bip"],
  [134.2, "bip"],
  [136.0, "bip_hi"],
  [138.1, "boing"],
  [138.75, "puf"],
  [140.6, "boing", 0.6],
  [141.0, "pyk"],
  [141.15, "tada"],
  [145.2, "question"],
  [150.3, "tada"],
  [150.4, "sparkle"],
  [155.6, "mlask"],
  [160.3, "tiktak"],
  [165.6, "burr"],
  [170.2, "sparkle", 0.4],
  [175.3, "chlup"],
  [176.0, "giggle"],
  [180.4, "chew"],
  [181.2, "chew"],
  [182.3, "giggle", 0.8],
  [185.2, "whoosh", 0.5],
  [186.2, "chirp"],
  [188.6, "chirp"],
  [190.1, "sparkle", 0.5],
  [215.3, "sparkle"],
  [220.4, "tup"],
  [220.7, "tup"],
  [221.0, "tup"],
  [221.3, "tup"],
  [221.6, "tup"],
  [223.4, "dzyn"],
  [225.5, "stuk"],
  [227.0, "stuk"],
  [228.5, "stuk"],
  [230.3, "curious"],
  [236.0, "sparkle", 0.6],
  [238.2, "end_chime"],
];

// ── on-screen onomatopoeia ─────────────────────────────────────
export interface Pop {
  t: number;
  text: string;
  x: number; // 0..1 of frame width
  y: number; // 0..1 of frame height
  color: string;
  dur?: number;
  size?: number;
}

export const POPS: Pop[] = [
  { t: 0.15, text: "DZYŃ!", x: 0.74, y: 0.22, color: "#ffd84d" },
  { t: 40.3, text: "HOP!", x: 0.3, y: 0.3, color: "#ff8a3d" },
  { t: 45.4, text: "HOP!", x: 0.26, y: 0.28, color: "#ff8a3d" },
  { t: 46.3, text: "HOP!", x: 0.72, y: 0.3, color: "#ffd84d" },
  { t: 55.85, text: "HOOOP!", x: 0.28, y: 0.25, color: "#ff8a3d", dur: 1.6 },
  { t: 65.1, text: "BUM!", x: 0.5, y: 0.28, color: "#ff5c8a", size: 1.3 },
  { t: 75.3, text: "PLUM!", x: 0.7, y: 0.25, color: "#a8e6c9" },
  { t: 82.0, text: "APSIK!", x: 0.5, y: 0.22, color: "#ff9ec4", size: 1.4, dur: 1.6 },
  { t: 95.4, text: "HOP!", x: 0.3, y: 0.3, color: "#ff8a3d" },
  { t: 95.95, text: "PLUSK!", x: 0.75, y: 0.62, color: "#8fd8ff" },
  { t: 105.5, text: "SZUR-SZUR", x: 0.62, y: 0.3, color: "#6fd585", dur: 2.4 },
  { t: 120.4, text: "DING!", x: 0.72, y: 0.18, color: "#ffd84d" },
  { t: 138.1, text: "HOP-HOP!", x: 0.25, y: 0.25, color: "#ff8a3d" },
  { t: 141.0, text: "PYK!", x: 0.62, y: 0.2, color: "#ff3b5c", size: 1.3 },
  { t: 165.6, text: "BURRR…", x: 0.72, y: 0.62, color: "#e8b47e" },
  { t: 175.3, text: "CHLUP!", x: 0.5, y: 0.2, color: "#ff3b5c", size: 1.3 },
  { t: 186.2, text: "PI-PI!", x: 0.75, y: 0.2, color: "#ffe04f" },
  { t: 225.5, text: "STUK… STUK…", x: 0.7, y: 0.25, color: "#a7dcff", dur: 3 },
];

/** Viewer interaction moments: big "?" + pause. */
export const QUESTIONS: [number, number][] = [
  [25.3, 30.0],
  [145.3, 150.0],
];

export const COUNT: [number, number][] = [
  [132.5, 1],
  [134.2, 2],
  [136.0, 3],
];

export const COLOR_WORD = { s: 150.3, e: 155.0, text: "CZERWONY" };

// ── song ────────────────────────────────────────────────────────
export const SONG_BPM = 96;
export const EIGHTH = 60 / SONG_BPM / 2;
export const SONG_INTRO = 190.0; // two bars intro
export const SONG_START = 195.0;
export const SONG_END = 215.0;

/** [syllable, eighths, midi]; a syllable ending in "~" continues the word. Rests have empty text. */
export type Syl = [string, number, number];
export const SONG: Syl[][] = [
  [["Hop-", 2, 67], ["hop,", 2, 67], ["nie", 1, 64], ["pod~", 1, 67], ["da~", 2, 69], ["ję", 2, 67], ["się,", 4, 64], ["", 2, 0]],
  [["z", 1, 60], ["przy~", 1, 62], ["ja~", 2, 64], ["cie~", 2, 64], ["lem", 2, 62], ["cie~", 2, 64], ["szę", 2, 65], ["się!", 4, 67]],
  [["Pół", 2, 69], ["dla", 2, 69], ["cie~", 1, 67], ["bie,", 1, 64], ["pół", 2, 67], ["dla", 2, 65], ["mnie –", 4, 64], ["", 2, 0]],
  [["dziel~", 1, 62], ["my", 1, 64], ["się", 2, 65], ["przez", 2, 65], ["wszyst~", 1, 64], ["kie", 1, 62], ["dnie!", 6, 60], ["", 2, 0]],
];

/** Chord roots (midi) per bar from SONG_INTRO: 2 intro bars + 8 song bars + 2 outro bars. */
export const SONG_CHORDS: number[] = [60, 67, 60, 60, 60, 67, 65, 60, 67, 60, 65, 60];

/** Absolute timing of each syllable. */
export function songTimeline() {
  const out: { line: number; text: string; s: number; e: number; midi: number }[] = [];
  SONG.forEach((line, li) => {
    let t = SONG_START + li * 16 * EIGHTH;
    for (const [text, n, midi] of line) {
      out.push({ line: li, text, s: t, e: t + n * EIGHTH, midi });
      t += n * EIGHTH;
    }
  });
  return out;
}
