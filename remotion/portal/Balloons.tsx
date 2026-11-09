import React from "react";
import { FONT_FAMILY } from "../fonts";
import { rng, starPath } from "./util";

const COLORS = ["#ff3b6b", "#ffd60a", "#2ee6a6", "#3b8bff", "#b65bff", "#ff8a1f", "#ff5bd6", "#3df2ff"];

interface Balloon {
  spawn: number;
  vx: number;
  vy: number;
  z: number;
  color: number;
  size: number;
  ph: number;
}

/** Balloons popped on purpose (in sync with the pop sound effects). */
export const POPPED: { at: number; x: number; y: number; color: number; size: number }[] = [
  { at: 14.5, x: 330, y: 700, color: 0, size: 120 },
  { at: 14.85, x: 760, y: 560, color: 2, size: 115 },
  { at: 15.3, x: 470, y: 420, color: 4, size: 130 },
  { at: 15.55, x: 800, y: 900, color: 1, size: 110 },
  { at: 15.95, x: 260, y: 1000, color: 6, size: 120 },
  { at: 16.3, x: 620, y: 300, color: 3, size: 125 },
];

const BalloonShape: React.FC<{ x: number; y: number; size: number; color: number; rot: number; t: number }> = ({ x, y, size, color, rot }) => {
  const rx = size * 0.42;
  const ry = size * 0.52;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
      <path d={`M 0 ${ry} q -10 ${size * 0.25} 6 ${size * 0.5} q 14 ${size * 0.25} -4 ${size * 0.55}`} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={2.5} fill="none" />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={`url(#bal${color})`} />
      <path d={`M -7 ${ry - 2} L 7 ${ry - 2} L 0 ${ry + 9} Z`} fill={`url(#bal${color})`} />
      <ellipse cx={-rx * 0.38} cy={-ry * 0.42} rx={rx * 0.22} ry={ry * 0.32} fill="#ffffff" opacity={0.7} transform={`rotate(-25 ${-rx * 0.38} ${-ry * 0.42})`} />
    </g>
  );
};

/** Hundreds of balloons bursting out of the blue portal (world space). */
export const Balloons: React.FC<{ t: number; ox: number; oy: number; start: number }> = ({ t, ox, oy, start }) => {
  const r = rng(77);
  const list: Balloon[] = Array.from({ length: 230 }, () => ({
    spawn: start + Math.pow(r(), 1.6) * 1.8,
    vx: (r() - 0.5) * 1500,
    vy: -(300 + r() * 1100),
    z: r(),
    color: Math.floor(r() * COLORS.length),
    size: 60 + r() * 60,
    ph: r() * 6.28,
  }));
  list.sort((a, b) => a.z - b.z);
  const k = 2.2;
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible" }}>
      <defs>
        {COLORS.map((c, i) => (
          <radialGradient key={i} id={`bal${i}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="22%" stopColor={c} />
            <stop offset="85%" stopColor={c} />
            <stop offset="100%" stopColor="#1b1340" stopOpacity={0.6} />
          </radialGradient>
        ))}
      </defs>
      {list.map((b, i) => {
        const tau = t - b.spawn;
        if (tau < 0) return null;
        const depth = 0.55 + b.z * 1.4;
        const fly = (1 - Math.exp(-k * tau)) / k;
        const x = ox + b.vx * fly * depth + Math.sin(tau * 2 + b.ph) * 25;
        const y = oy + b.vy * fly * depth - 140 * tau;
        if (y < -900 || x < -900 || x > 2000) return null;
        const grow = Math.min(1, tau / 0.25);
        return <BalloonShape key={i} x={x} y={y} size={b.size * depth * grow} color={b.color} rot={Math.sin(tau * 2.4 + b.ph) * 12} t={t} />;
      })}
      {POPPED.map((p, i) => {
        const appear = start + 0.3 + i * 0.12;
        if (t < appear) return null;
        const tau = t - appear;
        const grow = Math.min(1, tau / 0.35);
        const fx = ox + (p.x - ox) * Math.min(1, tau / 0.6);
        const fy = oy + (p.y - oy) * Math.min(1, tau / 0.6) - Math.max(0, tau - 0.6) * 25;
        if (t < p.at) {
          const squish = t > p.at - 0.12 ? 1 + (t - (p.at - 0.12)) * 1.5 : 1;
          return <BalloonShape key={`p${i}`} x={fx} y={fy} size={p.size * 1.25 * grow * squish} color={p.color} rot={Math.sin(tau * 2) * 10} t={t} />;
        }
        const e = t - p.at;
        if (e > 0.45) return null;
        const c = COLORS[p.color];
        return (
          <g key={`p${i}`} opacity={1 - e / 0.45}>
            <path d={starPath(fx, fy, 90 + e * 200, 40 + e * 90, 8)} fill="#ffffff" />
            <path d={starPath(fx, fy, 70 + e * 160, 30 + e * 70, 8)} fill={c} />
            {Array.from({ length: 8 }, (_, j) => {
              const a = (j / 8) * Math.PI * 2;
              const d = 40 + e * 500;
              return <rect key={j} x={fx + Math.cos(a) * d - 8} y={fy + Math.sin(a) * d - 5} width={16} height={10} fill={c} transform={`rotate(${j * 45 + e * 600} ${fx + Math.cos(a) * d} ${fy + Math.sin(a) * d})`} />;
            })}
            <text x={fx} y={fy + 18} textAnchor="middle" fontFamily={FONT_FAMILY} fontWeight={700} fontSize={58 + e * 40} fill="#ffffff" stroke="#2b1066" strokeWidth={8} paintOrder="stroke">
              PUF!
            </text>
          </g>
        );
      })}
    </svg>
  );
};
