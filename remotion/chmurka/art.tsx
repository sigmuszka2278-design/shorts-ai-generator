import React from "react";
import { starPath } from "../paint";

export const W = 1080;
export const H = 1920;

/** Deterministic pseudo random 0..1. */
export function rand(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Vertical sky gradient. */
export const Sky: React.FC<{ id: string; stops: Array<[number, string]> }> = ({ id, stops }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([o, c]) => (
          <stop key={o} offset={`${o * 100}%`} stopColor={c} />
        ))}
      </linearGradient>
    </defs>
    <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${id})`} />
  </>
);

export const BLUE_SKY: Array<[number, string]> = [
  [0, "#2f8cf0"],
  [0.45, "#5fb2ff"],
  [0.8, "#9bd3ff"],
  [1, "#cdeaff"],
];

/** A small background cloud (no face), drifting slowly. */
export const BgCloud: React.FC<{ x: number; y: number; s: number; opacity?: number; tint?: string }> = ({
  x,
  y,
  s,
  opacity = 0.85,
  tint = "#ffffff",
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <ellipse cx={0} cy={30} rx={150} ry={50} fill={tint} />
    <circle cx={-70} cy={10} r={55} fill={tint} />
    <circle cx={10} cy={-20} r={75} fill={tint} />
    <circle cx={85} cy={10} r={55} fill={tint} />
    <ellipse cx={-10} cy={-55} rx={30} ry={12} fill="#ffffff" opacity={0.7} />
  </g>
);

/** Layer of drifting clouds (parallax). */
export const CloudLayer: React.FC<{ frame: number; tint?: string; opacity?: number }> = ({ frame, tint, opacity = 0.8 }) => {
  const clouds = [
    { x: 160, y: 260, s: 0.9, v: 0.25 },
    { x: 880, y: 420, s: 0.7, v: 0.18 },
    { x: 300, y: 1450, s: 1.1, v: 0.3 },
    { x: 940, y: 1250, s: 0.8, v: 0.22 },
    { x: 620, y: 140, s: 0.55, v: 0.15 },
  ];
  return (
    <g>
      {clouds.map((c, i) => {
        const span = W + 500;
        const xx = ((((c.x + frame * c.v + 250) % span) + span) % span) - 250;
        return <BgCloud key={i} x={xx} y={c.y + Math.sin(frame / 40 + i) * 6} s={c.s} tint={tint} opacity={opacity} />;
      })}
    </g>
  );
};

/** Smiling cartoon sun. */
export const Sun: React.FC<{ x: number; y: number; r: number; frame: number; id: string; sleepy?: boolean; mouth?: number }> = ({
  x,
  y,
  r,
  frame,
  id,
  sleepy,
  mouth = 0,
}) => {
  const rays = 12;
  const rot = frame * 0.4;
  const pulse = 1 + Math.sin(frame / 10) * 0.04;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="#fff6b0" stopOpacity={0.9} />
          <stop offset="55%" stopColor="#ffe066" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#ffe066" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="40%" stopColor="#ffe14d" />
          <stop offset="85%" stopColor="#ffb52e" />
          <stop offset="100%" stopColor="#ff9f1c" />
        </radialGradient>
      </defs>
      <circle r={r * 2.3 * pulse} fill={`url(#${id}-glow)`} />
      <g transform={`rotate(${rot})`}>
        {Array.from({ length: rays }, (_, i) => {
          const a = (360 / rays) * i;
          const len = i % 2 ? 0.45 : 0.62;
          return (
            <path
              key={i}
              transform={`rotate(${a})`}
              d={`M ${-r * 0.16} ${-r * 1.08} Q 0 ${-r * (1.1 + len * 1.15)} ${r * 0.16} ${-r * 1.08} Z`}
              fill="#ffc93c"
              stroke="#ffb020"
              strokeWidth={6}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
      <circle r={r} fill={`url(#${id}-body)`} />
      <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.28} ry={r * 0.14} fill="#fff" opacity={0.8} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
      {/* face */}
      {[-1, 1].map((s) =>
        sleepy ? (
          <path
            key={s}
            d={`M ${s * r * 0.32 - r * 0.13} ${-r * 0.05} Q ${s * r * 0.32} ${r * 0.08} ${s * r * 0.32 + r * 0.13} ${-r * 0.05}`}
            stroke="#8a4a12"
            strokeWidth={r * 0.06}
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <g key={s}>
            <ellipse cx={s * r * 0.32} cy={-r * 0.08} rx={r * 0.1} ry={r * 0.13} fill="#5a3410" />
            <circle cx={s * r * 0.32 - r * 0.03} cy={-r * 0.13} r={r * 0.04} fill="#fff" />
          </g>
        ),
      )}
      <ellipse cx={-r * 0.55} cy={r * 0.2} rx={r * 0.13} ry={r * 0.08} fill="#ff7a59" opacity={0.6} />
      <ellipse cx={r * 0.55} cy={r * 0.2} rx={r * 0.13} ry={r * 0.08} fill="#ff7a59" opacity={0.6} />
      {mouth > 0.05 ? (
        <path
          d={`M ${-r * 0.22} ${r * 0.22} Q 0 ${r * (0.3 + mouth * 0.35)} ${r * 0.22} ${r * 0.22} Z`}
          fill="#a33a20"
          stroke="#8a4a12"
          strokeWidth={r * 0.04}
        />
      ) : (
        <path
          d={`M ${-r * 0.24} ${r * 0.2} Q 0 ${r * 0.48} ${r * 0.24} ${r * 0.2}`}
          stroke="#8a4a12"
          strokeWidth={r * 0.06}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </g>
  );
};

/** Twinkling 4-point sparkle. */
export const Sparkle: React.FC<{ x: number; y: number; size: number; color: string; frame: number; phase?: number; glow?: boolean }> = ({
  x,
  y,
  size,
  color,
  frame,
  phase = 0,
  glow = true,
}) => {
  const tw = 0.6 + 0.4 * Math.sin(frame / 6 + phase * 6.28);
  const s = size * tw;
  return (
    <g transform={`translate(${x} ${y}) rotate(${(frame + phase * 90) * 0.8})`}>
      {glow && <circle r={s * 1.1} fill={color} opacity={0.25} />}
      <path
        d={`M 0 ${-s} Q ${s * 0.15} ${-s * 0.15} ${s} 0 Q ${s * 0.15} ${s * 0.15} 0 ${s} Q ${-s * 0.15} ${s * 0.15} ${-s} 0 Q ${-s * 0.15} ${-s * 0.15} 0 ${-s} Z`}
        fill={color}
      />
      <circle r={s * 0.18} fill="#fff" />
    </g>
  );
};

export const Star: React.FC<{ x: number; y: number; r: number; color: string; opacity?: number }> = ({ x, y, r, color, opacity = 1 }) => (
  <path d={starPath(x, y, r, r * 0.5)} fill={color} opacity={opacity} stroke="#ffffff" strokeWidth={r * 0.15} strokeLinejoin="round" />
);

/** Simple cartoon flower. */
export const Flower: React.FC<{ x: number; y: number; s: number; color: string; frame: number; phase: number }> = ({ x, y, s, color, frame, phase }) => {
  const sway = Math.sin(frame / 20 + phase) * 6;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M 0 0 Q ${sway / 2} -30 ${sway} -60`} stroke="#3c9a3c" strokeWidth={7} fill="none" strokeLinecap="round" />
      <g transform={`translate(${sway} -60)`}>
        {Array.from({ length: 5 }, (_, i) => (
          <circle key={i} cx={Math.cos((i / 5) * 6.28) * 16} cy={Math.sin((i / 5) * 6.28) * 16} r={13} fill={color} />
        ))}
        <circle r={11} fill="#ffd93d" />
        <circle cx={-3} cy={-3} r={4} fill="#fff" opacity={0.8} />
      </g>
    </g>
  );
};

/** Green rolling meadow with flowers. */
export const Meadow: React.FC<{ frame: number; id: string; top?: number }> = ({ frame, id, top = 1420 }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-h1`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8fe07a" />
        <stop offset="100%" stopColor="#4fb84a" />
      </linearGradient>
      <linearGradient id={`${id}-h2`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a8ec8a" />
        <stop offset="100%" stopColor="#5cc456" />
      </linearGradient>
    </defs>
    <path d={`M -100 ${top + 60} Q 250 ${top - 80} 620 ${top + 30} T 1200 ${top - 10} L 1200 2100 L -100 2100 Z`} fill={`url(#${id}-h1)`} />
    <path d={`M -100 ${top + 170} Q 400 ${top + 40} 760 ${top + 150} T 1200 ${top + 120} L 1200 2100 L -100 2100 Z`} fill={`url(#${id}-h2)`} />
    <ellipse cx={240} cy={top + 90} rx={120} ry={18} fill="#fff" opacity={0.18} />
    {[
      [90, top + 330, "#ff7eb6"],
      [200, top + 420, "#ffffff"],
      [760, top + 300, "#b38cff"],
      [900, top + 380, "#ff7eb6"],
      [980, top + 260, "#ffffff"],
      [640, top + 440, "#ffb347"],
      [60, top + 210, "#b38cff"],
    ].map(([x, y, c], i) => (
      <Flower key={i} x={x as number} y={y as number} s={1.1} color={c as string} frame={frame} phase={i} />
    ))}
  </g>
);

/** Happy cartoon child; `point` 0..1 raises the right arm to point at the sky. */
export const Child: React.FC<{ x: number; y: number; s: number; frame: number; point: number; lookUp: number; blink: number }> = ({
  x,
  y,
  s,
  frame,
  point,
  lookUp,
  blink,
}) => {
  const bounce = Math.abs(Math.sin(frame / 9)) * 6 * point;
  const skin = "#ffd2b0";
  const skinDark = "#f2b28c";
  // arm angle: down (rest) → up-right (pointing)
  const armA = -20 + (-150 + 20) * point; // degrees from "down"
  const wiggle = Math.sin(frame / 5) * 4 * point;
  const open = Math.max(0.1, 1 - blink);
  return (
    <g transform={`translate(${x} ${y - bounce}) scale(${s})`}>
      {/* shadow */}
      <ellipse cx={0} cy={6} rx={110} ry={20} fill="#2f7d2f" opacity={0.3} />
      {/* legs */}
      <rect x={-45} y={-150} width={34} height={150} rx={17} fill={skin} />
      <rect x={12} y={-150} width={34} height={150} rx={17} fill={skin} />
      <ellipse cx={-30} cy={-6} rx={36} ry={20} fill="#ff5d73" />
      <ellipse cx={32} cy={-6} rx={36} ry={20} fill="#ff5d73" />
      {/* shorts */}
      <path d="M -62 -190 L 62 -190 L 66 -120 L 6 -120 L 0 -140 L -6 -120 L -66 -120 Z" fill="#4d7cff" />
      {/* left arm (rest, waving slightly) */}
      <g transform={`translate(-70 -300) rotate(${18 + Math.sin(frame / 12) * 4})`}>
        <rect x={-17} y={0} width={34} height={130} rx={17} fill={skin} />
        <circle cx={0} cy={132} r={22} fill={skin} />
      </g>
      {/* body / t-shirt */}
      <path d="M -78 -320 Q -88 -200 -66 -180 L 66 -180 Q 88 -200 78 -320 Q 0 -350 -78 -320 Z" fill="#ffcf3f" />
      <path d="M -78 -320 Q -88 -200 -66 -180 L 66 -180 Q 88 -200 78 -320" fill="none" stroke="#f0b21f" strokeWidth={6} />
      <Star x={0} y={-250} r={30} color="#ff7a59" />
      {/* right arm – pointing */}
      <g transform={`translate(70 -300) rotate(${armA + wiggle})`}>
        <rect x={-17} y={0} width={34} height={140} rx={17} fill={skin} />
        <circle cx={0} cy={142} r={23} fill={skin} />
        <rect x={-7} y={150} width={14} height={36} rx={7} fill={skin} opacity={point > 0.5 ? 1 : 0} />
        <path d="M -17 0 L 17 0 L 17 40 L -17 40 Z" fill="#ffcf3f" />
      </g>
      {/* head */}
      <g transform={`translate(0 -400) rotate(${lookUp * -8})`}>
        <circle cx={-92} cy={10} r={22} fill={skinDark} />
        <circle cx={92} cy={10} r={22} fill={skinDark} />
        <circle cx={0} cy={0} r={95} fill={skin} />
        {/* hair */}
        <path d="M -95 -5 Q -100 -110 0 -105 Q 100 -110 95 -5 Q 70 -60 20 -55 Q -10 -80 -40 -50 Q -70 -55 -95 -5 Z" fill="#8a4b2a" />
        <circle cx={-20} cy={-105} r={22} fill="#8a4b2a" />
        <circle cx={15} cy={-112} r={18} fill="#8a4b2a" />
        {/* eyes */}
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * 36} ${10 - lookUp * 6}) scale(1 ${open})`}>
            <ellipse rx={15} ry={19} fill="#2b2d42" />
            <circle cx={-4} cy={-7 - lookUp * 2} r={6} fill="#fff" />
          </g>
        ))}
        <ellipse cx={-60} cy={40} rx={16} ry={9} fill="#ff8fa3" opacity={0.6} />
        <ellipse cx={60} cy={40} rx={16} ry={9} fill="#ff8fa3" opacity={0.6} />
        <path d="M -28 45 Q 0 80 28 45 Q 0 55 -28 45 Z" fill="#c2405a" stroke="#8c2a3e" strokeWidth={4} strokeLinejoin="round" />
        <ellipse cx={-30} cy={-40} rx={22} ry={9} fill="#fff" opacity={0.35} />
      </g>
    </g>
  );
};

/** Big cartoon planet Earth seen from above (only the top arc is visible). */
export const Earth: React.FC<{ id: string; cy?: number; r?: number; frame: number }> = ({ id, cy = 2950, r = 1300, frame }) => (
  <g>
    <defs>
      <radialGradient id={`${id}-sea`} cx="40%" cy="10%" r="60%">
        <stop offset="0%" stopColor="#7fd6ff" />
        <stop offset="60%" stopColor="#2f9be8" />
        <stop offset="100%" stopColor="#1c6fc4" />
      </radialGradient>
      <radialGradient id={`${id}-atmo`}>
        <stop offset="88%" stopColor="#a6dcff" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#a6dcff" stopOpacity={0} />
      </radialGradient>
      <clipPath id={`${id}-clip`}>
        <circle cx={540} cy={cy} r={r} />
      </clipPath>
    </defs>
    <circle cx={540} cy={cy} r={r + 70} fill={`url(#${id}-atmo)`} />
    <circle cx={540} cy={cy} r={r} fill={`url(#${id}-sea)`} />
    <g clipPath={`url(#${id}-clip)`} transform={`translate(${Math.sin(frame / 60) * 8} 0)`}>
      <path d={`M 80 ${cy - r + 140} q 120 -90 260 -40 q 90 50 40 130 q -60 60 -180 40 q -140 -30 -120 -130 Z`} fill="#5cc85a" />
      <path d={`M 600 ${cy - r + 60} q 160 -40 260 40 q 80 90 -20 150 q -120 40 -200 -20 q -90 -80 -40 -170 Z`} fill="#6fd46a" />
      <path d={`M 420 ${cy - r + 290} q 80 -30 130 20 q 20 60 -60 70 q -90 0 -70 -90 Z`} fill="#5cc85a" />
      <ellipse cx={330} cy={cy - r + 50} rx={140} ry={26} fill="#ffffff" opacity={0.45} />
    </g>
  </g>
);
