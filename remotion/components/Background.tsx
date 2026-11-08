import React from "react";
import { AbsoluteFill, random } from "remotion";
import { shade } from "../../lib/scene/color";
import type { ThemeId } from "../../lib/scene/types";
import { heartPath, OUTLINE, starPath } from "../paint";

const W = 1080;
const H = 1920;
const GROUND = 1500;

interface ThemeLook {
  sky: [string, string, string];
  ground: string;
  hillFar: string;
  hillNear: string;
}

export const THEME_LOOK: Record<ThemeId, ThemeLook> = {
  laka: { sky: ["#6ec6ff", "#a8e0ff", "#e6f8ff"], ground: "#6fcf74", hillFar: "#a4e5a0", hillNear: "#86d987" },
  niebo: { sky: ["#7fc8ff", "#c7e6ff", "#ffe3f1"], ground: "#9be7a3", hillFar: "#c4f0c0", hillNear: "#a6e9a9" },
  kosmos: { sky: ["#140a35", "#3a1a78", "#7b2ea0"], ground: "#8e5bd8", hillFar: "#4b2a8f", hillNear: "#6a3fbf" },
  ocean: { sky: ["#00a6d6", "#0077b6", "#034078"], ground: "#f6d6a8", hillFar: "#0a6aa1", hillNear: "#e9c48d" },
  las: { sky: ["#9ee6d0", "#d3f5e6", "#fffbe6"], ground: "#5cbf60", hillFar: "#3f9d58", hillNear: "#4fb15c" },
  zamek: { sky: ["#ffafcc", "#ffc8dd", "#cde7ff"], ground: "#9de39f", hillFar: "#c8f1b7", hillNear: "#a9e7a0" },
  cukierkowo: { sky: ["#ffc6ff", "#e7c6ff", "#bde0fe"], ground: "#ff99c8", hillFar: "#ffd6e8", hillNear: "#ffb3d9" },
  noc: { sky: ["#071242", "#1c2d7a", "#4b3fb8"], ground: "#25407a", hillFar: "#1a2c63", hillNear: "#20376f" },
};

function Cloud({ x, y, s, opacity = 1 }: { x: number; y: number; s: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <ellipse cx={0} cy={20} rx={110} ry={42} fill="#ffffff" />
      <circle cx={-45} cy={0} r={48} fill="#ffffff" />
      <circle cx={20} cy={-18} r={62} fill="#ffffff" />
      <circle cx={75} cy={8} r={40} fill="#ffffff" />
      <ellipse cx={0} cy={40} rx={100} ry={18} fill="#e3f1ff" />
    </g>
  );
}

function Tree({ x, y, s, color, is3d }: { x: number; y: number; s: number; color: string; is3d: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-16} y={-20} width={32} height={150} rx={12} fill="#8d5a3b" />
      <circle cx={0} cy={-90} r={95} fill={color} />
      <circle cx={-60} cy={-40} r={60} fill={color} />
      <circle cx={60} cy={-40} r={60} fill={color} />
      {is3d && <circle cx={-30} cy={-130} r={40} fill="#ffffff" opacity={0.15} />}
      {[-40, 30, 0].map((dx, i) => (
        <circle key={i} cx={dx} cy={-80 + i * 30} r={10} fill="#ff5d73" />
      ))}
    </g>
  );
}

function Flower({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={0} width={6} height={50} fill="#3f9d58" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-16} rx={11} ry={17} fill={color} transform={`rotate(${a})`} />
      ))}
      <circle cx={0} cy={0} r={11} fill="#ffd60a" />
    </g>
  );
}

export const Background: React.FC<{ theme: ThemeId; frame: number; is3d: boolean; durationInFrames: number; seed: number }> = ({
  theme,
  frame,
  is3d,
  durationInFrames,
  seed,
}) => {
  const look = THEME_LOOK[theme];
  const progress = frame / Math.max(1, durationInFrames);
  // 3D: parallax camera drift – far layers move less than near ones
  const sway = is3d ? Math.sin(frame / 70) * 30 : 0;
  const layer = (depth: number) => `translate(${sway * depth} ${is3d ? -progress * 40 * depth : 0})`;
  const rnd = (i: number, k: string) => random(`${seed}-${k}-${i}`);

  const far: React.ReactNode[] = [];
  const mid: React.ReactNode[] = [];
  const near: React.ReactNode[] = [];

  const twinkles = (count: number, maxY: number, color = "#ffffff") =>
    Array.from({ length: count }, (_, i) => {
      const x = rnd(i, "sx") * W;
      const y = rnd(i, "sy") * maxY;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / (10 + rnd(i, "st") * 20) + i));
      const r = 2 + rnd(i, "sr") * 5;
      return rnd(i, "shape") > 0.85 ? (
        <path key={`s${i}`} d={starPath(x, y, r * 3, r * 1.2, 4)} fill={color} opacity={tw} />
      ) : (
        <circle key={`s${i}`} cx={x} cy={y} r={r} fill={color} opacity={tw} />
      );
    });

  switch (theme) {
    case "laka":
    case "niebo":
    case "zamek": {
      // sun
      far.push(
        <g key="sun" transform={`translate(${theme === "zamek" ? 860 : 850} ${theme === "niebo" ? 330 : 300})`}>
          <g transform={`rotate(${frame * 0.6})`}>
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={-10} y={-190} width={20} height={60} rx={10} fill="#ffd60a" opacity={0.85} transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r={110} fill={is3d ? "url(#sunGrad)" : "#ffd60a"} stroke={is3d ? "none" : OUTLINE} strokeWidth={is3d ? 0 : 6} />
          <circle cx={-34} cy={-10} r={10} fill={OUTLINE} />
          <circle cx={34} cy={-10} r={10} fill={OUTLINE} />
          <path d="M -30 30 Q 0 55 30 30" stroke={OUTLINE} strokeWidth={8} fill="none" strokeLinecap="round" />
        </g>,
      );
      const clouds = theme === "niebo" ? 6 : 3;
      for (let i = 0; i < clouds; i++) {
        const speed = 0.4 + rnd(i, "cs") * 0.8;
        const x = ((rnd(i, "cx") * (W + 600) + frame * speed) % (W + 600)) - 300;
        mid.push(<Cloud key={`c${i}`} x={x} y={180 + rnd(i, "cy") * (theme === "niebo" ? 1100 : 500)} s={0.6 + rnd(i, "cz") * 0.8} opacity={0.95} />);
      }
      if (theme === "niebo") {
        far.push(
          <g key="rb" opacity={0.45}>
            {["#ff4d6d", "#ff9f1c", "#ffd60a", "#52d273", "#3a86ff", "#9b5de5"].map((c, i) => (
              <path key={c} d={`M ${540 - (700 - i * 36)} 1450 A ${700 - i * 36} ${700 - i * 36} 0 0 1 ${540 + (700 - i * 36)} 1450`} stroke={c} strokeWidth={36} fill="none" />
            ))}
          </g>,
        );
      }
      if (theme === "zamek") {
        const c = "#f7b2d9";
        mid.push(
          <g key="castle" transform="translate(540 1250)">
            <rect x={-260} y={-330} width={520} height={330} fill={c} />
            {[-300, -100, 100, 300].map((x, i) => (
              <g key={x}>
                <rect x={x - 60} y={-480 - (i % 2) * 80} width={120} height={480 + (i % 2) * 80} fill={shade(c, 0.1 * (i % 2))} />
                <path d={`M ${x - 80} ${-480 - (i % 2) * 80} L ${x} ${-640 - (i % 2) * 80} L ${x + 80} ${-480 - (i % 2) * 80} Z`} fill="#9b5de5" />
                <path d={`M ${x} ${-640 - (i % 2) * 80} l 0 -60 l 50 ${15 + Math.sin(frame / 6 + i) * 10} l -50 15`} fill="#ff4d6d" stroke="#ff4d6d" strokeWidth={4} />
                <rect x={x - 22} y={-380 - (i % 2) * 80} width={44} height={64} rx={22} fill="#ffe66d" />
              </g>
            ))}
            <path d="M -70 0 L -70 -140 A 70 70 0 0 1 70 -140 L 70 0 Z" fill="#9b5de5" />
          </g>,
        );
      }
      // hills
      mid.push(<ellipse key="h1" cx={200} cy={GROUND + 60} rx={700} ry={260} fill={look.hillFar} />);
      mid.push(<ellipse key="h2" cx={950} cy={GROUND + 80} rx={620} ry={240} fill={look.hillFar} />);
      near.push(<ellipse key="h3" cx={540} cy={GROUND + 330} rx={1100} ry={420} fill={look.hillNear} />);
      for (let i = 0; i < 12; i++) {
        near.push(
          <Flower
            key={`f${i}`}
            x={rnd(i, "fx") * W}
            y={GROUND + 120 + rnd(i, "fy") * 280}
            s={0.8 + rnd(i, "fs") * 0.7}
            color={["#ff4d6d", "#ff70a6", "#ffffff", "#9b5de5", "#ff9f1c"][i % 5]}
          />,
        );
      }
      break;
    }
    case "kosmos": {
      far.push(<g key="stars">{twinkles(140, H)}</g>);
      far.push(
        <g key="planet1" transform={`translate(830 ${380 + Math.sin(frame / 50) * 15})`}>
          <circle r={130} fill={is3d ? "url(#planetGrad)" : "#ff9e00"} stroke={is3d ? "none" : OUTLINE} strokeWidth={6} />
          <ellipse rx={220} ry={45} fill="none" stroke="#ffd60a" strokeWidth={18} transform="rotate(-18)" opacity={0.9} />
        </g>,
      );
      mid.push(<circle key="p2" cx={180} cy={820} r={60} fill="#4cc9f0" opacity={0.9} />);
      mid.push(<circle key="p2b" cx={160} cy={800} r={18} fill="#ffffff" opacity={0.35} />);
      // shooting star
      const st = (frame * 14) % 2600;
      mid.push(
        <g key="shoot" transform={`translate(${st - 400} ${200 + st * 0.35})`} opacity={st < 1600 ? 1 : 0}>
          <path d="M 0 0 L -220 -77" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
          <path d={starPath(0, 0, 22, 9)} fill="#fff6a0" />
        </g>,
      );
      near.push(<ellipse key="moonground" cx={540} cy={GROUND + 420} rx={1200} ry={520} fill={look.ground} />);
      [
        [200, GROUND + 140, 60],
        [800, GROUND + 200, 80],
        [500, GROUND + 330, 45],
      ].forEach(([x, y, r], i) =>
        near.push(<ellipse key={`cr${i}`} cx={x} cy={y} rx={r} ry={r * 0.4} fill={shade(look.ground, -0.2)} />),
      );
      break;
    }
    case "noc": {
      far.push(<g key="stars">{twinkles(110, H * 0.7, "#fff9c4")}</g>);
      far.push(
        <g key="moon" transform="translate(800 360)">
          <circle r={210} fill="#fff9c4" opacity={0.15} />
          <circle r={130} fill={is3d ? "url(#moonGrad)" : "#fff3b0"} stroke={is3d ? "none" : OUTLINE} strokeWidth={6} />
          <circle cx={-40} cy={-30} r={22} fill="#f2e394" />
          <circle cx={40} cy={40} r={14} fill="#f2e394" />
        </g>,
      );
      mid.push(<ellipse key="h1" cx={200} cy={GROUND + 60} rx={700} ry={260} fill={look.hillFar} />);
      mid.push(<ellipse key="h2" cx={950} cy={GROUND + 80} rx={620} ry={240} fill={look.hillFar} />);
      near.push(<ellipse key="h3" cx={540} cy={GROUND + 330} rx={1100} ry={420} fill={look.hillNear} />);
      for (let i = 0; i < 18; i++) {
        const x = rnd(i, "fx") * W + Math.sin(frame / 20 + i) * 30;
        const y = 900 + rnd(i, "fy") * 900 + Math.cos(frame / 25 + i) * 30;
        const o = 0.4 + 0.6 * Math.abs(Math.sin(frame / 12 + i * 2));
        near.push(
          <g key={`ff${i}`} opacity={o}>
            <circle cx={x} cy={y} r={18} fill="#fff176" opacity={0.3} />
            <circle cx={x} cy={y} r={6} fill="#fff59d" />
          </g>,
        );
      }
      break;
    }
    case "ocean": {
      // light rays
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * 230 + Math.sin(frame / 40 + i) * 40;
        far.push(<path key={`ray${i}`} d={`M ${x} -50 L ${x + 120} -50 L ${x + 300} ${H} L ${x - 60} ${H} Z`} fill="#ffffff" opacity={0.07} />);
      }
      // fish
      for (let i = 0; i < 5; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = 2 + rnd(i, "fs") * 3;
        const x = dir > 0 ? ((frame * speed + rnd(i, "fx") * 1400) % 1400) - 200 : 1200 - ((frame * speed + rnd(i, "fx") * 1400) % 1400);
        const y = 300 + rnd(i, "fy") * 900 + Math.sin(frame / 10 + i) * 20;
        const c = ["#ff9f1c", "#ffd60a", "#f15bb5", "#00f5d4", "#ff70a6"][i];
        mid.push(
          <g key={`fish${i}`} transform={`translate(${x} ${y}) scale(${dir} 1)`}>
            <path d="M -40 0 L -75 -28 L -75 28 Z" fill={shade(c, -0.15)} />
            <ellipse rx={50} ry={30} fill={c} />
            <circle cx={25} cy={-6} r={7} fill={OUTLINE} />
            <circle cx={27} cy={-8} r={2.5} fill="#fff" />
          </g>,
        );
      }
      // seaweed
      for (let i = 0; i < 7; i++) {
        const x = 60 + i * 160;
        const sw = Math.sin(frame / 15 + i) * 30;
        near.push(
          <path key={`sw${i}`} d={`M ${x} ${GROUND + 200} Q ${x + sw} ${GROUND} ${x - sw} ${GROUND - 150} Q ${x + sw} ${GROUND - 250} ${x + sw * 0.5} ${GROUND - 330}`} stroke={i % 2 ? "#2ec4b6" : "#52d273"} strokeWidth={26} fill="none" strokeLinecap="round" />,
        );
      }
      near.push(<ellipse key="sand" cx={540} cy={GROUND + 360} rx={1150} ry={420} fill={look.ground} />);
      [150, 470, 860].forEach((x, i) =>
        near.push(
          <g key={`shell${i}`} transform={`translate(${x} ${GROUND + 220 + i * 40})`}>
            <path d="M -30 0 A 30 30 0 0 1 30 0 Z" fill="#ffafcc" />
            <path d="M 0 0 L -15 -24 M 0 0 L 0 -28 M 0 0 L 15 -24" stroke="#ff70a6" strokeWidth={3} />
          </g>,
        ),
      );
      // bubbles
      for (let i = 0; i < 14; i++) {
        const speed = 2 + rnd(i, "bs") * 3;
        const y = H - ((frame * speed + rnd(i, "by") * H) % (H + 100));
        const x = rnd(i, "bx") * W + Math.sin(frame / 12 + i) * 15;
        far.push(<circle key={`bb${i}`} cx={x} cy={y} r={6 + rnd(i, "br") * 16} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.6} />);
      }
      break;
    }
    case "las": {
      for (let i = 0; i < 5; i++) far.push(<Tree key={`tf${i}`} x={i * 260 + 20} y={1180} s={0.9} color={look.hillFar} is3d={is3d} />);
      mid.push(<ellipse key="h1" cx={540} cy={GROUND + 120} rx={900} ry={240} fill={look.hillNear} />);
      [60, 1020].forEach((x, i) => mid.push(<Tree key={`tn${i}`} x={x} y={1320} s={1.5} color={i ? "#2fa84f" : "#38b85a"} is3d={is3d} />));
      near.push(<ellipse key="g" cx={540} cy={GROUND + 360} rx={1150} ry={430} fill={look.ground} />);
      for (let i = 0; i < 8; i++) {
        near.push(<Flower key={`f${i}`} x={rnd(i, "fx") * W} y={GROUND + 150 + rnd(i, "fy") * 250} color={["#ff70a6", "#ffffff", "#ffd60a"][i % 3]} />);
      }
      // butterflies
      for (let i = 0; i < 3; i++) {
        const x = ((frame * (2 + i) + i * 400) % 1300) - 100;
        const y = 700 + i * 180 + Math.sin(frame / 8 + i) * 50;
        const flap = Math.abs(Math.sin(frame / 3 + i));
        mid.push(
          <g key={`bf${i}`} transform={`translate(${x} ${y})`}>
            <ellipse cx={-14} cy={0} rx={18 * flap + 3} ry={22} fill={["#ff70a6", "#ffd60a", "#c77dff"][i]} />
            <ellipse cx={14} cy={0} rx={18 * flap + 3} ry={22} fill={["#ff70a6", "#ffd60a", "#c77dff"][i]} />
            <rect x={-3} y={-16} width={6} height={32} rx={3} fill={OUTLINE} />
          </g>,
        );
      }
      break;
    }
    case "cukierkowo": {
      far.push(<g key="sprinkles">{twinkles(70, H * 0.75, "#ffffff")}</g>);
      [
        [170, 980, 90, "#ff70a6"],
        [900, 900, 110, "#70d6ff"],
        [540, 1080, 70, "#ffd670"],
      ].forEach(([x, y, r, c], i) =>
        mid.push(
          <g key={`lp${i}`} transform={`translate(${x} ${y})`}>
            <rect x={-8} y={0} width={16} height={600} fill="#ffffff" />
            <g transform={`rotate(${frame * (i % 2 ? -2 : 2)})`}>
              <circle r={r as number} fill={c as string} />
              <circle r={(r as number) * 0.66} fill="#ffffff" />
              <circle r={(r as number) * 0.4} fill={c as string} />
            </g>
          </g>,
        ),
      );
      mid.push(<ellipse key="h1" cx={200} cy={GROUND + 60} rx={700} ry={260} fill={look.hillFar} />);
      mid.push(<ellipse key="h2" cx={950} cy={GROUND + 80} rx={620} ry={240} fill={"#d0f4de"} />);
      near.push(<ellipse key="h3" cx={540} cy={GROUND + 330} rx={1100} ry={420} fill={look.hillNear} />);
      // icing drips
      near.push(
        <path
          key="icing"
          d={`M -40 ${GROUND - 40} Q 100 ${GROUND - 120} 270 ${GROUND - 70} Q 470 ${GROUND - 130} 640 ${GROUND - 80} Q 840 ${GROUND - 130} 1120 ${GROUND - 60} L 1120 ${GROUND + 20} Q 1000 ${GROUND + 80} 900 ${GROUND} Q 780 ${GROUND + 90} 650 ${GROUND + 10} Q 500 ${GROUND + 90} 380 ${GROUND} Q 200 ${GROUND + 80} -40 ${GROUND + 20} Z`}
          fill="#ffffff"
          opacity={0.9}
        />,
      );
      for (let i = 0; i < 10; i++) {
        near.push(<path key={`h${i}`} d={heartPath(rnd(i, "hx") * W, GROUND + 160 + rnd(i, "hy") * 280, 18)} fill={["#ff4d6d", "#ffffff", "#70d6ff"][i % 3]} />);
      }
      break;
    }
  }

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[1]} 55%, ${look.sky[2]} 100%)` }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="sunGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fff7b0" />
            <stop offset="60%" stopColor="#ffd60a" />
            <stop offset="100%" stopColor="#ff9f1c" />
          </radialGradient>
          <radialGradient id="planetGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffd28a" />
            <stop offset="60%" stopColor="#ff9e00" />
            <stop offset="100%" stopColor="#b84a00" />
          </radialGradient>
          <radialGradient id="moonGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fff3b0" />
            <stop offset="100%" stopColor="#e6c86e" />
          </radialGradient>
          <linearGradient id="groundShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.25} />
          </linearGradient>
        </defs>
        <g transform={layer(0.3)}>{far}</g>
        <g transform={layer(0.6)}>{mid}</g>
        <g transform={layer(1)}>{near}</g>
        {is3d && <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="url(#groundShade)" />}
      </svg>
    </AbsoluteFill>
  );
};
