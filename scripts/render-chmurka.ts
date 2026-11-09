/**
 * Renders the "Chmurka – dlaczego niebo jest niebieskie?" short (40 s, 1080×1920, Polish voiceover
 * + burned-in captions) to renders/chmurka-niebo.mp4.
 *
 *   npm run render:chmurka                 # MP4
 *   npm run render:chmurka -- --stills     # also PNG frames from every scene
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { rendersDir } from "../lib/render/storage";
import { CHMURKA_COMPOSITION_ID, TIMELINE } from "../remotion/chmurka/timeline";

async function main() {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const out = rendersDir();
  mkdirSync(out, { recursive: true });
  const browserExecutable = findBrowserExecutable();
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const composition = await selectComposition({ serveUrl, id: CHMURKA_COMPOSITION_ID, browserExecutable });

  if (process.argv.includes("--stills")) {
    const dir = path.join(out, "chmurka-stills");
    mkdirSync(dir, { recursive: true });
    for (const t of TIMELINE) {
      for (const k of [0.3, 0.75]) {
        const frame = t.startFrame + Math.floor(t.durationInFrames * k);
        const output = path.join(dir, `scene${t.index + 1}-${frame}.png`);
        await renderStill({ serveUrl, composition, frame, output, browserExecutable });
        console.log("still:", output);
      }
    }
    if (process.argv.includes("--stills-only")) return;
  }

  const file = path.join(out, "chmurka-niebo.mp4");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    crf: 18,
    pixelFormat: "yuv420p",
    outputLocation: file,
    browserExecutable,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.max(1, Math.floor(os.cpus().length / 2)),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) console.log(`render ${(last = pct)}%`);
    },
  });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "compact", file], {
    encoding: "utf8",
  });
  console.log(probe.trim());
  console.log("✓", file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
