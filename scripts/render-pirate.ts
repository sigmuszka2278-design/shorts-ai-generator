/**
 * Renders the "Piracki Token" Fortnite guide short (9:16, 1080×1920, 60 fps, 40 s).
 *
 *   npm run pirate:render                      # → renders/piracki-token.mp4 (+ .srt, opis.txt)
 *   npm run pirate:render -- --stills          # only key frames as PNG (quick preview)
 *   npm run pirate:render -- --frames=0-599    # render a range only
 *
 * If public/pirate/lektor.wav (or .mp3) exists it is mixed in as the voice-over and the music is ducked under it.
 * Script for the narrator (timed): renders/piracki-token.srt.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findBrowserExecutable } from "../lib/render/browser";
import { PIRATE_FPS, VIDEO_DESCRIPTION, voiceoverSrt } from "../lib/pirate/timeline";

const ID = "PirateTokenShort";

async function main() {
  const root = path.resolve(__dirname, "..");
  const out = path.join(root, "renders");
  mkdirSync(out, { recursive: true });
  const stills = process.argv.includes("--stills");
  const range = process.argv.find((a) => a.startsWith("--frames="))?.split("=")[1];

  const vo = ["pirate/lektor.wav", "pirate/lektor.mp3"].find((f) => existsSync(path.join(root, "public", f))) ?? null;
  const inputProps = { voiceover: vo };
  console.log("Lektor:", vo ?? "(brak pliku public/pirate/lektor.wav – film bez głosu, z napisami)");

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundle({ entryPoint: path.join(root, "remotion", "index.ts"), publicDir: path.join(root, "public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: ID, inputProps, browserExecutable });

  if (stills) {
    const dir = path.join(out, "piracki-stills");
    mkdirSync(dir, { recursive: true });
    const times = [0, 0.6, 1.6, 2.9, 4.0, 6.9, 9.5, 14.5, 16.5, 18.8, 20.5, 21.6, 22.6, 23.4, 25.0, 26.8, 28.8, 29.7, 31.2, 33.5, 35.0, 36.8, 38.5, 39.98];
    for (const s of times) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(s * PIRATE_FPS));
      const file = path.join(dir, `f${String(frame).padStart(4, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame, output: file, browserExecutable, scale: 0.5 });
      console.log("  still:", path.relative(root, file));
    }
    return;
  }

  const file = path.join(out, "piracki-token.mp4");
  const frameRange = range ? (range.split("-").map(Number) as [number, number]) : undefined;
  const t0 = Date.now();
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
    jpegQuality: 92,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.max(1, os.cpus().length),
    browserExecutable,
    frameRange,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct}%`);
      }
    },
  });
  writeFileSync(path.join(out, "piracki-token.srt"), voiceoverSrt());
  writeFileSync(path.join(out, "piracki-token-opis.txt"), VIDEO_DESCRIPTION + "\n");
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const v = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  console.log(`✓ ${path.relative(root, file)} – ${v.width}x${v.height} @ ${v.r_frame_rate}, ${a?.codec_name}, ${Number(probe.format.duration).toFixed(2)} s, ${((Date.now() - t0) / 1000).toFixed(0)} s renderu`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
