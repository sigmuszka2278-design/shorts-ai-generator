import { generateScene } from "../scene/generator";
import { VIDEO_HEIGHT, VIDEO_WIDTH, type GenerateOptions } from "../scene/types";
import { buildAiPrompt, extractVideoUrl, sceneFromAiClip, sleep } from "./ai-common";
import type { ProgressFn, ProviderInfo, VideoProvider } from "./types";

const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Generic adapter for your own AI video service.
 *
 * POST {AI_VIDEO_HTTP_URL}
 *   { prompt, promptPl, duration, aspectRatio: "9:16", width: 1080, height: 1920, style }
 * Response (immediately or after polling `statusUrl` with GET):
 *   { videoUrl: "https://…/clip.mp4" }  – done
 *   { statusUrl: "https://…", progress?: 0..1 } – still working
 *   { status: "failed", error: "…" } – error
 */
export class HttpProvider implements VideoProvider {
  constructor(
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly pollMs = 3000,
  ) {}

  info(): ProviderInfo {
    const available = Boolean(this.env.AI_VIDEO_HTTP_URL);
    return {
      id: "http",
      name: "Własny serwer AI",
      description: available
        ? "Twój endpoint HTTP generujący wideo z tekstu."
        : "Podłącz dowolny model AI przez prosty endpoint HTTP.",
      kind: "ai",
      available,
      hint: available ? undefined : "Ustaw AI_VIDEO_HTTP_URL w pliku .env.local",
    };
  }

  async generate(options: GenerateOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    const url = this.env.AI_VIDEO_HTTP_URL;
    if (!url) throw new Error("Własny serwer AI nie jest skonfigurowany");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.env.AI_VIDEO_HTTP_TOKEN) headers.Authorization = `Bearer ${this.env.AI_VIDEO_HTTP_TOKEN}`;

    const draft = generateScene(options);
    onProgress("Wysyłam pomysł do serwera AI…", 0.05);
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        prompt: buildAiPrompt(draft),
        promptPl: draft.prompt,
        duration: draft.durationInSeconds,
        aspectRatio: "9:16",
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        style: draft.style,
      }),
    });
    if (!res.ok) throw new Error(`Serwer AI: ${res.status}`);
    let data = (await res.json()) as Record<string, unknown>;

    const started = Date.now();
    while (!extractDirectUrl(data)) {
      if (data.status === "failed" || data.error) throw new Error(`Serwer AI: ${String(data.error ?? "błąd")}`);
      const statusUrl = typeof data.statusUrl === "string" ? data.statusUrl : null;
      if (!statusUrl) throw new Error("Serwer AI nie zwrócił ani videoUrl, ani statusUrl");
      if (Date.now() - started > TIMEOUT_MS) throw new Error("Przekroczono czas oczekiwania na serwer AI");
      const p = typeof data.progress === "number" ? data.progress : (Date.now() - started) / TIMEOUT_MS;
      onProgress("AI tworzy film…", Math.min(0.95, 0.1 + p * 0.85));
      await sleep(this.pollMs, signal);
      const poll = await this.fetchImpl(statusUrl, { headers, signal });
      if (!poll.ok) throw new Error(`Serwer AI: ${poll.status}`);
      data = (await poll.json()) as Record<string, unknown>;
    }
    const videoUrl = extractDirectUrl(data)!;
    onProgress("Klip AI gotowy!", 1);
    return await sceneFromAiClip(options, videoUrl, "http", new URL(url).host);
  }
}

function extractDirectUrl(data: Record<string, unknown>) {
  return extractVideoUrl(data.videoUrl ?? data.video_url ?? data.output ?? null);
}
