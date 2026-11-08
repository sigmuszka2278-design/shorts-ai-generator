import type { NextConfig } from "next";

// On Vercel MP4 files are rendered in the browser (see lib/config.ts), so the server
// renderer (headless Chrome + ffmpeg binaries) is left out of the serverless functions.
const onVercel = Boolean(process.env.VERCEL) && process.env.RENDER_MODE !== "server";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: onVercel
    ? {
        "/api/**": [
          "node_modules/@remotion/compositor-*/**",
          "node_modules/@remotion/bundler/**",
          "node_modules/@remotion/renderer/**",
          "node_modules/@remotion/studio*/**",
          "node_modules/@remotion/web-renderer/**",
          "node_modules/esbuild/**",
          "node_modules/@esbuild/**",
          "node_modules/webpack/**",
          "public/music/**",
          "public/sfx/**",
        ],
      }
    : undefined,
  // Remotion's renderer/bundler run in Node and must not be bundled by Next.
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-linux-x64-gnu",
    "@remotion/compositor-linux-x64-musl",
    "@remotion/compositor-linux-arm64-gnu",
    "@remotion/compositor-linux-arm64-musl",
    "@remotion/compositor-darwin-x64",
    "@remotion/compositor-darwin-arm64",
    "@remotion/compositor-win32-x64-msvc",
    "esbuild",
    "webpack",
  ],
};

export default nextConfig;
