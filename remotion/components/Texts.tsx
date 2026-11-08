import React from "react";
import { interpolate, spring } from "remotion";
import { FONT_FAMILY } from "../fonts";

const STROKE = "#2b2d42";

function fontSizeFor(text: string) {
  if (text.length <= 14) return 132;
  if (text.length <= 24) return 112;
  if (text.length <= 34) return 96;
  return 86;
}

/** Bouncy, letter-by-letter title at the top of the frame. */
export const Title: React.FC<{ text: string; frame: number; fps: number; palette: string[]; is3d: boolean }> = ({
  text,
  frame,
  fps,
  palette,
  is3d,
}) => {
  const words = text.split(" ");
  const size = fontSizeFor(text);
  let letterIndex = 0;
  const bob = Math.sin(frame / 18) * 8;
  const settle = interpolate(frame, [fps * 2.2, fps * 2.8], [1, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 130,
        left: 40,
        right: 40,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: size * 0.3,
        rowGap: 0,
        transform: `translateY(${bob - (1 - settle) * 60}px) scale(${settle})`,
        transformOrigin: "50% 0%",
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.1,
        textAlign: "center",
      }}
    >
      {words.map((word, w) => (
        <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
          {Array.from(word).map((ch, c) => {
            const i = letterIndex++;
            const s = spring({ frame: frame - 4 - i * 1.6, fps, config: { damping: 9, mass: 0.6, stiffness: 160 } });
            const wave = Math.sin(frame / 7 - i * 0.6) * 6;
            const color = palette[i % palette.length];
            return (
              <span
                key={c}
                style={{
                  display: "inline-block",
                  color: "#ffffff",
                  transform: `translateY(${(1 - s) * -120 + wave}px) scale(${s})`,
                  WebkitTextStroke: `${size * 0.09}px ${color}`,
                  paintOrder: "stroke fill",
                  textShadow: is3d
                    ? `0 ${size * 0.06}px 0 ${STROKE}, 0 ${size * 0.12}px ${size * 0.15}px rgba(0,0,0,0.35)`
                    : `0 ${size * 0.05}px 0 ${STROKE}`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

/** Big bouncing ending text, e.g. "Pa, pa!". */
export const Outro: React.FC<{ text: string; frame: number; startFrame: number; fps: number; palette: string[] }> = ({
  text,
  frame,
  startFrame,
  fps,
  palette,
}) => {
  const t = frame - startFrame;
  if (t < 0) return null;
  const s = spring({ frame: t, fps, config: { damping: 8, mass: 0.7 } });
  const wobble = Math.sin(t / 5) * 5;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1030,
        display: "flex",
        justifyContent: "center",
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 150,
        color: "#ffffff",
        WebkitTextStroke: `16px ${palette[0]}`,
        paintOrder: "stroke fill",
        textShadow: `0 10px 0 ${STROKE}, 0 24px 30px rgba(0,0,0,0.3)`,
        transform: `scale(${s}) rotate(${wobble}deg)`,
      }}
    >
      {text}
    </div>
  );
};
