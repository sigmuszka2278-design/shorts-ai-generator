import React from "react";
import { interpolate, spring } from "remotion";
import { FONT_FAMILY } from "../../fonts";
import type { Caption, SceneTiming } from "./timeline";
import { FPS } from "./timeline";

const OUTLINES: Record<string, string> = {
  s1: "#ff6fa8",
  s2: "#8b6cff",
  s3: "#4f6bff",
  s4: "#ff7a45",
  s5: "#e55ba8",
  s6: "#ff6fa8",
};

/**
 * Burned-in captions: 2–3 words at a time, large rounded white letters with a soft coloured outline.
 * Key words are yellow; the word being spoken right now pops up a little.
 */
export const Subtitles: React.FC<{ frame: number; captions: Caption[]; scenes: SceneTiming[] }> = ({ frame, captions, scenes }) => {
  const caption = captions.find((c) => frame >= c.from && frame < c.to);
  if (!caption) return null;
  const scene = scenes.find((s) => frame >= s.from && frame < s.from + s.durationInFrames) ?? scenes[0];
  const outline = OUTLINES[scene.id];
  const local = frame - caption.from;
  const appear = spring({ frame: local, fps: FPS, config: { damping: 12, mass: 0.5, stiffness: 180 } });
  const fadeOut = interpolate(frame, [caption.to - 4, caption.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneTime = (frame - scene.from) / FPS;
  const length = caption.words.reduce((n, w) => n + w.text.length + 1, 0);
  const fontSize = length > 22 ? 92 : length > 16 ? 104 : 116;

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1415,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        columnGap: fontSize * 0.5,
        rowGap: 4,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.18,
        textAlign: "center",
        transform: `scale(${0.82 + 0.18 * appear}) translateY(${(1 - appear) * 24}px)`,
        transformOrigin: "50% 50%",
        opacity: Math.min(1, appear * 1.6) * fadeOut,
      }}
    >
      {caption.words.map((w, i) => {
        const active = sceneTime >= w.start - 0.04 && sceneTime < Math.max(w.end + 0.06, w.start + 0.2);
        const pop = active
          ? interpolate(sceneTime, [w.start - 0.04, w.start + 0.1, Math.max(w.end + 0.06, w.start + 0.2)], [1, 1.12, 1.06], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: w.key ? "#ffe14d" : "#ffffff",
              WebkitTextStroke: `${Math.round(fontSize * 0.17)}px ${outline}`,
              paintOrder: "stroke fill",
              textShadow: `0 ${Math.round(fontSize * 0.07)}px 0 rgba(40,20,60,0.22), 0 0 ${Math.round(fontSize * 0.25)}px rgba(255,255,255,0.35)`,
              transform: `scale(${pop}) translateY(${(1 - pop) * 30}px)`,
              letterSpacing: 1,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
