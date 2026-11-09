import React from "react";
import { spring } from "remotion";
import { FONT_FAMILY } from "../fonts";
import type { Caption } from "./timeline";

export const HIGHLIGHT = "#ffe14d";

/**
 * Burned-in captions: 2–3 words at a time, large rounded white letters with a soft coloured
 * outline, key words in yellow. `time` is seconds relative to the scene's voiceover start.
 */
export const Subtitles: React.FC<{
  captions: Caption[];
  time: number;
  fps: number;
  outline: string;
  /** seconds after which captions of this scene are hidden */
  hideAfter: number;
}> = ({ captions, time, fps, outline, hideAfter }) => {
  let index = -1;
  for (let i = 0; i < captions.length; i++) {
    if (time >= captions[i].start - 0.04) index = i;
  }
  if (index < 0 || time > hideAfter) return null;
  const cap = captions[index];
  const local = Math.max(0, (time - cap.start + 0.04) * fps);
  const pop = spring({ frame: local, fps, config: { damping: 11, mass: 0.6, stiffness: 170 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1190,
        height: 260,
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        columnGap: 52,
        rowGap: 0,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 112,
        lineHeight: 1.12,
        textAlign: "center",
        transform: `scale(${0.7 + 0.3 * pop}) translateY(${(1 - pop) * 30}px)`,
        opacity: Math.min(1, pop * 1.6),
      }}
    >
      {cap.words.map((w, i) => {
        const speaking = time >= w.start && time <= w.end + 0.08;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: w.highlight ? HIGHLIGHT : "#ffffff",
              WebkitTextStroke: `16px ${outline}`,
              paintOrder: "stroke fill",
              textShadow: `0 8px 0 ${outline}, 0 14px 22px rgba(30, 40, 90, 0.35)`,
              transform: `scale(${speaking ? 1.08 : 1})`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
