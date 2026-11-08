/**
 * Where MP4 files are rendered:
 * - "server":  on this Node.js server with Remotion + headless Chrome (own computer / VPS / Docker)
 * - "browser": on the user's device (WebCodecs) – used on serverless hosting like Vercel,
 *              which cannot run Chrome + ffmpeg inside a function.
 * RENDER_MODE overrides the automatic choice.
 */
export function serverRenderEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.RENDER_MODE === "server") return true;
  if (env.RENDER_MODE === "browser") return false;
  return !env.VERCEL;
}
