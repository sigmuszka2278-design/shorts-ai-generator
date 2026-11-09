/**
 * Renders the "Chmurka i tęcza" short (composition `ChmurkaTecza`) to MP4 (H.264 + AAC, 1080×1920).
 *
 *   npx tsx scripts/render-chmurka.ts [out.mp4] [--stills]
 *
 * The voiceover is pre-generated (public/chmurka/*.mp3 + remotion/chmurka/voiceover.json);
 * to re-generate it run: python3 scripts/tts_chmurka.py public/chmurka  (needs `pip install edge-tts`).
 */
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { findBrowserExecutable } from "../lib/render/browser";

async function main() {
  const args = process.argv.slice(2);
  const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "renders/chmurka-tecza.mp4");
  mkdirSync(path.dirname(out), { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: "ChmurkaTecza", browserExecutable });
  console.log(`ChmurkaTecza: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(2)} s)`);

  const stillsArg = args.find((a) => a.startsWith("--stills"));
  if (stillsArg) {
    const frames = stillsArg.includes("=")
      ? stillsArg.split("=")[1].split(",").map(Number)
      : [20, 150, 240, 330, 420, 560, 600, 700, 780, 870, 960, 1050, 1150, 1230];
    for (const frame of frames) {
      const file = path.join(path.dirname(out), "stills", `chmurka-${String(frame).padStart(4, "0")}.png`);
      await renderStill({ serveUrl, composition, frame, output: file, browserExecutable, scale: 0.5 });
      console.log("still:", file);
    }
    return;
  }

  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: out,
    crf: 18,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 94,
    concurrency: Math.max(1, os.cpus().length - 1),
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        console.log(`render ${pct}%`);
      }
    },
  });
  console.log("✓", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
