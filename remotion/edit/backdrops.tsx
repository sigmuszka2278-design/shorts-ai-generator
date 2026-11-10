import React from "react";
import { random } from "remotion";
import type { TeamLook } from "./palette";

const X0 = -400;
const Y0 = -400;
const W = 1880;
const H = 2720;

/** Night stadium: sky, floodlights with beams + anamorphic streaks, crowd bokeh, pitch, haze. */
export const Stadium: React.FC<{
  look: TeamLook;
  frame: number;
  id: string;
  /** horizontal scroll of the crowd/pitch (speed lines feel) */
  scroll?: number;
  lightsOn?: number;
  crowdY?: number;
}> = ({ look, frame, id, scroll = 0, lightsOn = 1, crowdY = 1060 }) => {
  const lights = [
    { x: 120, y: 260, c: look.accent },
    { x: 960, y: 230, c: "#ffffff" },
    { x: 540, y: 120, c: look.rim },
  ];
  const bokeh = Array.from({ length: 140 }, (_, i) => {
    const r = random(`${id}-b-${i}`);
    const x = (((random(`${id}-x-${i}`) * W + scroll * (0.4 + r)) % W) + W) % W + X0;
    const y = crowdY + random(`${id}-y-${i}`) * 260 - 80;
    const flash = random(`${id}-f-${i}-${Math.floor(frame / 3)}`) > 0.985;
    const colors = [look.accent, look.glow, "#ffffff", look.rim];
    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={6 + r * 22}
        fill={flash ? "#ffffff" : colors[i % colors.length]}
        opacity={flash ? 0.95 : 0.18 + r * 0.35}
      />
    );
  });
  const flicker = 0.92 + 0.08 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.sky[0]} />
          <stop offset="0.55" stopColor={look.sky[1]} />
          <stop offset="1" stopColor={look.sky[0]} />
        </linearGradient>
        <linearGradient id={`${id}-pitch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.pitch} stopOpacity="0.6" />
          <stop offset="0.3" stopColor={look.pitch} />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={look.rim} stopOpacity="0.35" />
          <stop offset="1" stopColor={look.rim} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-bokeh`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-haze`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>
      <rect x={X0} y={Y0} width={W} height={H} fill={`url(#${id}-sky)`} />
      {/* beams */}
      <g opacity={0.55 * lightsOn * flicker}>
        {lights.map((l, i) => (
          <polygon
            key={i}
            points={`${l.x - 20},${l.y} ${l.x + 20},${l.y} ${540 + (l.x - 540) * 0.2 + 380},${crowdY + 600} ${540 + (l.x - 540) * 0.2 - 380},${crowdY + 600}`}
            fill={`url(#${id}-beam)`}
          />
        ))}
      </g>
      <g filter={`url(#${id}-bokeh)`}>{bokeh}</g>
      {/* lamps + anamorphic streaks */}
      {lights.map((l, i) => (
        <g key={i} opacity={lightsOn * flicker}>
          <circle cx={l.x} cy={l.y} r={230} fill={`url(#${id}-lamp)`} />
          <ellipse cx={l.x} cy={l.y} rx={700} ry={5} fill={l.c} opacity={0.55} />
          <ellipse cx={l.x} cy={l.y} rx={260} ry={12} fill="#ffffff" opacity={0.5} />
        </g>
      ))}
      {/* pitch */}
      <rect x={X0} y={crowdY + 190} width={W} height={H} fill={`url(#${id}-pitch)`} />
      {Array.from({ length: 12 }, (_, i) => {
        const x = ((((i * 220 - scroll * 1.6) % (12 * 220)) + 12 * 220) % (12 * 220)) + X0;
        return (
          <polygon
            key={i}
            points={`${x},${crowdY + 190} ${x + 110},${crowdY + 190} ${540 + (x + 110 - 540) * 2.4},${H + Y0} ${540 + (x - 540) * 2.4},${H + Y0}`}
            fill="#ffffff"
            opacity={0.025}
          />
        );
      })}
      <rect x={X0} y={crowdY + 188} width={W} height={4} fill="#ffffff" opacity={0.25} />
      {/* haze */}
      <g filter={`url(#${id}-haze)`} opacity={0.5}>
        <ellipse cx={300 + Math.sin(frame / 60) * 120} cy={crowdY + 140} rx={600} ry={160} fill={look.glow} opacity={0.35} />
        <ellipse cx={800 - Math.sin(frame / 75) * 140} cy={crowdY + 260} rx={520} ry={140} fill="#ffffff" opacity={0.18} />
      </g>
    </g>
  );
};

/** Diagonal motion streaks for fast "velocity" shots. */
export const SpeedLines: React.FC<{ frame: number; id: string; color: string; angle?: number; strength?: number }> = ({
  frame,
  id,
  color,
  angle = -8,
  strength = 1,
}) => (
  <g transform={`rotate(${angle} 540 960)`} opacity={strength}>
    {Array.from({ length: 34 }, (_, i) => {
      const y = random(`${id}-sl-${i}`) * 2400 - 240;
      const len = 260 + random(`${id}-sll-${i}`) * 700;
      const speed = 70 + random(`${id}-sls-${i}`) * 90;
      const x = 1600 - ((frame * speed + random(`${id}-slx-${i}`) * 3000) % 3000);
      return <rect key={i} x={x} y={y} width={len} height={2 + random(`${id}-slw-${i}`) * 5} fill={i % 3 ? "#ffffff" : color} opacity={0.18 + random(`${id}-slo-${i}`) * 0.3} />;
    })}
  </g>
);

/** Slow floating embers / dust (slow-motion intro & outro). */
export const Embers: React.FC<{ frame: number; id: string; color: string; count?: number; speed?: number }> = ({
  frame,
  id,
  color,
  count = 60,
  speed = 0.6,
}) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const r = random(`${id}-e-${i}`);
      const x = random(`${id}-ex-${i}`) * 1080 + Math.sin(frame / 40 + i) * 30;
      const y = 2000 - ((frame * speed * (0.6 + r) * 3 + random(`${id}-ey-${i}`) * 2100) % 2100);
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2 + r * 6}
          fill={i % 4 === 0 ? "#ffffff" : color}
          opacity={0.25 + 0.6 * Math.abs(Math.sin(frame / 20 + i))}
          style={{ filter: `drop-shadow(0 0 ${6 + r * 10}px ${color})` }}
        />
      );
    })}
  </g>
);

/** Volumetric light rays from a point. */
export const GodRays: React.FC<{ x: number; y: number; color: string; frame: number; count?: number; opacity?: number }> = ({
  x,
  y,
  color,
  frame,
  count = 14,
  opacity = 0.35,
}) => (
  <g opacity={opacity} style={{ mixBlendMode: "screen" }}>
    {Array.from({ length: count }, (_, i) => {
      const a = (i / count) * 360 + frame * 0.15;
      const w = 4 + (i % 3) * 3;
      return (
        <polygon
          key={i}
          points={`${x},${y} ${x + 2200 * Math.cos(((a - w) * Math.PI) / 180)},${y + 2200 * Math.sin(((a - w) * Math.PI) / 180)} ${x + 2200 * Math.cos(((a + w) * Math.PI) / 180)},${y + 2200 * Math.sin(((a + w) * Math.PI) / 180)}`}
          fill={color}
          opacity={0.25 + 0.2 * Math.sin(frame / 15 + i * 1.7)}
        />
      );
    })}
  </g>
);
