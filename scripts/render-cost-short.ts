/**
 * Renders a "cost counter" Short (composition CostShort) to MP4 1080×1920, H.264 + AAC.
 *
 *   python3 scripts/cost-short/build_assets.py cost-short/auto-na-rok.json   # voice, images, timeline
 *   npm run cost-short -- auto-na-rok                                        # → output/auto-na-rok.mp4
 *   npm run cost-short -- auto-na-rok --stills                               # + preview frames
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";

async function main() {
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "auto-na-rok";
  const stills = process.argv.includes("--stills");
  const root = process.cwd();
  const timeline = JSON.parse(readFileSync(path.join(root, "public", "cost-short", slug, "timeline.json"), "utf8"));
  const outDir = path.join(root, "output");
  mkdirSync(outDir, { recursive: true });

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundle({ entryPoint: path.join(root, "remotion", "index.ts"), publicDir: path.join(root, "public") });
  const browserExecutable = findBrowserExecutable();
  const inputProps = timeline as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: "CostShort", inputProps, browserExecutable });

  if (stills) {
    const dir = path.join(root, "renders", `${slug}-stills`);
    mkdirSync(dir, { recursive: true });
    const times = [1, 10.1, 15.4, 23.7, 31, 34.2, 37.2, 44];
    for (const s of times) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
      const output = path.join(dir, `t${s.toFixed(1)}.jpg`);
      await renderStill({ serveUrl, composition, inputProps, frame, output, imageFormat: "jpeg", browserExecutable });
      console.log("still:", output);
    }
    if (process.argv.includes("--stills-only")) return;
  }

  const master = path.join(os.tmpdir(), `${slug}-master.mp4`);
  const output = path.join(outDir, `${slug}.mp4`);
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: master,
    crf: 19,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 92,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || os.cpus().length,
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        console.log(`render ${pct}%`);
      }
    },
  });
  // final encode: smaller file for upload/repo, loudness normalised to YouTube's -14 LUFS
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", master,
    "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "9M", "-bufsize", "18M", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-movflags", "+faststart", output,
  ]);
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration,size", "-of", "compact", output], {
    encoding: "utf8",
  });
  console.log(probe.trim());
  console.log("✔", output);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
