import { describe, expect, it } from "vitest";
import { CAPTIONS, LEAD_SECONDS, TIMELINE, TOTAL_FRAMES, VO, fitDurations } from "../remotion/chmurka/timeline";

describe("Chmurka short", () => {
  it("lasts exactly 40 s and keeps the six scenes in order", () => {
    expect(TIMELINE).toHaveLength(6);
    expect(TIMELINE[0].startFrame).toBe(0);
    const end = TIMELINE.at(-1)!;
    expect(end.startFrame + end.durationInFrames).toBe(TOTAL_FRAMES);
    for (let i = 1; i < TIMELINE.length; i++) {
      expect(TIMELINE[i].startFrame).toBe(TIMELINE[i - 1].startFrame + TIMELINE[i - 1].durationInFrames);
    }
  });

  it("fits every narration line inside its scene", () => {
    TIMELINE.forEach((t, i) => {
      expect((LEAD_SECONDS + VO[i].speechEnd) * 30).toBeLessThan(t.durationInFrames);
    });
  });

  it("captions are 2–3 words (one only for a lone word) and match the voiceover", () => {
    CAPTIONS.forEach((caps, i) => {
      expect(caps.flatMap((c) => c.words.map((w) => w.text)).join(" ")).toBe(VO[i].text);
      for (const c of caps) expect(c.words.length).toBeLessThanOrEqual(3);
    });
    expect(CAPTIONS.flat().some((c) => c.words.some((w) => w.highlight))).toBe(true);
  });

  it("fitDurations keeps the total", () => {
    const out = fitDurations([4, 8, 10], [6, 5, 5], 22);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(22);
    expect(out[0]).toBeGreaterThanOrEqual(6);
  });
});
