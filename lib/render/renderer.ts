import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SceneSpec } from "../scene/types";
import { createJob, getJob, updateJob, type Job } from "../jobs/store";
import { findBrowserExecutable } from "./browser";
import { rendersDir, type VideoMeta } from "./storage";

export { isValidVideoId, listVideos, rendersDir, type VideoMeta } from "./storage";

export const COMPOSITION_ID = "KidsShort";

export interface RenderResult {
  videoId: string;
  fileName: string;
  url: string;
  downloadUrl: string;
  sizeBytes: number;
  durationInSeconds: number;
  renderSeconds: number;
}

// ── Remotion bundle (built once per server process) ───────────────

const g = globalThis as unknown as { __shortsBundle?: Promise<string>; __shortsQueue?: Promise<unknown> };

async function getBundle(onProgress?: (p: number) => void): Promise<string> {
  if (!g.__shortsBundle) {
    g.__shortsBundle = (async () => {
      const { bundle } = await import("@remotion/bundler");
      const root = process.cwd();
      return bundle({
        entryPoint: path.join(root, "remotion", "index.ts"),
        publicDir: path.join(root, "public"),
        onProgress: (p) => onProgress?.(p / 100),
        outDir: path.join(os.tmpdir(), `shorts-ai-bundle-${process.pid}`),
      });
    })().catch((err) => {
      g.__shortsBundle = undefined;
      throw err;
    });
  }
  return g.__shortsBundle;
}

/** Renders a scene to MP4 (H.264 + AAC, 1080×1920). Used by the API and by the CLI test. */
export async function renderSceneToFile(
  scene: SceneSpec,
  outputFile: string,
  onProgress: (stage: string, progress: number) => void = () => {},
) {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  onProgress("Przygotowuję animację…", 0.02);
  const serveUrl = await getBundle((p) => onProgress("Przygotowuję animację…", 0.02 + p * 0.08));
  const browserExecutable = findBrowserExecutable();
  const inputProps = scene as unknown as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps, browserExecutable });

  const concurrency = Number(process.env.RENDER_CONCURRENCY) || Math.max(1, Math.floor(os.cpus().length / 2));
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: outputFile,
    crf: 20,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 92,
    concurrency,
    browserExecutable,
    onProgress: ({ progress, stitchStage }) => {
      onProgress(stitchStage === "muxing" ? "Dodaję dźwięk…" : "Renderuję klatki…", 0.1 + progress * 0.88);
    },
  });
  onProgress("Gotowe!", 1);
}

// Only one render at a time – rendering is CPU heavy.
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const prev = g.__shortsQueue ?? Promise.resolve();
  const next = prev.then(task, task);
  g.__shortsQueue = next.catch(() => undefined);
  return next;
}

export function startRenderJob(scene: SceneSpec): Job<RenderResult> {
  const job = createJob<RenderResult>("render", "W kolejce…");
  const started = Date.now();
  enqueue(async () => {
    const dir = rendersDir();
    await mkdir(dir, { recursive: true });
    const videoId = `${new Date().toISOString().slice(0, 10)}-${job.id.slice(0, 8)}`;
    const fileName = `${videoId}.mp4`;
    const output = path.join(dir, fileName);
    updateJob(job.id, { status: "running", stage: "Startuję renderowanie…", progress: 0.01 });
    await renderSceneToFile(scene, output, (stage, progress) => updateJob(job.id, { stage, progress }));
    const { size } = await stat(output);
    const meta: VideoMeta = {
      videoId,
      title: scene.title,
      prompt: scene.prompt,
      style: scene.style,
      theme: scene.theme,
      durationInSeconds: scene.durationInSeconds,
      createdAt: Date.now(),
      sizeBytes: size,
      provider: scene.provider,
    };
    await writeFile(path.join(dir, `${videoId}.json`), JSON.stringify(meta, null, 2));
    const result: RenderResult = {
      videoId,
      fileName,
      url: `/api/videos/${videoId}`,
      downloadUrl: `/api/videos/${videoId}?download=1`,
      sizeBytes: size,
      durationInSeconds: scene.durationInSeconds,
      renderSeconds: Math.round((Date.now() - started) / 1000),
    };
    updateJob(job.id, { status: "done", progress: 1, stage: "Gotowe!", result });
  }).catch((err: unknown) => {
    console.error("[render] failed", err);
    updateJob(job.id, {
      status: "error",
      stage: "Błąd renderowania",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  return getJob<RenderResult>(job.id)!;
}
