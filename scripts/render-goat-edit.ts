/**
 * Renders the "CR7 🐐 THE GOAT" football edit (9:16, 60 fps, ~18 s, H.264 + AAC).
 *
 *   npm run edit:render                  # 4K: 2160×3840 @ 60 fps → renders/cr7-goat-edit-4k.mp4
 *   npm run edit:render -- --preview     # fast 540×960 preview
 *   npm run edit:render -- --stills      # PNG frames of key moments → renders/goat-stills
 *   npm run edit:render -- --clips=public/edit/clips
 *        uses your own footage: files named after shot ids (intro.mp4, bicycle.mp4, stepovers.mp4,
 *        freekick.mp4, ucl.mp4, header.mp4, net.mp4, strike.mp4, siuuu.mp4, goat.mp4 …)
 *        replace the vector shots; speed ramps, beat-sync and all effects still apply.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { EDIT_RENDER_SCALE, IMPACT_FRAMES, SHOTS } from "../lib/edit/timeline";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const flag = (name: string) => process.argv.includes(`--${name}`);

function collectClips(dir: string | undefined) {
  const clips: Record<string, { src: string }> = {};
  if (!dir) return clips;
  const abs = path.resolve(dir);
  const pub = path.resolve("public");
  if (!abs.startsWith(pub)) throw new Error("--clips must point to a folder inside /public");
  const ids = new Set(SHOTS.flatMap((s) => [s.id, s.kind]));
  for (const file of existsSync(abs) ? readdirSync(abs) : []) {
    const id = path.parse(file).name;
    if (ids.has(id) && /\.(mp4|mov|webm|mkv)$/i.test(file)) clips[id] = { src: path.relative(pub, path.join(abs, file)).split(path.sep).join("/") };
  }
  console.log("Klipy użytkownika:", Object.keys(clips).length ? Object.keys(clips).join(", ") : "(brak – grafika wektorowa)");
  return clips;
}

async function main() {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const preview = flag("preview");
  const scale = preview ? 0.5 : Number(arg("scale")) || EDIT_RENDER_SCALE;
  const outDir = path.resolve("renders");
  mkdirSync(outDir, { recursive: true });

  const inputProps = { clips: collectClips(arg("clips")), musicVolume: 1 };
  const browserExecutable = findBrowserExecutable();
  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const composition = await selectComposition({ serveUrl, id: "GoatEdit", inputProps, browserExecutable });

  if (flag("stills")) {
    const dir = path.join(outDir, "goat-stills");
    mkdirSync(dir, { recursive: true });
    const frames = [
      ...SHOTS.map((s) => s.startFrame + Math.floor(s.durationInFrames * 0.35)),
      ...IMPACT_FRAMES,
      SHOTS[SHOTS.length - 1].startFrame + 120,
    ].sort((a, b) => a - b);
    for (const frame of frames) {
      const output = path.join(dir, `frame-${String(frame).padStart(4, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame, output, browserExecutable, scale: Number(arg("scale")) || 0.5 });
      console.log("  still:", output);
    }
    return;
  }

  const file = path.join(outDir, preview ? "cr7-goat-edit-preview.mp4" : `cr7-goat-edit-${scale >= 2 ? "4k" : `${scale}x`}.mp4`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "320k",
    outputLocation: file,
    scale,
    crf: preview ? 24 : 16,
    x264Preset: preview ? "veryfast" : "slow",
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || os.cpus().length,
    browserExecutable,
    chromiumOptions: { gl: "swangle" },
    onProgress: ({ progress, renderedFrames }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct}% (${renderedFrames}/${composition.durationInFrames} klatek, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
    },
  });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration", "-of", "compact", file], { encoding: "utf8" });
  console.log(probe.trim());
  console.log(`✓ ${file} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
