import React from "react";
import { rng, starPath } from "./util";

/** Far background: night sky, aurora, moon, mountains, stars. Drawn larger than the frame for parallax. */
export const Sky: React.FC<{ t: number }> = ({ t }) => {
  const r = rng(7);
  const stars = Array.from({ length: 140 }, () => ({ x: r() * 1600 - 260, y: r() * 1500 - 200, s: 1.5 + r() * 3.5, ph: r() * 6 }));
  return (
    <svg viewBox="-260 -300 1600 2520" style={{ position: "absolute", left: -260, top: -300, width: 1600, height: 2520 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0630" />
          <stop offset="35%" stopColor="#2a0f6b" />
          <stop offset="58%" stopColor="#7a1fa8" />
          <stop offset="70%" stopColor="#ff4fa3" />
          <stop offset="78%" stopColor="#ffb36b" />
          <stop offset="100%" stopColor="#ffb36b" />
        </linearGradient>
        <radialGradient id="moon" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ffe8fb" />
          <stop offset="100%" stopColor="#ffb3e6" />
        </radialGradient>
        <radialGradient id="moonGlow">
          <stop offset="0%" stopColor="#ff9be6" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ff9be6" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="aur" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00ffd5" stopOpacity={0} />
          <stop offset="30%" stopColor="#00ffd5" stopOpacity={0.55} />
          <stop offset="65%" stopColor="#7d5bff" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#7d5bff" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a3fd1" />
          <stop offset="100%" stopColor="#3b1675" />
        </linearGradient>
        <linearGradient id="mtnNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d1d93" />
          <stop offset="100%" stopColor="#1c0b45" />
        </linearGradient>
      </defs>
      <rect x={-260} y={-300} width={1600} height={2520} fill="url(#sky)" />
      {stars.map((s, i) => (
        <path key={i} d={starPath(s.x, s.y, s.s * 2.2, s.s * 0.6)} fill="#ffffff" opacity={0.35 + 0.65 * Math.abs(Math.sin(t * 2 + s.ph))} />
      ))}
      {/* aurora ribbons */}
      {[0, 1, 2].map((k) => {
        const y0 = 120 + k * 150;
        const w = (x: number) => y0 + Math.sin(x / 180 + t * (0.8 + k * 0.3) + k) * 60;
        let d = `M -260 ${w(-260)}`;
        for (let x = -200; x <= 1340; x += 60) d += ` L ${x} ${w(x)}`;
        return <path key={k} d={d} stroke="url(#aur)" strokeWidth={70 - k * 15} fill="none" opacity={0.45} strokeLinecap="round" style={{ filter: "blur(14px)" }} />;
      })}
      <circle cx={860} cy={330} r={330} fill="url(#moonGlow)" />
      <circle cx={860} cy={330} r={150} fill="url(#moon)" />
      <circle cx={815} cy={300} r={26} fill="#f5c6ec" opacity={0.6} />
      <circle cx={905} cy={385} r={18} fill="#f5c6ec" opacity={0.5} />
      <circle cx={880} cy={270} r={12} fill="#f5c6ec" opacity={0.5} />
      {/* moon ring */}
      <ellipse cx={860} cy={330} rx={260} ry={46} fill="none" stroke="#ffd6f5" strokeWidth={8} opacity={0.5} transform="rotate(-18 860 330)" />
      {/* far mountains */}
      <path d="M -260 1180 L -120 900 L 30 1060 L 200 820 L 380 1040 L 560 860 L 760 1060 L 930 840 L 1120 1040 L 1340 880 L 1340 1500 L -260 1500 Z" fill="url(#mtnFar)" />
      <path d="M -260 1260 L -60 1040 L 120 1180 L 300 1000 L 520 1200 L 700 1060 L 900 1220 L 1100 1030 L 1340 1200 L 1340 1600 L -260 1600 Z" fill="url(#mtnNear)" />
      {/* floating islands */}
      {[
        { x: 120, y: 620, s: 1 },
        { x: 1010, y: 760, s: 0.75 },
      ].map((isl, i) => (
        <g key={i} transform={`translate(${isl.x} ${isl.y + Math.sin(t * 1.2 + i) * 14}) scale(${isl.s})`}>
          <path d="M -110 0 Q 0 -30 110 0 Q 60 40 30 120 Q 0 170 -20 110 Q -60 50 -110 0 Z" fill="#40177e" />
          <path d="M -110 0 Q 0 -30 110 0 Q 0 16 -110 0 Z" fill="#5bd47a" />
          <path d="M -40 -12 L -30 -70 L -20 -12 Z M 10 -14 L 26 -95 L 42 -12 Z" fill="#7ef0ff" opacity={0.9} />
        </g>
      ))}
    </svg>
  );
};

/** Ground in world space: rune platform, glowing floor, mist. */
export const Floor: React.FC<{ t: number }> = ({ t }) => {
  return (
    <svg viewBox="-600 1150 2280 1300" style={{ position: "absolute", left: -600, top: 1150, width: 2280, height: 1300, overflow: "visible" }}>
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a2aa8" />
          <stop offset="40%" stopColor="#2b1066" />
          <stop offset="100%" stopColor="#12062e" />
        </linearGradient>
        <radialGradient id="plat" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#b685ff" />
          <stop offset="60%" stopColor="#6c3bd6" />
          <stop offset="100%" stopColor="#3a1888" />
        </radialGradient>
      </defs>
      <path d="M -600 1215 Q 540 1150 1680 1215 L 1680 2450 L -600 2450 Z" fill="url(#ground)" />
      {/* platform */}
      <ellipse cx={540} cy={1300} rx={560} ry={120} fill="#1d0a4a" />
      <ellipse cx={540} cy={1285} rx={560} ry={115} fill="url(#plat)" />
      <ellipse cx={540} cy={1285} rx={500} ry={98} fill="none" stroke="#ffe36b" strokeWidth={5} opacity={0.75} />
      <ellipse
        cx={540}
        cy={1285}
        rx={430}
        ry={80}
        fill="none"
        stroke="#7df9ff"
        strokeWidth={7}
        strokeDasharray="26 18 6 18"
        strokeDashoffset={t * 80}
        opacity={0.8}
        style={{ filter: "drop-shadow(0 0 8px #7df9ff)" }}
      />
      {/* portal light pools */}
      {[
        [205, "#ff2a55"],
        [540, "#2aa8ff"],
        [875, "#ffcc22"],
      ].map(([x, c]) => (
        <ellipse key={String(x)} cx={Number(x)} cy={1262} rx={170} ry={34} fill={String(c)} opacity={0.55 + 0.15 * Math.sin(t * 5 + Number(x))} style={{ filter: "blur(12px)" }} />
      ))}
      {/* crystals at the sides */}
      {[
        { x: -110, s: 1.2, c: "#ff5bd6" },
        { x: 1180, s: 1.0, c: "#5bf0ff" },
        { x: 1060, s: 0.7, c: "#ffe14d" },
        { x: 10, s: 0.6, c: "#7dff9b" },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${1340 + i * 30}) scale(${c.s})`}>
          <path d="M 0 0 L -40 -150 L 0 -260 L 40 -150 Z" fill={c.c} opacity={0.95} />
          <path d="M 0 0 L 0 -260 L 40 -150 Z" fill="#ffffff" opacity={0.35} />
          <path d="M -70 0 L -90 -100 L -60 -150 L -40 -90 Z" fill={c.c} opacity={0.8} />
          <ellipse cx={0} cy={-120} rx={90} ry={150} fill={c.c} opacity={0.18 + 0.08 * Math.sin(t * 3 + i)} style={{ filter: "blur(20px)" }} />
        </g>
      ))}
    </svg>
  );
};

/** Drifting fireflies / magic dust (world space, in front). */
export const Dust: React.FC<{ t: number; count?: number; seed?: number; color?: string }> = ({ t, count = 40, seed = 3, color = "#fff7b0" }) => {
  const r = rng(seed);
  const ps = Array.from({ length: count }, () => ({ x: r() * 1400 - 160, y: r() * 1900, sp: 20 + r() * 40, ph: r() * 6.28, s: 3 + r() * 6 }));
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible", pointerEvents: "none" }}>
      {ps.map((p, i) => {
        const y = ((p.y - t * p.sp) % 1900 + 1900) % 1900;
        const x = p.x + Math.sin(t * 0.9 + p.ph) * 30;
        return (
          <g key={i} opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2.3 + p.ph))}>
            <circle cx={x} cy={y} r={p.s * 2.4} fill={color} opacity={0.25} />
            <circle cx={x} cy={y} r={p.s * 0.8} fill="#ffffff" />
          </g>
        );
      })}
    </svg>
  );
};
