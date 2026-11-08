import { generateScene } from "../scene/generator";
import type { GenerateOptions } from "../scene/types";
import { buildAiPrompt, extractVideoUrl, fillTemplate, sceneFromAiClip, sleep } from "./ai-common";
import type { ProgressFn, ProviderInfo, VideoProvider } from "./types";

const API = "https://api.replicate.com/v1";
const DEFAULT_TEMPLATE = '{"prompt":"{{prompt}}","aspect_ratio":"{{aspect_ratio}}","duration":{{duration}}}';
const TIMEOUT_MS = 10 * 60 * 1000;

interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  urls?: { get?: string };
  logs?: string;
}

/**
 * Replicate adapter – works with any text-to-video model hosted on Replicate
 * (set REPLICATE_MODEL, e.g. "minimax/video-01", and optionally REPLICATE_INPUT_TEMPLATE).
 */
export class ReplicateProvider implements VideoProvider {
  constructor(
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly pollMs = 3000,
  ) {}

  info(): ProviderInfo {
    const available = Boolean(this.env.REPLICATE_API_TOKEN && this.env.REPLICATE_MODEL);
    return {
      id: "replicate",
      name: "AI wideo (Replicate)",
      description: available
        ? `Model: ${this.env.REPLICATE_MODEL}. Klip AI + napisy, efekty i dźwięki ze studia.`
        : "Prawdziwy generator wideo AI przez Replicate.",
      kind: "ai",
      available,
      hint: available ? undefined : "Ustaw REPLICATE_API_TOKEN i REPLICATE_MODEL w pliku .env.local",
    };
  }

  async generate(options: GenerateOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    const token = this.env.REPLICATE_API_TOKEN;
    const model = this.env.REPLICATE_MODEL;
    if (!token || !model) throw new Error("Generator Replicate nie jest skonfigurowany");

    const draft = generateScene(options);
    const prompt = buildAiPrompt(draft);
    const input = fillTemplate(this.env.REPLICATE_INPUT_TEMPLATE || DEFAULT_TEMPLATE, {
      prompt,
      duration: draft.durationInSeconds,
      aspect_ratio: "9:16",
    });

    onProgress("Wysyłam pomysł do modelu AI…", 0.05);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    // "owner/name" → official model endpoint, "owner/name:version" → version endpoint
    const [name, version] = model.split(":");
    const createUrl = version ? `${API}/predictions` : `${API}/models/${name}/predictions`;
    const body = version ? { version, input } : { input };
    const res = await this.fetchImpl(createUrl, { method: "POST", headers, body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(`Replicate: ${res.status} ${await safeText(res)}`);
    let prediction = (await res.json()) as Prediction;

    const started = Date.now();
    while (prediction.status === "starting" || prediction.status === "processing") {
      if (Date.now() - started > TIMEOUT_MS) throw new Error("Przekroczono czas oczekiwania na model AI");
      const elapsed = (Date.now() - started) / TIMEOUT_MS;
      onProgress(prediction.status === "starting" ? "Model AI się uruchamia…" : "AI tworzy film…", Math.min(0.9, 0.1 + elapsed * 3));
      await sleep(this.pollMs, signal);
      const poll = await this.fetchImpl(prediction.urls?.get ?? `${API}/predictions/${prediction.id}`, { headers, signal });
      if (!poll.ok) throw new Error(`Replicate: ${poll.status} ${await safeText(poll)}`);
      prediction = (await poll.json()) as Prediction;
    }
    if (prediction.status !== "succeeded") {
      throw new Error(`Model AI nie wygenerował filmu: ${prediction.error ?? prediction.status}`);
    }
    const videoUrl = extractVideoUrl(prediction.output);
    if (!videoUrl) throw new Error("Model AI nie zwrócił adresu wideo");
    onProgress("Klip AI gotowy!", 1);
    return await sceneFromAiClip(options, videoUrl, "replicate", model);
  }
}

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
