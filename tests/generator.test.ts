import { describe, expect, it } from "vitest";
import { analyzePrompt, clampDuration, generateScene, makeTitle, normalize, sanitizeScene } from "../lib/scene/generator";
import { landingFrames, motionAt } from "../lib/scene/motion";

describe("analiza polskiego pomysłu", () => {
  it("usuwa polskie znaki", () => {
    expect(normalize("Żółć ŁĄKA źdźbło")).toBe("zolc laka zdzblo");
  });

  it("rozpoznaje zwierzątka, magię, scenerię i liczbę kulek", () => {
    const a = analyzePrompt("Kotek i piesek bawią się pięcioma kulkami w kosmosie z magiczną różdżką");
    expect(a.animals).toEqual(["kot", "pies"]);
    expect(a.magic).toContain("rozdzka");
    expect(a.theme).toBe("kosmos");
    expect(a.effects).toContain("sparkles");
  });

  it("rozpoznaje liczby zapisane cyfrą i słownie", () => {
    expect(analyzePrompt("7 kulek").ballCount).toBe(7);
    expect(analyzePrompt("trzy kolorowe kulki").ballCount).toBe(3);
    expect(analyzePrompt("dziesięć piłek").ballCount).toBe(10);
  });

  it("rozpoznaje kolory i ruch", () => {
    const a = analyzePrompt("Czerwone i niebieskie kulki tańczą");
    expect(a.colors.map((c) => c.label)).toEqual(["czerwony", "niebieski"]);
    expect(a.motion).toBe("wiggle");
  });

  it("nie myli liścia z liskiem", () => {
    expect(analyzePrompt("zielony listek na łące").animals).toEqual([]);
    expect(analyzePrompt("lisek na łące").animals).toEqual(["lis"]);
  });
});

describe("generator scen", () => {
  it("ogranicza długość do 5–20 s", () => {
    expect(clampDuration(1)).toBe(5);
    expect(clampDuration(99)).toBe(20);
    expect(clampDuration(Number.NaN)).toBe(10);
  });

  it("tworzy pionowy film 1080×1920 z dźwiękami", () => {
    const s = generateScene({ prompt: "Jednorożec i tęcza", durationInSeconds: 12, style: "3d" });
    expect(s.width).toBe(1080);
    expect(s.height).toBe(1920);
    expect(s.durationInSeconds).toBe(12);
    expect(s.sounds.length).toBeGreaterThan(5);
    expect(s.music).not.toBeNull();
    expect(s.actors.some((a) => a.kind === "animal")).toBe(true);
    expect(s.actors.some((a) => a.kind === "ball")).toBe(true);
    expect(s.actors.some((a) => a.kind === "magic")).toBe(true);
    expect(s.effects.map((e) => e.kind)).toContain("rainbow");
  });

  it("wszystkie zdarzenia mieszczą się w czasie filmu (5 s i 20 s)", () => {
    for (const d of [5, 20]) {
      const s = generateScene({ prompt: "Dziesięć kulek, kotek, piesek i miś z koroną i prezentem", durationInSeconds: d, style: "2d" });
      const total = d * 30;
      for (const a of s.actors) expect(a.enterFrame).toBeLessThan(total - 15);
      for (const c of s.sounds) expect(c.frame).toBeLessThan(total);
      for (const e of s.effects) expect(e.startFrame).toBeLessThan(total);
    }
  });

  it("jest deterministyczny dla tego samego ziarna", () => {
    const a = generateScene({ prompt: "Miś", durationInSeconds: 8, style: "3d", seed: 42 });
    const b = generateScene({ prompt: "Miś", durationInSeconds: 8, style: "3d", seed: 42 });
    const c = generateScene({ prompt: "Miś", durationInSeconds: 8, style: "3d", seed: 43 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("pozwala wyłączyć efekty i muzykę", () => {
    const s = generateScene({ prompt: "Kotek", durationInSeconds: 6, style: "2d", sfx: false, music: false });
    expect(s.sounds).toEqual([]);
    expect(s.music).toBeNull();
  });

  it("wymusza wybraną scenerię", () => {
    expect(generateScene({ prompt: "kotek w kosmosie", durationInSeconds: 6, style: "2d", theme: "ocean" }).theme).toBe("ocean");
  });

  it("skraca długie tytuły", () => {
    expect(makeTitle("kotek")).toBe("Kotek");
    expect(makeTitle("a".repeat(10) + " " + "b".repeat(50)).endsWith("…")).toBe(true);
  });
});

describe("sanitizeScene", () => {
  it("odrzuca nieprawidłowe dane i niebezpieczne URL-e", () => {
    expect(() => sanitizeScene(null)).toThrow();
    expect(() => sanitizeScene({ version: 2 })).toThrow();
    const s = generateScene({ prompt: "kotek", durationInSeconds: 6, style: "2d" });
    expect(() => sanitizeScene({ ...s, backgroundVideoUrl: "file:///etc/passwd" })).toThrow();
    expect(sanitizeScene({ ...s, durationInSeconds: 500, width: 10 })).toMatchObject({ durationInSeconds: 20, width: 1080 });
  });
});

describe("ruch", () => {
  it("skok ląduje na ziemi w momentach z landingFrames", () => {
    const frames = landingFrames("jump", 5, 0, 200);
    expect(frames.length).toBeGreaterThan(3);
    for (const f of frames) expect(Math.abs(motionAt("jump", f, 300, 5).dy)).toBeLessThan(1e-6);
  });
});

describe("liczebniki w narzędniku", () => {
  it("rozpoznaje 'pięcioma kulkami'", () => {
    expect(analyzePrompt("bawią się pięcioma kulkami").ballCount).toBe(5);
  });
});

describe("odmiana nazw miejsc", () => {
  it("rozpoznaje 'na łące' i 'w lesie'", () => {
    expect(analyzePrompt("kotek na łące").theme).toBe("laka");
    expect(analyzePrompt("miś w lesie").theme).toBe("las");
    expect(analyzePrompt("rybki w morzu").theme).toBe("ocean");
  });
});

describe("adresy klipów AI", () => {
  it("akceptuje https oraz http z dozwolonego serwera AI", () => {
    const s = generateScene({ prompt: "kotek", durationInSeconds: 6, style: "2d" });
    expect(sanitizeScene({ ...s, backgroundVideoUrl: "https://cdn.x/a.mp4" }).backgroundVideoUrl).toBe("https://cdn.x/a.mp4");
    expect(() => sanitizeScene({ ...s, backgroundVideoUrl: "http://evil.local/a.mp4" })).toThrow();
    expect(
      sanitizeScene({ ...s, backgroundVideoUrl: "http://localhost:4001/a.mp4" }, { allowedVideoOrigins: ["http://localhost:4001"] }).backgroundVideoUrl,
    ).toBe("http://localhost:4001/a.mp4");
  });
});
