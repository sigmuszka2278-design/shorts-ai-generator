import {
  ANIMAL_COLORS,
  ANIMAL_LABELS,
  ANIMALS,
  BALL_STEMS,
  COLORS,
  EFFECTS,
  MAGIC,
  MAGIC_COLORS,
  MAGIC_LABELS,
  MOTIONS,
  MUSIC_FOR_THEME,
  NUMBER_WORDS,
  THEME_LABELS,
  THEMES,
  type KeywordEntry,
} from "./dictionary";
import { landingFrames } from "./motion";
import { climaxFrame, outroStartFrame } from "./timeline";
import { createRandom, hashString, type Random } from "./random";
import {
  MAX_DURATION,
  MIN_DURATION,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type Actor,
  type AnimalActor,
  type AnimalId,
  type BallActor,
  type Effect,
  type EffectKind,
  type Entrance,
  type GenerateOptions,
  type MagicActor,
  type MagicId,
  type Motion,
  type SceneSpec,
  type SoundCue,
  type ThemeId,
} from "./types";

export const THEME_PALETTES: Record<ThemeId, string[]> = {
  laka: ["#ff4d6d", "#ffd60a", "#3a86ff", "#ff9f1c", "#9b5de5", "#52d273"],
  kosmos: ["#f72585", "#7209b7", "#4cc9f0", "#ffd60a", "#80ffdb", "#ff9e00"],
  ocean: ["#00bbf9", "#00f5d4", "#fee440", "#f15bb5", "#9b5de5", "#ff8fab"],
  las: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c"],
  zamek: ["#ff70a6", "#ffd670", "#e9ff70", "#70d6ff", "#c77dff", "#ff9770"],
  cukierkowo: ["#ff70a6", "#ffcad4", "#70d6ff", "#ffd670", "#cdb4db", "#ff9770"],
  noc: ["#ffd60a", "#c77dff", "#4cc9f0", "#ff70a6", "#80ffdb", "#ffffff"],
  niebo: ["#ff4d6d", "#ffd60a", "#52d273", "#3a86ff", "#9b5de5", "#ff9f1c"],
};

const OUTROS = ["Pa, pa!", "Do zobaczenia!", "Brawo!", "Hura!", "Koniec bajki!"];

/** Lower-case and strip Polish diacritics. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function matches(tokens: string[], stems: string[], exact: string[] = []): number {
  let count = 0;
  for (const token of tokens) {
    if (exact.includes(token) || stems.some((s) => token.startsWith(s))) count++;
  }
  return count;
}

function findAll<T extends string>(tokens: string[], entries: KeywordEntry<T>[]): T[] {
  const found: { id: T; index: number }[] = [];
  for (const entry of entries) {
    const index = tokens.findIndex(
      (t) => entry.exact?.includes(t) || entry.stems.some((s) => t.startsWith(s)),
    );
    if (index >= 0) found.push({ id: entry.id, index });
  }
  // keep the order in which the user mentioned things
  return found.sort((a, b) => a.index - b.index).map((f) => f.id);
}

/** Number written next to "kulki"/"piłki", e.g. "pięć kulek" or "5 kulek". */
export function detectBallCount(tokens: string[]): number | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!BALL_STEMS.some((s) => tokens[i].startsWith(s))) continue;
    for (const j of [i - 1, i - 2, i + 1]) {
      const t = tokens[j];
      if (!t) continue;
      if (/^\d+$/.test(t)) return clamp(parseInt(t, 10), 1, 14);
      if (t in NUMBER_WORDS) return clamp(NUMBER_WORDS[t], 1, 14);
    }
    return null;
  }
  return null;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 10;
  return clamp(Math.round(seconds), MIN_DURATION, MAX_DURATION);
}

export function makeTitle(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (!clean) return "Magiczna przygoda";
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (capitalized.length <= 42) return capitalized;
  const cut = capitalized.slice(0, 42);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : 42)}…`;
}

interface Analysis {
  animals: AnimalId[];
  magic: MagicId[];
  theme: ThemeId | null;
  motion: Motion | null;
  effects: EffectKind[];
  colors: { label: string; hex: string }[];
  ballCount: number | null;
  wantsBalls: boolean;
  rainbowColors: boolean;
}

export function analyzePrompt(prompt: string): Analysis {
  const tokens = tokenize(prompt);
  let theme: ThemeId | null = null;
  let best = 0;
  for (const entry of THEMES) {
    const score = matches(tokens, entry.stems, entry.exact);
    if (score > best) {
      best = score;
      theme = entry.id;
    }
  }
  const motion = MOTIONS.find((m) => matches(tokens, m.stems) > 0)?.id ?? null;
  const effects = EFFECTS.filter((e) => matches(tokens, e.stems) > 0).map((e) => e.id);
  const colors = COLORS.filter((c) => matches(tokens, c.stems) > 0).map(({ label, hex }) => ({ label, hex }));
  return {
    animals: findAll(tokens, ANIMALS).slice(0, 3),
    magic: findAll(tokens, MAGIC).slice(0, 2),
    theme,
    motion,
    effects,
    colors,
    ballCount: detectBallCount(tokens),
    wantsBalls: matches(tokens, BALL_STEMS) > 0,
    rainbowColors: matches(tokens, ["kolorow", "teczow", "roznokolor", "wielokolor"]) > 0,
  };
}

const DEFAULT_EFFECT_FOR_MAGIC: Record<MagicId, EffectKind> = {
  rozdzka: "sparkles",
  gwiazda: "stars",
  korona: "sparkles",
  prezent: "confetti",
  krysztal: "sparkles",
  balon: "confetti",
  serce: "hearts",
  ksiezyc: "stars",
  grzybek: "sparkles",
  lizak: "confetti",
};

const MAGIC_MOTION: Record<MagicId, Motion> = {
  rozdzka: "wiggle",
  gwiazda: "spin",
  korona: "float",
  prezent: "pulse",
  krysztal: "float",
  balon: "float",
  serce: "pulse",
  ksiezyc: "float",
  grzybek: "pulse",
  lizak: "spin",
};

/**
 * Turns a Polish idea into a fully programmatic animation description.
 * Deterministic for a given (prompt, seed, options).
 */
export function generateScene(options: GenerateOptions): SceneSpec {
  const prompt = (options.prompt ?? "").trim().slice(0, 300);
  const durationInSeconds = clampDuration(options.durationInSeconds);
  const fps = VIDEO_FPS;
  const total = durationInSeconds * fps;
  const seed = (options.seed ?? hashString(prompt || "shorts")) >>> 0;
  const rnd = createRandom(seed);
  const analysis = analyzePrompt(prompt);

  const theme: ThemeId =
    options.theme && options.theme !== "auto"
      ? options.theme
      : analysis.theme ?? rnd.pick<ThemeId>(["laka", "niebo", "las", "cukierkowo", "kosmos", "ocean"]);

  // Colours: detected ones first, then the theme palette
  const themePalette = THEME_PALETTES[theme];
  const palette = analysis.colors.length
    ? [...analysis.colors.map((c) => c.hex), ...themePalette].slice(0, 6)
    : themePalette;
  const ballPalette = analysis.colors.length && !analysis.rainbowColors ? analysis.colors.map((c) => c.hex) : palette;

  // What appears in the film – fill the gaps with surprises
  const animals: AnimalId[] = analysis.animals.length
    ? analysis.animals
    : [rnd.pick<AnimalId>(["kot", "pies", "krolik", "mis", "zaba", "kaczka", "jednorozec", "panda", "pingwin"])];
  const magic: MagicId[] = analysis.magic.length
    ? analysis.magic
    : [rnd.pick<MagicId>(theme === "noc" ? ["ksiezyc", "gwiazda"] : ["rozdzka", "gwiazda", "krysztal", "serce", "balon"])];

  const shortClip = durationInSeconds <= 7;
  const ballCount = analysis.ballCount ?? (analysis.wantsBalls ? rnd.int(5, 8) : rnd.int(3, 5));
  const maxBalls = shortClip ? Math.min(ballCount, 8) : ballCount;

  // ── timeline (proportional to the duration) ──
  const at = (fraction: number) => Math.round(total * fraction);
  const ballsStart = Math.max(8, at(0.05));
  const ballsEnd = at(shortClip ? 0.3 : 0.25);
  const animalsStart = at(0.12);
  const animalsEnd = at(0.4);
  const magicStart = at(0.42);
  const climax = climaxFrame(total);
  const outroStart = outroStartFrame(total);

  const actors: Actor[] = [];
  const sounds: SoundCue[] = [];
  const sfxEnabled = options.sfx !== false;
  const addSound = (frame: number, sfx: SoundCue["sfx"], volume = 0.7) => {
    if (frame >= 0 && frame < total - 3) sounds.push({ frame: Math.round(frame), sfx, volume });
  };

  addSound(2, "whoosh", 0.55);

  // Balls
  const ballMotion: Motion =
    analysis.motion === "spin" || analysis.motion === "roll" || analysis.motion === "float" ? analysis.motion : "bounce";
  for (let i = 0; i < maxBalls; i++) {
    const enterFrame = Math.round(ballsStart + ((ballsEnd - ballsStart) * i) / Math.max(1, maxBalls - 1));
    const depth = rnd.range(0.15, 1);
    const size = Math.round(70 + depth * 110);
    const ball: BallActor = {
      kind: "ball",
      id: `ball-${i}`,
      x: clamp(0.1 + ((i + rnd.range(0.2, 0.8)) / maxBalls) * 0.8, 0.08, 0.92),
      y: rnd.range(0.3, 0.6),
      size,
      color: ballPalette[i % ballPalette.length],
      enterFrame,
      entrance: rnd.pick<Entrance>(["drop", "pop", "drop"]),
      motion: ballMotion,
      depth,
      phase: rnd.int(0, 40),
    };
    actors.push(ball);
    if (i < 8) addSound(enterFrame + 4, i % 2 ? "pop" : "bubble", 0.45 + depth * 0.25);
  }

  // Animals
  const animalMotion: Motion = analysis.motion ?? rnd.pick<Motion>(["jump", "wiggle", "jump"]);
  const slots = animals.length === 1 ? [0.5] : animals.length === 2 ? [0.3, 0.7] : [0.2, 0.5, 0.8];
  animals.forEach((variant, i) => {
    const [body, accent] = ANIMAL_COLORS[variant];
    const enterFrame = Math.round(animalsStart + ((animalsEnd - animalsStart) * i) / Math.max(1, animals.length));
    const motion: Motion = animalMotion === "roll" ? "wiggle" : animalMotion;
    const animal: AnimalActor = {
      kind: "animal",
      id: `animal-${i}`,
      variant,
      x: slots[i],
      y: animals.length === 3 ? (i === 1 ? 0.8 : 0.74) : 0.77,
      size: animals.length === 3 ? 290 : animals.length === 2 ? 340 : 420,
      color: body,
      accent,
      enterFrame,
      entrance: animals.length === 1 ? "rise" : i % 2 === 0 ? "slide-left" : "slide-right",
      motion,
      depth: 0.9,
      phase: i * 9,
    };
    actors.push(animal);
    addSound(enterFrame, animal.entrance === "rise" ? "boing" : "whoosh", 0.6);
    addSound(enterFrame + 12, "squeak", 0.55);
    if (i === 0) {
      // landing sounds for the main character (every second jump, quietly)
      landingFrames(motion, animal.phase, 20, total - enterFrame)
        .filter((_, k) => k % 2 === 0)
        .forEach((t) => addSound(enterFrame + t, "thump", 0.35));
    }
  });

  // Magic items
  magic.forEach((variant, i) => {
    const [color, accent] = MAGIC_COLORS[variant];
    const enterFrame = magicStart + i * 12;
    const item: MagicActor = {
      kind: "magic",
      id: `magic-${i}`,
      variant,
      x: magic.length === 1 ? 0.5 : i === 0 ? 0.32 : 0.68,
      y: 0.4,
      size: magic.length === 1 ? 300 : 230,
      color,
      accent,
      enterFrame,
      entrance: "pop",
      motion: MAGIC_MOTION[variant],
      depth: 1,
      phase: i * 20,
    };
    actors.push(item);
    addSound(enterFrame, "magic", 0.7);
  });

  // Effects – mentioned ones first, otherwise derived from magic items
  const effectKinds: EffectKind[] = analysis.effects.length
    ? analysis.effects.slice(0, 3)
    : [DEFAULT_EFFECT_FOR_MAGIC[magic[0]]];
  if (!effectKinds.includes("confetti") && !shortClip && rnd.chance(0.5)) effectKinds.push("confetti");
  const effects: Effect[] = effectKinds.map((kind, i) => {
    const startFrame = climax + i * 10;
    return { kind, startFrame, durationInFrames: Math.max(30, total - startFrame) };
  });
  effects.forEach((effect, i) => {
    const sfx = effect.kind === "bubbles" ? "bubble" : effect.kind === "confetti" ? "pop" : effect.kind === "rainbow" ? "chime" : "sparkle";
    addSound(effect.startFrame, sfx, 0.7);
    if (i === 0) addSound(effect.startFrame + 2, "tada", 0.65);
  });

  addSound(outroStart, "chime", 0.6);

  // Music & mix
  const music = options.music === false ? null : { track: MUSIC_FOR_THEME[theme], volume: 0.32 };

  const detected: string[] = [
    `Sceneria: ${THEME_LABELS[theme]}${analysis.theme || (options.theme && options.theme !== "auto") ? "" : " (losowo)"}`,
    `Bohaterowie: ${animals.map((a) => ANIMAL_LABELS[a]).join(", ")}${analysis.animals.length ? "" : " (niespodzianka)"}`,
    `Kolorowe kulki: ${maxBalls}`,
    `Magia: ${magic.map((m) => MAGIC_LABELS[m]).join(", ")}`,
    `Efekty: ${effectKinds.map((e) => EFFECTS.find((x) => x.id === e)?.label ?? e).join(", ")}`,
  ];
  if (analysis.motion) detected.push(`Ruch: ${MOTIONS.find((m) => m.id === analysis.motion)?.label}`);
  if (analysis.colors.length) detected.push(`Kolory: ${analysis.colors.map((c) => c.label).join(", ")}`);

  return {
    version: 1,
    prompt,
    title: makeTitle(prompt),
    outro: theme === "noc" ? "Dobranoc!" : rnd.pick(OUTROS),
    seed,
    style: options.style === "2d" ? "2d" : "3d",
    theme,
    durationInSeconds,
    fps,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    palette,
    actors,
    effects,
    sounds: sfxEnabled ? sounds.sort((a, b) => a.frame - b.frame) : [],
    music,
    sfxEnabled,
    provider: "procedural",
    detected,
  };
}

/** Validates & sanitises a scene coming from the client before rendering. */
export function sanitizeScene(input: unknown, opts: { allowedVideoOrigins?: string[] } = {}): SceneSpec {
  if (!input || typeof input !== "object") throw new Error("Brak opisu sceny");
  const scene = input as Partial<SceneSpec>;
  if (scene.version !== 1 || !Array.isArray(scene.actors) || !Array.isArray(scene.effects) || !Array.isArray(scene.sounds)) {
    throw new Error("Nieprawidłowy opis sceny");
  }
  const durationInSeconds = clampDuration(Number(scene.durationInSeconds));
  if (scene.actors.length > 40 || scene.effects.length > 10 || scene.sounds.length > 200) {
    throw new Error("Scena jest zbyt rozbudowana");
  }
  const bg = scene.backgroundVideoUrl;
  if (bg !== undefined && !isAllowedVideoUrl(bg, opts.allowedVideoOrigins ?? [])) {
    throw new Error("Nieprawidłowy adres wideo AI");
  }
  return {
    ...(scene as SceneSpec),
    title: String(scene.title ?? "").slice(0, 80),
    outro: String(scene.outro ?? "").slice(0, 40),
    durationInSeconds,
    backgroundVideoDurationInSeconds:
      typeof scene.backgroundVideoDurationInSeconds === "number" && scene.backgroundVideoDurationInSeconds > 0.5
        ? Math.min(600, scene.backgroundVideoDurationInSeconds)
        : undefined,
    fps: VIDEO_FPS,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  };
}

/** AI clips must be served over HTTPS – or come from the configured AI server's own origin. */
function isAllowedVideoUrl(url: unknown, allowedOrigins: string[]): boolean {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" && allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}
