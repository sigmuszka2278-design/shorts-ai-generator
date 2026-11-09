import React from "react";
import { Easing } from "remotion";
import { FONT_FAMILY } from "../fonts";
import { lerp, pop, prog, rand, shake, type SceneProps } from "./util";

const W = 1080;
const H = 1920;
const EMOJI = "'Noto Color Emoji', 'Apple Color Emoji', sans-serif";

const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, ...style }}>
    {children}
  </svg>
);

/** Rounded label used inside scenes. */
const Tag: React.FC<{ x: number; y: number; s: number; text: string; bg: string; color?: string; size?: number; rot?: number }> = ({
  x,
  y,
  s,
  text,
  bg,
  color = "#fff",
  size = 58,
  rot = 0,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`,
      background: bg,
      color,
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
      fontSize: size,
      padding: `${size * 0.18}px ${size * 0.45}px`,
      borderRadius: size * 0.5,
      border: "6px solid #fff",
      boxShadow: "0 14px 0 rgba(0,0,0,0.35), 0 20px 50px rgba(0,0,0,0.4)",
      whiteSpace: "nowrap",
      opacity: s > 0.01 ? 1 : 0,
    }}
  >
    {text}
  </div>
);

const Bubbles: React.FC<{ t: number; count?: number; color?: string }> = ({ t, count = 26, color = "rgba(255,255,255,0.5)" }) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const speed = 120 + rand(i) * 220;
      const y = H + 60 - ((t * speed + rand(i + 9) * H * 1.3) % (H * 1.3));
      const x = rand(i + 3) * W + Math.sin(t * 2 + i) * 24;
      const r = 6 + rand(i + 5) * 18;
      return <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={3} />;
    })}
  </>
);

const Stars: React.FC<{ t: number; count?: number; seed?: number }> = ({ t, count = 140, seed = 0 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <circle
        key={i}
        cx={rand(i + seed) * W}
        cy={rand(i * 3 + seed + 1) * H}
        r={1 + rand(i * 7 + seed) * 3}
        fill="#fff"
        opacity={0.35 + 0.65 * Math.abs(Math.sin(t * (1 + rand(i)) * 2 + i))}
      />
    ))}
  </>
);

const HeartShape: React.FC<{ fill: string }> = ({ fill }) => (
  <path d="M0 30 C -60 -20, -40 -75, 0 -42 C 40 -75, 60 -20, 0 30 Z" fill={fill} stroke="#fff" strokeWidth={6} />
);

// ────────────────────────────── INTRO ──────────────────────────────
export const IntroScene: React.FC<SceneProps> = ({ t, seg }) => {
  const slam = pop(t, 0, 7, 260);
  const sh = shake(t, 0.02, 40, 0.6);
  const sub = pop(t, 0.35, 9);
  const lastAt = seg.words.find((w) => w.w.startsWith("Ostatnia"))?.start ?? 3.5;
  const teaser = pop(t, lastAt, 8);
  const emojis = ["🐙", "🪐", "🦈", "🍌", "🌌", "🪼"];
  const titleOut = prog(t, lastAt - 0.2, lastAt + 0.2);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Svg>
        <defs>
          <radialGradient id="introBg" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#ff2d55" />
            <stop offset="45%" stopColor="#7a0f6e" />
            <stop offset="100%" stopColor="#12002b" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#introBg)" />
        <g transform={`translate(540 760) rotate(${t * 25})`} opacity={0.22}>
          {Array.from({ length: 18 }, (_, i) => (
            <path key={i} d="M0 0 L -90 -1700 L 90 -1700 Z" fill="#fff" transform={`rotate(${i * 20})`} />
          ))}
        </g>
        {Array.from({ length: 14 }, (_, i) => {
          const y = H - ((t * (90 + rand(i) * 80) + rand(i + 2) * H) % H);
          return (
            <text key={i} x={rand(i + 4) * W} y={y} fontSize={60 + rand(i) * 70} fill="#fff" opacity={0.25} fontFamily={FONT_FAMILY} fontWeight={700}>
              ?
            </text>
          );
        })}
      </Svg>
      {/* orbiting emoji preview of all six facts */}
      {emojis.map((e, i) => {
        const a = (i / 6) * Math.PI * 2 + t * 0.9;
        const s = pop(t, 0.15 + i * 0.07, 9) * (1 - titleOut * 0.4);
        return (
          <div
            key={e}
            style={{
              position: "absolute",
              left: 540 + Math.cos(a) * 400,
              top: 760 + Math.sin(a) * 400,
              fontSize: 120,
              fontFamily: EMOJI,
              transform: `translate(-50%,-50%) scale(${s})`,
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.5))",
            }}
          >
            {e}
          </div>
        );
      })}
      {/* giant 6 */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 740,
          transform: `translate(-50%,-50%) scale(${lerp(3.2, 1, slam) * (1 - titleOut * 0.35)}) rotate(${(1 - slam) * -20}deg)`,
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 560,
          lineHeight: 1,
          color: "#ffe14d",
          WebkitTextStroke: "22px #12002b",
          paintOrder: "stroke fill",
          textShadow: "0 26px 0 #12002b, 0 0 80px rgba(255,225,77,0.8)",
        }}
      >
        6
      </div>
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 30,
          right: 30,
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          color: "#fff",
          transform: `scale(${sub}) translateY(${titleOut * -40}px)`,
          opacity: 1 - titleOut,
        }}
      >
        <div style={{ fontSize: 132, WebkitTextStroke: "14px #12002b", paintOrder: "stroke fill", letterSpacing: 2 }}>CIEKAWOSTEK</div>
        <div style={{ fontSize: 70, marginTop: 10, color: "#ffe14d", WebkitTextStroke: "10px #12002b", paintOrder: "stroke fill" }}>
          O KTÓRYCH NIGDY NIE SŁYSZAŁEŚ! <span style={{ fontFamily: EMOJI, WebkitTextStroke: 0 }}>😱</span>
        </div>
      </div>
      {/* teaser for the last fact */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1080,
          transform: `translate(-50%,-50%) scale(${teaser}) rotate(${Math.sin(t * 6) * 4}deg)`,
          width: 300,
          height: 300,
          borderRadius: 60,
          background: "linear-gradient(160deg,#7a5cff,#2b0b6e)",
          border: "10px solid #ffe14d",
          boxShadow: "0 0 80px rgba(255,225,77,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 200,
          color: "#ffe14d",
          opacity: teaser > 0.01 ? 1 : 0,
        }}
      >
        ?
      </div>
    </div>
  );
};

// ────────────────────────────── 1. OCTOPUS ──────────────────────────────
export const OctopusScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const enter = pop(t, st + 0.1, 12, 120);
  const hearts = seg.beats.hearts;
  const blue = prog(t, seg.beats.blood, seg.beats.blood + 0.6);
  const cx = 540;
  const cy = 820 + Math.sin(t * 1.6) * 24 + (1 - enter) * 600;
  const tentacles = Array.from({ length: 8 }, (_, i) => {
    const base = -130 + i * 37;
    const ph = t * 3 + i * 0.9;
    const sx = cx + base;
    const sy = cy + 120;
    const dir = (i - 3.5) * 28;
    const p1 = `${sx + dir * 0.6 + Math.sin(ph) * 40} ${sy + 140}`;
    const p2 = `${sx + dir * 1.4 + Math.sin(ph + 1.2) * 70} ${sy + 260}`;
    const end = `${sx + dir * 2 + Math.sin(ph + 2.2) * 90} ${sy + 380 + Math.cos(ph) * 30}`;
    return <path key={i} d={`M ${sx} ${sy} C ${p1}, ${p2}, ${end}`} stroke="url(#octoSkin)" strokeWidth={46 - i * 0} strokeLinecap="round" fill="none" />;
  });
  const heartColor = (k: number) => {
    const c1 = [232, 40, 70];
    const c2 = [40, 120, 255];
    const m = prog(t, seg.beats.blood + k * 0.12, seg.beats.blood + k * 0.12 + 0.4);
    return `rgb(${c1.map((c, j) => Math.round(lerp(c, c2[j], m))).join(",")})`;
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d8fd6" />
            <stop offset="0.5" stopColor="#0a4d8c" />
            <stop offset="1" stopColor="#031a3a" />
          </linearGradient>
          <radialGradient id="octoSkin" cx="40%" cy="30%" r="80%">
            <stop offset="0" stopColor="#ff9a6b" />
            <stop offset="0.6" stopColor="#e2553d" />
            <stop offset="1" stopColor="#9c2a2a" />
          </radialGradient>
          <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#4fb3ff" stopOpacity={0.9} />
            <stop offset="1" stopColor="#4fb3ff" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#sea)" />
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            d={`M ${120 + i * 170} -50 L ${40 + i * 170 + Math.sin(t + i) * 60} ${H} L ${200 + i * 170 + Math.sin(t + i) * 60} ${H} Z`}
            fill="#bfe8ff"
            opacity={0.06 + 0.04 * Math.sin(t * 1.5 + i)}
          />
        ))}
        {/* seabed + seaweed */}
        <path d={`M 0 1640 Q 270 1580 540 1630 T 1080 1610 L 1080 1920 L 0 1920 Z`} fill="#c9a86a" opacity={0.85} />
        {Array.from({ length: 7 }, (_, i) => {
          const x = 60 + i * 160;
          const sw = Math.sin(t * 2 + i) * 40;
          return <path key={i} d={`M ${x} 1660 Q ${x + sw} 1500 ${x - sw * 0.5} 1360`} stroke="#2fae6b" strokeWidth={22} strokeLinecap="round" fill="none" />;
        })}
        <Bubbles t={t} />
        {/* blue blood glow */}
        <circle cx={cx} cy={cy} r={420} fill="url(#blueGlow)" opacity={blue * 0.8} />
        <g>{tentacles}</g>
        <ellipse cx={cx} cy={cy - 30} rx={200} ry={230} fill="url(#octoSkin)" stroke="#7a1f1f" strokeWidth={6} />
        {[-1, 1].map((s) => {
          const blink = Math.abs(Math.sin(t * 1.3)) > 0.97 ? 0.15 : 1;
          return (
            <g key={s}>
              <ellipse cx={cx + s * 78} cy={cy + 20} rx={52} ry={60 * blink} fill="#fff" />
              <circle cx={cx + s * 78 + Math.sin(t) * 10} cy={cy + 28} r={26 * blink} fill="#1b1b2f" />
            </g>
          );
        })}
        <path d={`M ${cx - 40} ${cy + 110} Q ${cx} ${cy + 140} ${cx + 40} ${cy + 110}`} stroke="#7a1f1f" strokeWidth={8} fill="none" strokeLinecap="round" />
        {/* three hearts */}
        {[0, 1, 2].map((k) => {
          const s = pop(t, hearts + k * 0.18, 8, 200);
          const beat = 1 + 0.12 * Math.max(0, Math.sin((t - hearts) * Math.PI * 2.4 - k * 0.5)) * (t > hearts + 0.6 ? 1 : 0);
          const x = cx + (k - 1) * 250;
          const y = 470 + (k === 1 ? -30 : 0);
          return (
            <g key={k} transform={`translate(${x} ${y}) scale(${1.6 * s * beat})`}>
              <HeartShape fill={heartColor(k)} />
            </g>
          );
        })}
      </Svg>
      <Tag x={540} y={1150} s={pop(t, hearts + 0.55, 9)} text="× 3 SERCA" bg="#e8284a" size={64} rot={-4} />
      <Tag x={540} y={1262} s={pop(t, seg.beats.blood + 0.2, 9)} text="💧 NIEBIESKA KREW" bg="#2878ff" size={60} rot={3} />
    </div>
  );
};

// ────────────────────────────── 2. VENUS ──────────────────────────────
export const VenusScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const zoom = lerp(0.6, 1, prog(t, st, st + 0.9, Easing.out(Easing.cubic)));
  const spin = t * 18; // slow drift of cloud bands
  const day = seg.beats.day;
  const year = seg.beats.year;
  const dayFill = prog(t, day, day + 2.2);
  const yearFill = prog(t, year, year + 0.9);
  const cardA = pop(t, day - 0.1, 10);
  const cardB = pop(t, year - 0.1, 10);
  const orbitA = t * 1.4;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <radialGradient id="venus" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff2c4" />
            <stop offset="0.45" stopColor="#e9b75f" />
            <stop offset="1" stopColor="#7a4a14" />
          </radialGradient>
          <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff9d6" />
            <stop offset="0.4" stopColor="#ffcf3f" />
            <stop offset="1" stopColor="#ff7a00" stopOpacity={0} />
          </radialGradient>
          <clipPath id="venusClip">
            <circle cx={540} cy={760} r={330} />
          </clipPath>
        </defs>
        <rect width={W} height={H} fill="#06061a" />
        <Stars t={t} seed={11} />
        <circle cx={120} cy={260} r={260} fill="url(#sunG)" />
        <ellipse cx={120} cy={260} rx={700} ry={180} fill="none" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={3} strokeDasharray="14 14" />
        <circle cx={120 + Math.cos(orbitA) * 700} cy={260 + Math.sin(orbitA) * 180} r={16} fill="#e9b75f" />
        <g transform={`translate(540 690) scale(${zoom * 0.86}) translate(-540 -760)`}>
          <circle cx={540} cy={760} r={350} fill="#ffcf7a" opacity={0.18} />
          <circle cx={540} cy={760} r={330} fill="url(#venus)" />
          <g clipPath="url(#venusClip)" opacity={0.45}>
            {Array.from({ length: 9 }, (_, i) => {
              const y = 470 + i * 70;
              const off = ((spin * (1 + (i % 3) * 0.2)) % 400) - 200;
              return (
                <path
                  key={i}
                  d={`M ${-200 + off} ${y} Q ${100 + off} ${y - 40} ${400 + off} ${y} T ${1000 + off} ${y} T ${1600 + off} ${y}`}
                  stroke={i % 2 ? "#fff3cf" : "#a8682a"}
                  strokeWidth={26}
                  fill="none"
                />
              );
            })}
          </g>
          <circle cx={540} cy={760} r={330} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={4} />
          {/* rotation arrow */}
          <g transform={`rotate(${-t * 40} 540 760)`} opacity={cardA}>
            <path d="M 540 380 A 380 380 0 0 0 200 600" stroke="#ffe14d" strokeWidth={14} fill="none" strokeLinecap="round" />
            <path d="M 180 560 L 196 630 L 250 590 Z" fill="#ffe14d" />
          </g>
        </g>
      </Svg>
      {/* comparison cards */}
      {[
        { y: 1060, s: cardA, label: "🔄 1 OBRÓT", value: "243 dni", fill: dayFill, color: "#ff7a3d" },
        { y: 1060, s: cardB, label: "☀️ 1 ROK", value: "225 dni", fill: yearFill * (225 / 243), color: "#3dc3ff" },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i === 0 ? 40 : 560,
            top: c.y - 20,
            width: 480,
            transform: `scale(${c.s})`,
            transformOrigin: "50% 0%",
            background: "rgba(10,10,40,0.85)",
            border: `6px solid ${c.color}`,
            borderRadius: 36,
            padding: "20px 24px",
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            opacity: c.s > 0.01 ? 1 : 0,
          }}
        >
          <div style={{ fontSize: 48 }}>{c.label}</div>
          <div style={{ fontSize: 76, color: c.color }}>{c.value}</div>
          <div style={{ height: 22, borderRadius: 11, background: "rgba(255,255,255,0.15)", marginTop: 8 }}>
            <div style={{ height: 22, borderRadius: 11, width: `${c.fill * 100}%`, background: c.color }} />
          </div>
        </div>
      ))}
      <Tag x={540} y={690} s={pop(t, year + 0.7, 9)} text="DOBA > ROK 🤯" bg="#ff2d55" size={56} rot={-3} />
    </div>
  );
};

// ────────────────────────────── 3. SHARK ──────────────────────────────
const SharkBody: React.FC<{ t: number }> = ({ t }) => {
  const tail = Math.sin(t * 7) * 18;
  return (
    <g>
      <path
        d={`M 0 0 C 80 -70, 260 -90, 420 -30 C 470 -10, 500 10, 470 30 C 380 70, 160 80, 0 30 L ${-120} ${-60 + tail} L ${-90} 15 L ${-130} ${90 + tail} Z`}
        fill="#5f7d8c"
        stroke="#2d3f48"
        strokeWidth={6}
      />
      <path d="M 40 30 C 160 75, 380 65, 470 30 C 380 50, 160 55, 40 30 Z" fill="#dfe8ea" />
      <path d="M 210 -70 L 250 -190 L 300 -60 Z" fill="#5f7d8c" stroke="#2d3f48" strokeWidth={6} />
      <path d="M 200 40 L 160 140 L 260 50 Z" fill="#4f6b78" />
      <circle cx={400} cy={-12} r={10} fill="#111" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${330 - i * 20} -10 q -8 20 0 40`} stroke="#2d3f48" strokeWidth={5} fill="none" />
      ))}
    </g>
  );
};

export const SharkScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const swim = prog(t, st, st + seg.duration / 30, Easing.linear);
  const sharkX = lerp(-500, 1250, swim);
  const sharkY = 760 + Math.sin(t * 2) * 30;
  const trees = seg.beats.trees;
  const tl = prog(t, st + 0.8, trees, Easing.inOut(Easing.quad));
  const treeS = pop(t, trees, 9);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <linearGradient id="ancient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fb3a0" />
            <stop offset="0.45" stopColor="#1f6b6a" />
            <stop offset="1" stopColor="#0b2a2e" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#ancient)" />
        {/* far silhouettes (parallax) */}
        {Array.from({ length: 5 }, (_, i) => {
          const x = ((i * 300 - t * 40) % 1500) + 1200;
          return (
            <g key={i} transform={`translate(${(x % 1500) - 200} ${420 + i * 90}) scale(0.25)`} opacity={0.25}>
              <SharkBody t={t + i} />
            </g>
          );
        })}
        {/* ammonites and trilobite-like shells on the ancient sea floor */}
        <path d="M 0 1500 Q 300 1440 600 1490 T 1080 1470 L 1080 1920 L 0 1920 Z" fill="#3d5a4a" />
        {[150, 470, 860].map((x, i) => (
          <g key={x} transform={`translate(${x} ${1530 + i * 10}) rotate(${t * 10 + i * 40})`}>
            <path d="M0 0 m -40 0 a 40 40 0 1 0 80 0 a 30 30 0 1 0 -60 0 a 20 20 0 1 0 40 0 a 10 10 0 1 0 -20 0" stroke="#d9c39a" strokeWidth={8} fill="none" />
          </g>
        ))}
        <Bubbles t={t} count={18} color="rgba(220,255,240,0.35)" />
        <g transform={`translate(${sharkX} ${sharkY}) scale(1.35)`}>
          <SharkBody t={t} />
        </g>
        {/* timeline */}
        <g transform="translate(0 1120)">
          <rect x={90} y={-14} width={900} height={28} rx={14} fill="rgba(0,0,0,0.35)" />
          <rect x={90} y={-14} width={900 * tl} height={28} rx={14} fill="#ffe14d" />
          <circle cx={90} cy={0} r={34} fill="#5f7d8c" stroke="#fff" strokeWidth={6} />
          <circle cx={990} cy={0} r={34} fill={treeS > 0.5 ? "#2fae6b" : "#555"} stroke="#fff" strokeWidth={6} />
          <text x={90} y={90} textAnchor="start" fontFamily={FONT_FAMILY} fontWeight={700} fontSize={44} fill="#fff">
            🦈 ok. 450 mln lat temu
          </text>
          <text x={990} y={-60} textAnchor="end" fontFamily={FONT_FAMILY} fontWeight={700} fontSize={44} fill="#fff" opacity={treeS}>
            🌳 ok. 385 mln lat temu
          </text>
        </g>
        {/* first tree growing on an island */}
        <g transform={`translate(860 1040) scale(${treeS})`}>
          <rect x={-14} y={-160} width={28} height={160} fill="#6b4423" />
          <circle cx={0} cy={-190} r={80} fill="#2fae6b" />
          <circle cx={-55} cy={-150} r={55} fill="#26935a" />
          <circle cx={55} cy={-150} r={55} fill="#26935a" />
        </g>
      </Svg>
      <Tag x={540} y={430} s={pop(t, st + 0.9, 9)} text="🦈 STARSZE OD DRZEW!" bg="#1f6b6a" size={58} rot={-3} />
    </div>
  );
};

// ────────────────────────────── 4. BANANA ──────────────────────────────
const Face: React.FC<{ x: number; y: number; shock: number; t: number }> = ({ x, y, shock, t }) => (
  <g transform={`translate(${x} ${y})`}>
    {[-1, 1].map((s) => (
      <g key={s}>
        <ellipse cx={s * 34} cy={0} rx={22 + shock * 8} ry={26 + shock * 14} fill="#fff" stroke="#222" strokeWidth={4} />
        <circle cx={s * 34 + Math.sin(t * 3) * 4} cy={4} r={10 - shock * 3} fill="#222" />
      </g>
    ))}
    {shock > 0.5 ? <ellipse cx={0} cy={60} rx={20} ry={28} fill="#5a1a1a" /> : <path d="M -26 48 Q 0 72 26 48" stroke="#222" strokeWidth={6} fill="none" strokeLinecap="round" />}
  </g>
);

export const BananaScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const bIn = pop(t, st + 0.1, 9);
  const sIn = pop(t, st + 0.3, 9);
  const yes = seg.beats.berry;
  const no = seg.beats.no;
  const yesS = pop(t, yes, 8, 240);
  const noS = pop(t, no, 8, 240);
  const shockB = prog(t, yes - 0.1, yes + 0.1);
  const shockS = prog(t, no - 0.1, no + 0.1);
  const shS = shake(t, no, 30, 0.6);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <radialGradient id="popBg" cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#fff6a8" />
            <stop offset="1" stopColor="#ff7eb6" />
          </radialGradient>
          <linearGradient id="bananaG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff27a" />
            <stop offset="1" stopColor="#f2b705" />
          </linearGradient>
          <radialGradient id="strawG" cx="40%" cy="30%" r="80%">
            <stop offset="0" stopColor="#ff7a7a" />
            <stop offset="1" stopColor="#c8102e" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#popBg)" />
        <g transform={`translate(540 800) rotate(${t * 20})`} opacity={0.25}>
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M0 0 L -80 -1600 L 80 -1600 Z" fill="#fff" transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
        {/* banana */}
        <g transform={`translate(${lerp(-400, 290, bIn)} ${780 + Math.sin(t * 4) * 20}) rotate(${-15 + Math.sin(t * 3) * 6}) scale(${1 + yesS * 0.08})`}>
          <path d="M -170 -140 C -140 120, 120 230, 230 110 C 140 160, -60 80, -110 -150 Z" fill="url(#bananaG)" stroke="#7a5a00" strokeWidth={8} />
          <path d="M -170 -140 L -150 -190 L -110 -150 Z" fill="#6b4c00" />
          <Face x={10} y={60} shock={shockB} t={t} />
        </g>
        {/* strawberry */}
        <g transform={`translate(${lerp(1400, 790, sIn) + shS.x} ${800 + Math.cos(t * 4) * 20 + shS.y}) rotate(${Math.sin(t * 3) * 6})`}>
          <path d="M 0 180 C -170 120, -190 -60, -120 -110 C -60 -150, 60 -150, 120 -110 C 190 -60, 170 120, 0 180 Z" fill="url(#strawG)" stroke="#7a0a1a" strokeWidth={8} />
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse key={i} cx={-100 + (i % 5) * 50 + (Math.floor(i / 5) % 2) * 25} cy={-50 + Math.floor(i / 5) * 70} rx={7} ry={11} fill="#ffe14d" />
          ))}
          <path d="M -90 -120 L -40 -170 L 0 -130 L 40 -170 L 90 -120 L 0 -100 Z" fill="#2fae6b" stroke="#17643a" strokeWidth={6} />
          <Face x={0} y={0} shock={shockS} t={t} />
        </g>
        {/* surprise marks */}
        {[0, 1, 2].map((i) => {
          const s = pop(t, no + 0.1 + i * 0.08, 8);
          return (
            <text key={i} x={700 + i * 110} y={520 - (i % 2) * 60} fontSize={130} fontFamily={FONT_FAMILY} fontWeight={700} fill="#ff2d55" stroke="#fff" strokeWidth={8} paintOrder="stroke" transform={`rotate(${(i - 1) * 15} ${700 + i * 110} 520)`} opacity={s > 0.01 ? 1 : 0} style={{ transformBox: "fill-box" }}>
              {i === 1 ? "?" : "!"}
            </text>
          );
        })}
      </Svg>
      <Tag x={290} y={1120} s={yesS} text="✅ JAGODA" bg="#22a35a" size={66} rot={-6} />
      <Tag x={790} y={1120} s={noS} text="❌ NIE JAGODA" bg="#e8284a" size={60} rot={5} />
    </div>
  );
};

// ────────────────────────────── 5. MOON ──────────────────────────────
const Boot: React.FC<{ x: number; y: number; s: number; flip: boolean; o: number }> = ({ x, y, s, flip, o }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={o}>
    <path d="M -38 -110 C -48 -60, -50 40, -36 80 C -20 110, 20 110, 36 80 C 50 40, 48 -60, 38 -110 C 26 -130, -26 -130, -38 -110 Z" fill="#6f6f78" />
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x={-34} y={-100 + i * 24} width={68} height={10} rx={4} fill="#4d4d55" />
    ))}
  </g>
);

export const MoonScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const pan = prog(t, st, st + seg.duration / 30, Easing.linear);
  const steps = seg.beats.steps;
  const windS = pop(t, seg.beats.wind, 9);
  const rainS = pop(t, seg.beats.rain, 9);
  const yearsS = pop(t, seg.beats.years, 9);
  const counter = Math.round(prog(t, seg.beats.years, seg.beats.years + 1.4, Easing.out(Easing.cubic)) * 1000000);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <radialGradient id="earth" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#8fd3ff" />
            <stop offset="0.6" stopColor="#1f6fd1" />
            <stop offset="1" stopColor="#0a2a6e" />
          </radialGradient>
          <linearGradient id="regolith" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8d8d95" />
            <stop offset="1" stopColor="#c9c9cf" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="#020208" />
        <Stars t={t} seed={33} count={160} />
        <g transform={`translate(${975 - pan * 60} 560) scale(0.8)`}>
          <circle r={130} fill="url(#earth)" />
          <path d="M -60 -60 q 40 -30 70 10 q 20 40 -20 60 q -40 10 -50 -70 z" fill="#3fbf6f" opacity={0.85} />
          <path d="M 40 30 q 40 -10 50 30 q -20 40 -50 20 z" fill="#3fbf6f" opacity={0.85} />
        </g>
        {/* lunar surface in perspective */}
        <g transform={`translate(${-pan * 60} 0)`}>
          <path d="M -100 900 Q 300 860 600 890 T 1300 880 L 1300 1920 L -100 1920 Z" fill="url(#regolith)" />
          {[
            [180, 1000, 120],
            [760, 960, 90],
            [980, 1250, 150],
            [120, 1500, 110],
            [640, 1720, 170],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="#7a7a82" />
              <ellipse cx={x} cy={y + r * 0.05} rx={r * 0.85} ry={r * 0.24} fill="#a5a5ad" />
            </g>
          ))}
          {/* footprints walking toward the viewer (5 steps, every 0.38 s) */}
          {Array.from({ length: 5 }, (_, i) => {
            const at = steps + i * 0.38;
            const s = pop(t, at, 14, 300);
            const depth = i / 4;
            return <Boot key={i} x={520 + (i % 2 ? 70 : -70) * (0.6 + depth)} y={980 + depth * 520} s={(0.45 + depth * 0.75) * (0.85 + 0.15 * s)} flip={i % 2 === 1} o={s > 0.01 ? 1 : 0} />;
          })}
        </g>
        {/* little flag */}
        <g transform="translate(260 900)">
          <rect x={0} y={-220} width={8} height={240} fill="#ddd" />
          <rect x={8} y={-220} width={130} height={80} fill="#f4f4f4" />
          <rect x={8} y={-180} width={130} height={40} fill="#e8284a" />
        </g>
      </Svg>
      {/* no wind, no rain */}
      {[
        { x: 300, s: windS, icon: "💨", label: "WIATR" },
        { x: 780, s: rainS, icon: "🌧️", label: "DESZCZ" },
      ].map((c) => (
        <div
          key={c.label}
          style={{
            position: "absolute",
            left: c.x,
            top: 620,
            transform: `translate(-50%,-50%) scale(${c.s})`,
            textAlign: "center",
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            color: "#fff",
            opacity: c.s > 0.01 ? 1 : 0,
          }}
        >
          <div style={{ position: "relative", fontSize: 150, fontFamily: EMOJI }}>
            {c.icon}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 220, color: "#ff2d55", fontFamily: FONT_FAMILY, lineHeight: 1 }}>
              ✕
            </div>
          </div>
          <div style={{ fontSize: 56, WebkitTextStroke: "8px #020208", paintOrder: "stroke fill" }}>BRAK: {c.label}</div>
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 440,
          transform: `translate(-50%,-50%) scale(${yearsS * (1 - windS * 0.25)})`,
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 84,
          color: "#ffe14d",
          WebkitTextStroke: "10px #020208",
          paintOrder: "stroke fill",
          whiteSpace: "nowrap",
          opacity: yearsS > 0.01 ? 1 - windS * 0.8 : 0,
        }}
      >
        ⏳ {counter.toLocaleString("pl-PL")}+ LAT
      </div>
    </div>
  );
};

// ────────────────────────────── 6. JELLYFISH ──────────────────────────────
export const JellyScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const rw = seg.beats.rewind;
  const young = seg.beats.young;
  // life cycle: adult → shrinks to a polyp (rewind) → young medusa again
  const shrink = prog(t, rw + 0.1, rw + 1.0);
  const regrow = prog(t, young - 0.6, young + 0.3, Easing.out(Easing.back(1.6)));
  const size = lerp(1, 0.18, shrink) * lerp(1, 3.2, regrow);
  const rewinding = t > rw && t < young - 0.5;
  const glow = 0.6 + 0.4 * Math.sin(t * 4);
  const pulse = 1 + 0.08 * Math.sin(t * 5);
  const enter = pop(t, st + 0.1, 12, 110);
  const cx = 540;
  const cy = 760 + Math.sin(t * 1.4) * 40 + (1 - enter) * 700;
  const tents = Array.from({ length: 9 }, (_, i) => {
    const x = cx - 160 + i * 40;
    const ph = t * 3 + i;
    return (
      <path
        key={i}
        d={`M ${x} ${cy + 40} q ${Math.sin(ph) * 40} 120 0 240 t ${Math.sin(ph + 1) * 30} 240`}
        stroke={i % 2 ? "#ff9cf0" : "#9ef3ff"}
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
        opacity={0.8}
      />
    );
  });
  const clockA = rewinding ? -(t - rw) * 1400 : -(young - 0.5 - rw) * 1400 + (t > rw ? 0 : (t - rw) * 60);
  const clockS = pop(t, rw - 0.05, 10) * (1 - prog(t, young + 0.2, young + 0.6));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <radialGradient id="abyss" cx="50%" cy="40%" r="80%">
            <stop offset="0" stopColor="#2b1066" />
            <stop offset="1" stopColor="#030014" />
          </radialGradient>
          <radialGradient id="bell" cx="50%" cy="25%" r="80%">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="0.4" stopColor="#ff9cf0" stopOpacity={0.8} />
            <stop offset="1" stopColor="#7a5cff" stopOpacity={0.4} />
          </radialGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ff9cf0" stopOpacity={0.7} />
            <stop offset="1" stopColor="#ff9cf0" stopOpacity={0} />
          </radialGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#abyss)" />
        {Array.from({ length: 50 }, (_, i) => {
          const dir = rewinding ? -3 : 1;
          const y = (((rand(i) * H + t * 40 * dir * (0.5 + rand(i + 1))) % H) + H) % H;
          return <circle key={i} cx={rand(i + 7) * W} cy={y} r={2 + rand(i + 2) * 4} fill="#9ef3ff" opacity={0.3 + 0.5 * rand(i + 3)} />;
        })}
        <g transform={`translate(${cx} ${cy}) scale(${size}) translate(${-cx} ${-cy})`}>
          <circle cx={cx} cy={cy} r={420} fill="url(#halo)" opacity={glow} />
          <g filter="url(#soft)" opacity={0.6}>
            {tents}
          </g>
          {tents}
          <path
            d={`M ${cx - 220 * pulse} ${cy + 40} C ${cx - 230 * pulse} ${cy - 260}, ${cx + 230 * pulse} ${cy - 260}, ${cx + 220 * pulse} ${cy + 40} Q ${cx + 110} ${cy + 80} ${cx} ${cy + 40} Q ${cx - 110} ${cy + 80} ${cx - 220 * pulse} ${cy + 40} Z`}
            fill="url(#bell)"
            stroke="#ffffff"
            strokeOpacity={0.6}
            strokeWidth={5}
          />
          <ellipse cx={cx} cy={cy - 90} rx={90 * pulse} ry={50} fill="#ffffff" opacity={0.35} />
        </g>
        {/* polyp stage (visible while small) */}
        <g opacity={shrink * (1 - regrow)} transform={`translate(${cx} 1250)`}>
          <path d="M 0 0 L 0 -150" stroke="#9ef3ff" strokeWidth={14} strokeLinecap="round" />
          <circle cx={0} cy={-170} r={30} fill="#ff9cf0" />
          {[-1, 1].map((s) => (
            <path key={s} d={`M 0 -60 q ${s * 50} -10 ${s * 70} -60`} stroke="#9ef3ff" strokeWidth={10} fill="none" strokeLinecap="round" />
          ))}
          <ellipse cx={0} cy={6} rx={120} ry={18} fill="#4a3a7a" />
        </g>
        {/* VHS rewind overlay */}
        {rewinding && (
          <g>
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={0} y={((i * 170 + t * 900) % H)} width={W} height={6 + (i % 3) * 4} fill="#fff" opacity={0.12} />
            ))}
            <text x={70} y={440} fontFamily={FONT_FAMILY} fontWeight={700} fontSize={90} fill="#fff" opacity={Math.sin(t * 12) > 0 ? 1 : 0.4}>
              ◀◀ REWIND
            </text>
          </g>
        )}
        {/* clock spinning backwards */}
        <g transform={`translate(880 560) scale(${clockS})`} opacity={clockS > 0.01 ? 1 : 0}>
          <circle r={110} fill="#fff" stroke="#7a5cff" strokeWidth={14} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={-4} y={-96} width={8} height={18} fill="#2b1066" transform={`rotate(${i * 30})`} />
          ))}
          <rect x={-5} y={-80} width={10} height={80} rx={5} fill="#2b1066" transform={`rotate(${clockA})`} />
          <rect x={-6} y={-55} width={12} height={55} rx={6} fill="#ff2d55" transform={`rotate(${clockA / 12})`} />
          <circle r={10} fill="#2b1066" />
        </g>
        {/* sparkles when young again */}
        {Array.from({ length: 14 }, (_, i) => {
          const d = t - young;
          if (d < 0 || d > 1.4) return null;
          const a = (i / 14) * Math.PI * 2;
          const r = 120 + d * 520;
          return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={14 * (1 - d / 1.4)} fill="#ffe14d" />;
        })}
      </Svg>
      <Tag x={540} y={1180} s={pop(t, st + 1.2, 9) * (1 - prog(t, rw, rw + 0.2))} text="Turritopsis dohrnii" bg="#7a5cff" size={52} rot={-2} />
      <Tag x={540} y={1180} s={pop(t, young + 0.1, 8)} text="✨ ZNOWU MŁODA!" bg="#ff2d8a" size={62} rot={3} />
    </div>
  );
};

// ────────────────────────────── OUTRO ──────────────────────────────
export const OutroScene: React.FC<SceneProps> = ({ t, seg }) => {
  const st = seg.from / 30;
  const items = ["🐙", "🪐", "🦈", "🍌", "🌌", "🪼"];
  const numbersAt = seg.beats.numbers;
  const comment = pop(t, seg.beats.comment, 9);
  const head = pop(t, st + 0.1, 10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Svg>
        <defs>
          <linearGradient id="outroBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff2d8a" />
            <stop offset="0.5" stopColor="#7a5cff" />
            <stop offset="1" stopColor="#1b0a4a" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#outroBg)" />
        <g transform={`translate(540 760) rotate(${-t * 15})`} opacity={0.15}>
          {Array.from({ length: 18 }, (_, i) => (
            <path key={i} d="M0 0 L -90 -1700 L 90 -1700 Z" fill="#fff" transform={`rotate(${i * 20})`} />
          ))}
        </g>
      </Svg>
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 40,
          right: 40,
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 140,
          color: "#ffe14d",
          WebkitTextStroke: "14px #1b0a4a",
          paintOrder: "stroke fill",
          transform: `scale(${head}) rotate(${Math.sin(t * 3) * 3}deg)`,
        }}
      >
        KTÓRA? 🤔
      </div>
      <div style={{ position: "absolute", top: 520, left: 70, right: 70, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40 }}>
        {items.map((e, i) => {
          const s = pop(t, Math.min(numbersAt - 0.9, st + 0.5) + i * 0.12, 9);
          const bob = Math.sin(t * 4 + i) * 10;
          return (
            <div
              key={i}
              style={{
                height: 260,
                borderRadius: 40,
                background: "rgba(255,255,255,0.95)",
                border: "8px solid #ffe14d",
                boxShadow: "0 14px 0 rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateY(${bob}px) scale(${s})`,
              }}
            >
              <div style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 100, color: "#7a5cff", lineHeight: 1 }}>{i + 1}</div>
              <div style={{ fontFamily: EMOJI, fontSize: 90, lineHeight: 1.1 }}>{e}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1210,
          transform: `translate(-50%,-50%) scale(${comment}) translateY(${Math.sin(t * 6) * 10}px)`,
          background: "#fff",
          borderRadius: 50,
          padding: "26px 50px",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 66,
          color: "#1b0a4a",
          whiteSpace: "nowrap",
          boxShadow: "0 14px 0 rgba(0,0,0,0.3)",
          opacity: comment > 0.01 ? 1 : 0,
        }}
      >
        💬 Napisz numer 1–6! 👇
      </div>
    </div>
  );
};
