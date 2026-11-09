/**
 * Renders the 25 s Short "TYLKO JEDEN PORTAL PROWADZI DO SKARBU!" to MP4
 * (H.264 + AAC, 1080×1920, 30 fps).
 *
 *   npm run portal:audio                       # (re)build voice-over + music + SFX
 *   npm run portal:render                      # → renders/portal-short.mp4
 *   npm run portal:render -- --stills=0,4.5,9  # only PNG frames at given seconds
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { FPS, PORTAL_SHORT_ID } from "../remotion/portal/timeline";

async function main() {
  const root = path.resolve(__dirname, "..");
  const outDir = path.join(root, "renders");
  mkdirSync(outDir, { recursive: true });
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundle({ entryPoint: path.join(root, "remotion", "index.ts"), publicDir: path.join(root, "public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: PORTAL_SHORT_ID, browserExecutable });

  const stillsArg = process.argv.find((a) => a.startsWith("--stills="));
  if (stillsArg) {
    const dir = path.join(outDir, "portal-stills");
    mkdirSync(dir, { recursive: true });
    for (const s of stillsArg.split("=")[1].split(",").map(Number)) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(s * FPS));
      const output = path.join(dir, `still-${String(frame).padStart(3, "0")}.png`);
      await renderStill({ serveUrl, composition, frame, output, browserExecutable });
      console.log("still:", output);
    }
    return;
  }

  const output = path.join(outDir, "portal-short.mp4");
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: output,
    crf: 18,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    x264Preset: "slow",
    concurrency: Number(process.env.RENDER_CONCURRENCY) || os.cpus().length,
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct}%`);
      }
    },
  });
  console.log(`✓ ${path.relative(root, output)} (${Math.round((Date.now() - t0) / 1000)} s)`);
  console.log(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration,size", "-of", "default=nw=1", output], { encoding: "utf8" }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
