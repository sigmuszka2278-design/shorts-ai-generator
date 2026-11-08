import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shorts AI Studio – kolorowe animacje dla dzieci",
  description:
    "Wpisz pomysł, a Shorts AI Studio stworzy kolorowy, animowany film dla dzieci w formacie YouTube Shorts (9:16, 1080p) z efektami dźwiękowymi.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdf7ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-blobs font-sans antialiased">{children}</body>
    </html>
  );
}
