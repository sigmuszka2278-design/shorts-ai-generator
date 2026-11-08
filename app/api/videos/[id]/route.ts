import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { jsonError } from "@/lib/api";
import { parseRange } from "@/lib/http-range";
import { isValidVideoId, rendersDir } from "@/lib/render/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams a rendered MP4 with HTTP Range support (required by Safari/iOS for <video>). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidVideoId(id)) return jsonError("Nieprawidłowy identyfikator", 400);
  const file = path.join(rendersDir(), `${id}.mp4`);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return jsonError("Nie znaleziono filmu", 404);
  }

  const url = new URL(request.url);
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  if (url.searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="shorts-ai-${id}.mp4"`);
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    const stream = createReadStream(file, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { status: 200, headers });
}
