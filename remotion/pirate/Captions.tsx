import React from "react";
import { spring, useVideoConfig } from "remotion";
import { SAFE, type Caption } from "../../lib/pirate/timeline";

export const CAPTION_FONT = "Anton, Impact, 'Arial Black', 'Noto Color Emoji', sans-serif";

const strokeStyle = (size: number): React.CSSProperties => ({
  WebkitTextStroke: `${Math.round(size * 0.13)}px black`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size * 0.07)}px 0 rgba(0,0,0,0.85), 0 0 ${Math.round(size * 0.3)}px rgba(0,0,0,0.35)`,
});

/** Big Burbank/Impact-style caption: white with black outline, key words in gold, popping in word by word. */
export const PopCaption: React.FC<{ caption: Caption; frame: number; pulse?: boolean }> = ({ caption, frame, pulse }) => {
  const { fps } = useVideoConfig();
  const t = frame - caption.from;
  if (t < 0 || frame >= caption.to) return null;
  const words = caption.text.split(" ");
  const out = Math.min(1, (caption.to - frame) / 6);
  const beatPulse = pulse ? 1 + 0.05 * Math.exp(-((frame % 24) / 6)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        top: caption.y,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: caption.size * 0.26,
        rowGap: caption.size * 0.02,
        transform: `scale(${beatPulse})`,
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const wt = t - i * caption.stagger;
        if (wt < 0) return <span key={i} style={{ visibility: "hidden", fontSize: caption.size, fontFamily: CAPTION_FONT }}>{w}</span>;
        const s = spring({ frame: wt, fps, config: { damping: 9, stiffness: 260, mass: 0.6 } });
        const gold = caption.gold.includes(w);
        const isEmoji = /\p{Extended_Pictographic}/u.test(w) && !/[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: CAPTION_FONT,
              fontSize: caption.size,
              lineHeight: 1.08,
              letterSpacing: 1,
              color: gold ? "#FFC93C" : "white",
              transform: `scale(${s}) rotate(${(1 - s) * (i % 2 ? 12 : -12)}deg)`,
              ...(isEmoji ? { textShadow: "0 6px 0 rgba(0,0,0,0.5)" } : strokeStyle(caption.size)),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Smaller info line (still outlined, readable on any background). */
export const SmallText: React.FC<{
  text: React.ReactNode;
  y: number;
  size?: number;
  opacity?: number;
  color?: string;
  box?: boolean;
  scale?: number;
}> = ({ text, y, size = 34, opacity = 1, color = "white", box, scale = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: SAFE.right - SAFE.left,
      top: y,
      display: "flex",
      justifyContent: "center",
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <div
      style={{
        fontFamily: CAPTION_FONT,
        fontSize: size,
        color,
        textAlign: "center",
        textWrap: "balance",
        lineHeight: 1.2,
        letterSpacing: 0.5,
        padding: box ? `${size * 0.35}px ${size * 0.6}px` : 0,
        borderRadius: size * 0.5,
        background: box ? "rgba(8,20,24,0.82)" : "transparent",
        border: box ? `${Math.max(3, size * 0.08)}px solid #FFC93C` : "none",
        ...(box ? {} : strokeStyle(size * 0.6)),
      }}
    >
      {text}
    </div>
  </div>
);
