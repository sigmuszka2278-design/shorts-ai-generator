import { ANIMAL_LABELS, MAGIC_LABELS } from "../scene/dictionary";
import { generateScene } from "../scene/generator";
import { climaxFrame } from "../scene/timeline";
import type { AnimalId, GenerateOptions, MagicId, SceneSpec, ThemeId } from "../scene/types";

const ANIMAL_EN: Record<AnimalId, string> = {
  kot: "a cute kitten",
  pies: "a happy puppy",
  krolik: "a fluffy bunny",
  mis: "a teddy bear",
  zaba: "a smiling frog",
  kaczka: "a yellow duckling",
  jednorozec: "a pastel unicorn",
  smok: "a friendly baby dragon",
  panda: "a baby panda",
  lis: "a little fox",
  pingwin: "a baby penguin",
  swinka: "a pink piglet",
};

const MAGIC_EN: Record<MagicId, string> = {
  rozdzka: "a sparkling magic wand",
  gwiazda: "a smiling golden star",
  korona: "a shiny golden crown",
  prezent: "a magical gift box",
  krysztal: "a glowing crystal",
  balon: "colorful balloons",
  serce: "floating hearts",
  ksiezyc: "a smiling moon",
  grzybek: "a cute red mushroom",
  lizak: "giant swirly lollipops",
};

const THEME_EN: Record<ThemeId, string> = {
  laka: "a sunny flower meadow",
  kosmos: "outer space with planets and stars",
  ocean: "a bright underwater world",
  las: "an enchanted forest",
  zamek: "a fairy-tale castle",
  cukierkowo: "a candy land",
  noc: "a calm starry night",
  niebo: "fluffy clouds in the sky",
};

/** Builds an English text-to-video prompt from the (Polish) idea + what the generator understood. */
export function buildAiPrompt(scene: SceneSpec): string {
  const animals = [...new Set(scene.actors.filter((a) => a.kind === "animal").map((a) => (a as { variant: AnimalId }).variant))];
  const magic = [...new Set(scene.actors.filter((a) => a.kind === "magic").map((a) => (a as { variant: MagicId }).variant))];
  const balls = scene.actors.filter((a) => a.kind === "ball").length;
  const style =
    scene.style === "3d"
      ? "Cute colorful 3D animated cartoon, soft clay-like Pixar-style render, glossy materials, soft lighting"
      : "Cute colorful 2D flat cartoon animation, bold outlines, vibrant flat colors";
  return [
    `${style}, for toddlers and young children.`,
    `Scene: ${THEME_EN[scene.theme]}.`,
    animals.length ? `Characters: ${animals.map((a) => ANIMAL_EN[a]).join(", ")}, playful and happy.` : "",
    balls ? `${balls} bouncing glossy rainbow-colored balls.` : "",
    magic.length ? `Magic: ${magic.map((m) => MAGIC_EN[m]).join(", ")}, sparkles and glitter.` : "",
    `Original idea (Polish): "${scene.prompt}".`,
    "Bright saturated colors, smooth joyful motion, vertical 9:16 composition, safe for kids, no text, no scary elements.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Polish summary used in the UI for AI scenes. */
export function describeAiScene(scene: SceneSpec, model: string): string[] {
  const animals = scene.actors.filter((a) => a.kind === "animal").map((a) => ANIMAL_LABELS[(a as { variant: AnimalId }).variant]);
  const magic = scene.actors.filter((a) => a.kind === "magic").map((a) => MAGIC_LABELS[(a as { variant: MagicId }).variant]);
  return [`Model AI: ${model}`, ...(animals.length ? [`Bohaterowie: ${animals.join(", ")}`] : []), ...(magic.length ? [`Magia: ${magic.join(", ")}`] : [])];
}

/**
 * Wraps an AI clip into a scene: the clip becomes the background and the app
 * adds the animated title, magic effects, music and sound effects on top.
 */
export async function sceneFromAiClip(
  options: GenerateOptions,
  videoUrl: string,
  provider: string,
  model: string,
  probe: (url: string) => Promise<number | null> = probeDuration,
): Promise<SceneSpec> {
  const base = generateScene(options);
  const clipDuration = await probe(videoUrl);
  const total = base.durationInSeconds * base.fps;
  const climax = climaxFrame(total);
  return {
    ...base,
    actors: [],
    backgroundVideoUrl: videoUrl,
    backgroundVideoDurationInSeconds: clipDuration ?? undefined,
    provider,
    sounds: base.sounds.filter((s) => s.frame <= 3 || s.frame >= climax),
    detected: [...describeAiScene(base, model), ...base.detected.filter((d) => d.startsWith("Efekty") || d.startsWith("Sceneria"))],
  };
}

export function fillTemplate(template: string, vars: Record<string, string | number>): unknown {
  const filled = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined) return "";
    // strings are inserted JSON-escaped (without the surrounding quotes)
    return typeof value === "number" ? String(value) : JSON.stringify(value).slice(1, -1);
  });
  return JSON.parse(filled);
}

/** Finds the first video URL in an arbitrary model output (string, array or object). */
export function extractVideoUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") return /^https?:\/\//.test(output) ? output : null;
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = extractVideoUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof output === "object") {
    const obj = output as Record<string, unknown>;
    for (const key of ["videoUrl", "video_url", "video", "url", "output", "mp4"]) {
      const url = extractVideoUrl(obj[key]);
      if (url) return url;
    }
    for (const value of Object.values(obj)) {
      const url = extractVideoUrl(value);
      if (url) return url;
    }
  }
  return null;
}

export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("Przerwano"));
    });
  });

/** Reads the clip length (needs a server that supports HTTP Range – all CDNs do). */
export async function probeDuration(url: string): Promise<number | null> {
  try {
    const { parseMedia } = await import("@remotion/media-parser");
    const { durationInSeconds } = await parseMedia({
      src: url,
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    return durationInSeconds && durationInSeconds > 0.5 ? durationInSeconds : null;
  } catch (err) {
    console.warn("[ai] could not read clip duration", err);
    return null;
  }
}
