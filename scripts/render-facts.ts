/**
 * Renders the "6 ciekawostek" YouTube Short (remotion/facts) to MP4.
 *
 *   npx tsx scripts/render-facts.ts <mix.wav> <out.mp4> [--stills=dir]
 *
 * The audio (voice + music + SFX) is produced by facts-short/build.py; Remotion renders
 * the picture and ffmpeg muxes both into H.264 + AAC, 1080×1920, 30 fps.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";

async function main() {
  const [mix, out] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const stillsDir = process.argv.find((a) => a.startsWith("--stills="))?.split("=")[1];
  const onlyStills = process.argv.includes("--only-stills");
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: "FactsShort", inputProps: {}, browserExecutable });
  console.log(`FactsShort: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(2)} s)`);

  if (stillsDir) {
    mkdirSync(stillsDir, { recursive: true });
    const frames = (process.env.STILL_FRAMES ?? "0,30,60").split(",").map(Number);
    for (const frame of frames) {
      const file = path.join(stillsDir, `f${String(frame).padStart(4, "0")}.jpg`);
      await renderStill({ serveUrl, composition, frame, output: file, browserExecutable, imageFormat: "jpeg", jpegQuality: 80 });
      console.log("still", file);
    }
    if (onlyStills) return;
  }

  const silent = path.join(path.dirname(out), "video-silent.mp4");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 18,
    muted: true,
    outputLocation: silent,
    browserExecutable,
    concurrency: Math.max(1, os.cpus().length),
    chromiumOptions: { gl: "swangle" },
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20) * 5;
      if (p !== last) {
        last = p;
        console.log(`render ${p}%`);
      }
    },
  });
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", silent, "-i", mix,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", out,
  ]);
  console.log("✓", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
