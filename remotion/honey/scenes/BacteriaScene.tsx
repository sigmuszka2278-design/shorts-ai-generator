import React from "react";
import { AbsoluteFill, interpolateColors, random } from "remotion";
import { Bokeh, Camera, H, Label, W, clamp01, focus, lerp, shotTransform, tween, type Shot } from "../fx";

/** Macro shot inside honey: a bacterium loses its water (osmosis) and dries out. Science-overlay style. */

const SHOTS: Shot[] = [
  { at: 0, ...focus(1.0, 540, 960), drift: { scale: 0.03 } },
  { at: 2.85, ...focus(1.25, 560, 860), drift: { scale: 0.025, x: -8 } },
  { at: 5.25, ...focus(1.7, 540, 900), drift: { scale: 0.04 } },
];

function cellPath(cx: number, cy: number, rx: number, ry: number, wrinkle: number, t: number) {
  const n = 90;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // stadium-like capsule
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sq = Math.sign(c) * Math.pow(Math.abs(c), 0.6);
    const r = 1 + wrinkle * (0.12 * Math.sin(a * 11 + 1.3) + 0.08 * Math.sin(a * 17 + 2.1) + 0.05 * Math.sin(a * 5 + t));
    pts.push(`${(cx + sq * rx * r).toFixed(1)},${(cy + s * ry * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

export const BacteriaScene: React.FC<{ t: number }> = ({ t }) => {
  const cam = shotTransform(t, SHOTS);
  const enter = tween(t, [2.85, 4.0], [0, 1]);
  const dry = tween(t, [4.3, 7.2], [0, 1]);
  const size = lerp(1, 0.48, dry);
  const cx = lerp(620, 540, enter) + Math.sin(t * 1.3) * 10 * (1 - dry);
  const cy = lerp(300, 880, enter) + Math.cos(t * 1.1) * 8 * (1 - dry);
  const rot = -18 + t * 4 * (1 - dry);
  const body = interpolateColors(dry, [0, 0.6, 1], ["#8be0a6", "#b8b46a", "#7a5226"]);
  const water = tween(t, [0.4, 2.2], [0, 0.17]);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #ffcf5c 0%, #e0901a 40%, #8a4206 85%, #4a1f02 100%)" }}>
      <Camera transform={cam.transform}>
        {/* caustic light in the honey */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${50 + 18 * Math.sin(t * 0.5)}% ${35 + 10 * Math.cos(t * 0.4)}%, rgba(255,248,210,0.55) 0%, rgba(255,230,150,0) 32%),
              radial-gradient(circle at ${30 + 12 * Math.cos(t * 0.6)}% ${70 + 8 * Math.sin(t * 0.7)}%, rgba(255,240,180,0.35) 0%, rgba(255,230,150,0) 28%)`,
            mixBlendMode: "screen",
          }}
        />
        <Bokeh count={30} seed="bact" phase={t} colors={["#fff2c0", "#ffd36b", "#ffe49a"]} opacity={0.45} minR={8} maxR={60} blur={6} />
        {/* suspended air bubbles */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const x = random(`bub-x${i}`) * W;
            const y = ((random(`bub-y${i}`) * H - t * (8 + 10 * random(`bub-v${i}`))) % H + H) % H;
            const r = 10 + random(`bub-r${i}`) * 36;
            return (
              <g key={i} opacity={0.7}>
                <circle cx={x} cy={y} r={r} fill="none" stroke="#fff6d6" strokeWidth={3} />
                <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} fill="#ffffff" opacity={0.8} />
              </g>
            );
          })}
        </svg>

        {/* bacterium */}
        {enter > 0 ? (
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <radialGradient id="cell" cx="0.4" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="0.4" stopColor={body} stopOpacity="0.8" />
                <stop offset="1" stopColor={body} stopOpacity="0.95" />
              </radialGradient>
            </defs>
            <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${size})`}>
              {/* flagella */}
              {[-1, 1].map((side) =>
                [0, 1].map((j) => (
                  <path
                    key={`${side}-${j}`}
                    d={Array.from({ length: 24 }, (_, i) => {
                      const s = i / 23;
                      const x = side * (150 + s * 230);
                      const y = (j ? 18 : -18) + Math.sin(s * 9 - t * 10 * (1 - dry) + j) * 26 * s * (1 - dry * 0.7) + dry * s * s * 80;
                      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
                    }).join(" ")}
                    stroke={body}
                    strokeWidth={6}
                    fill="none"
                    opacity={0.75}
                    strokeLinecap="round"
                  />
                )),
              )}
              <path d={cellPath(0, 0, 175, 72, dry * 1.6, t)} fill="url(#cell)" stroke="#2c4a2a" strokeOpacity={0.5} strokeWidth={4} />
              {/* inner granules */}
              {Array.from({ length: 9 }, (_, i) => (
                <circle
                  key={i}
                  cx={(random(`gr-x${i}`) - 0.5) * 230}
                  cy={(random(`gr-y${i}`) - 0.5) * 70}
                  r={6 + random(`gr-r${i}`) * 10}
                  fill="#244a2c"
                  opacity={0.35 + dry * 0.3}
                />
              ))}
              <ellipse cx={-50} cy={-32} rx={70} ry={10} fill="#fff" opacity={0.45 * (1 - dry)} />
            </g>
            {/* water leaving the cell */}
            {Array.from({ length: 16 }, (_, i) => {
              const start = 4.2 + i * 0.17;
              const k = clamp01((t - start) / 1.3);
              if (k <= 0 || k >= 1) return null;
              const a = random(`w-a${i}`) * Math.PI * 2;
              const d = 90 + k * 320;
              return (
                <g key={i} opacity={1 - k}>
                  <path
                    d={`M ${cx + Math.cos(a) * d} ${cy + Math.sin(a) * d - 16} q 12 18 0 30 q -12 -12 0 -30 Z`}
                    fill="#9fe3ff"
                    stroke="#e8fbff"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
            {/* reticle */}
            <g opacity={enter * 0.9}>
              <circle cx={cx} cy={cy} r={260 * size + 40} fill="none" stroke="#fff3d1" strokeWidth={3} strokeDasharray="14 12" transform={`rotate(${t * 20} ${cx} ${cy})`} />
              <line x1={cx + 200} y1={cy - 200} x2={cx + 300} y2={cy - 300} stroke="#fff3d1" strokeWidth={3} />
            </g>
          </svg>
        ) : null}
      </Camera>

      {/* HUD (not affected by the camera) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g opacity={tween(t, [0.2, 0.6], [0, 1])}>
          <rect x={90} y={300} width={60} height={560} rx={30} fill="rgba(20,8,0,0.45)" stroke="#fff3d1" strokeWidth={4} />
          <rect x={100} y={850 - 540 * water} width={40} height={540 * water} rx={20} fill="#7fd8ff" />
          {[0.25, 0.5, 0.75].map((k) => (
            <line key={k} x1={150} y1={850 - 540 * k} x2={175} y2={850 - 540 * k} stroke="#fff3d1" strokeWidth={4} />
          ))}
        </g>
      </svg>
      <Label x={200} y={330} text="WODA" sub="W MIODZIE" appear={tween(t, [0.3, 0.7], [0, 1])} />
      <Label x={200} y={700} text={`${Math.round(water * 100)}%`} appear={tween(t, [0.5, 0.9], [0, 1])} color="#9fe3ff" size={86} />
      <Label x={700} y={300} text="BAKTERIA" appear={tween(t, [3.3, 3.7], [0, 1]) * (t < 7.6 ? 1 : 0)} size={40} />
      <Label x={540} y={1480} text="OSMOZA" sub="WODA UCIEKA Z KOMÓRKI" align="center" appear={tween(t, [5.3, 5.7], [0, 1])} size={52} />
    </AbsoluteFill>
  );
};
