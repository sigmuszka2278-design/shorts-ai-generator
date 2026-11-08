import React from "react";
import { shade } from "../lib/scene/color";

export const OUTLINE = "#2b2d42";

/**
 * Builds fills for SVG shapes.
 * - 2D: flat cartoon colours with a thick outline.
 * - 3D: radial gradients (light from the top-left), giving a soft clay/plastic look.
 */
export function createPaint(uid: string, is3d: boolean) {
  const defs: React.ReactElement[] = [];
  const cache = new Map<string, string>();

  const paint = (color: string, variant: "sphere" | "soft" = "sphere") => {
    if (!is3d) return color;
    const key = `${color}-${variant}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const id = `${uid}-g${cache.size}`;
    const ref = `url(#${id})`;
    cache.set(key, ref);
    defs.push(
      variant === "sphere" ? (
        <radialGradient key={id} id={id} cx="38%" cy="32%" r="72%" fx="30%" fy="25%">
          <stop offset="0%" stopColor={shade(color, 0.6)} />
          <stop offset="40%" stopColor={color} />
          <stop offset="85%" stopColor={shade(color, -0.28)} />
          <stop offset="100%" stopColor={shade(color, -0.4)} />
        </radialGradient>
      ) : (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={shade(color, 0.35)} />
          <stop offset="100%" stopColor={shade(color, -0.25)} />
        </linearGradient>
      ),
    );
    return ref;
  };

  const stroke = is3d
    ? { stroke: "rgba(0,0,0,0.12)", strokeWidth: 1.5 }
    : { stroke: OUTLINE, strokeWidth: 5, strokeLinejoin: "round" as const };

  return {
    paint,
    stroke,
    renderDefs: () => <defs>{defs}</defs>,
  };
}

/** Glossy highlight used on 3D shapes. */
export const Gloss: React.FC<{ cx: number; cy: number; rx: number; ry: number; is3d: boolean; opacity?: number }> = ({
  cx,
  cy,
  rx,
  ry,
  is3d,
  opacity = 0.75,
}) =>
  is3d ? (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} transform={`rotate(-30 ${cx} ${cy})`} />
  ) : (
    <path
      d={`M ${cx - rx} ${cy + ry * 0.6} Q ${cx - rx * 0.6} ${cy - ry} ${cx + rx * 0.4} ${cy - ry}`}
      stroke="#ffffff"
      strokeWidth={Math.max(3, rx * 0.35)}
      strokeLinecap="round"
      fill="none"
      opacity={0.85}
    />
  );

export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"} ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} `;
  }
  return `${d}Z`;
}

export const heartPath = (cx: number, cy: number, s: number) =>
  `M ${cx} ${cy + s * 0.85} C ${cx - s * 1.3} ${cy + s * 0.05}, ${cx - s * 0.75} ${cy - s * 0.95}, ${cx} ${cy - s * 0.35} C ${cx + s * 0.75} ${cy - s * 0.95}, ${cx + s * 1.3} ${cy + s * 0.05}, ${cx} ${cy + s * 0.85} Z`;

/** Cute face (eyes + cheeks + smile) used on animals and magic items. */
export const Face: React.FC<{
  cx: number;
  cy: number;
  scale?: number;
  blink: number; // 0 = open, 1 = closed
  sleepy?: boolean;
}> = ({ cx, cy, scale = 1, blink, sleepy }) => {
  const eyeDx = 22 * scale;
  const eyeR = 9 * scale;
  const open = Math.max(0.08, 1 - blink);
  return (
    <g>
      {[-1, 1].map((side) =>
        sleepy ? (
          <path
            key={side}
            d={`M ${cx + side * eyeDx - eyeR} ${cy} Q ${cx + side * eyeDx} ${cy + eyeR} ${cx + side * eyeDx + eyeR} ${cy}`}
            stroke={OUTLINE}
            strokeWidth={3.5 * scale}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <g key={side} transform={`translate(${cx + side * eyeDx} ${cy}) scale(1 ${open})`}>
            <ellipse cx={0} cy={0} rx={eyeR} ry={eyeR * 1.15} fill={OUTLINE} />
            <circle cx={-eyeR * 0.3} cy={-eyeR * 0.4} r={eyeR * 0.38} fill="#fff" />
            <circle cx={eyeR * 0.35} cy={eyeR * 0.35} r={eyeR * 0.16} fill="#fff" />
          </g>
        ),
      )}
      <ellipse cx={cx - eyeDx - 12 * scale} cy={cy + 17 * scale} rx={9 * scale} ry={5.5 * scale} fill="#ff6b9a" opacity={0.55} />
      <ellipse cx={cx + eyeDx + 12 * scale} cy={cy + 17 * scale} rx={9 * scale} ry={5.5 * scale} fill="#ff6b9a" opacity={0.55} />
      <path
        d={`M ${cx - 9 * scale} ${cy + 15 * scale} Q ${cx} ${cy + 25 * scale} ${cx + 9 * scale} ${cy + 15 * scale}`}
        stroke={OUTLINE}
        strokeWidth={3.5 * scale}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

/** 0..1 eyelid closure – blinks every ~3 s, offset by `phase`. */
export function blinkAt(frame: number, phase: number): number {
  const period = 95;
  const t = (frame + phase * 7) % period;
  if (t > 6) return 0;
  return t < 3 ? t / 3 : (6 - t) / 3;
}
