import React from "react";
import { AbsoluteFill, Easing, interpolate, random } from "remotion";

export const W = 1080;
export const H = 1920;

export const GOLD = {
  deep: "#3a1a04",
  dark: "#6b3306",
  amber: "#b8640c",
  honey: "#e89a1c",
  light: "#ffc94a",
  glow: "#ffe39a",
  cream: "#fff3d1",
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** interpolate() with clamping and a smooth ease by default. */
export function tween(t: number, input: [number, number], output: [number, number], easing = ease) {
  return interpolate(t, input, output, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export interface Shot {
  /** local start time in seconds */
  at: number;
  scale: number;
  x: number;
  y: number;
  rotate?: number;
  /** slow drift per second while the shot is on screen */
  drift?: { scale?: number; x?: number; y?: number };
}

/** Framing that puts set point (px, py) in the centre of the screen at zoom `s`. */
export const focus = (s: number, px: number, py: number) => ({ scale: s, x: -(px - W / 2) * s, y: -(py - H / 2) * s });

/**
 * "Fast-paced editing" inside one scene: hard cuts between framings of the
 * same set, each with a short punch-in and a slow continuous drift.
 */
export function shotTransform(t: number, shots: Shot[]): { transform: string; sinceCut: number } {
  let i = 0;
  for (let k = 0; k < shots.length; k++) if (t >= shots[k].at) i = k;
  const s = shots[i];
  const dt = t - s.at;
  const punch = 1 + 0.06 * Math.exp(-dt * 9);
  const scale = (s.scale + (s.drift?.scale ?? 0) * dt) * punch;
  const x = s.x + (s.drift?.x ?? 0) * dt;
  const y = s.y + (s.drift?.y ?? 0) * dt;
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${s.rotate ?? 0}deg)`,
    sinceCut: dt,
  };
}

export const Camera: React.FC<{ transform: string; children: React.ReactNode }> = ({ transform, children }) => (
  <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>
);

/** Soft out-of-focus light circles. `phase` in seconds – periodic so loops stay seamless. */
export const Bokeh: React.FC<{
  count: number;
  seed: string;
  phase: number;
  colors: string[];
  opacity?: number;
  minR?: number;
  maxR?: number;
  blur?: number;
  area?: { x: number; y: number; w: number; h: number };
}> = ({ count, seed, phase, colors, opacity = 0.5, minR = 30, maxR = 140, blur = 18, area = { x: 0, y: 0, w: W, h: H } }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: `blur(${blur}px)` }}>
    {Array.from({ length: count }, (_, i) => {
      const r = lerp(minR, maxR, random(`${seed}-r-${i}`));
      const period = [4, 5, 8, 10][i % 4];
      const a = (phase / period) * Math.PI * 2 + random(`${seed}-p-${i}`) * 6.28;
      const x = area.x + random(`${seed}-x-${i}`) * area.w + Math.sin(a) * 24;
      const y = area.y + random(`${seed}-y-${i}`) * area.h + Math.cos(a) * 18;
      const o = opacity * (0.45 + 0.55 * random(`${seed}-o-${i}`)) * (0.8 + 0.2 * Math.sin(a * 2));
      return <circle key={i} cx={x} cy={y} r={r} fill={colors[i % colors.length]} opacity={o} />;
    })}
  </svg>
);

/** Floating dust / pollen particles. */
export const Dust: React.FC<{ count: number; seed: string; t: number; color?: string; opacity?: number; speed?: number }> = ({
  count,
  seed,
  t,
  color = GOLD.glow,
  opacity = 0.7,
  speed = 18,
}) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: count }, (_, i) => {
      const r = 1.5 + random(`${seed}-r${i}`) * 3.5;
      const x = (random(`${seed}-x${i}`) * W + Math.sin(t * 0.7 + i) * 30 + t * speed * (random(`${seed}-d${i}`) - 0.3)) % W;
      const y = (random(`${seed}-y${i}`) * H - t * speed * (0.4 + random(`${seed}-v${i}`)) + H * 4) % H;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + random(`${seed}-t${i}`) * 2) + i));
      return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={opacity * tw} />;
    })}
  </svg>
);

/** Animated film grain + vignette + warm golden grade on top of everything. */
export const FilmGrade: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(255,170,60,0.10) 0%, rgba(255,200,90,0.0) 45%, rgba(120,50,0,0.18) 100%)",
        mixBlendMode: "soft-light",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) 55%, rgba(20,8,0,0.55) 100%)",
      }}
    />
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.09, mixBlendMode: "overlay" }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 40} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

/** Bright golden flash used on hard cuts between scenes. */
export const CutFlash: React.FC<{ frame: number; cuts: number[]; fps: number }> = ({ frame, cuts, fps }) => {
  let o = 0;
  for (const c of cuts) {
    const d = frame - Math.round(c * fps);
    if (d >= -1 && d < 7) o = Math.max(o, d < 0 ? 0.35 : interpolate(d, [0, 6], [0.85, 0], { extrapolateRight: "clamp" }));
  }
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 45%, #fff6d8 0%, #ffcf6a 45%, rgba(255,160,40,0.6) 100%)",
        opacity: o,
        mixBlendMode: "screen",
      }}
    />
  );
};

/** Diagonal sun rays. */
export const Rays: React.FC<{ t: number; origin: [number, number]; color?: string; opacity?: number; count?: number; spread?: number; angle?: number }> = ({
  t,
  origin,
  color = "#ffd77a",
  opacity = 0.35,
  count = 7,
  spread = 50,
  angle = 115,
}) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", filter: "blur(14px)" }}>
    <defs>
      <linearGradient id="ray" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={color} stopOpacity="1" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    {Array.from({ length: count }, (_, i) => {
      const a = angle - spread / 2 + (spread / (count - 1)) * i;
      const w = 40 + random(`ray-w${i}`) * 110;
      const o = opacity * (0.5 + 0.5 * Math.sin(t * (0.6 + i * 0.13) + i * 1.7));
      return (
        <rect
          key={i}
          x={origin[0]}
          y={origin[1] - w / 2}
          width={2600}
          height={w}
          fill="url(#ray)"
          opacity={o}
          transform={`rotate(${a} ${origin[0]} ${origin[1]})`}
        />
      );
    })}
  </svg>
);

/** Small clean label used for the "scientific" overlays. */
export const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  sub?: string;
  appear: number;
  color?: string;
  align?: "left" | "center";
  size?: number;
}> = ({ x, y, text, sub, appear, color = "#fff3d1", align = "left", size = 46 }) => {
  const k = clamp01(appear);
  if (k <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : "0"}, ${(1 - k) * 20}px)`,
        opacity: k,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        color,
        fontSize: size,
        letterSpacing: 2,
        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        textAlign: align,
        whiteSpace: "nowrap",
      }}
    >
      {text}
      {sub ? <div style={{ fontSize: size * 0.5, letterSpacing: 4, opacity: 0.8, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
};
