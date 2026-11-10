/**
 * Renderuje film „Sławomir Mrożek. Moja historia” (kompozycja MrozekFilm, 1920×1080, 30 kl./s).
 *
 *   npx tsx scripts/render-mrozek.ts                  # pełny film → renders/mrozek/mrozek-film.mp4
 *   npx tsx scripts/render-mrozek.ts --stills=5,60,120 # kadry kontrolne (sekundy) → renders/mrozek/still-*.jpg
 *   npx tsx scripts/render-mrozek.ts --range=0,300     # fragment (klatki od,do)
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { findBrowserExecutable } from "../lib/render/browser";

async function main() {
  const out = path.resolve("renders", "mrozek");
  mkdirSync(out, { recursive: true });
  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
  const browserExecutable = findBrowserExecutable();
  const composition = await selectComposition({ serveUrl, id: "MrozekFilm", browserExecutable });
  console.log(`Film: ${(composition.durationInFrames / composition.fps).toFixed(1)} s, ${composition.width}×${composition.height}`);

  const stills = arg("stills");
  if (stills) {
    for (const s of stills.split(",").map(Number)) {
      const frame = Math.min(Math.round(s * composition.fps), composition.durationInFrames - 1);
      const file = path.join(out, `still-${String(s).padStart(5, "0")}.jpg`);
      await renderStill({ serveUrl, composition, frame, output: file, browserExecutable, imageFormat: "jpeg", jpegQuality: 88 });
      console.log("kadr:", file);
    }
    return;
  }

  const range = arg("range")?.split(",").map(Number) as [number, number] | undefined;
  const file = path.join(out, range ? `fragment-${range[0]}-${range[1]}.mp4` : "mrozek-film.mp4");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: file,
    browserExecutable,
    frameRange: range,
    crf: 20,
    audioBitrate: "192k",
    concurrency: Number(process.env.RENDER_CONCURRENCY) || 3,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 100);
      if (p !== last && p % 5 === 0) {
        last = p;
        console.log(`  ${p}%`);
      }
    },
  });
  console.log("Gotowe:", file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
