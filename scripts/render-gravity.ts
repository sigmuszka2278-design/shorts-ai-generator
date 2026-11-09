/**
 * Renders the "Co gdyby grawitacja zniknęła na 5 sekund?!" YouTube Short (1080×1920, 30 s).
 *
 *   python3 scripts/gravity/voiceover.py    # Polish narration (Piper TTS, offline)
 *   python3 scripts/gravity/soundtrack.py   # music + SFX + narration mix
 *   npm run render:gravity                  # → renders/grawitacja-5-sekund.mp4
 *   npm run render:gravity -- --stills=0,90,200   # only PNG frames → renders/gravity-stills
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { rendersDir } from "../lib/render/storage";

const ID = "GravityShort";

async function main() {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const out = rendersDir();
  mkdirSync(out, { recursive: true });
  const browserExecutable = findBrowserExecutable();
  // three.js needs WebGL: SwiftShader (software) works on any server; set REMOTION_GL=angle to use a GPU
  const chromiumOptions = { gl: (process.env.REMOTION_GL as "angle" | "swangle" | "egl" | undefined) ?? "swangle" } as const;

  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const composition = await selectComposition({ serveUrl, id: ID, browserExecutable, chromiumOptions });

  const stillsArg = process.argv.find((a) => a.startsWith("--stills="));
  if (stillsArg) {
    const dir = path.join(out, "gravity-stills");
    mkdirSync(dir, { recursive: true });
    for (const f of stillsArg.split("=")[1].split(",").map(Number)) {
      const file = path.join(dir, `frame-${String(f).padStart(3, "0")}.png`);
      const t0 = Date.now();
      await renderStill({ serveUrl, composition, frame: f, output: file, browserExecutable, chromiumOptions });
      console.log(`  ${file} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    return;
  }

  const file = path.join(out, "grawitacja-5-sekund.mp4");
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: file,
    crf: 18,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 94,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.max(1, Math.floor(os.cpus().length / 2)),
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 120_000,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct}%  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
    },
  });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration,size", "-of", "compact", file], {
    encoding: "utf8",
  });
  console.log(`✓ ${file}\n${probe}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
