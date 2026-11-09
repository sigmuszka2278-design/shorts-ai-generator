import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT_FAMILY } from "../fonts";
import captionsJson from "./captions.json";
import type { CaptionLine } from "./timeline";
import { T } from "./timeline";
import { clamp01, prog, springAt, starPath } from "./util";

const captions = captionsJson as CaptionLine[];

const textStyle = (size: number, color = "#ffffff", stroke = "#2b0a5c", strokeW = 16): React.CSSProperties => ({
  fontFamily: FONT_FAMILY,
  fontWeight: 700,
  fontSize: size,
  color,
  WebkitTextStroke: `${strokeW}px ${stroke}`,
  paintOrder: "stroke fill",
  lineHeight: 1.05,
  letterSpacing: 1,
  textShadow: `0 10px 0 ${stroke}, 0 14px 30px rgba(0,0,0,0.45)`,
});

/** "WYBIERZ: 1, 2 CZY 3?" banner at the top. */
export const Banner: React.FC<{ t: number }> = ({ t }) => {
  const s = springAt(t, 0.05, 16, 6);
  const out = prog(t, 3.0, 3.25);
  if (s <= 0 || out >= 1) return null;
  const wig = Math.sin(t * 6) * 2.5;
  const digits: [string, string][] = [
    ["1", "#ff3b6b"],
    ["2", "#3bb6ff"],
    ["3", "#ffd23f"],
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 205, height: 260, pointerEvents: "none" }}>
      <div
        style={{
          transform: `scale(${s * (1 - out)}) rotate(${wig}deg)`,
          background: "linear-gradient(180deg, #ff4fd8 0%, #8a2be2 100%)",
          border: "10px solid #ffffff",
          borderRadius: 60,
          padding: "18px 44px 26px",
          boxShadow: "0 14px 0 #2b0a5c, 0 24px 50px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          whiteSpace: "nowrap",
        }}
      >
        <span style={textStyle(84, "#ffffff", "#2b0a5c", 14)}>WYBIERZ:</span>
        {digits.map(([d, c], i) => (
          <React.Fragment key={d}>
            <span style={{ ...textStyle(104, c, "#2b0a5c", 14), display: "inline-block", transform: `translateY(${Math.sin(t * 8 + i * 1.3) * 8}px)` }}>{d}</span>
            {i === 0 && <span style={textStyle(84, "#ffffff", "#2b0a5c", 14)}>,</span>}
            {i === 1 && <span style={textStyle(70, "#ffffff", "#2b0a5c", 14)}>CZY</span>}
          </React.Fragment>
        ))}
        <span style={textStyle(104, "#ffffff", "#2b0a5c", 14)}>?</span>
      </div>
    </AbsoluteFill>
  );
};

/** Huge 3-2-1 countdown with a draining ring. */
export const Countdown: React.FC<{ t: number }> = ({ t }) => {
  const steps: [number, string, string, string][] = [
    [T.count3, "3", "#ff3b6b", "#7a0022"],
    [T.count2, "2", "#3bb6ff", "#0b2a7a"],
    [T.count1, "1", "#ffd23f", "#7a4300"],
  ];
  const active = steps.findIndex(([at], i) => t >= at && t < (steps[i + 1]?.[0] ?? T.count1 + 0.85));
  if (active < 0) return null;
  const [at, label, color, dark] = steps[active];
  const local = t - at;
  const s = 0.4 + 0.6 * springAt(t, at, 18, 7);
  const end = active === 2 ? prog(t, at + 0.6, at + 0.85) : 0;
  const ring = 1 - clamp01(local / 0.8);
  const R = 230;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, transparent 35%, ${color}55 75%, ${dark}cc 100%)`, opacity: 1 - local * 0.6 }} />
      <svg viewBox="-400 -400 800 800" width={800} height={800} style={{ position: "absolute", transform: `scale(${s * (1 + end * 2)}) rotate(${(1 - Math.min(1, local * 4)) * -25}deg)`, opacity: 1 - end }}>
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d="M -14 -270 L 14 -270 L 0 -380 Z" fill={color} opacity={0.8} transform={`rotate(${i * 22.5 + local * 40})`} />
        ))}
        <circle r={R + 30} fill={dark} opacity={0.85} />
        <circle r={R} fill="none" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={34} />
        <circle r={R} fill="none" stroke={color} strokeWidth={34} strokeDasharray={`${C * ring} ${C}`} transform="rotate(-90)" strokeLinecap="round" />
        <text y={115} textAnchor="middle" fontFamily={FONT_FAMILY} fontWeight={700} fontSize={340} fill={color} stroke="#ffffff" strokeWidth={22} paintOrder="stroke">
          {label}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/** Word-by-word captions synchronised with the voice-over. */
export const Captions: React.FC<{ t: number }> = ({ t }) => {
  const line = captions.find((l, i) => t >= l.start - 0.05 && t < Math.min(captions[i + 1]?.start ?? 99, l.end + 0.9));
  if (!line) return null;
  // current chunk
  const spoken = line.words.filter((w) => w.start <= t + 0.05);
  const chunk = spoken.length ? spoken[spoken.length - 1].chunk : 0;
  const words = line.words.filter((w) => w.chunk === chunk);
  const chunkStart = words[0].start;
  const pop = 0.6 + 0.4 * springAt(t, chunkStart - 0.05, 20, 8);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 1190, height: 420, pointerEvents: "none" }}>
      <div
        style={{
          width: 980,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: 34,
          rowGap: 4,
          transform: `scale(${pop})`,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.05;
          const said = t >= w.start;
          const ws = said ? 0.9 + 0.1 * springAt(t, w.start, 24, 9) + (active ? 0.06 : 0) : 1;
          const color = w.emph ? (said ? "#ffe14d" : "#fff6c2") : active ? "#7df9ff" : "#ffffff";
          return (
            <span key={i} style={{ ...textStyle(w.text.length > 11 ? 92 : 106, color), display: "inline-block", transform: `scale(${ws}) rotate(${active ? -3 : 0}deg)`, opacity: said ? 1 : 0.85 }}>
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** "1 000 000 💎" counter in the treasure room (the gem icon is drawn, not an emoji). */
export const DiamondCounter: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.reveal + 0.25 || t > T.dragonOut) return null;
  const s = springAt(t, T.reveal + 0.25, 16, 7);
  const out = prog(t, T.dragonOut - 0.25, T.dragonOut);
  const p = prog(t, T.reveal + 0.3, T.reveal + 1.6, (x) => 1 - Math.pow(1 - x, 3));
  const n = Math.round(1_000_000 * p);
  const txt = n.toLocaleString("pl-PL").replace(/ |\s/g, " ");
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 230, height: 200, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${s * (1 - out)})` }}>
        <svg viewBox="-60 -50 120 100" width={130} height={110}>
          <path d="M -33 -19 L 33 -19 L 55 -5 L 0 45 L -55 -5 Z" fill="#3df2ff" stroke="#ffffff" strokeWidth={5} strokeLinejoin="round" />
          <path d="M -33 -19 L -12 -5 L -55 -5 Z M 12 -5 L 33 -19 L 55 -5 Z" fill="#ffffff" opacity={0.6} />
          <path d="M -12 -5 L 12 -5 L 0 45 Z" fill="#ffffff" opacity={0.3} />
        </svg>
        <span style={{ ...textStyle(120, "#ffe14d"), fontVariantNumeric: "tabular-nums" }}>{txt}</span>
      </div>
    </AbsoluteFill>
  );
};

/** Sparkle burst used for transitions. */
export const StarBurst: React.FC<{ x: number; y: number; p: number; color?: string; count?: number; radius?: number }> = ({ x, y, p, color = "#ffffff", count = 12, radius = 420 }) => {
  if (p <= 0 || p >= 1) return null;
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, pointerEvents: "none", overflow: "visible" }}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + i;
        const d = radius * Math.pow(p, 0.6) * (0.7 + 0.3 * ((i * 37) % 10) / 10);
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d;
        const s = 34 * (1 - p) + 6;
        return <path key={i} d={starPath(sx, sy, s, s * 0.3)} fill={i % 3 === 0 ? "#ffe14d" : i % 3 === 1 ? "#7df9ff" : color} opacity={1 - p * 0.8} />;
      })}
    </svg>
  );
};
