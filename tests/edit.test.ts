import { describe, expect, it } from "vitest";
import { makePhonk, PHONK_SAMPLE_RATE } from "../lib/audio/phonk";
import {
  BEAT_FRAMES,
  CUT_FRAMES,
  DROP_FRAME,
  EDIT_DURATION_FRAMES,
  EDIT_FPS,
  rampSpeed,
  remapFrame,
  SHOTS,
  shotAt,
} from "../lib/edit/timeline";

describe("football edit – timeline", () => {
  it("trwa 15–20 s przy 60 fps", () => {
    expect(EDIT_FPS).toBe(60);
    const seconds = EDIT_DURATION_FRAMES / EDIT_FPS;
    expect(seconds).toBeGreaterThanOrEqual(15);
    expect(seconds).toBeLessThanOrEqual(20);
  });

  it("każde cięcie wypada dokładnie na beacie (perfect beat sync)", () => {
    for (const f of CUT_FRAMES) expect(f % BEAT_FRAMES).toBe(0);
    expect(CUT_FRAMES[0]).toBe(DROP_FRAME);
  });

  it("ujęcia pokrywają cały film bez dziur", () => {
    let expected = 0;
    for (const s of SHOTS) {
      expect(s.startFrame).toBe(expected);
      expected += s.durationInFrames;
    }
    expect(expected).toBe(EDIT_DURATION_FRAMES);
    expect(shotAt(0).kind).toBe("intro");
    expect(shotAt(EDIT_DURATION_FRAMES - 1).kind).toBe("goat");
  });

  it("speed ramp: zwolnienie w momencie uderzenia, remap rośnie monotonicznie", () => {
    for (const s of SHOTS.filter((x) => x.impact != null)) {
      const atImpact = rampSpeed(s.ramp, s.impact!);
      expect(atImpact).toBeLessThan(1);
      expect(Math.max(...s.ramp.map(([, v]) => v))).toBeGreaterThan(1);
      let prev = -1;
      for (let f = 0; f <= s.durationInFrames; f++) {
        const r = remapFrame(s, f);
        expect(r).toBeGreaterThan(prev);
        prev = r;
      }
    }
  });
});

describe("football edit – phonk", () => {
  it("ma długość filmu, cichsze intro i mocny drop", () => {
    const pcm = makePhonk();
    const sr = PHONK_SAMPLE_RATE;
    expect(pcm.length / sr).toBeCloseTo(EDIT_DURATION_FRAMES / EDIT_FPS, 0);
    const rms = (a: number, b: number) => {
      let s = 0;
      for (let i = Math.floor(a * sr); i < Math.floor(b * sr); i++) s += pcm[i] * pcm[i];
      return Math.sqrt(s / ((b - a) * sr));
    };
    const drop = DROP_FRAME / EDIT_FPS;
    expect(rms(drop, drop + 2)).toBeGreaterThan(rms(0, drop - 1) * 1.8);
  });
});
