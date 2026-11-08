"use client";

import type React from "react";
import type { SceneSpec } from "@/lib/scene/types";

export interface BrowserRenderResult {
  blob: Blob;
  url: string;
  fileName: string;
  sizeBytes: number;
  durationInSeconds: number;
  renderSeconds: number;
}

/**
 * Renders the film to MP4 (H.264 + AAC, 1080×1920) directly in the browser using WebCodecs.
 * Works on hosting without a render server (e.g. Vercel) – the phone/computer does the work.
 */
export async function renderInBrowser(
  scene: SceneSpec,
  onProgress: (progress: number, stage: string) => void,
  signal?: AbortSignal,
): Promise<BrowserRenderResult> {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") {
    throw new Error(
      "Ta przeglądarka nie potrafi tworzyć plików wideo. Zaktualizuj iOS / Safari (wymagany iOS 16.4 lub nowszy) albo użyj Chrome na komputerze.",
    );
  }
  const started = Date.now();
  onProgress(0.01, "Przygotowuję renderowanie…");
  const [{ renderMediaOnWeb, canRenderMediaOnWeb }, { KidsShort }] = await Promise.all([
    import("@remotion/web-renderer"),
    import("@/remotion/KidsShort"),
  ]);

  const check = await canRenderMediaOnWeb({
    container: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    width: scene.width,
    height: scene.height,
  });
  if (!check.canRender) {
    const reason = check.issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ");
    throw new Error(`Ta przeglądarka nie może zapisać MP4 (${reason || "brak kodeka H.264/AAC"}).`);
  }

  const durationInFrames = Math.round(scene.durationInSeconds * scene.fps);
  const result = await renderMediaOnWeb({
    composition: {
      id: "KidsShort",
      component: KidsShort as unknown as React.ComponentType<Record<string, unknown>>,
      width: scene.width,
      height: scene.height,
      fps: scene.fps,
      durationInFrames,
    },
    inputProps: scene as unknown as Record<string, unknown>,
    container: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    videoBitrate: "high",
    signal: signal ?? null,
    // Remotion is free for individuals and companies of up to 3 people (https://remotion.dev/license).
    // Larger companies: set NEXT_PUBLIC_REMOTION_LICENSE_KEY to your company license key.
    licenseKey: process.env.NEXT_PUBLIC_REMOTION_LICENSE_KEY || "free-license",
    onProgress: ({ progress }) => onProgress(0.02 + progress * 0.95, "Renderuję klatki na tym urządzeniu…"),
  });
  onProgress(0.98, "Zapisuję plik MP4…");
  const blob = await result.getBlob();
  const slug = scene.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  onProgress(1, "Gotowe!");
  return {
    blob,
    url: URL.createObjectURL(blob),
    fileName: `shorts-${slug || "film"}.mp4`,
    sizeBytes: blob.size,
    durationInSeconds: scene.durationInSeconds,
    renderSeconds: Math.round((Date.now() - started) / 1000),
  };
}

/** iPhone: opens the share sheet, where "Zapisz wideo" saves the film to Photos. */
export async function shareVideo(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: "video/mp4" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== "function" || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title });
  } catch (err) {
    if ((err as Error).name !== "AbortError") throw err;
  }
  return true;
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  try {
    return Boolean(typeof nav.share === "function" && nav.canShare?.({ files: [new File([new Blob()], "t.mp4", { type: "video/mp4" })] }));
  } catch {
    return false;
  }
}
