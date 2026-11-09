/**
 * Soft, rounded "3D cartoon" artwork for the Chmurka short. Everything is drawn in SVG with
 * radial gradients (light from the top-left), glossy highlights and soft shadows.
 */
import React from "react";
import { interpolate } from "remotion";
import { blinkAt } from "../paint";

export const INK = "#33334d";
export const RAINBOW = ["#ff5a5f", "#ff9f1c", "#ffd93d", "#4cd17a", "#3d9cff", "#9b6bff"];

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

// ── Sky, hills, background clouds ─────────────────────────────────

export const Sky: React.FC<{ frame: number; top?: string; bottom?: string; children?: React.ReactNode; uid?: string }> = ({
  frame,
  top = "#6ec6ff",
  bottom = "#d9f3ff",
  children,
  uid = "sky",
}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
      <radialGradient id={`${uid}-skyglow`} cx="0.5" cy="0.35" r="0.6">
        <stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
        <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${uid}-sky)`} />
    <rect width={1080} height={1920} fill={`url(#${uid}-skyglow)`} />
    {[
      { x: 140, y: 260, s: 0.55, v: 0.25 },
      { x: 900, y: 180, s: 0.45, v: 0.18 },
      { x: 820, y: 520, s: 0.35, v: 0.3 },
      { x: 90, y: 980, s: 0.4, v: 0.22 },
    ].map((c, i) => (
      <PuffCloud key={i} x={((c.x + frame * c.v) % 1300) - 110} y={c.y} scale={c.s} opacity={0.75} />
    ))}
    {children}
  </svg>
);

/** Simple fluffy background cloud (no face). */
export const PuffCloud: React.FC<{ x: number; y: number; scale: number; opacity?: number; tint?: string }> = ({
  x,
  y,
  scale,
  opacity = 1,
  tint = "#ffffff",
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <ellipse cx={0} cy={70} rx={190} ry={40} fill="#5aa9e6" opacity={0.18} />
    {[
      [-110, 10, 70],
      [-30, -40, 95],
      [80, -20, 85],
      [150, 25, 60],
      [20, 30, 90],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={tint} />
    ))}
    <ellipse cx={-40} cy={-80} rx={45} ry={20} fill="#fff" opacity={0.7} />
  </g>
);

export const Hills: React.FC<{ y?: number; flowers?: boolean; frame: number }> = ({ y = 1520, flowers = false, frame }) => (
  <g>
    <defs>
      <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9be27a" />
        <stop offset="1" stopColor="#58b94f" />
      </linearGradient>
      <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fd65f" />
        <stop offset="1" stopColor="#3d9e3f" />
      </linearGradient>
    </defs>
    <path d={`M -50 ${y + 40} Q 260 ${y - 120} 560 ${y + 10} T 1150 ${y - 30} L 1150 1960 L -50 1960 Z`} fill="url(#hillBack)" />
    <path d={`M -50 ${y + 140} Q 380 ${y - 10} 760 ${y + 120} T 1150 ${y + 90} L 1150 1960 L -50 1960 Z`} fill="url(#hillFront)" />
    <path d={`M 120 ${y + 75} Q 380 ${y - 5} 640 ${y + 70}`} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={14} fill="none" strokeLinecap="round" />
    {flowers &&
      [
        [90, y + 190, "#ff7eb6"],
        [250, y + 260, "#ffd93d"],
        [430, y + 210, "#ffffff"],
        [620, y + 290, "#ff9f1c"],
        [800, y + 230, "#b38cff"],
        [980, y + 280, "#ff7eb6"],
        [170, y + 360, "#ffffff"],
        [700, y + 380, "#ffd93d"],
        [900, y + 360, "#ffffff"],
      ].map(([fx, fy, c], i) => {
        const sway = Math.sin(frame / 20 + i) * 4;
        return (
          <g key={i} transform={`translate(${fx as number} ${fy as number}) rotate(${sway})`}>
            <path d="M 0 0 L 0 34" stroke="#2f8f3a" strokeWidth={6} strokeLinecap="round" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-13} rx={9} ry={14} fill={c as string} transform={`rotate(${a})`} />
            ))}
            <circle r={9} fill="#ffcf33" />
            <circle cx={-3} cy={-3} r={3} fill="#fff" opacity={0.8} />
          </g>
        );
      })}
  </g>
);

// ── Rainbow ───────────────────────────────────────────────────────

/** Six-band rainbow. `bands` (0..6, fractional) lets the rainbow appear band by band; `grow` draws the arc. */
export const Rainbow: React.FC<{
  cx: number;
  cy: number;
  r: number;
  width?: number;
  grow?: number;
  frame: number;
  cloudScale?: number;
}> = ({ cx, cy, r, width = 52, grow = 1, frame, cloudScale = 0.75 }) => {
  const shimmer = 0.9 + Math.sin(frame / 14) * 0.06;
  return (
    <g>
      <defs>
        <filter id="rbGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <g filter="url(#rbGlow)" opacity={0.45 * grow}>
        {RAINBOW.map((c, i) => {
          const rr = r - i * width;
          return <path key={c} d={`M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`} stroke={c} strokeWidth={width} fill="none" />;
        })}
      </g>
      {RAINBOW.map((c, i) => {
        const rr = r - i * width;
        const len = Math.PI * rr;
        return (
          <g key={c}>
            <path
              d={`M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`}
              stroke={c}
              strokeWidth={width + 1}
              fill="none"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - grow)}
              opacity={shimmer + 0.08}
            />
            {/* glossy highlight on each band = soft 3D tube look */}
            <path
              d={`M ${cx - rr + width * 0.22} ${cy} A ${rr - width * 0.22} ${rr - width * 0.22} 0 0 1 ${cx + rr - width * 0.22} ${cy}`}
              stroke="#ffffff"
              strokeOpacity={0.28}
              strokeWidth={width * 0.18}
              fill="none"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - grow)}
            />
          </g>
        );
      })}
      {[-1, 1].map((side) => (
        <PuffCloud key={side} x={cx + side * (r - width * 2.5)} y={cy - 10} scale={cloudScale} opacity={Math.min(1, grow * 2)} />
      ))}
    </g>
  );
};

// ── Chmurka (the main character) ──────────────────────────────────

export interface ChmurkaProps {
  frame: number;
  /** 0 = snowy white, 1 = rainy grey. */
  grey?: number;
  /** Pupil direction, -1..1. */
  lookX?: number;
  lookY?: number;
  /** 0..1 – sparkles in the eyes + wide eyes ("wow"). */
  amazed?: number;
  /** 0..1 mouth opening while talking. */
  talk?: number;
  /** Waving arm angle in degrees, or undefined = arm resting. */
  wave?: number;
  /** Squash on "kap!" (1 = none). */
  squash?: number;
  /** Unique prefix for SVG ids (several Chmurkas can be on screen during a cross-fade). */
  uid?: string;
}

/** Chmurka – a small, fluffy, smiling white cloud with big friendly eyes. Drawn in a 600×440 box, origin at its centre. */
export const Chmurka: React.FC<ChmurkaProps> = ({ uid = "ch", frame, grey = 0, lookX = 0, lookY = 0, amazed = 0, talk = 0, wave, squash = 1 }) => {
  const light = mix("#ffffff", "#d6dbe4", grey);
  const mid = mix("#eef4ff", "#b5bccb", grey);
  const dark = mix("#bccbe6", "#8890a3", grey);
  const blink = blinkAt(frame, 3);
  const open = Math.max(0.1, 1 - blink);
  const eyeScale = 1 + amazed * 0.08;
  const puffs: [number, number, number][] = [
    [-175, 40, 105],
    [-85, -45, 135],
    [55, -75, 145],
    [175, -5, 120],
    [225, 70, 90],
    [-220, 95, 75],
    [0, 70, 175],
  ];
  const breathe = 1 + Math.sin(frame / 22) * 0.015;
  const armAngle = wave ?? 8 + Math.sin(frame / 25) * 4;
  return (
    <g transform={`scale(${breathe * (2 - squash)} ${breathe * squash})`}>
      <defs>
        <radialGradient id={`${uid}-ch-puff`} cx="0.38" cy="0.3" r="0.75">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${uid}-ch-eye`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#4b5d8f" />
          <stop offset="1" stopColor="#1f2340" />
        </radialGradient>
        <filter id={`${uid}-ch-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {/* soft shadow under the cloud */}
      <ellipse cx={10} cy={215} rx={230} ry={30} fill="#1d4f91" opacity={0.16} filter={`url(#${uid}-ch-soft)`} />
      {/* back glow / outline */}
      <g filter={`url(#${uid}-ch-soft)`} opacity={0.5}>
        {puffs.map(([x, y, r], i) => (
          <circle key={i} cx={x + 6} cy={y + 14} r={r + 6} fill={dark} />
        ))}
      </g>
      {/* little arms */}
      <g transform={`rotate(${-armAngle * 0.4 - 10} -250 90)`}>
        <ellipse cx={-280} cy={110} rx={48} ry={36} fill={`url(#${uid}-ch-puff)`} />
      </g>
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={`url(#${uid}-ch-puff)`} />
      ))}
      {/* right arm (drawn in front so the goodbye wave is visible) */}
      <g transform={`rotate(${-armAngle} 235 45)`}>
        <ellipse cx={325} cy={45} rx={54} ry={40} fill={`url(#${uid}-ch-puff)`} />
        <ellipse cx={312} cy={30} rx={18} ry={9} fill="#fff" opacity={0.7} />
      </g>
      {/* top highlights */}
      <ellipse cx={-110} cy={-120} rx={60} ry={26} fill="#fff" opacity={0.75} transform="rotate(-20 -110 -120)" />
      <ellipse cx={40} cy={-170} rx={44} ry={18} fill="#fff" opacity={0.6} transform="rotate(-8 40 -170)" />

      {/* face */}
      {[-1, 1].map((side) => {
        const ex = side * 78;
        const ey = 25;
        return (
          <g key={side} transform={`translate(${ex} ${ey}) scale(${eyeScale} ${eyeScale * open})`}>
            <ellipse rx={50} ry={60} fill="#ffffff" />
            <ellipse rx={50} ry={60} fill="none" stroke={INK} strokeOpacity={0.12} strokeWidth={4} />
            <g transform={`translate(${lookX * 14} ${lookY * 14})`}>
              <ellipse rx={35} ry={42} fill={`url(#${uid}-ch-eye)`} />
              <circle cx={-12} cy={-16} r={13} fill="#fff" />
              <circle cx={12} cy={14} r={6} fill="#fff" />
              {amazed > 0.01 && (
                <path
                  d="M 14 -26 L 18 -16 L 28 -12 L 18 -8 L 14 2 L 10 -8 L 0 -12 L 10 -16 Z"
                  fill="#fff7b0"
                  opacity={amazed * (0.7 + 0.3 * Math.sin(frame / 4 + side))}
                  transform={`scale(${0.8 + 0.25 * Math.sin(frame / 5 + side)})`}
                />
              )}
            </g>
          </g>
        );
      })}
      {/* eyebrows lift when amazed */}
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M ${side * 78 - 26} ${-52 - amazed * 12} Q ${side * 78} ${-66 - amazed * 14} ${side * 78 + 26} ${-52 - amazed * 12}`}
          stroke={INK}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />
      ))}
      {/* cheeks */}
      <ellipse cx={-150} cy={95} rx={34} ry={20} fill="#ff8fb3" opacity={0.6} />
      <ellipse cx={150} cy={95} rx={34} ry={20} fill="#ff8fb3" opacity={0.6} />
      {/* mouth */}
      {talk > 0.05 ? (
        <g transform="translate(0 112)">
          <path d={`M -34 -6 Q 0 ${10 + talk * 44} 34 -6 Q 0 4 -34 -6 Z`} fill="#8a2f4b" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <ellipse cx={0} cy={4 + talk * 22} rx={14} ry={6 + talk * 4} fill="#ff7f9f" />
        </g>
      ) : (
        <path d="M -36 104 Q 0 138 36 104" stroke={INK} strokeWidth={8} strokeLinecap="round" fill="none" />
      )}
    </g>
  );
};

// ── Raindrop ──────────────────────────────────────────────────────

const DROP = "M 0 -62 C 16 -36 46 -6 46 24 C 46 50 25 68 0 68 C -25 68 -46 50 -46 24 C -46 -6 -16 -36 0 -62 Z";

export const RaindropDefs: React.FC = () => (
  <defs>
    <radialGradient id="drop-g" cx="0.38" cy="0.45" r="0.75">
      <stop offset="0" stopColor="#e6f7ff" />
      <stop offset="0.45" stopColor="#7cc8ff" />
      <stop offset="1" stopColor="#2f7fe0" />
    </radialGradient>
  </defs>
);

/** Small smiling raindrop. Needs <RaindropDefs/> once in the same SVG. */
export const Raindrop: React.FC<{ x: number; y: number; s: number; face?: boolean; rot?: number; glint?: number }> = ({
  x,
  y,
  s,
  face = true,
  rot = 0,
  glint = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d={DROP} fill="url(#drop-g)" stroke="#2a6fc4" strokeOpacity={0.25} strokeWidth={3} />
    <ellipse cx={-17} cy={-2} rx={9} ry={18} fill="#fff" opacity={0.8} transform="rotate(20 -17 -2)" />
    {face && (
      <g>
        <circle cx={-13} cy={26} r={6} fill={INK} />
        <circle cx={13} cy={26} r={6} fill={INK} />
        <circle cx={-15} cy={24} r={2.2} fill="#fff" />
        <circle cx={11} cy={24} r={2.2} fill="#fff" />
        <path d="M -9 40 Q 0 49 9 40" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        <ellipse cx={-26} cy={38} rx={6} ry={4} fill="#ff8fb3" opacity={0.6} />
        <ellipse cx={26} cy={38} rx={6} ry={4} fill="#ff8fb3" opacity={0.6} />
      </g>
    )}
    {glint > 0.01 && (
      <path
        d="M 22 -30 L 27 -18 L 40 -13 L 27 -8 L 22 4 L 17 -8 L 4 -13 L 17 -18 Z"
        fill="#ffffff"
        opacity={glint}
        transform={`scale(${0.6 + glint * 0.6})`}
      />
    )}
  </g>
);

// ── Big close-up raindrop (scene 4) ───────────────────────────────

export const BigDrop: React.FC<{ frame: number; size: number }> = ({ frame, size }) => {
  const blink = blinkAt(frame, 5);
  const open = Math.max(0.1, 1 - blink);
  const k = size / 130;
  return (
    <g transform={`scale(${k})`}>
      <defs>
        <radialGradient id="bigdrop" cx="0.4" cy="0.5" r="0.75">
          <stop offset="0" stopColor="#f2fbff" stopOpacity={0.95} />
          <stop offset="0.5" stopColor="#8fd2ff" stopOpacity={0.92} />
          <stop offset="1" stopColor="#2a74d6" stopOpacity={0.95} />
        </radialGradient>
        <filter id="bd-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <ellipse cx={0} cy={88} rx={48} ry={8} fill="#1b3f7a" opacity={0.18} filter="url(#bd-soft)" />
      <path d={DROP} fill="url(#bigdrop)" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={2.2} />
      <ellipse cx={-20} cy={-4} rx={8} ry={20} fill="#fff" opacity={0.85} transform="rotate(22 -20 -4)" />
      <circle cx={-26} cy={-28} r={4} fill="#fff" opacity={0.9} />
      <path d="M 26 50 Q 36 34 36 18" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} fill="none" strokeLinecap="round" />
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * 14} 22) scale(1 ${open})`}>
          <ellipse rx={8} ry={9.5} fill={INK} />
          <circle cx={-2.5} cy={-3.5} r={3} fill="#fff" />
          <circle cx={2.5} cy={3} r={1.3} fill="#fff" />
        </g>
      ))}
      <path d="M -9 38 Q 0 47 9 38" stroke={INK} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      <ellipse cx={-28} cy={36} rx={6} ry={3.5} fill="#ff8fb3" opacity={0.6} />
      <ellipse cx={28} cy={36} rx={6} ry={3.5} fill="#ff8fb3" opacity={0.6} />
    </g>
  );
};

// ── Sun ───────────────────────────────────────────────────────────

export const Sun: React.FC<{ frame: number; r: number; glow?: number }> = ({ frame, r, glow = 1 }) => {
  const spin = frame * 0.4;
  const pulse = 1 + Math.sin(frame / 12) * 0.04;
  return (
    <g>
      <defs>
        <radialGradient id="sun-g" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fffbd1" />
          <stop offset="0.45" stopColor="#ffd93d" />
          <stop offset="1" stopColor="#ff9f1c" />
        </radialGradient>
        <radialGradient id="sun-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3a8" stopOpacity={0.85} />
          <stop offset="1" stopColor="#fff3a8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={r * 2.3 * pulse} fill="url(#sun-halo)" opacity={glow} />
      <g transform={`rotate(${spin})`}>
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M ${-r * 0.16} ${-r * 1.08} Q 0 ${-r * 1.62} ${r * 0.16} ${-r * 1.08} Z`}
            fill="#ffc531"
            stroke="#ffb020"
            strokeWidth={r * 0.06}
            strokeLinejoin="round"
            transform={`rotate(${i * 30}) scale(${i % 2 ? 0.85 : 1})`}
          />
        ))}
      </g>
      <circle r={r} fill="url(#sun-g)" />
      <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.3} ry={r * 0.16} fill="#fff" opacity={0.6} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
      {/* happy closed eyes */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M ${s * r * 0.34 - r * 0.15} ${-r * 0.02} Q ${s * r * 0.34} ${-r * 0.2} ${s * r * 0.34 + r * 0.15} ${-r * 0.02}`}
          stroke={INK}
          strokeWidth={r * 0.08}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <ellipse cx={-r * 0.55} cy={r * 0.22} rx={r * 0.14} ry={r * 0.08} fill="#ff7f6f" opacity={0.55} />
      <ellipse cx={r * 0.55} cy={r * 0.22} rx={r * 0.14} ry={r * 0.08} fill="#ff7f6f" opacity={0.55} />
      <path d={`M ${-r * 0.24} ${r * 0.24} Q 0 ${r * 0.52} ${r * 0.24} ${r * 0.24}`} stroke={INK} strokeWidth={r * 0.08} strokeLinecap="round" fill="none" />
    </g>
  );
};

// ── Child (scene 5) ───────────────────────────────────────────────

/** Cartoon child standing, turned slightly to the right (towards the rainbow), smiling. Feet at origin. */
export const Child: React.FC<{ frame: number; scale: number }> = ({ frame, scale }) => {
  const blink = blinkAt(frame, 1);
  const open = Math.max(0.1, 1 - blink);
  const bob = Math.sin(frame / 16) * 3;
  const armUp = 12 + Math.sin(frame / 10) * 6;
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="skin" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffe9d6" />
          <stop offset="1" stopColor="#f2b48f" />
        </radialGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="1" stopColor="#ff7a3d" />
        </linearGradient>
        <linearGradient id="pants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f8cff" />
          <stop offset="1" stopColor="#3b5fd6" />
        </linearGradient>
        <radialGradient id="hair" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a8683f" />
          <stop offset="1" stopColor="#5e3620" />
        </radialGradient>
      </defs>
      {/* legs + shoes */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={s * 26 - 18} y={-120} width={36} height={100} rx={16} fill="url(#pants)" />
          <ellipse cx={s * 26 + 10} cy={-14} rx={32} ry={18} fill="#e84a6f" />
          <ellipse cx={s * 26 + 2} cy={-22} rx={12} ry={5} fill="#fff" opacity={0.5} />
        </g>
      ))}
      <g transform={`translate(0 ${bob * 0.3})`}>
        {/* back arm */}
        <g transform={`rotate(${-20} -60 -250)`}>
          <rect x={-82} y={-262} width={34} height={110} rx={17} fill="#ff8f3d" />
          <circle cx={-65} cy={-150} r={20} fill="url(#skin)" />
        </g>
        {/* body */}
        <path d="M -78 -110 Q -88 -280 0 -290 Q 88 -280 78 -110 Q 0 -96 -78 -110 Z" fill="url(#shirt)" />
        <ellipse cx={-30} cy={-240} rx={22} ry={40} fill="#fff" opacity={0.25} />
        <circle cx={10} cy={-200} r={16} fill="#ffe066" />
        {/* front arm pointing to the rainbow */}
        <g transform={`rotate(${-armUp - 60} 60 -250)`}>
          <rect x={46} y={-262} width={34} height={115} rx={17} fill="#ff8f3d" />
          <circle cx={63} cy={-145} r={20} fill="url(#skin)" />
        </g>
        {/* head */}
        <g transform={`translate(0 ${-385 + bob})`}>
          <circle r={105} fill="url(#skin)" />
          <circle cx={-98} cy={8} r={20} fill="#f2b48f" />
          {/* hair */}
          <path d="M -108 -10 Q -120 -120 -10 -122 Q 100 -128 112 -20 Q 70 -70 10 -62 Q -40 -80 -108 -10 Z" fill="url(#hair)" />
          <path d="M -30 -118 Q -10 -150 20 -122" stroke="#5e3620" strokeWidth={10} fill="none" strokeLinecap="round" />
          <ellipse cx={-50} cy={-95} rx={26} ry={10} fill="#fff" opacity={0.25} transform="rotate(-20 -50 -95)" />
          {/* eyes looking right */}
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${i ? 62 : 8} 8) scale(1 ${open})`}>
              <ellipse rx={15} ry={19} fill="#fff" />
              <ellipse cx={5} cy={-1} rx={10} ry={13} fill={INK} />
              <circle cx={1} cy={-6} r={4} fill="#fff" />
            </g>
          ))}
          <ellipse cx={-10} cy={50} rx={18} ry={10} fill="#ff8fb3" opacity={0.6} />
          <ellipse cx={86} cy={44} rx={14} ry={9} fill="#ff8fb3" opacity={0.6} />
          <path d="M 14 52 Q 42 82 72 52" stroke={INK} strokeWidth={7} strokeLinecap="round" fill="#b8405e" />
        </g>
      </g>
    </g>
  );
};

/** Gentle sparkle star. */
export const Sparkle: React.FC<{ x: number; y: number; s: number; o: number; color?: string }> = ({ x, y, s, o, color = "#fff7c2" }) => (
  <path
    d="M 0 -20 Q 3 -3 20 0 Q 3 3 0 20 Q -3 3 -20 0 Q -3 -3 0 -20 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={color}
    opacity={o}
  />
);

export const ease = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t),
  });
