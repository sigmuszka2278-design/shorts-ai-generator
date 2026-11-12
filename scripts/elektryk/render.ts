/**
 * Renders the contest short to MP4 (1080×1920, 30 fps, H.264 + AAC).
 *
 *   npx tsx scripts/elektryk/build-audio.ts   # audio + subtitle timings (once)
 *   npx tsx scripts/elektryk/render.ts        # video → renders/elektryk/*.mp4
 *   npx tsx scripts/elektryk/render.ts --stills=1,5,12   # only PNG frames at given seconds
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { findBrowserExecutable } from "../../lib/render/browser";

const ID = "ElektrykShort";

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const outDir = path.join(root, "renders", "elektryk");
  mkdirSync(outDir, { recursive: true });
  const browserExecutable = findBrowserExecutable();
  const serveUrl = await bundle({ entryPoint: path.join(root, "remotion", "index.ts"), publicDir: path.join(root, "public") });
  const composition = await selectComposition({ serveUrl, id: ID, browserExecutable });

  const stillsArg = process.argv.find((a) => a.startsWith("--stills="));
  if (stillsArg) {
    for (const sec of stillsArg.split("=")[1].split(",").map(Number)) {
      const output = path.join(outDir, "stills", `kadr-${String(sec).padStart(4, "0")}s.png`);
      await renderStill({ serveUrl, composition, frame: Math.round(sec * composition.fps), output, browserExecutable, scale: 0.5 });
      console.log("✓", path.relative(root, output));
    }
    return;
  }

  const silent = path.join(outDir, "obraz.mp4");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    muted: true,
    outputLocation: silent,
    crf: 18,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 92,
    browserExecutable,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) console.log(`  klatki ${p * 10}%`), (last = p);
    },
  });

  for (const [audio, name] of [
    ["mix-z-lektorem.wav", "elektryk-rolka-z-lektorem.mp4"],
    ["mix-bez-lektora.wav", "elektryk-rolka-bez-lektora.mp4"],
  ]) {
    const out = path.join(outDir, name);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", silent, "-i", path.join(outDir, audio), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
    console.log("✓", path.relative(root, out));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
