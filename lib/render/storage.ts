import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Lightweight helpers for stored MP4 files – no Remotion imports, so API routes using them stay small.

export interface VideoMeta {
  videoId: string;
  title: string;
  prompt: string;
  style: string;
  theme: string;
  durationInSeconds: number;
  createdAt: number;
  sizeBytes: number;
  provider: string;
}

export function rendersDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.RENDERS_DIR || path.join(process.cwd(), "renders"));
}

export function isValidVideoId(id: string) {
  return /^[a-z0-9-]{8,80}$/.test(id);
}

export async function listVideos(limit = 12): Promise<VideoMeta[]> {
  const dir = rendersDir();
  let files: string[] = [];
  try {
    files = await readdir(/*turbopackIgnore: true*/ dir);
  } catch {
    return [];
  }
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          return JSON.parse(await readFile(path.join(/*turbopackIgnore: true*/ dir, f), "utf8")) as VideoMeta;
        } catch {
          return null;
        }
      }),
  );
  return metas
    .filter((m): m is VideoMeta => Boolean(m))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
