import { describe, expect, it } from "vitest";
import { buildCaptions, buildTimeline, chunkWords } from "../remotion/stories/mruczek/timeline";

describe("Mruczek story timeline", () => {
  const { scenes, durationInFrames } = buildTimeline();

  it("has six scenes in order and lasts about 40 s", () => {
    expect(scenes.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(durationInFrames / 30).toBeGreaterThan(38);
    expect(durationInFrames / 30).toBeLessThan(45);
  });

  it("captions reproduce the voiceover text exactly, 1–3 words each", () => {
    for (const scene of scenes) {
      const chunks = chunkWords(scene.words);
      expect(chunks.map((c) => c.map((w) => w.text).join(" ")).join(" ")).toBe(scene.text);
      for (const c of chunks) expect(c.length).toBeLessThanOrEqual(3);
    }
  });

  it("never ends a caption on a one-letter word and captions do not overlap", () => {
    const captions = buildCaptions(scenes);
    for (const c of captions) expect(c.words[c.words.length - 1].text.length).toBeGreaterThan(1);
    for (let i = 1; i < captions.length; i++) expect(captions[i].from).toBeGreaterThanOrEqual(captions[i - 1].to);
  });
});
