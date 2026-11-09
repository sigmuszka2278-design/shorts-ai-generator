/**
 * Renders the "honey never spoils" Short (HoneyShort composition) to MP4.
 *
 *   npx tsx scripts/honey/render.ts                    # renders/miod-sie-nie-psuje.mp4
 *   npx tsx scripts/honey/render.ts --stills           # only PNG frames for a quick look
 *   npx tsx scripts/honey/render.ts --clips=clips.json # real footage per scene: {"tomb": "https://…/tomb.mp4", …}
 *
 * Run `python3 scripts/honey/build_audio.py` first if you changed the script text.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../../lib/render/browser";

const ID = "HoneyShort";

async function main() {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const out = path.resolve(process.env.RENDERS_DIR ?? "renders");
  mkdirSync(out, { recursive: true });
  const clipsArg = process.argv.find((a) => a.startsWith("--clips="));
  const clips = clipsArg ? JSON.parse(readFileSync(clipsArg.slice(8), "utf8")) : {};
  const inputProps = { clips, showCaptions: !process.argv.includes("--no-captions") };

  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: ID, inputProps, browserExecutable });

  if (process.argv.includes("--stills")) {
    const framesArg = process.argv.find((a) => a.startsWith("--frames="));
    const frames = framesArg ? framesArg.slice(9).split(",").map(Number) : [0, 45, 120, 250, 360, 480, 570, 700, 820, 880, 1000, 1110, 1199];
    mkdirSync(path.join(out, "honey-stills"), { recursive: true });
    for (const frame of frames) {
      const file = path.join(out, "honey-stills", `frame-${String(frame).padStart(4, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame, output: file, browserExecutable, scale: 0.5 });
      console.log("still:", file);
    }
    return;
  }

  const file = path.join(out, "miod-sie-nie-psuje.mp4");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: file,
    crf: 18,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.max(1, os.cpus().length - 1),
    browserExecutable,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20) * 5;
      if (p !== last) console.log(`render ${(last = p)}%`);
    },
  });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration", "-of", "compact", file], { encoding: "utf8" });
  console.log(probe.trim());
  console.log("✓", file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
