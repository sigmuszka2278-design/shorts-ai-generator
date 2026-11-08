import React from "react";
import { shade } from "../../lib/scene/color";
import type { MagicId } from "../../lib/scene/types";
import { blinkAt, createPaint, Face, Gloss, heartPath, OUTLINE, starPath } from "../paint";

interface Props {
  id: string;
  variant: MagicId;
  color: string;
  accent: string;
  size: number;
  is3d: boolean;
  frame: number;
  phase: number;
}

/** Magical objects (viewBox 200×200) with a pulsing glow. */
export const MagicItem: React.FC<Props> = ({ id, variant, color, accent, size, is3d, frame, phase }) => {
  const { paint, stroke, renderDefs } = createPaint(`m-${id}`, is3d);
  const blink = blinkAt(frame, phase + 3);
  const glow = 0.55 + Math.sin(frame / 8) * 0.25;

  const item: React.ReactNode = (() => {
    switch (variant) {
      case "rozdzka":
        return (
          <g>
            <path d="M 52 182 L 112 84" stroke={OUTLINE} strokeWidth={20} strokeLinecap="round" />
            <path d="M 52 182 L 112 84" stroke={paint(accent, "soft")} strokeWidth={13} strokeLinecap="round" />
            <path d="M 62 165 L 70 152 M 78 139 L 86 126" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
            <g transform={`rotate(${Math.sin(frame / 10) * 12} 122 66)`}>
              <path d={starPath(122, 66, 56, 25)} fill={paint(color)} {...stroke} strokeLinejoin="round" />
              <Face cx={122} cy={66} scale={0.7} blink={blink} />
            </g>
          </g>
        );
      case "gwiazda":
        return (
          <g>
            <path d={starPath(100, 104, 90, 42)} fill={paint(color)} {...stroke} strokeLinejoin="round" />
            <Face cx={100} cy={102} scale={1.1} blink={blink} />
            <Gloss cx={78} cy={70} rx={12} ry={6} is3d={is3d} opacity={0.6} />
          </g>
        );
      case "korona":
        return (
          <g>
            <path d="M 24 150 L 16 56 L 62 96 L 100 36 L 138 96 L 184 56 L 176 150 Z" fill={paint(color)} {...stroke} strokeLinejoin="round" />
            <rect x={22} y={140} width={156} height={26} rx={10} fill={paint(shade(color, -0.15))} {...stroke} />
            {[16, 100, 184].map((x, i) => (
              <circle key={x} cx={x} cy={i === 1 ? 36 : 56} r={11} fill={paint(accent)} {...stroke} />
            ))}
            {[60, 100, 140].map((x, i) => (
              <circle key={x} cx={x} cy={153} r={8} fill={paint(["#4cc9f0", accent, "#52d273"][i])} />
            ))}
            <Gloss cx={56} cy={110} rx={14} ry={7} is3d={is3d} opacity={0.6} />
          </g>
        );
      case "prezent": {
        const lid = Math.max(0, Math.sin(frame / 12)) * 10;
        return (
          <g>
            <rect x={32} y={88} width={136} height={100} rx={10} fill={paint(color)} {...stroke} />
            <rect x={88} y={88} width={24} height={100} fill={paint(accent)} />
            <g transform={`translate(0 ${-lid})`}>
              <rect x={22} y={64} width={156} height={34} rx={9} fill={paint(shade(color, 0.1))} {...stroke} />
              <rect x={88} y={64} width={24} height={34} fill={paint(accent)} />
              <ellipse cx={74} cy={50} rx={30} ry={18} fill={paint(accent)} {...stroke} transform="rotate(-20 74 50)" />
              <ellipse cx={126} cy={50} rx={30} ry={18} fill={paint(accent)} {...stroke} transform="rotate(20 126 50)" />
              <circle cx={100} cy={60} r={13} fill={paint(shade(accent, -0.1))} {...stroke} />
            </g>
            <Face cx={70} cy={130} scale={0.8} blink={blink} />
          </g>
        );
      }
      case "krysztal":
        return (
          <g>
            <path d="M 100 14 L 168 76 L 100 190 L 32 76 Z" fill={paint(color)} {...stroke} strokeLinejoin="round" />
            <path d="M 32 76 L 168 76 M 100 14 L 76 76 L 100 190 L 124 76 Z" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={3} fill="none" />
            <path d="M 100 14 L 76 76 L 32 76 Z" fill="#fff" opacity={0.35} />
            <path d="M 100 190 L 124 76 L 168 76 Z" fill={accent} opacity={0.35} />
            <Face cx={100} cy={112} scale={0.8} blink={blink} />
          </g>
        );
      case "balon":
        return (
          <g>
            <path d={`M 100 168 Q ${86 + Math.sin(frame / 7) * 10} 190 100 214 Q ${114 - Math.sin(frame / 7) * 10} 236 100 260`} stroke={OUTLINE} strokeWidth={3} fill="none" />
            <path d="M 92 172 L 108 172 L 100 158 Z" fill={paint(shade(color, -0.2))} {...stroke} />
            <ellipse cx={100} cy={88} rx={66} ry={78} fill={paint(color)} {...stroke} />
            <Face cx={100} cy={92} scale={1} blink={blink} />
            <Gloss cx={70} cy={44} rx={16} ry={9} is3d={is3d} opacity={0.75} />
          </g>
        );
      case "serce":
        return (
          <g>
            <path d={heartPath(100, 100, 92)} fill={paint(color)} {...stroke} strokeLinejoin="round" />
            <Face cx={100} cy={96} scale={1.05} blink={blink} />
            <Gloss cx={58} cy={58} rx={14} ry={8} is3d={is3d} opacity={0.6} />
          </g>
        );
      case "ksiezyc":
        return (
          <g>
            <path d="M 132 20 A 84 84 0 1 0 172 150 A 66 66 0 1 1 132 20 Z" fill={paint(color)} {...stroke} strokeLinejoin="round" />
            <Face cx={84} cy={104} scale={0.9} blink={0} sleepy />
            <circle cx={70} cy={150} r={7} fill={shade(color, -0.15)} opacity={0.6} />
            <circle cx={48} cy={70} r={5} fill={shade(color, -0.15)} opacity={0.6} />
          </g>
        );
      case "grzybek":
        return (
          <g>
            <rect x={70} y={96} width={60} height={88} rx={26} fill={paint(accent)} {...stroke} />
            <Face cx={100} cy={136} scale={0.85} blink={blink} />
            <path d="M 14 108 Q 18 20 100 18 Q 182 20 186 108 Q 100 126 14 108 Z" fill={paint(color)} {...stroke} strokeLinejoin="round" />
            {[
              [60, 60, 14],
              [112, 42, 11],
              [148, 78, 13],
              [96, 88, 9],
            ].map(([x, y, r]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" />
            ))}
          </g>
        );
      case "lizak": {
        const rings = [70, 56, 42, 28, 14];
        return (
          <g>
            <rect x={93} y={150} width={14} height={90} rx={6} fill="#fff" {...stroke} />
            <g transform={`rotate(${frame * 3} 100 92)`}>
              {rings.map((r, i) => (
                <circle key={r} cx={100} cy={92} r={r} fill={paint(i % 2 === 0 ? color : accent)} {...(i === 0 ? stroke : {})} />
              ))}
            </g>
            <Gloss cx={72} cy={60} rx={14} ry={8} is3d={is3d} opacity={0.6} />
          </g>
        );
      }
    }
  })();

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      {renderDefs()}
      <defs>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0%" stopColor="#fffbe0" stopOpacity={0.95} />
          <stop offset="45%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={100} cy={100} r={150} fill={`url(#glow-${id})`} opacity={glow * (is3d ? 1 : 0.7)} />
      {item}
    </svg>
  );
};
