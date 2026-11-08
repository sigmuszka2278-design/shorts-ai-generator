/**
 * End-to-end check of the programmatic pipeline:
 * idea → scene → Remotion render → MP4 1080×1920 with audio.
 *
 *   npm run test:render              # 6 s clip, both styles
 *   npm run test:render -- --stills  # also saves PNG frames to renders/stills
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { generateScene } from "../lib/scene/generator";
import { findBrowserExecutable } from "../lib/render/browser";
import { renderSceneToFile, rendersDir, COMPOSITION_ID } from "../lib/render/renderer";

async function main() {
  const out = path.join(rendersDir(), "test");
  mkdirSync(out, { recursive: true });
  const stills = process.argv.includes("--stills");
  const durationArg = process.argv.find((a) => a.startsWith("--duration="));
  const duration = durationArg ? Number(durationArg.split("=")[1]) : 6;

  const cases = [
    { prompt: "Kotek i piesek skaczą z pięcioma kolorowymi kulkami pod tęczą", style: "3d" as const },
    { prompt: "Jednorożec z magiczną różdżką w kosmosie i deszcz gwiazd", style: "2d" as const },
  ];

  console.log("Przeglądarka:", findBrowserExecutable() ?? "(pobierana przez Remotion)");

  for (const [i, c] of cases.entries()) {
    const scene = generateScene({ ...c, durationInSeconds: duration });
    console.log(`\n▶ ${c.style.toUpperCase()} – "${c.prompt}"`);
    console.log("  ", scene.detected.join(" | "));

    if (stills) {
      const { renderStill, selectComposition } = await import("@remotion/renderer");
      const { bundle } = await import("@remotion/bundler");
      const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), publicDir: path.resolve("public") });
      const inputProps = scene as unknown as Record<string, unknown>;
      const browserExecutable = findBrowserExecutable();
      const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps, browserExecutable });
      for (const f of [0.15, 0.45, 0.7, 0.92]) {
        const frame = Math.floor(composition.durationInFrames * f);
        const file = path.join(out, `still-${i}-${c.style}-${frame}.png`);
        await renderStill({ serveUrl, composition, inputProps, frame, output: file, browserExecutable });
        console.log("   still:", file);
      }
    }

    const file = path.join(out, `test-${i}-${c.style}.mp4`);
    const t0 = Date.now();
    let last = -1;
    await renderSceneToFile(scene, file, (stage, p) => {
      const pct = Math.floor(p * 10) * 10;
      if (pct !== last) {
        last = pct;
        process.stdout.write(`   ${stage} ${pct}%\n`);
      }
    });
    const probe = JSON.parse(
      execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }),
    );
    const video = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
    const audio = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
    const dur = Number(probe.format.duration);
    console.log(`   ✓ ${file} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    console.log(`     wideo: ${video.codec_name} ${video.width}x${video.height} @ ${video.r_frame_rate}, audio: ${audio?.codec_name ?? "BRAK"}, czas: ${dur.toFixed(2)} s`);
    if (video.width !== 1080 || video.height !== 1920) throw new Error("Zła rozdzielczość");
    if (!audio) throw new Error("Brak ścieżki audio");
    if (Math.abs(dur - duration) > 0.3) throw new Error(`Zły czas trwania: ${dur}`);
  }
  console.log("\nWszystkie testy renderowania zakończone sukcesem ✔");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
