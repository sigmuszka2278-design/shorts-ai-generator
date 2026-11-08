import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createJob, updateJob } from "@/lib/jobs/store";
import { getProviders, isProviderId } from "@/lib/providers";
import { clampDuration } from "@/lib/scene/generator";
import type { GenerateOptions, SceneSpec, ThemeId } from "@/lib/scene/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THEMES: ThemeId[] = ["laka", "kosmos", "ocean", "las", "zamek", "cukierkowo", "noc", "niebo"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Nieprawidłowe dane");
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 3) return jsonError("Wpisz pomysł na film (co najmniej 3 znaki)");
  if (prompt.length > 300) return jsonError("Pomysł może mieć maksymalnie 300 znaków");

  const theme = typeof body.theme === "string" && THEMES.includes(body.theme as ThemeId) ? (body.theme as ThemeId) : "auto";
  const options: GenerateOptions = {
    prompt,
    durationInSeconds: clampDuration(Number(body.duration ?? 10)),
    style: body.style === "2d" ? "2d" : "3d",
    theme,
    seed: Number.isInteger(body.seed) ? (body.seed as number) >>> 0 : undefined,
    sfx: body.sfx !== false,
    music: body.music !== false,
  };

  const providerId = isProviderId(body.provider) ? body.provider : "procedural";
  const provider = getProviders()[providerId];
  const info = provider.info();
  if (!info.available) return jsonError(`${info.name} jest niedostępny. ${info.hint ?? ""}`.trim());

  if (info.kind === "procedural") {
    const scene = await provider.generate(options, () => {});
    return NextResponse.json({ scene });
  }

  // AI providers can take minutes – run in the background and let the client poll /api/jobs/:id
  const job = createJob<SceneSpec>("ai", "Łączę z generatorem AI…");
  updateJob(job.id, { status: "running" });
  provider
    .generate(options, (stage, progress) => updateJob(job.id, { stage, progress }))
    .then((scene) => updateJob(job.id, { status: "done", progress: 1, stage: "Gotowe!", result: scene }))
    .catch((err: unknown) =>
      updateJob(job.id, { status: "error", stage: "Błąd", error: err instanceof Error ? err.message : String(err) }),
    );
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
