import { generateScene } from "../scene/generator";
import type { GenerateOptions } from "../scene/types";
import { HttpProvider } from "./http";
import { ReplicateProvider } from "./replicate";
import type { ProviderId, ProviderInfo, VideoProvider } from "./types";

/** Free, offline generator – builds the whole animation from code. */
export class ProceduralProvider implements VideoProvider {
  info(): ProviderInfo {
    return {
      id: "procedural",
      name: "Animacja programowa",
      description: "Darmowa, działa od razu i offline. Postacie, kulki i magia generowane kodem.",
      kind: "procedural",
      available: true,
    };
  }

  async generate(options: GenerateOptions) {
    return generateScene(options);
  }
}

export function getProviders(env: Record<string, string | undefined> = process.env): Record<ProviderId, VideoProvider> {
  return {
    procedural: new ProceduralProvider(),
    replicate: new ReplicateProvider(env),
    http: new HttpProvider(env),
  };
}

export function listProviders(): ProviderInfo[] {
  return Object.values(getProviders()).map((p) => p.info());
}

export function isProviderId(id: unknown): id is ProviderId {
  return id === "procedural" || id === "replicate" || id === "http";
}

export type { ProviderId, ProviderInfo, VideoProvider } from "./types";
