import type { GenerateOptions, SceneSpec } from "../scene/types";

export type ProviderId = "procedural" | "replicate" | "http";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  kind: "procedural" | "ai";
  available: boolean;
  /** Why the provider is unavailable (Polish, shown in the UI). */
  hint?: string;
}

export type ProgressFn = (stage: string, progress: number) => void;

/**
 * A video generator. The procedural provider returns a scene immediately;
 * AI providers call an external model and return a scene whose
 * `backgroundVideoUrl` points to the AI clip (the app then adds title,
 * effects, music and sound effects on top and renders a 1080×1920 MP4).
 */
export interface VideoProvider {
  info(): ProviderInfo;
  generate(options: GenerateOptions, onProgress: ProgressFn, signal?: AbortSignal): Promise<SceneSpec>;
}

/** Result of a text-to-video model call. */
export interface AiClip {
  videoUrl: string;
  model: string;
}
