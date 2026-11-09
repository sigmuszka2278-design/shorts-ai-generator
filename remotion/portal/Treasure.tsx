import React from "react";
import { rng, starPath } from "./util";

export const GEM_COLORS = ["#3df2ff", "#ff4fd8", "#9b5cff", "#38f59a", "#ff3b5c", "#3b7bff", "#e8fbff", "#ffe14d"];

/** Faceted brilliant-cut gem, centred at 0,0, ~`s` wide. */
export const Gem: React.FC<{ s: number; color: number; tw?: number }> = ({ s, color, tw = 0 }) => {
  const w = s / 2;
  const top = -s * 0.32;
  const mid = -s * 0.08;
  const bot = s * 0.5;
  return (
    <g>
      <path d={`M ${-w * 0.55} ${top} L ${w * 0.55} ${top} L ${w} ${mid} L 0 ${bot} L ${-w} ${mid} Z`} fill={`url(#gem${color})`} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.5} />
      <path d={`M ${-w * 0.55} ${top} L ${-w * 0.2} ${mid} L ${-w} ${mid} Z`} fill="#ffffff" opacity={0.45} />
      <path d={`M ${-w * 0.2} ${mid} L ${w * 0.2} ${mid} L 0 ${bot} Z`} fill="#ffffff" opacity={0.18} />
      <path d={`M ${w * 0.55} ${top} L ${w} ${mid} L ${w * 0.2} ${mid} Z`} fill="#000000" opacity={0.15} />
      <path d={`M ${w * 0.2} ${mid} L ${w} ${mid} L 0 ${bot} Z`} fill="#000000" opacity={0.25} />
      <path d={`M ${-w * 0.55} ${top} L ${w * 0.55} ${top} L ${w * 0.2} ${mid} L ${-w * 0.2} ${mid} Z`} fill="#ffffff" opacity={0.3} />
      {tw > 0.05 && <path d={starPath(-w * 0.3, top + 4, s * 0.55 * tw, s * 0.07 * tw)} fill="#ffffff" />}
    </g>
  );
};

export const GemDefs: React.FC = () => (
  <defs>
    {GEM_COLORS.map((c, i) => (
      <linearGradient key={i} id={`gem${i}`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor={c} />
        <stop offset="100%" stopColor={c} stopOpacity={0.85} />
      </linearGradient>
    ))}
    <radialGradient id="coin" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stopColor="#fffbe0" />
      <stop offset="40%" stopColor="#ffd23f" />
      <stop offset="100%" stopColor="#c27c00" />
    </radialGradient>
    <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff3a8" />
      <stop offset="50%" stopColor="#ffc31a" />
      <stop offset="100%" stopColor="#a86200" />
    </linearGradient>
    <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#c0532b" />
      <stop offset="100%" stopColor="#6b2414" />
    </linearGradient>
  </defs>
);

/** Mound height (y of the pile surface) at x. */
const mound = (x: number) => {
  const c = 1160 - 230 * Math.exp(-Math.pow((x - 540) / 330, 2));
  const side = 90 * Math.exp(-Math.pow((x - 60) / 160, 2)) + 110 * Math.exp(-Math.pow((x - 1010) / 170, 2));
  return c + 140 - side;
};

export const TARGET_GEM = { x: 785, y: 1110, s: 150, color: 1 };

/** Treasure room: warm cave, light beams, mountains of gems and coins, open chest. */
export const TreasureRoom: React.FC<{ t: number; hideTarget: boolean; chestGlow: number }> = ({ t, hideTarget, chestGlow }) => {
  const r = rng(1234);
  const items: { x: number; y: number; s: number; kind: "gem" | "coin"; color: number; rot: number; ph: number }[] = [];
  for (let i = 0; i < 260; i++) {
    const x = r() * 1240 - 80;
    const surface = mound(x);
    const y = surface + Math.pow(r(), 0.7) * (1980 - surface);
    const depthScale = 0.8 + ((y - 900) / 1000) * 0.9;
    const kind = r() < 0.58 ? "gem" : "coin";
    items.push({ x, y, s: (kind === "gem" ? 55 + r() * 60 : 46 + r() * 26) * depthScale, kind, color: Math.floor(r() * GEM_COLORS.length), rot: (r() - 0.5) * 50, ph: r() * 6.28 });
  }
  items.sort((a, b) => a.y - b.y);
  const sparkles = Array.from({ length: 34 }, () => ({ x: r() * 1080, y: 850 + r() * 1000, ph: r() * 6.28, sp: 2 + r() * 3, s: 26 + r() * 40 }));
  const chestY = 1070;
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible" }}>
      <GemDefs />
      <defs>
        <radialGradient id="cave" cx="50%" cy="52%" r="75%">
          <stop offset="0%" stopColor="#ffcf4d" />
          <stop offset="25%" stopColor="#ff8a2a" />
          <stop offset="55%" stopColor="#a8237a" />
          <stop offset="100%" stopColor="#25093f" />
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6c8" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#fff6c8" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="pillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a1160" />
          <stop offset="50%" stopColor="#6d2a9a" />
          <stop offset="100%" stopColor="#2a0b47" />
        </linearGradient>
        <linearGradient id="pileBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#b86b00" />
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={1480} height={2320} fill="url(#cave)" />
      {/* arches & pillars */}
      <path d="M -200 -200 L 1280 -200 L 1280 1000 C 1100 1000, 1080 300, 540 260 C 0 300, -20 1000, -200 1000 Z" fill="#2a0b47" opacity={0.85} />
      <path d="M 120 280 C 260 120, 820 120, 960 280" stroke="#ffcf4d" strokeWidth={12} fill="none" opacity={0.7} />
      {[60, 1020].map((x, i) => (
        <g key={i}>
          <rect x={x - 60} y={260} width={120} height={900} fill="url(#pillar)" />
          <rect x={x - 75} y={240} width={150} height={40} rx={10} fill="#ffcf4d" opacity={0.85} />
          {/* torch */}
          <ellipse cx={x} cy={520} rx={70 + 8 * Math.sin(t * 17 + i)} ry={90} fill="#ffb02e" opacity={0.35} style={{ filter: "blur(18px)" }} />
          <path d={`M ${x - 18} 520 Q ${x} ${450 - 12 * Math.sin(t * 20 + i)} ${x + 18} 520 Q ${x} 545 ${x - 18} 520 Z`} fill="#ffe36b" />
          <rect x={x - 10} y={520} width={20} height={70} rx={6} fill="#7a3b12" />
        </g>
      ))}
      {/* light beams */}
      {[300, 540, 780].map((x, i) => (
        <path
          key={i}
          d={`M ${x - 50} -100 L ${x + 50} -100 L ${x + 230 - i * 120} 1400 L ${x - 180 - i * 60} 1400 Z`}
          fill="url(#beam)"
          opacity={0.35 + 0.2 * Math.sin(t * 1.5 + i * 2)}
          style={{ mixBlendMode: "screen" }}
        />
      ))}
      {/* big crystals */}
      {[
        { x: 140, y: 1000, s: 1.4, c: 1 },
        { x: 950, y: 960, s: 1.6, c: 0 },
        { x: 250, y: 930, s: 0.8, c: 2 },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
          <ellipse cx={0} cy={-110} rx={110} ry={170} fill={GEM_COLORS[c.c]} opacity={0.3 + 0.1 * Math.sin(t * 3 + i)} style={{ filter: "blur(24px)" }} />
          <path d="M 0 0 L -55 -150 L 0 -280 L 55 -150 Z" fill={`url(#gem${c.c})`} />
          <path d="M 0 0 L 0 -280 L 55 -150 Z" fill="#000" opacity={0.18} />
          <path d="M -80 10 L -105 -90 L -70 -150 L -45 -70 Z" fill={`url(#gem${c.c})`} />
          <path d="M 70 10 L 100 -70 L 75 -120 L 45 -50 Z" fill={`url(#gem${c.c})`} />
        </g>
      ))}
      {/* back pile silhouette */}
      <path d={`M -100 2000 L -100 ${mound(-100)} ${Array.from({ length: 30 }, (_, i) => { const x = -100 + i * 45; return `L ${x} ${mound(x) + 20}`; }).join(" ")} L 1200 2000 Z`} fill="url(#pileBack)" />
      {/* chest */}
      <g transform={`translate(540 ${chestY})`}>
        <ellipse cx={0} cy={-40} rx={300} ry={220} fill="#fff1a0" opacity={0.35 + chestGlow * 0.5} style={{ filter: "blur(30px)" }} />
        <path d="M -190 -40 L -170 -200 Q 0 -280 170 -200 L 190 -40 Z" fill="url(#chestWood)" stroke="#3d1206" strokeWidth={6} />
        <path d="M -170 -200 Q 0 -280 170 -200" stroke="url(#goldBar)" strokeWidth={22} fill="none" />
        <rect x={-200} y={-50} width={400} height={170} rx={16} fill="url(#chestWood)" stroke="#3d1206" strokeWidth={6} />
        <rect x={-200} y={-50} width={400} height={30} fill="url(#goldBar)" />
        <rect x={-150} y={-50} width={30} height={170} fill="url(#goldBar)" />
        <rect x={120} y={-50} width={30} height={170} fill="url(#goldBar)" />
        <rect x={-30} y={-10} width={60} height={70} rx={10} fill="url(#goldBar)" stroke="#7a4300" strokeWidth={4} />
        <circle cx={0} cy={18} r={9} fill="#3d1206" />
        {/* gems spilling over */}
        {[-150, -100, -50, 0, 50, 100, 150, -125, -25, 75, 125].map((x, i) => (
          <g key={i} transform={`translate(${x} ${-60 - (i > 6 ? 40 : 0) - Math.abs(Math.sin(i)) * 20}) rotate(${(i % 3) * 15 - 15})`}>
            {i % 3 === 0 ? <ellipse rx={30} ry={30} fill="url(#coin)" stroke="#a86200" strokeWidth={3} /> : <Gem s={70} color={(i * 3) % GEM_COLORS.length} tw={Math.max(0, Math.sin(t * 3 + i))} />}
          </g>
        ))}
      </g>
      {/* pile items */}
      {items.map((it, i) => {
        if (Math.abs(it.x - TARGET_GEM.x) < 70 && Math.abs(it.y - TARGET_GEM.y) < 60) return null;
        const tw = Math.max(0, Math.sin(t * 2.5 + it.ph) * 1.4 - 0.4);
        return (
          <g key={i} transform={`translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.rot.toFixed(1)})`}>
            {it.kind === "gem" ? (
              <Gem s={it.s} color={it.color} tw={tw} />
            ) : (
              <>
                <ellipse rx={it.s / 2} ry={it.s / 2.6} fill="#a86200" transform="translate(0 5)" />
                <ellipse rx={it.s / 2} ry={it.s / 2.6} fill="url(#coin)" />
                <ellipse rx={it.s / 3.2} ry={it.s / 4.2} fill="none" stroke="#c27c00" strokeWidth={2.5} />
              </>
            )}
          </g>
        );
      })}
      {/* golden pedestal under the diamond that becomes a candy */}
      <g transform={`translate(${TARGET_GEM.x} ${TARGET_GEM.y + 95})`}>
        <path d="M -70 0 L 70 0 L 95 130 L -95 130 Z" fill="url(#goldBar)" stroke="#7a4300" strokeWidth={5} strokeLinejoin="round" />
        <rect x={-95} y={-22} width={190} height={30} rx={10} fill="url(#goldBar)" stroke="#7a4300" strokeWidth={5} />
        <ellipse cx={-30} cy={50} rx={14} ry={40} fill="#ffffff" opacity={0.35} />
      </g>
      {/* the diamond that becomes a candy */}
      {!hideTarget && (
        <g transform={`translate(${TARGET_GEM.x} ${TARGET_GEM.y + Math.sin(t * 3) * 6}) rotate(-8)`}>
          <ellipse cx={0} cy={0} rx={130} ry={110} fill={GEM_COLORS[TARGET_GEM.color]} opacity={0.45} style={{ filter: "blur(22px)" }} />
          <Gem s={TARGET_GEM.s} color={TARGET_GEM.color} tw={0.6 + 0.4 * Math.sin(t * 6)} />
        </g>
      )}
      {/* twinkles */}
      {sparkles.map((s, i) => {
        const k = Math.max(0, Math.sin(t * s.sp + s.ph));
        return k > 0.05 ? <path key={i} d={starPath(s.x, s.y, s.s * k, s.s * 0.16 * k)} fill="#ffffff" transform={`rotate(${t * 60} ${s.x} ${s.y})`} /> : null;
      })}
    </svg>
  );
};

/** Wrapped striped candy. */
export const Candy: React.FC<{ s: number; t: number }> = ({ s, t }) => (
  <svg viewBox="-160 -80 320 160" width={320 * s} height={160 * s} style={{ position: "absolute", left: (-160 * s), top: (-80 * s), overflow: "visible" }}>
    <defs>
      <radialGradient id="candyBall" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#ff7ad9" />
        <stop offset="100%" stopColor="#c2187a" />
      </radialGradient>
      <clipPath id="candyClip">
        <circle r={62} />
      </clipPath>
    </defs>
    <path d="M -60 0 L -150 -60 Q -130 0 -150 60 Z" fill="#ffe14d" stroke="#d99a00" strokeWidth={4} strokeLinejoin="round" />
    <path d="M 60 0 L 150 -60 Q 130 0 150 60 Z" fill="#5bf0ff" stroke="#1aa3c2" strokeWidth={4} strokeLinejoin="round" />
    <circle r={64} fill="url(#candyBall)" stroke="#a3125f" strokeWidth={4} />
    <g clipPath="url(#candyClip)" transform={`rotate(${t * 90})`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d="M 0 0 C 30 -20, 50 -50, 40 -90 L 70 -90 C 70 -40, 40 -10, 0 0 Z" fill={["#ffffff", "#7dff9b", "#ffe14d"][i % 3]} opacity={0.85} transform={`rotate(${i * 60})`} />
      ))}
    </g>
    <circle r={64} fill="none" stroke="#a3125f" strokeWidth={4} />
    <ellipse cx={-22} cy={-28} rx={20} ry={11} fill="#ffffff" opacity={0.8} transform="rotate(-30 -22 -28)" />
  </svg>
);
