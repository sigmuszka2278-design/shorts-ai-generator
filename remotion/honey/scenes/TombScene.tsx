import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Camera, Dust, H, W, clamp01, focus, shotTransform, tween, type Shot } from "../fx";

/** Dimly lit Egyptian tomb, torchlight, archaeologists in 1920s clothes discovering sealed clay jars. */

const flicker = (t: number, k = 0) =>
  0.82 + 0.1 * Math.sin(t * 17 + k) + 0.06 * Math.sin(t * 31 + k * 2) + 0.04 * Math.sin(t * 7.3 + k * 3);

const SHOTS: Shot[] = [
  { at: 0, ...focus(1.08, 540, 980), drift: { scale: 0.02, x: -6 } },
  { at: 2.25, ...focus(1.65, 420, 1330), drift: { scale: 0.03, x: 10 } },
  { at: 4.35, ...focus(2.35, 560, 1420), drift: { scale: 0.05, y: 8 } },
];

const Flame: React.FC<{ x: number; y: number; t: number; scale?: number; k?: number }> = ({ x, y, t, scale = 1, k = 0 }) => {
  const f = flicker(t, k);
  const sway = Math.sin(t * 9 + k) * 6;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={-30} rx={160 * f} ry={170 * f} fill="#ff9a2e" opacity={0.18} filter="url(#tombBlur)" />
      <path
        d={`M-26 0 C -34 -40, -10 -70, ${sway} ${-120 * f} C 12 -70, 34 -40, 26 0 C 18 16, -18 16, -26 0 Z`}
        fill="#ff7a12"
      />
      <path d={`M-15 0 C -18 -30, -4 -50, ${sway * 0.7} ${-86 * f} C 8 -50, 18 -30, 15 0 C 10 9, -10 9, -15 0 Z`} fill="#ffc23d" />
      <path d={`M-7 0 C -8 -16, -2 -28, ${sway * 0.4} ${-48 * f} C 4 -28, 8 -16, 7 0 Z`} fill="#fff4c4" />
    </g>
  );
};

function glyph(kind: number, x: number, y: number, s: number, key: string) {
  const p = { stroke: "#2a1608", strokeWidth: 6, fill: "none", strokeLinecap: "round" as const };
  switch (kind % 6) {
    case 0:
      return (
        <g key={key}>
          <circle cx={x} cy={y} r={s * 0.34} {...p} />
          <circle cx={x} cy={y} r={s * 0.08} fill="#2a1608" />
        </g>
      );
    case 1:
      return <path key={key} d={`M${x - s * 0.4} ${y} q ${s * 0.13} -${s * 0.2} ${s * 0.27} 0 t ${s * 0.27} 0 t ${s * 0.27} 0`} {...p} />;
    case 2:
      return <path key={key} d={`M${x - s * 0.35} ${y + s * 0.3} L${x} ${y - s * 0.35} L${x + s * 0.35} ${y + s * 0.3} Z`} {...p} />;
    case 3:
      return (
        <g key={key}>
          <line x1={x} y1={y - s * 0.4} x2={x} y2={y + s * 0.4} {...p} />
          <path d={`M${x} ${y - s * 0.4} q ${s * 0.25} 0 ${s * 0.25} ${s * 0.2}`} {...p} />
        </g>
      );
    case 4:
      return <path key={key} d={`M${x - s * 0.38} ${y + s * 0.1} q ${s * 0.18} -${s * 0.4} ${s * 0.38} -${s * 0.05} q ${s * 0.2} -${s * 0.2} ${s * 0.38} ${s * 0.1}`} {...p} />;
    default:
      return <rect key={key} x={x - s * 0.3} y={y - s * 0.22} width={s * 0.6} height={s * 0.44} rx={s * 0.1} {...p} />;
  }
}

const Jar: React.FC<{ x: number; base: number; s: number; open?: number; glow?: number; id: string }> = ({ x, base, s, open = 0, glow = 0, id }) => {
  const h = 330 * s;
  const w = 210 * s;
  const neck = 70 * s;
  const top = base - h;
  return (
    <g>
      <ellipse cx={x} cy={base + 4} rx={w * 0.6} ry={18 * s} fill="#000" opacity={0.5} />
      <path
        d={`M${x - neck} ${top + 30 * s}
            C ${x - neck} ${top + 70 * s}, ${x - w * 0.62} ${top + 90 * s}, ${x - w * 0.62} ${top + h * 0.5}
            C ${x - w * 0.62} ${base - 40 * s}, ${x - w * 0.3} ${base}, ${x} ${base}
            C ${x + w * 0.3} ${base}, ${x + w * 0.62} ${base - 40 * s}, ${x + w * 0.62} ${top + h * 0.5}
            C ${x + w * 0.62} ${top + 90 * s}, ${x + neck} ${top + 70 * s}, ${x + neck} ${top + 30 * s} Z`}
        fill={`url(#clay)`}
      />
      <path
        d={`M${x - w * 0.5} ${top + h * 0.35} C ${x - w * 0.6} ${top + h * 0.6}, ${x - w * 0.45} ${base - 50 * s}, ${x - w * 0.2} ${base - 18 * s}`}
        stroke="#ffb46a"
        strokeWidth={10 * s}
        fill="none"
        opacity={0.35}
      />
      {[0.42, 0.55].map((k) => (
        <path
          key={k}
          d={`M${x - w * 0.6} ${top + h * k} Q ${x} ${top + h * k + 26 * s}, ${x + w * 0.6} ${top + h * k}`}
          stroke="#3a1c0a"
          strokeWidth={5 * s}
          fill="none"
          opacity={0.6}
        />
      ))}
      {/* glow from the honey inside */}
      {glow > 0 ? (
        <>
          <ellipse cx={x} cy={top + 30 * s} rx={neck * 1.2} ry={20 * s} fill="#ffcf5a" opacity={glow} />
          <ellipse cx={x} cy={top - 80 * s} rx={neck * 3} ry={180 * s} fill="#ffc04a" opacity={glow * 0.5} filter={`url(#tombBlur)`} />
        </>
      ) : null}
      {/* clay seal / lid */}
      <g transform={`translate(${x + open * 110 * s} ${top + 30 * s - open * 90 * s}) rotate(${open * 24})`}>
        <ellipse cx={0} cy={0} rx={neck * 1.15} ry={22 * s} fill="#5a2f14" />
        <path d={`M${-neck * 1.15} 0 Q 0 ${-70 * s}, ${neck * 1.15} 0 Z`} fill={`url(#clay)`} />
        <circle cx={0} cy={-22 * s} r={14 * s} fill="#8a3a1a" stroke="#3a1608" strokeWidth={3 * s} />
      </g>
      <title>{id}</title>
    </g>
  );
};

export const TombScene: React.FC<{ t: number }> = ({ t }) => {
  const cam = shotTransform(t, SHOTS);
  const f = flicker(t);
  const open = tween(t, [4.6, 5.8], [0, 1]);
  const glow = tween(t, [4.8, 6.0], [0, 0.95]);
  const reach = tween(t, [2.4, 4.0], [0, 1]);

  return (
    <AbsoluteFill style={{ background: "#0d0602" }}>
      <Camera transform={cam.transform}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <filter id="tombBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="40" />
            </filter>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a1608" />
              <stop offset="0.6" stopColor="#5b3416" />
              <stop offset="1" stopColor="#3a1f0b" />
            </linearGradient>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a2a10" />
              <stop offset="1" stopColor="#1a0c04" />
            </linearGradient>
            <radialGradient id="clay" cx="0.35" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#c46a32" />
              <stop offset="0.55" stopColor="#7a3a16" />
              <stop offset="1" stopColor="#2e1406" />
            </radialGradient>
            <radialGradient id="torchLight" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffb456" stopOpacity="0.75" />
              <stop offset="0.5" stopColor="#d9701c" stopOpacity="0.25" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* stone wall */}
          <rect x={-300} y={-300} width={W + 600} height={1700} fill="url(#wall)" />
          {Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 5 }, (_, col) => {
              const bw = 320;
              const x = -300 + col * bw + (row % 2 ? bw / 2 : 0);
              const y = -300 + row * 190;
              const shade = 0.12 + random(`stone-${row}-${col}`) * 0.18;
              return (
                <rect key={`${row}-${col}`} x={x + 4} y={y + 4} width={bw - 8} height={182} fill="#000" opacity={shade} rx={6} />
              );
            }),
          )}
          {/* carved band of symbols */}
          <rect x={-300} y={330} width={W + 600} height={420} fill="#7a4a1e" opacity={0.35} />
          <line x1={-300} y1={330} x2={W + 300} y2={330} stroke="#20100a" strokeWidth={8} />
          <line x1={-300} y1={750} x2={W + 300} y2={750} stroke="#20100a" strokeWidth={8} />
          {Array.from({ length: 3 }, (_, row) =>
            Array.from({ length: 12 }, (_, col) =>
              glyph(Math.floor(random(`g-${row}-${col}`) * 6), -220 + col * 130, 410 + row * 130, 90, `g-${row}-${col}`),
            ),
          )}

          {/* floor */}
          <rect x={-300} y={1350} width={W + 600} height={900} fill="url(#floor)" />
          <path d={`M-300 1350 L${W + 300} 1350`} stroke="#000" strokeWidth={14} opacity={0.5} />

          {/* torch light pools */}
          <ellipse cx={170} cy={620} rx={760 * f} ry={820 * f} fill="url(#torchLight)" />
          <ellipse cx={840} cy={900} rx={620 * flicker(t, 2)} ry={700 * flicker(t, 2)} fill="url(#torchLight)" opacity={0.85} />

          {/* wall torch */}
          <rect x={150} y={640} width={40} height={150} rx={8} fill="#2b1608" />
          <rect x={130} y={630} width={80} height={26} rx={6} fill="#4b2a10" />
          <Flame x={170} y={632} t={t} />

          {/* back row of jars */}
          {[90, 250, 830, 990].map((x, i) => (
            <Jar key={x} id={`back-${i}`} x={x} base={1470} s={0.62 + (i % 2) * 0.08} />
          ))}

          {/* standing archaeologist (fedora, jacket), holding a torch high */}
          <g>
            <path d="M740 1560 L760 1180 L800 1180 L812 1560 Z" fill="#170b04" />
            <path d="M820 1560 L842 1180 L880 1180 L890 1560 Z" fill="#170b04" />
            <path d="M715 1210 C 720 1000, 740 900, 815 880 C 900 900, 925 1000, 920 1210 Z" fill="#24130a" stroke="#ffa64d" strokeWidth={4} strokeOpacity={0.55} />
            <path d="M890 930 C 930 860, 950 800, 960 720" stroke="#24130a" strokeWidth={46} strokeLinecap="round" fill="none" />
            <circle cx={815} cy={830} r={52} fill="#3a2010" stroke="#ffa64d" strokeWidth={3} strokeOpacity={0.6} />
            <ellipse cx={815} cy={792} rx={100} ry={18} fill="#140a04" />
            <path d="M762 792 C 765 735, 865 735, 868 792 Z" fill="#140a04" />
            <rect x={952} y={640} width={20} height={110} rx={6} fill="#2b1608" transform="rotate(8 962 700)" />
            <Flame x={965} y={636} t={t} k={2} scale={0.85} />
          </g>

          {/* front jars */}
          <Jar id="left" x={210} base={1660} s={0.9} />
          <Jar id="hero" x={560} base={1640} s={1.05} open={open} glow={glow} />

          {/* kneeling archaeologist (pith helmet, vest), reaching for the seal */}
          <g>
            <path d="M200 1700 C 210 1620, 280 1590, 360 1600 L 420 1700 Z" fill="#170b04" />
            <path d="M260 1600 C 250 1450, 300 1340, 380 1330 C 440 1340, 470 1420, 450 1600 Z" fill="#2a160a" stroke="#ffa64d" strokeWidth={4} strokeOpacity={0.5} />
            <path
              d={`M430 1390 C ${470 + reach * 30} ${1400 - reach * 30}, ${500 + reach * 30} ${1440 - reach * 50}, ${505 + reach * 40} ${1450 - reach * 60}`}
              stroke="#2a160a"
              strokeWidth={36}
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={505 + reach * 40} cy={1450 - reach * 60} r={18} fill="#6a3c1e" />
            <circle cx={395} cy={1285} r={50} fill="#3e2211" stroke="#ffa64d" strokeWidth={3} strokeOpacity={0.6} />
            <ellipse cx={392} cy={1252} rx={88} ry={20} fill="#c9b48a" />
            <path d="M335 1252 C 338 1188, 448 1188, 450 1252 Z" fill="#d8c49a" />
            <path d="M345 1240 C 370 1225, 420 1225, 440 1240" stroke="#8a744e" strokeWidth={6} fill="none" />
          </g>
        </svg>
        <Dust count={60} seed="tomb" t={t} color="#ffcf8a" opacity={0.55 * f} speed={12} />
      </Camera>
      {/* darkness at the edges, flickering */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at 45% 52%, rgba(0,0,0,0) 30%, rgba(5,2,0,${0.75 - 0.12 * clamp01(f - 0.8)}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
