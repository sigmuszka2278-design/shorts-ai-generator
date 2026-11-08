import { describe, expect, it } from "vitest";
import { encodeWav, makeMusic, makeSfx, SFX_NAMES } from "../lib/audio/synth";
import { parseRange } from "../lib/http-range";

describe("parseRange", () => {
  it("parsuje zakresy bajtów", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=0-1000", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=200-300", 100)).toBe("invalid");
    expect(parseRange("items=0-1", 100)).toBe("invalid");
  });
});

describe("syntezator", () => {
  it("tworzy poprawne pliki WAV", () => {
    const wav = encodeWav(makeSfx("pop"), 44100);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(44100);
  });

  it("generuje wszystkie efekty bez ciszy i przesterowania", () => {
    for (const name of SFX_NAMES) {
      const s = makeSfx(name);
      const peak = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it("muzyka trwa dłużej niż najdłuższy film", () => {
    expect(makeMusic("wesola", 8000).length / 8000).toBeGreaterThanOrEqual(20);
  });
});
