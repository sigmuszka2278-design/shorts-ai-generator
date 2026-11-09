import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

export interface CaptionWord {
  text: string;
  start: number;
  highlight: boolean;
}

export interface Caption {
  start: number;
  end: number;
  scene: string;
  words: CaptionWord[];
}

const YELLOW = "#FFD60A";

/**
 * Burned-in Polish subtitles: 2–4 words at a time, bold white with a thick
 * black outline, key words in yellow, placed in the lower-middle of the frame
 * (above the YouTube Shorts UI).
 */
export const Captions: React.FC<{ captions: Caption[]; time: number }> = ({ captions, time }) => {
  const current = captions.find((c) => time >= c.start && time < c.end);
  if (!current) return null;
  const age = time - current.start;
  const pop = interpolate(age, [0, 0.07, 0.14], [0.78, 1.07, 1], { extrapolateRight: "clamp" });
  const lift = interpolate(age, [0, 0.12], [18, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(age, [0, 0.05], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1180,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: 38,
          rowGap: 4,
          transform: `translateY(${lift}px) scale(${pop})`,
          opacity,
          fontFamily: "Montserrat, 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: 96,
          lineHeight: 1.12,
          textAlign: "center",
        }}
      >
        {current.words.map((w, i) => {
          const spoken = time >= w.start - 0.03;
          return (
            <span
              key={i}
              style={{
                color: w.highlight ? YELLOW : "#FFFFFF",
                WebkitTextStroke: "12px #000",
                paintOrder: "stroke fill",
                textShadow: "0 6px 18px rgba(0,0,0,0.65)",
                transform: w.highlight && spoken ? `scale(${interpolate(time - w.start, [0, 0.1, 0.2], [1, 1.1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` : undefined,
                display: "inline-block",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
