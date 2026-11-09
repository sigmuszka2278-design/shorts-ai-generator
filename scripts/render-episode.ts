/**
 * Renders episode 1 "Tosia i największa malina w lesie" (1920×1080, 4:00).
 *
 *   npm run episode:audio                      # build public/episode/*.wav first
 *   npm run episode                            # full MP4 → renders/episode/
 *   npm run episode -- --stills=3,45,141       # only PNG frames at these seconds
 *   npm run episode -- --shorts                # vertical Shorts version
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { findBrowserExecutable } from "../lib/render/browser";

async function main() {
  const out = path.resolve("renders", "episode");
  mkdirSync(out, { recursive: true });
  const stillsArg = process.argv.find((a) => a.startsWith("--stills="));
  const shorts = process.argv.includes("--shorts");
  const id = shorts ? "TosiaOdcinek1Shorts" : "TosiaOdcinek1";
  const browserExecutable = findBrowserExecutable();

  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });

  if (stillsArg) {
    const inputProps = { withAudio: false };
    const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
    const scaleArg = process.argv.find((a) => a.startsWith("--scale="));
    const scale = scaleArg ? Number(scaleArg.split("=")[1]) : 0.5;
    for (const s of stillsArg.split("=")[1].split(",").map(Number)) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
      const file = path.join(out, `${shorts ? "shorts-" : ""}still-${String(s).replace(".", "_")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame, output: file, browserExecutable, scale });
      console.log("still:", file);
    }
    return;
  }

  const inputProps = { withAudio: true };
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  const file = path.join(out, shorts ? "tosia-odc01-shorts.mp4" : "tosia-odc01-najwieksza-malina.mp4");
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    crf: 20,
    outputLocation: file,
    browserExecutable,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 100);
      if (p !== last && p % 5 === 0) {
        last = p;
        console.log(`${p}%  (${Math.round((Date.now() - t0) / 1000)} s)`);
      }
    },
  });
  console.log("✓", file, `${Math.round((Date.now() - t0) / 1000)} s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
