/**
 * Shared timeline of the "Piracki Token" Fortnite guide short (9:16, 40 s, 60 fps).
 * Used by the Remotion composition (picture), the audio generator (music + SFX)
 * and the subtitle / voice-over exports, so everything stays in sync.
 *
 * Music runs at 150 BPM → one beat = 0.4 s = 24 frames, so every cut lands on a beat.
 */

export const PIRATE_FPS = 60;
export const PIRATE_WIDTH = 1080;
export const PIRATE_HEIGHT = 1920;
export const PIRATE_SECONDS = 40;
export const PIRATE_FRAMES = PIRATE_FPS * PIRATE_SECONDS;
export const PIRATE_BPM = 150;
export const BEAT_FRAMES = (PIRATE_FPS * 60) / PIRATE_BPM; // 24
export const BEAT_SECONDS = 60 / PIRATE_BPM; // 0.4

/** Safe zone for key captions: nothing important in the bottom 20 % or at the right edge. */
export const SAFE = {
  left: 70,
  right: PIRATE_WIDTH - 190,
  top: 200,
  bottom: Math.round(PIRATE_HEIGHT * 0.8), // 1536
};

const b = (beats: number) => beats * BEAT_FRAMES;

export const SECTIONS = {
  hook: { from: 0, to: b(8) }, // 0.0–3.2 s
  map: { from: b(8), to: b(20) }, // 3.2–8.0 s
  spots: { from: b(20), to: b(50) }, // 8.0–20.0 s (3 × 4 s)
  gameplay: { from: b(50), to: b(76) }, // 20.0–30.4 s
  tip: { from: b(76), to: b(90) }, // 30.4–36.0 s
  cta: { from: b(90), to: b(100) }, // 36.0–40.0 s
} as const;

export interface Spot {
  name: string;
  chests: number;
  /** position on the island map, 0–1 */
  mapX: number;
  mapY: number;
  /** frame (absolute) at which the map marker lights up */
  highlightFrame: number;
  from: number;
  to: number;
  vo: string;
}

export const SPOTS: Spot[] = [
  { name: "RUBBER RESORT", chests: 47, mapX: 0.3, mapY: 0.36, highlightFrame: b(12.5), from: b(20), to: b(30), vo: "Rubber Resort – czterdzieści siedem skrzynek!" },
  { name: "LANTERN LANDING", chests: 45, mapX: 0.68, mapY: 0.44, highlightFrame: b(14.5), from: b(30), to: b(40), vo: "Lantern Landing – czterdzieści pięć!" },
  { name: "LOGUETOWN", chests: 41, mapX: 0.44, mapY: 0.7, highlightFrame: b(16.5), from: b(40), to: b(50), vo: "Loguetown – czterdzieści jeden!" },
];

/** Gameplay beats (absolute frames). */
export const GAME = {
  jump: b(50), // leave the bus
  skydive: b(52),
  glider: b(54.5),
  landing: b(57.5),
  run: b(59), // speed-ramp: chests 1–6
  /** speed-ramp: quick chests come faster and faster (offsets from `run`) */
  quickChestOffsets: [24, 84, 132, 170, 200, 226],
  quickChests: 6,
  slowmo: b(70), // last chest, music drops out
  reveal: b(73), // lid opens → ordinary loot
  end: b(76),
};

export function chestOpenFrame(i: number): number {
  if (i < GAME.quickChests) return GAME.run + GAME.quickChestOffsets[i];
  return GAME.reveal;
}

/** Voice-over lines (Polish, energetic young male gaming narrator). Times in seconds. */
export interface VoLine {
  start: number;
  end: number;
  text: string;
}

export const VO_LINES: VoLine[] = [
  { start: 0.15, end: 3.1, text: "Chcesz zdobyć piracki token w Fortnite? Zobacz, gdzie warto lądować!" },
  { start: 3.3, end: 7.9, text: "Token może wypaść ze skrzynki, więc liczy się, ile ich otworzysz. Oto trzy miejsca z największą liczbą skrzynek!" },
  ...SPOTS.map((s) => ({ start: s.from / PIRATE_FPS + 0.15, end: s.from / PIRATE_FPS + 3.2, text: s.vo })),
  { start: 20.3, end: 23.0, text: "Skacz, ląduj, otwieraj, nie zatrzymuj się!" },
  { start: 30.5, end: 35.9, text: "Otwieraj jak najwięcej skrzynek i sprawdzaj zasady aktualnego wydarzenia! I pamiętaj – to rzadki drop, a nie pewniak." },
  { start: 36.2, end: 39.5, text: "A ty już trafiłeś piracki token? Napisz w komentarzu!" },
];

/** On-screen captions: popped in word by word, `gold` words highlighted. */
export interface Caption {
  from: number;
  to: number;
  text: string;
  gold: string[];
  y: number;
  size: number;
  /** frames between words */
  stagger: number;
}

export const CAPTIONS: Caption[] = [
  { from: 6, to: SECTIONS.hook.to, text: "CHCESZ ZDOBYĆ PIRACKI TOKEN? 🏴‍☠️", gold: ["PIRACKI", "TOKEN?"], y: 330, size: 118, stagger: 9 },
  { from: SECTIONS.map.from + 8, to: SECTIONS.map.to, text: "NAJWIĘCEJ SKRZYNEK = WIĘCEJ SZANS", gold: ["SKRZYNEK", "SZANS"], y: 270, size: 104, stagger: 8 },
  { from: GAME.reveal + 10, to: GAME.end, text: "TYM RAZEM NIE… ALE GRAMY DALEJ! 😤", gold: ["GRAMY", "DALEJ!"], y: 360, size: 104, stagger: 5 },
  {
    from: SECTIONS.tip.from + 26,
    to: SECTIONS.tip.to,
    text: "OTWIERAJ JAK NAJWIĘCEJ SKRZYNEK I SPRAWDZAJ ZASADY AKTUALNEGO WYDARZENIA!",
    gold: ["NAJWIĘCEJ", "SKRZYNEK", "ZASADY"],
    y: 250,
    size: 84,
    stagger: 6,
  },
  {
    from: SECTIONS.cta.from + 6,
    to: PIRATE_FRAMES - 12, // cleared before the loop point (frame 0 has no caption)
    text: "A TY JUŻ TRAFIŁEŚ PIRACKI TOKEN? NAPISZ W KOMENTARZU! 👇",
    gold: ["PIRACKI", "TOKEN?", "KOMENTARZU!"],
    y: 260,
    size: 92,
    stagger: 6,
  },
];

export const VIDEO_DESCRIPTION =
  "Liczba skrzynek z fanowskich map; token jest losowy i bardzo rzadki. Zasady wydarzenia mogą się zmienić.";

/** Sound effects placed on the timeline (seconds). Names match `makePirateSfx`. */
export const SFX_CUES: { at: number; name: string; gain?: number }[] = [
  { at: 0.0, name: "coin" },
  { at: 0.02, name: "whoosh", gain: 0.7 },
  { at: 1.15, name: "bassHit" }, // on the word "token"
  { at: SECTIONS.map.from / PIRATE_FPS - 0.1, name: "whoosh", gain: 0.8 },
  ...SPOTS.map((s) => ({ at: s.highlightFrame / PIRATE_FPS, name: "ping" })),
  ...SPOTS.map((s) => ({ at: s.from / PIRATE_FPS - 0.12, name: "whoosh", gain: 0.9 })),
  ...SPOTS.map((s) => ({ at: (s.from + 120) / PIRATE_FPS, name: "ding", gain: 0.7 })),
  { at: GAME.jump / PIRATE_FPS - 0.1, name: "whoosh" },
  { at: GAME.skydive / PIRATE_FPS - 0.3, name: "wind", gain: 0.8 },
  { at: GAME.glider / PIRATE_FPS, name: "glider" },
  { at: GAME.landing / PIRATE_FPS, name: "land" },
  ...Array.from({ length: GAME.quickChests }, (_, i) => ({ at: chestOpenFrame(i) / PIRATE_FPS, name: "chest" })),
  { at: GAME.slowmo / PIRATE_FPS + 0.2, name: "creak" },
  { at: GAME.reveal / PIRATE_FPS, name: "sadTrombone" },
  { at: SECTIONS.tip.from / PIRATE_FPS - 0.1, name: "whoosh", gain: 0.8 },
  { at: SECTIONS.tip.from / PIRATE_FPS + 0.1, name: "scroll" },
  { at: SECTIONS.cta.from / PIRATE_FPS, name: "confetti" },
];

/** Ticks while the chest counters count up. */
for (const s of SPOTS) {
  for (let i = 0; i < 10; i++) SFX_CUES.push({ at: (s.from + 30 + i * 9) / PIRATE_FPS, name: "tick", gain: 0.35 });
}

function srtTime(sec: number) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

/** Voice-over script as SRT (handy as a recording guide and as closed captions). */
export function voiceoverSrt(): string {
  return VO_LINES.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.text}\n`).join("\n");
}
