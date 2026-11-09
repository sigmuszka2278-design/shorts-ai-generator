/**
 * Renders the scripted story "Mruczek i jego wąsy" to MP4 (1080×1920, H.264 + AAC).
 *
 *   npm run render:mruczek                      # → renders/mruczek-wasy.mp4
 *   npm run render:mruczek -- --stills          # only preview PNG frames (renders/mruczek-stills)
 *   npm run render:mruczek -- --out=film.mp4
 *
 * Voiceover is pre-recorded in public/stories/mruczek (regenerate with scripts/stories/voiceover.py).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { rendersDir } from "../lib/render/storage";

const ID = "MruczekWasy";

async function main() {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const framesArg = process.argv.find((a) => a.startsWith("--frames="));
  const output = path.resolve(outArg ? outArg.slice(6) : path.join(rendersDir(), "mruczek-wasy.mp4"));
  const browserExecutable = findBrowserExecutable();

  console.log("Pakuję kompozycję…");
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const composition = await selectComposition({ serveUrl, id: ID, browserExecutable });
  console.log(`Kompozycja ${ID}: ${composition.durationInFrames} klatek = ${(composition.durationInFrames / composition.fps).toFixed(2)} s`);

  if (process.argv.includes("--stills")) {
    const dir = path.join(rendersDir(), "mruczek-stills");
    mkdirSync(dir, { recursive: true });
    const frames = framesArg
      ? framesArg.slice(9).split(",").map(Number)
      : Array.from({ length: 16 }, (_, i) => Math.floor(((i + 0.5) / 16) * composition.durationInFrames));
    for (const frame of frames) {
      const file = path.join(dir, `f${String(frame).padStart(4, "0")}.png`);
      await renderStill({ serveUrl, composition, frame, output: file, browserExecutable, scale: 0.5 });
      console.log("  ", file);
    }
    return;
  }

  mkdirSync(path.dirname(output), { recursive: true });
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: output,
    crf: 19,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 92,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.max(1, os.cpus().length - 1),
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct}%`);
      }
    },
  });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "compact", output], {
    encoding: "utf8",
  });
  console.log(probe.trim());
  console.log("Gotowe ✔", output);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
