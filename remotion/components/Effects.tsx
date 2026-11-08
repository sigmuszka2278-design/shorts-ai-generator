import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import type { Effect } from "../../lib/scene/types";
import { heartPath, starPath } from "../paint";

const W = 1080;
const H = 1920;

interface Props {
  effect: Effect;
  frame: number;
  palette: string[];
  seed: number;
  is3d: boolean;
}

/** Rainbow is drawn behind actors – see `RainbowEffect`. Everything else is a front layer. */
export const RainbowEffect: React.FC<{ effect: Effect; frame: number }> = ({ effect, frame }) => {
  const t = frame - effect.startFrame;
  if (t < 0) return null;
  const grow = interpolate(t, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const colors = ["#ff4d6d", "#ff9f1c", "#ffd60a", "#52d273", "#3a86ff", "#6a4cff", "#9b5de5"];
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {colors.map((c, i) => {
          const r = 620 - i * 44;
          const len = Math.PI * r;
          return (
            <path
              key={c}
              d={`M ${540 - r} 1350 A ${r} ${r} 0 0 1 ${540 + r} 1350`}
              stroke={c}
              strokeWidth={46}
              fill="none"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - grow)}
              opacity={0.92}
            />
          );
        })}
        {[-1, 1].map((side) => (
          <g key={side} opacity={grow} transform={`translate(${540 + side * 600} 1360)`}>
            <ellipse rx={150} ry={60} fill="#fff" />
            <circle cx={-60} cy={-30} r={60} fill="#fff" />
            <circle cx={40} cy={-40} r={70} fill="#fff" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const FrontEffect: React.FC<Props> = ({ effect, frame, palette, seed, is3d }) => {
  const t = frame - effect.startFrame;
  if (t < 0 || effect.kind === "rainbow") return null;
  const rnd = (i: number, k: string) => random(`${seed}-${effect.kind}-${k}-${i}`);
  const items: React.ReactNode[] = [];

  // magic flash at the start of every effect
  const flash = interpolate(t, [0, 4, 22], [0, 0.6, 0], { extrapolateRight: "clamp" });
  const ring = interpolate(t, [0, 25], [0, 1100], { extrapolateRight: "clamp" });

  switch (effect.kind) {
    case "confetti": {
      for (let i = 0; i < 90; i++) {
        const delay = rnd(i, "d") * 25;
        const lt = t - delay;
        if (lt < 0) continue;
        const startX = rnd(i, "x") * W;
        const vx = (rnd(i, "vx") - 0.5) * 6;
        const x = startX + vx * lt + Math.sin(lt / 8 + i) * 30;
        const y = -60 + lt * (9 + rnd(i, "vy") * 7);
        if (y > H + 50) continue;
        const rot = lt * (6 + rnd(i, "r") * 10) * (i % 2 ? 1 : -1);
        const flip = Math.cos(lt / 5 + i);
        const color = palette[i % palette.length];
        items.push(
          <rect
            key={i}
            x={-14}
            y={-8}
            width={28}
            height={16}
            rx={4}
            fill={color}
            transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip} 1)`}
          />,
        );
      }
      break;
    }
    case "sparkles": {
      for (let i = 0; i < 46; i++) {
        const delay = rnd(i, "d") * 40;
        const lt = t - delay;
        if (lt < 0) continue;
        const angle = rnd(i, "a") * Math.PI * 2;
        const dist = 120 + rnd(i, "dist") * 520 * Math.min(1, lt / 30);
        const x = 540 + Math.cos(angle) * dist;
        const y = 820 + Math.sin(angle) * dist * 1.2 - lt * 0.8;
        const tw = Math.abs(Math.sin(lt / 6 + i));
        const s = 12 + rnd(i, "s") * 26;
        items.push(
          <path key={i} d={starPath(x, y, s * tw + 4, (s * tw + 4) * 0.3, 4)} fill={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#fff59d" : palette[i % palette.length]} />,
        );
      }
      break;
    }
    case "stars": {
      for (let i = 0; i < 28; i++) {
        const delay = rnd(i, "d") * 60;
        const lt = (t - delay) % 70;
        if (t - delay < 0) continue;
        const x = rnd(i, "x") * (W + 400) - 100 - lt * 6;
        const y = -50 + lt * 18 + rnd(i, "y") * 300;
        const s = 18 + rnd(i, "s") * 22;
        items.push(
          <g key={i} opacity={interpolate(lt, [0, 8, 60, 70], [0, 1, 1, 0])}>
            <path d={`M ${x} ${y} L ${x + 90} ${y - 270 / 1.0 * 0.4}`} stroke="#fff9c4" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
            <path d={starPath(x, y, s, s * 0.45)} fill="#ffd60a" transform={`rotate(${lt * 8} ${x} ${y})`} />
          </g>,
        );
      }
      break;
    }
    case "bubbles": {
      for (let i = 0; i < 26; i++) {
        const delay = rnd(i, "d") * 40;
        const lt = t - delay;
        if (lt < 0) continue;
        const r = 22 + rnd(i, "r") * 40;
        const x = rnd(i, "x") * W + Math.sin(lt / 10 + i) * 40;
        const y = H + r - lt * (6 + rnd(i, "v") * 6);
        if (y < -r) continue;
        items.push(
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={palette[i % palette.length]} fillOpacity={0.18} stroke="#ffffff" strokeWidth={4} strokeOpacity={0.85} />
            <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.25} ry={r * 0.14} fill="#fff" opacity={0.9} transform={`rotate(-35 ${x - r * 0.35} ${y - r * 0.4})`} />
          </g>,
        );
      }
      break;
    }
    case "hearts": {
      for (let i = 0; i < 22; i++) {
        const delay = rnd(i, "d") * 40;
        const lt = t - delay;
        if (lt < 0) continue;
        const x = rnd(i, "x") * W + Math.sin(lt / 9 + i) * 40;
        const y = H - lt * (7 + rnd(i, "v") * 5);
        if (y < -80) continue;
        const s = 26 + rnd(i, "s") * 30;
        items.push(<path key={i} d={heartPath(x, y, s)} fill={["#ff4d6d", "#ff70a6", "#ffb3c6"][i % 3]} stroke={is3d ? "none" : "#2b2d42"} strokeWidth={4} />);
      }
      break;
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {ring > 0 && ring < 1100 && (
          <circle cx={540} cy={820} r={ring} fill="none" stroke="#ffffff" strokeWidth={30 * (1 - ring / 1100)} opacity={0.8 * (1 - ring / 1100)} />
        )}
        {items}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 43%, #ffffff 0%, rgba(255,255,255,0) 60%)", opacity: flash }} />
    </AbsoluteFill>
  );
};
