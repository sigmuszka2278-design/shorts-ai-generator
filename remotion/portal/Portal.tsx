import React from "react";
import { FONT_FAMILY } from "../fonts";
import { rng } from "./util";

export interface PortalLook {
  id: string;
  number: number;
  base: string;
  swirl: string[];
  rim: [string, string, string];
  glow: string;
}

export const PORTAL_W = 300;
export const PORTAL_H = 470;
export const RIM = 26;

export const PORTALS: (PortalLook & { x: number; y: number })[] = [
  { id: "red", number: 1, x: 205, y: 1010, base: "#c8002f", swirl: ["#ff0a3c", "#ff7a00", "#ff2a8a", "#ffd000", "#ff0a3c"], rim: ["#ffd6a0", "#e0472b", "#5e0a1c"], glow: "#ff2a55" },
  { id: "blue", number: 2, x: 540, y: 1010, base: "#0a3dff", swirl: ["#00e5ff", "#2a5bff", "#9a4bff", "#00ffc8", "#00e5ff"], rim: ["#c9f2ff", "#2f74e8", "#0b1d63"], glow: "#2aa8ff" },
  { id: "gold", number: 3, x: 875, y: 1010, base: "#ff9d00", swirl: ["#fff36b", "#ff9d00", "#ffe9a8", "#ffb800", "#fff36b"], rim: ["#fff6c8", "#f2b200", "#7a4300"], glow: "#ffcc22" },
];

interface Props {
  look: PortalLook;
  x: number;
  y: number;
  t: number;
  /** 0..1 – burst of light while opening */
  open: number;
  /** 0..1 – gold charge-up */
  charge: number;
  /** content drawn inside the swirl (e.g. a peek into the treasure room) */
  children?: React.ReactNode;
}

/** A huge glowing portal: metallic rim, swirling vortex, sucked-in sparks, number badge. */
export const Portal: React.FC<Props> = ({ look, x, y, t, open, charge, children }) => {
  const W = PORTAL_W;
  const H = PORTAL_H;
  const energy = 1 + open * 1.5 + charge * 3;
  const pulse = 0.85 + 0.15 * Math.sin(t * 5 + look.number);
  const spin = t * (70 + 260 * open + 520 * charge) + look.number * 40;
  const ringScale = 1 + open * 0.06 * Math.sin(t * 30) + charge * 0.03 * Math.sin(t * 45);
  const r = rng(look.number * 101);
  const sparks = Array.from({ length: 26 }, (_, i) => ({ a: r() * Math.PI * 2, speed: 0.4 + r() * 0.6, ph: r(), size: 4 + r() * 7, i }));
  const uid = `p-${look.id}`;

  return (
    <div style={{ position: "absolute", left: x - W / 2, top: y - H / 2, width: W, height: H, transform: `scale(${ringScale})` }}>
      {/* outer glow */}
      <div
        style={{
          position: "absolute",
          inset: -170 - charge * 220,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${look.glow} 0%, ${look.glow}88 28%, transparent 66%)`,
          opacity: (0.55 + 0.25 * open + 0.45 * charge) * pulse,
          mixBlendMode: "screen",
        }}
      />
      {/* light rays (opening / charging) */}
      {open + charge > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: W / 2 - 700,
            top: H / 2 - 700,
            width: 1400,
            height: 1400,
            borderRadius: "50%",
            background: `repeating-conic-gradient(from ${t * 40}deg, ${look.glow}cc 0deg 6deg, transparent 6deg 22deg)`,
            WebkitMaskImage: "radial-gradient(circle, black 12%, transparent 62%)",
            maskImage: "radial-gradient(circle, black 12%, transparent 62%)",
            opacity: Math.min(1, open * 0.8 + charge),
            mixBlendMode: "screen",
          }}
        />
      )}
      {/* vortex */}
      <div
        style={{
          position: "absolute",
          inset: RIM - 4,
          borderRadius: "50%",
          overflow: "hidden",
          background: look.base,
          boxShadow: `inset 0 0 60px 20px rgba(0,0,0,0.45)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "-60%",
            top: "-40%",
            width: "220%",
            height: "180%",
            background: `conic-gradient(from 0deg, ${look.swirl.join(", ")})`,
            transform: `rotate(${spin}deg)`,
            filter: "blur(10px)",
            opacity: 0.9,
          }}
        />
        <svg viewBox="-150 -150 300 300" style={{ position: "absolute", left: "-30%", top: "-15%", width: "160%", height: "130%", transform: `rotate(${-spin * 1.4}deg)` }}>
          {[0, 1, 2, 3, 4].map((k) => {
            const rot = k * 72;
            return (
              <path
                key={k}
                d="M0 0 C 30 -10, 60 10, 70 50 C 80 90, 50 130, 10 145"
                transform={`rotate(${rot})`}
                fill="none"
                stroke="#ffffff"
                strokeWidth={9}
                strokeLinecap="round"
                opacity={0.28}
              />
            );
          })}
        </svg>
        {children}
        {/* sparks spiralling inward */}
        <svg viewBox={`0 0 ${W - 2 * RIM + 8} ${H - 2 * RIM + 8}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {sparks.map((s) => {
            const p = (t * s.speed * energy * 0.6 + s.ph) % 1;
            const rr = (1 - p) * 1.0;
            const a = s.a + p * 5;
            const cx = (W - 2 * RIM + 8) / 2 + Math.cos(a) * rr * (W / 2);
            const cy = (H - 2 * RIM + 8) / 2 + Math.sin(a) * rr * (H / 2);
            return <circle key={s.i} cx={cx} cy={cy} r={s.size * (0.4 + rr)} fill="#ffffff" opacity={0.85 * (1 - p * 0.6)} />;
          })}
        </svg>
        {/* bright core */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at center, rgba(255,255,255,${0.75 + 0.25 * open}) 0%, rgba(255,255,255,0.35) ${12 + open * 25 + charge * 35}%, transparent ${45 + open * 30 + charge * 40}%)`,
            transform: `scale(${pulse + open * 0.3})`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "#ffffff", opacity: Math.max(open * 0.55, charge * charge * 0.8) }} />
      </div>
      {/* rim */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={look.rim[0]} />
            <stop offset="45%" stopColor={look.rim[1]} />
            <stop offset="100%" stopColor={look.rim[2]} />
          </linearGradient>
          <radialGradient id={`${uid}-gem`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={look.glow} />
            <stop offset="100%" stopColor={look.rim[2]} />
          </radialGradient>
          <radialGradient id={`${uid}-badge`} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor={look.rim[1]} />
            <stop offset="100%" stopColor={look.rim[2]} />
          </radialGradient>
        </defs>
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - RIM / 2} ry={H / 2 - RIM / 2} fill="none" stroke={look.rim[2]} strokeWidth={RIM + 8} />
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - RIM / 2} ry={H / 2 - RIM / 2} fill="none" stroke={`url(#${uid}-rim)`} strokeWidth={RIM} />
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - RIM / 2 - 6} ry={H / 2 - RIM / 2 - 6} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={3} strokeDasharray="40 22" strokeDashoffset={-t * 60} />
        <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - RIM + 2} ry={H / 2 - RIM + 2} fill="none" stroke={look.glow} strokeWidth={5} opacity={0.9} />
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
          const gx = W / 2 + Math.cos(a) * (W / 2 - RIM / 2);
          const gy = H / 2 + Math.sin(a) * (H / 2 - RIM / 2);
          const tw = 0.6 + 0.4 * Math.sin(t * 6 + i * 1.7);
          return (
            <g key={i}>
              <circle cx={gx} cy={gy} r={10} fill={`url(#${uid}-gem)`} stroke={look.rim[2]} strokeWidth={2} />
              <circle cx={gx - 3} cy={gy - 3} r={3} fill="#ffffff" opacity={tw} />
            </g>
          );
        })}
        {/* number badge */}
        <g transform={`translate(${W / 2} ${-6}) scale(${1 + 0.06 * Math.sin(t * 4 + look.number)})`}>
          <circle r={50} fill={look.rim[2]} />
          <circle r={45} fill={`url(#${uid}-badge)`} />
          <ellipse cx={-14} cy={-20} rx={18} ry={9} fill="#ffffff" opacity={0.7} transform="rotate(-30 -14 -20)" />
          <text
            y={20}
            textAnchor="middle"
            fontFamily={FONT_FAMILY}
            fontWeight={700}
            fontSize={62}
            fill="#ffffff"
            stroke={look.rim[2]}
            strokeWidth={8}
            paintOrder="stroke"
          >
            {look.number}
          </text>
        </g>
      </svg>
    </div>
  );
};
