import { describe, expect, it } from "vitest";
import {
  BEAT_FRAMES,
  CAPTIONS,
  chestOpenFrame,
  GAME,
  PIRATE_FRAMES,
  SAFE,
  SECTIONS,
  SPOTS,
  VO_LINES,
  voiceoverSrt,
} from "../lib/pirate/timeline";

describe("Piracki Token timeline", () => {
  it("is 40 s at 60 fps, 150 BPM", () => {
    expect(PIRATE_FRAMES).toBe(2400);
    expect(BEAT_FRAMES).toBe(24);
  });

  it("cuts land on beats and sections are contiguous", () => {
    const list = Object.values(SECTIONS);
    expect(list[0].from).toBe(0);
    expect(list.at(-1)!.to).toBe(PIRATE_FRAMES);
    for (let i = 0; i < list.length; i++) {
      expect(list[i].from % BEAT_FRAMES).toBe(0);
      if (i > 0) expect(list[i].from).toBe(list[i - 1].to);
    }
    for (const s of SPOTS) expect(s.from % BEAT_FRAMES).toBe(0);
  });

  it("keeps the top 3 in order with their chest counts", () => {
    expect(SPOTS.map((s) => [s.name, s.chests])).toEqual([
      ["RUBBER RESORT", 47],
      ["LANTERN LANDING", 45],
      ["LOGUETOWN", 41],
    ]);
  });

  it("puts key captions above the bottom 20 %", () => {
    for (const c of CAPTIONS) {
      expect(c.y).toBeGreaterThanOrEqual(SAFE.top);
      expect(c.y + c.size * 5).toBeLessThan(SAFE.bottom);
    }
  });

  it("opens 7 chests in order before the slow-motion reveal", () => {
    const frames = Array.from({ length: GAME.quickChests + 1 }, (_, i) => chestOpenFrame(i));
    expect(frames).toHaveLength(7);
    for (let i = 1; i < frames.length; i++) expect(frames[i]).toBeGreaterThan(frames[i - 1]);
    expect(frames[GAME.quickChests - 1]).toBeLessThan(GAME.slowmo);
  });

  it("voice-over lines fit inside the video and do not overlap", () => {
    for (let i = 0; i < VO_LINES.length; i++) {
      expect(VO_LINES[i].end).toBeLessThanOrEqual(40);
      if (i > 0) expect(VO_LINES[i].start).toBeGreaterThanOrEqual(VO_LINES[i - 1].end);
    }
    expect(voiceoverSrt()).toContain("00:00:00,150 --> 00:00:03,100");
  });
});
