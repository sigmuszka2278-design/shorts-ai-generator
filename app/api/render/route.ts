import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { activeJobs } from "@/lib/jobs/store";
import { startRenderJob } from "@/lib/render/renderer";
import { sanitizeScene } from "@/lib/scene/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUEUE = 5;

export async function POST(request: Request) {
  let body: { scene?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Nieprawidłowe dane");
  }
  let scene;
  try {
    const aiServer = process.env.AI_VIDEO_HTTP_URL;
    scene = sanitizeScene(body.scene, { allowedVideoOrigins: aiServer ? [new URL(aiServer).origin] : [] });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Nieprawidłowa scena");
  }
  if (activeJobs("render") >= MAX_QUEUE) return jsonError("Za dużo filmów w kolejce – spróbuj za chwilę", 429);
  const job = startRenderJob(scene);
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
