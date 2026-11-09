import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Camera, Dust, H, Label, Rays, W, focus, lerp, shotTransform, tween, type Shot } from "../fx";

/** Honeybees on a backlit honeycomb; enzyme → hydrogen peroxide overlay. */

const SHOTS: Shot[] = [
  { at: 0, ...focus(1.05, 540, 960), drift: { scale: 0.02, x: 8 } },
  { at: 1.6, ...focus(2.1, 470, 880), drift: { scale: 0.05, x: -6 } },
  { at: 3.6, ...focus(1.45, 640, 1060), drift: { scale: 0.03, y: -8 } },
  { at: 5.8, ...focus(1.15, 540, 960), drift: { scale: -0.02 } },
];

const R = 64; // hexagon radius
const hexPath = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ") + " Z";

const Bee: React.FC<{ x: number; y: number; angle: number; t: number; s?: number; id: number }> = ({ x, y, angle, t, s = 1, id }) => {
  const flap = Math.abs(Math.sin(t * 60 + id * 1.7));
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`}>
      <ellipse cx={4} cy={10} rx={58} ry={32} fill="#000" opacity={0.25} />
      {/* legs */}
      {[-18, 0, 18].map((lx, i) => (
        <g key={i} stroke="#1a0e04" strokeWidth={4} strokeLinecap="round">
          <line x1={lx} y1={10} x2={lx - 8 + Math.sin(t * 8 + i) * 4} y2={36} />
          <line x1={lx} y1={-10} x2={lx - 8 - Math.sin(t * 8 + i) * 4} y2={-36} />
        </g>
      ))}
      {/* abdomen */}
      <ellipse cx={-26} cy={0} rx={40} ry={26} fill="#e8a516" />
      {[-44, -28, -12].map((sx) => (
        <rect key={sx} x={sx - 5} y={-25} width={10} height={50} rx={5} fill="#2a1604" />
      ))}
      <ellipse cx={-34} cy={-10} rx={18} ry={6} fill="#fff1b8" opacity={0.55} />
      {/* thorax + head */}
      <ellipse cx={16} cy={0} rx={22} ry={20} fill="#6b4210" />
      <circle cx={16} cy={0} r={18} fill="#c48a2a" opacity={0.45} />
      <circle cx={42} cy={0} r={15} fill="#2a1604" />
      <ellipse cx={46} cy={-8} rx={6} ry={8} fill="#000" />
      <ellipse cx={46} cy={8} rx={6} ry={8} fill="#000" />
      <path d="M52 -6 q 18 -14 26 -10 M52 6 q 18 14 26 10" stroke="#1a0e04" strokeWidth={3} fill="none" />
      {/* wings */}
      <g opacity={0.75}>
        <ellipse cx={4} cy={-28} rx={34} ry={14 + flap * 6} fill="#fffaf0" opacity={0.55} transform={`rotate(${-20 - flap * 25} 10 -10)`} stroke="#fff" strokeWidth={1.5} />
        <ellipse cx={4} cy={28} rx={34} ry={14 + flap * 6} fill="#fffaf0" opacity={0.55} transform={`rotate(${20 + flap * 25} 10 10)`} stroke="#fff" strokeWidth={1.5} />
      </g>
    </g>
  );
};

export const BeesScene: React.FC<{ t: number }> = ({ t }) => {
  const cam = shotTransform(t, SHOTS);
  const cells: React.ReactNode[] = [];
  const dx = R * Math.sqrt(3);
  for (let row = -1; row < 22; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0);
      const cy = row * R * 1.5;
      const capped = random(`cap-${row}-${col}`) > 0.72;
      const light = 0.55 + 0.45 * random(`l-${row}-${col}`);
      cells.push(
        <g key={`${row}-${col}`}>
          <path d={hexPath(cx, cy, R)} fill={capped ? "#f3d48a" : "url(#cellHoney)"} opacity={capped ? 0.95 : light} stroke="url(#wax)" strokeWidth={9} />
          {!capped ? <ellipse cx={cx - R * 0.22} cy={cy - R * 0.25} rx={R * 0.22} ry={R * 0.1} fill="#fffbe6" opacity={0.6 * light} /> : null}
        </g>,
      );
    }
  }

  const bees = [
    { x: 470 + Math.sin(t * 0.8) * 30, y: 880 + Math.cos(t * 0.6) * 20, a: -30 + Math.sin(t) * 10 },
    { x: 760 + t * 12, y: 560 - t * 6, a: 160 },
    { x: 250 - t * 8, y: 1340 + Math.sin(t * 0.9) * 16, a: 70 },
    { x: 820 - t * 10, y: 1500, a: 200 + Math.sin(t * 1.2) * 12 },
  ];
  const flyer = { x: lerp(-150, 1250, (t % 8) / 8), y: 420 + Math.sin(t * 3) * 40 };

  const molecule = tween(t, [2.9, 3.3], [0, 1]);

  return (
    <AbsoluteFill style={{ background: "#2a1202" }}>
      <Camera transform={cam.transform}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <radialGradient id="backlight" cx="0.72" cy="0.22" r="0.9">
              <stop offset="0" stopColor="#fff2b8" />
              <stop offset="0.35" stopColor="#f5a623" />
              <stop offset="1" stopColor="#5a2402" />
            </radialGradient>
            <radialGradient id="cellHoney" cx="0.45" cy="0.4" r="0.6">
              <stop offset="0" stopColor="#ffd970" />
              <stop offset="0.6" stopColor="#e8901a" />
              <stop offset="1" stopColor="#8a3e04" />
            </radialGradient>
            <linearGradient id="wax" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff0b0" />
              <stop offset="0.5" stopColor="#e3b04a" />
              <stop offset="1" stopColor="#9a5a10" />
            </linearGradient>
          </defs>
          <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="url(#backlight)" />
          <g opacity={0.93}>{cells}</g>
          {bees.map((b, i) => (
            <Bee key={i} id={i} x={b.x} y={b.y} angle={b.a} t={t} s={1.15} />
          ))}
          <g style={{ filter: "blur(3px)" }}>
            <Bee id={9} x={flyer.x} y={flyer.y} angle={-5} t={t} s={1.5} />
          </g>
        </svg>
        <Rays t={t} origin={[1100, -100]} angle={125} spread={45} opacity={0.4} />
        <Dust count={40} seed="pollen" t={t} color="#fff0a8" opacity={0.7} speed={14} />
      </Camera>

      {/* overlays */}
      <Label x={90} y={300} text="ENZYM" sub="OKSYDAZA GLUKOZY" appear={tween(t, [1.3, 1.7], [0, 1])} />
      {molecule > 0 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: molecule }}>
          <g transform={`translate(700 420) rotate(${t * 18}) scale(${0.8 + 0.2 * molecule})`}>
            <line x1={-70} y1={0} x2={70} y2={0} stroke="#fff3d1" strokeWidth={14} />
            <line x1={-70} y1={0} x2={-130} y2={-80} stroke="#fff3d1" strokeWidth={10} />
            <line x1={70} y1={0} x2={130} y2={80} stroke="#fff3d1" strokeWidth={10} />
            <circle cx={-70} cy={0} r={52} fill="#e5332a" stroke="#fff" strokeWidth={4} />
            <circle cx={70} cy={0} r={52} fill="#e5332a" stroke="#fff" strokeWidth={4} />
            <circle cx={-130} cy={-80} r={30} fill="#ffffff" stroke="#e8c27a" strokeWidth={4} />
            <circle cx={130} cy={80} r={30} fill="#ffffff" stroke="#e8c27a" strokeWidth={4} />
          </g>
        </svg>
      ) : null}
      <Label x={700} y={570} text="H₂O₂" sub="NADTLENEK WODORU" align="center" appear={tween(t, [3.0, 3.4], [0, 1])} size={70} />
      {/* antibacterial pulse */}
      {t > 4.3 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(255,240,180,0) ${lerp(10, 70, ((t - 4.3) % 1.2) / 1.2)}%, rgba(255,230,140,${0.35 * (1 - ((t - 4.3) % 1.2) / 1.2)}) ${lerp(14, 76, ((t - 4.3) % 1.2) / 1.2)}%, rgba(255,240,180,0) ${lerp(20, 84, ((t - 4.3) % 1.2) / 1.2)}%)`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
