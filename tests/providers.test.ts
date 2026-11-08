import { describe, expect, it, vi } from "vitest";
import { buildAiPrompt, extractVideoUrl, fillTemplate } from "../lib/providers/ai-common";
import { HttpProvider } from "../lib/providers/http";
import { ReplicateProvider } from "../lib/providers/replicate";
import { generateScene } from "../lib/scene/generator";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const options = { prompt: "Kotek i tęcza w kosmosie", durationInSeconds: 6, style: "3d" as const };

describe("wspólne narzędzia AI", () => {
  it("buduje angielski prompt dla modelu", () => {
    const p = buildAiPrompt(generateScene(options));
    expect(p).toContain("kitten");
    expect(p).toContain("9:16");
    expect(p).toContain("Kotek i tęcza w kosmosie");
  });

  it("wypełnia szablon JSON i escapuje cudzysłowy", () => {
    expect(fillTemplate('{"prompt":"{{prompt}}","duration":{{duration}}}', { prompt: 'a "b"', duration: 5 })).toEqual({
      prompt: 'a "b"',
      duration: 5,
    });
  });

  it("znajduje URL wideo w różnych formatach odpowiedzi", () => {
    expect(extractVideoUrl("https://x/a.mp4")).toBe("https://x/a.mp4");
    expect(extractVideoUrl(["https://x/a.mp4"])).toBe("https://x/a.mp4");
    expect(extractVideoUrl({ video: { url: "https://x/b.mp4" } })).toBe("https://x/b.mp4");
    expect(extractVideoUrl({ foo: 1 })).toBeNull();
  });
});

describe("ReplicateProvider", () => {
  it("jest niedostępny bez klucza", () => {
    expect(new ReplicateProvider({}).info().available).toBe(false);
  });

  it("tworzy predykcję, odpytuje i zwraca scenę z klipem AI", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "p1", status: "starting", urls: { get: "https://api.replicate.com/v1/predictions/p1" } }))
      .mockResolvedValueOnce(json({ id: "p1", status: "processing" }))
      .mockResolvedValueOnce(json({ id: "p1", status: "succeeded", output: "https://cdn.example.com/clip.mp4" }));
    const provider = new ReplicateProvider(
      { REPLICATE_API_TOKEN: "t", REPLICATE_MODEL: "owner/model" },
      fetchMock as unknown as typeof fetch,
      1,
    );
    const progress = vi.fn();
    const scene = await provider.generate(options, progress);
    expect(scene.backgroundVideoUrl).toBe("https://cdn.example.com/clip.mp4");
    expect(scene.provider).toBe("replicate");
    expect(scene.actors).toEqual([]);
    expect(progress).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.replicate.com/v1/models/owner/model/predictions");
    const body = JSON.parse(init.body);
    expect(body.input.aspect_ratio).toBe("9:16");
    expect(body.input.duration).toBe(6);
    expect(init.headers.Authorization).toBe("Bearer t");
  });

  it("zgłasza błąd modelu po polsku", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ id: "p1", status: "failed", error: "NSFW" }));
    const provider = new ReplicateProvider({ REPLICATE_API_TOKEN: "t", REPLICATE_MODEL: "o/m" }, fetchMock as unknown as typeof fetch, 1);
    await expect(provider.generate(options, () => {})).rejects.toThrow(/nie wygenerował/);
  });
});

describe("HttpProvider", () => {
  it("obsługuje odpowiedź ze statusUrl", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ statusUrl: "https://ai.example.com/status/1" }))
      .mockResolvedValueOnce(json({ progress: 0.5, statusUrl: "https://ai.example.com/status/1" }))
      .mockResolvedValueOnce(json({ videoUrl: "https://ai.example.com/v.mp4" }));
    const provider = new HttpProvider({ AI_VIDEO_HTTP_URL: "https://ai.example.com/gen" }, fetchMock as unknown as typeof fetch, 1);
    const scene = await provider.generate(options, () => {});
    expect(scene.backgroundVideoUrl).toBe("https://ai.example.com/v.mp4");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ aspectRatio: "9:16", width: 1080, height: 1920 });
  });
});
