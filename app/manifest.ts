import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shorts AI Studio",
    short_name: "Shorts AI",
    description: "Kolorowe animowane filmy dla dzieci na YouTube Shorts",
    lang: "pl",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7ff",
    theme_color: "#fdf7ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
