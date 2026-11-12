/**
 * Original vector art for the "Piracki Token" short – everything is drawn in SVG,
 * no game assets: token, chest, hero, flying bus, glider, island map, towns, ship.
 */
import React from "react";

export const GOLD = "#FFC93C";
export const GOLD_DARK = "#B87A00";
export const TEAL = "#0FB5AE";
export const TEAL_DARK = "#08635F";
export const INK = "#0B0B0F";

// ── token ────────────────────────────────────────────────────────

export const Token: React.FC<{ size: number; angle: number; shine?: number; id?: string }> = ({ size, angle, shine = 0, id = "tk" }) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const face = Math.abs(c) < 0.04 ? 0.04 * Math.sign(c || 1) : c;
  const edge = s * 9;
  return (
    <svg width={size} height={size} viewBox="-110 -110 220 220" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF8C9" />
          <stop offset="0.35" stopColor="#FFD54A" />
          <stop offset="0.75" stopColor="#E9A800" />
          <stop offset="1" stopColor="#8A5600" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE68A" />
          <stop offset="1" stopColor="#7A4A00" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle r="98" />
        </clipPath>
      </defs>
      {/* coin thickness */}
      <g transform={`translate(${edge} 0) scale(${face} 1)`}>
        <circle r="98" fill="#6B4300" />
      </g>
      {Math.abs(s) > 0.05 && <rect x={Math.min(0, edge)} y={-98} width={Math.abs(edge)} height={196} fill="#8A5A00" />}
      <g transform={`scale(${face} 1)`}>
        <circle r="98" fill={`url(#${id}-rim)`} />
        <circle r="90" fill={`url(#${id}-g)`} />
        {Array.from({ length: 28 }, (_, i) => (
          <rect key={i} x={-3} y={-97} width={6} height={9} rx={2} fill="#A86E00" transform={`rotate(${(i * 360) / 28})`} />
        ))}
        <circle r="72" fill="none" stroke={TEAL} strokeWidth="9" />
        <circle r="72" fill="none" stroke="#5FF2E6" strokeWidth="2" strokeDasharray="6 10" />
        <circle r="64" fill="#F0B81E" />
        {/* crossbones */}
        <g fill="#FFF3C4" stroke={GOLD_DARK} strokeWidth="3">
          {[45, -45].map((r) => (
            <g key={r} transform={`rotate(${r})`}>
              <rect x={-52} y={-6} width={104} height={12} rx={6} />
              <circle cx={-52} cy={-7} r={8} />
              <circle cx={-52} cy={7} r={8} />
              <circle cx={52} cy={-7} r={8} />
              <circle cx={52} cy={7} r={8} />
            </g>
          ))}
        </g>
        {/* skull */}
        <g stroke={GOLD_DARK} strokeWidth="3">
          <path d="M-30 -8 C-30 -42 30 -42 30 -8 C30 6 22 12 18 16 L18 26 L-18 26 L-18 16 C-22 12 -30 6 -30 -8Z" fill="#FFF3C4" />
          <ellipse cx="-12" cy="-6" rx="8" ry="9" fill={INK} stroke="none" />
          <ellipse cx="12" cy="-6" rx="8" ry="9" fill={INK} stroke="none" />
          <path d="M0 4 L-5 12 L5 12Z" fill={INK} stroke="none" />
          {[-9, -3, 3, 9].map((x) => (
            <line key={x} x1={x} y1={18} x2={x} y2={26} stroke={GOLD_DARK} strokeWidth="2.5" />
          ))}
        </g>
        {/* moving shine */}
        <g clipPath={`url(#${id}-clip)`}>
          <rect x={-40 + shine * 260 - 130} y={-140} width={34} height={280} fill="white" opacity={0.45} transform="rotate(25)" />
          <rect x={-40 + shine * 260 - 80} y={-140} width={10} height={280} fill="white" opacity={0.35} transform="rotate(25)" />
        </g>
      </g>
    </svg>
  );
};

// ── particles ────────────────────────────────────────────────────

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const Sparks: React.FC<{ t: number; count?: number; cx: number; cy: number; spread?: number; color?: string; seed?: number }> = ({
  t,
  count = 40,
  cx,
  cy,
  spread = 700,
  color = GOLD,
  seed = 1,
}) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: count }, (_, i) => {
      const a = hash(i + seed) * Math.PI * 2;
      const sp = 0.4 + hash(i * 3 + seed) * 0.6;
      const life = (t * sp + hash(i * 7 + seed)) % 1;
      const r = life * spread;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const len = 10 + 30 * sp;
      const op = Math.sin(life * Math.PI);
      return (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={x - Math.cos(a) * len}
          y2={y - Math.sin(a) * len}
          stroke={i % 5 === 0 ? "white" : color}
          strokeWidth={4 + 4 * sp}
          strokeLinecap="round"
          opacity={op}
        />
      );
    })}
  </svg>
);

export const Confetti: React.FC<{ t: number; count?: number }> = ({ t, count = 90 }) => {
  const colors = [GOLD, TEAL, "#FFFFFF", "#FF5A5F", "#7CF2E8"];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const vx = (hash(i) - 0.5) * 1900;
        const vy = -900 - hash(i + 9) * 1500;
        const x = 540 + vx * t;
        const y = 1100 + vy * t + 1700 * t * t;
        const rot = t * 900 * (hash(i + 4) - 0.5) + i * 40;
        const w = 22 + hash(i + 2) * 22;
        return (
          <rect
            key={i}
            x={x - w / 2}
            y={y - w / 4}
            width={w}
            height={w / 2}
            fill={colors[i % colors.length]}
            transform={`rotate(${rot} ${x} ${y}) scale(1 ${Math.abs(Math.cos(t * 12 + i))})`}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        );
      })}
    </svg>
  );
};

// ── chest ────────────────────────────────────────────────────────

/** Treasure chest; `open` 0–1 lifts the lid, `glow` 0–1 shows golden light. */
export const Chest: React.FC<{ size: number; open: number; glow?: number; plainLoot?: number }> = ({ size, open, glow = 0, plainLoot = 0 }) => {
  const lid = -open * 105; // degrees
  return (
    <svg width={size} height={size} viewBox="-120 -150 240 240" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="chest-light" cx="50%" cy="100%" r="100%">
          <stop offset="0" stopColor="#FFF6B0" stopOpacity="1" />
          <stop offset="0.5" stopColor={GOLD} stopOpacity="0.6" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow > 0 && (
        <g opacity={glow}>
          <path d="M-90 -10 L-170 -260 L170 -260 L90 -10Z" fill="url(#chest-light)" />
          <circle cx="0" cy="-20" r="120" fill="url(#chest-light)" opacity={0.6} />
        </g>
      )}
      <ellipse cx="0" cy="78" rx="110" ry="16" fill="black" opacity="0.3" />
      {/* body */}
      <rect x="-100" y="-20" width="200" height="95" rx="10" fill="#8B4A1C" stroke={INK} strokeWidth="6" />
      {[-60, -20, 20, 60].map((x) => (
        <line key={x} x1={x} y1={-18} x2={x} y2={72} stroke="#6A3510" strokeWidth="4" />
      ))}
      <rect x="-100" y="-20" width="200" height="16" fill={GOLD} stroke={INK} strokeWidth="5" />
      <rect x="-82" y="-20" width="20" height="95" fill={GOLD} stroke={INK} strokeWidth="5" />
      <rect x="62" y="-20" width="20" height="95" fill={GOLD} stroke={INK} strokeWidth="5" />
      {/* plain loot popping out */}
      {plainLoot > 0 && (
        <g transform={`translate(0 ${-20 - plainLoot * 70}) scale(${0.4 + plainLoot * 0.6})`} opacity={Math.min(1, plainLoot * 2)}>
          <PlainLoot />
        </g>
      )}
      {/* lid */}
      <g transform={`rotate(${lid} -100 -20)`}>
        <path d="M-100 -20 L-100 -55 Q0 -110 100 -55 L100 -20Z" fill="#9C5622" stroke={INK} strokeWidth="6" />
        <path d="M-82 -20 L-82 -66 L-62 -74 L-62 -20Z" fill={GOLD} stroke={INK} strokeWidth="5" />
        <path d="M62 -20 L62 -74 L82 -66 L82 -20Z" fill={GOLD} stroke={INK} strokeWidth="5" />
        <rect x="-14" y="-40" width="28" height="30" rx="5" fill={GOLD} stroke={INK} strokeWidth="5" />
        <circle cx="0" cy="-26" r="5" fill={INK} />
      </g>
    </svg>
  );
};

/** Ordinary, very un-pirate loot: an ammo box, a bandage roll and some planks. */
const PlainLoot: React.FC = () => (
  <g>
    <rect x="-95" y="-40" width="70" height="46" rx="6" fill="#6E7A55" stroke={INK} strokeWidth="5" />
    <rect x="-80" y="-30" width="40" height="10" fill="#C9C9A0" />
    <g transform="translate(5 -30)">
      <rect x="-22" y="-10" width="44" height="44" rx="10" fill="#F2F2F2" stroke={INK} strokeWidth="5" />
      <line x1="-22" y1="12" x2="22" y2="12" stroke="#CFCFCF" strokeWidth="4" />
    </g>
    <g transform="translate(70 -20) rotate(-20)">
      <rect x="-30" y="-8" width="62" height="14" fill="#B98A55" stroke={INK} strokeWidth="4" />
      <rect x="-26" y="10" width="62" height="14" fill="#A87A45" stroke={INK} strokeWidth="4" />
    </g>
  </g>
);

// ── hero (original chibi pirate) ─────────────────────────────────

export type Pose = "fall" | "glide" | "run" | "dance" | "slump";

export const Hero: React.FC<{ size: number; pose: Pose; t: number }> = ({ size, pose, t }) => {
  const skin = "#F2C29B";
  const shirt = TEAL;
  const pants = "#1D1D27";
  const bandana = "#E23B3B";
  const stroke = { stroke: INK, strokeWidth: 6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

  let armL = 0,
    armR = 0,
    legL = 0,
    legR = 0,
    bob = 0,
    lean = 0,
    headTilt = 0;
  switch (pose) {
    case "fall":
      armL = -60 + Math.sin(t * 9) * 8;
      armR = 60 - Math.sin(t * 9) * 8;
      legL = -25 + Math.sin(t * 7) * 6;
      legR = 25 - Math.sin(t * 7) * 6;
      break;
    case "glide":
      armL = -160;
      armR = 160;
      legL = -8 + Math.sin(t * 5) * 6;
      legR = 8 + Math.sin(t * 5 + 1) * 6;
      bob = Math.sin(t * 4) * 4;
      break;
    case "run": {
      const c = Math.sin(t * 18);
      armL = c * 55;
      armR = -c * 55;
      legL = -c * 45;
      legR = c * 45;
      bob = -Math.abs(Math.cos(t * 18)) * 10;
      lean = 10;
      break;
    }
    case "dance": {
      const c = Math.sin(t * 2 * Math.PI * 2.5);
      armL = -130 + c * 40;
      armR = 130 + c * 40;
      legL = -15 + c * 10;
      legR = 15 + c * 10;
      bob = -Math.abs(c) * 16;
      lean = c * 8;
      headTilt = c * 8;
      break;
    }
    case "slump":
      armL = 12;
      armR = -12;
      legL = -6;
      legR = 6;
      bob = 10;
      headTilt = 14;
      lean = 4;
      break;
  }

  const limb = (x: number, y: number, rot: number, len: number, w: number, fill: string, end: string) => (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - w / 2} y={y} width={w} height={len} rx={w / 2} fill={fill} {...stroke} />
      <circle cx={x} cy={y + len} r={w * 0.62} fill={end} {...stroke} />
    </g>
  );

  return (
    <svg width={size} height={size * 1.4} viewBox="-100 -150 200 280" style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${bob}) rotate(${lean})`}>
        {limb(-22, 40, legL, 52, 26, pants, "#3A2416")}
        {limb(22, 40, legR, 52, 26, pants, "#3A2416")}
        {limb(-38, -18, armL, 50, 22, shirt, skin)}
        {limb(38, -18, armR, 50, 22, shirt, skin)}
        <path d="M-44 -24 Q0 -38 44 -24 L40 46 Q0 56 -40 46Z" fill={shirt} {...stroke} />
        <path d="M-40 30 L40 30 L40 44 Q0 54 -40 44Z" fill="#5A3A1E" {...stroke} />
        <rect x="-8" y="29" width="16" height="15" rx="3" fill={GOLD} stroke={INK} strokeWidth="4" />
        <g transform={`rotate(${headTilt} 0 -30)`}>
          <circle cx="0" cy="-74" r="48" fill={skin} {...stroke} />
          <path d="M-50 -82 Q0 -138 50 -82 Q20 -92 -50 -82Z" fill={bandana} {...stroke} />
          <path d="M44 -86 L74 -100 L68 -76Z" fill={bandana} {...stroke} />
          {pose === "slump" ? (
            <>
              <path d="M-26 -70 L-10 -66" {...stroke} />
              <path d="M26 -70 L10 -66" {...stroke} />
              <path d="M-14 -46 Q0 -54 14 -46" fill="none" {...stroke} />
              <path d="M40 -100 Q48 -86 40 -80 Q32 -86 40 -100Z" fill="#7FD3FF" stroke={INK} strokeWidth="3" />
            </>
          ) : (
            <>
              <ellipse cx="-17" cy="-72" rx="7" ry="10" fill={INK} />
              <rect x="6" y="-82" width="26" height="20" rx="8" fill={INK} />
              <line x1="-44" y1="-90" x2="40" y2="-74" stroke={INK} strokeWidth="4" />
              <path d="M-16 -50 Q0 -36 16 -50" fill="none" {...stroke} />
            </>
          )}
        </g>
      </g>
    </svg>
  );
};

// ── flying bus + glider ──────────────────────────────────────────

export const FlyingBus: React.FC<{ size: number; t: number }> = ({ size, t }) => (
  <svg width={size} height={size} viewBox="-150 -170 300 300" style={{ overflow: "visible" }}>
    <ellipse cx="0" cy="-90" rx="110" ry="62" fill="#3FA9F5" stroke={INK} strokeWidth="7" />
    <path d="M-110 -90 Q0 -40 110 -90" fill="none" stroke="#1E78C2" strokeWidth="8" />
    <path d="M-60 -36 L-70 0 M60 -36 L70 0" stroke={INK} strokeWidth="6" />
    <rect x="-120" y="0" width="240" height="90" rx="16" fill="#2D7DD2" stroke={INK} strokeWidth="7" />
    {[-90, -40, 10, 60].map((x) => (
      <rect key={x} x={x} y={14} width={40} height={30} rx={6} fill="#BFE9FF" stroke={INK} strokeWidth="5" />
    ))}
    <rect x="-120" y="58" width="240" height="12" fill={GOLD} />
    <circle cx="-70" cy="92" r="16" fill={INK} />
    <circle cx="70" cy="92" r="16" fill={INK} />
    {[-1, 1].map((d) => (
      <ellipse key={d} cx={d * 135} cy={40} rx={8} ry={30 * Math.abs(Math.cos(t * 40))} fill="#999" />
    ))}
  </svg>
);

/** Pirate-sail glider canopy. */
export const Glider: React.FC<{ width: number; open: number }> = ({ width, open }) => (
  <svg width={width} height={width * 0.6} viewBox="-150 -60 300 180" style={{ overflow: "visible" }}>
    <g transform={`scale(${0.2 + 0.8 * open} ${open})`}>
      <path d="M-140 0 Q0 -80 140 0 Q70 -20 0 -16 Q-70 -20 -140 0Z" fill="#F4EBD0" stroke={INK} strokeWidth="7" />
      <path d="M-140 0 Q-70 -20 0 -16 L0 -58 Q-80 -50 -140 0Z" fill="#E9DDB8" />
      <g transform="translate(0 -30) scale(0.55)">
        <circle cx="0" cy="-6" r="18" fill={INK} />
        <path d="M-30 18 L30 34 M30 18 L-30 34" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      </g>
      <path d="M-130 2 L-40 110 M130 2 L40 110 M-50 -12 L-30 110 M50 -12 L30 110" stroke={INK} strokeWidth="3" />
    </g>
  </svg>
);

// ── island map ───────────────────────────────────────────────────

export const ISLAND_PATH =
  "M200 520 C160 380 330 250 520 280 C700 300 880 240 930 420 C990 600 900 700 950 880 C1000 1060 900 1240 760 1300 C620 1360 560 1480 400 1430 C240 1380 140 1250 160 1080 C180 920 90 840 120 720 C140 640 220 620 200 520Z";

export const IslandMap: React.FC<{ frame: number; highlight: (i: number) => number; markers: { x: number; y: number; name: string }[] }> = ({
  frame,
  highlight,
  markers,
}) => {
  // island art in a 1080×1600 box; markers given 0–1 inside it
  const chestDots = Array.from({ length: 70 }, (_, i) => ({ x: 230 + hash(i * 5) * 650, y: 380 + hash(i * 11) * 950 }));
  return (
    <svg width={1080} height={1600} viewBox="0 0 1080 1600" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="map-sea" cx="50%" cy="50%" r="70%">
          <stop offset="0" stopColor="#25D0C4" />
          <stop offset="1" stopColor="#065A63" />
        </radialGradient>
        <linearGradient id="map-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7BC86C" />
          <stop offset="1" stopColor="#3E8E4A" />
        </linearGradient>
      </defs>
      <rect x="-600" y="-600" width="2280" height="2800" fill="url(#map-sea)" />
      {Array.from({ length: 14 }, (_, i) => (
        <path
          key={i}
          d={`M${-100 + ((i * 173 + frame * 0.6) % 1300)} ${80 + i * 115} q30 -14 60 0 q30 14 60 0`}
          fill="none"
          stroke="#9FF7EE"
          strokeWidth="5"
          opacity="0.45"
          strokeLinecap="round"
        />
      ))}
      <path d={ISLAND_PATH} fill="#F3D9A0" transform="translate(540 800) scale(1.07) translate(-540 -800)" />
      <path d={ISLAND_PATH} fill="url(#map-land)" stroke="#2F6B3A" strokeWidth="6" />
      {/* mountains + river + roads */}
      <path d="M560 600 L620 500 L680 600Z M610 640 L690 520 L760 640Z" fill="#8C7A5B" stroke="#4A3B26" strokeWidth="5" />
      <path d="M620 500 L640 535 L600 535Z M690 520 L712 556 L668 556Z" fill="white" />
      <path d="M300 760 C420 820 480 700 600 800 C700 880 640 1000 780 1080" fill="none" stroke="#3CC7E6" strokeWidth="18" strokeLinecap="round" />
      <path d="M330 560 L560 760 L740 700 M560 760 L470 1080 L700 1150" fill="none" stroke="#D9C08A" strokeWidth="10" strokeDasharray="22 14" strokeLinecap="round" />
      {/* trees */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = 240 + hash(i * 13 + 1) * 620;
        const y = 420 + hash(i * 17 + 2) * 900;
        return <circle key={i} cx={x} cy={y} r={14 + hash(i) * 10} fill="#2F7D3B" opacity={0.85} />;
      })}
      {/* scattered chest spawns */}
      {chestDots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={6 + 2 * Math.sin(frame / 8 + i)} fill={GOLD} opacity={0.75} />
      ))}
      {markers.map((m, i) => {
        const h = highlight(i);
        const x = m.x * 1080;
        const y = m.y * 1600;
        const pulse = 1 + 0.15 * Math.sin(frame / 6 + i);
        return (
          <g key={m.name} transform={`translate(${x} ${y})`}>
            <circle r={60 * pulse * (0.6 + h * 0.8)} fill={GOLD} opacity={0.25 + 0.35 * h} />
            <circle r={110 * h} fill="none" stroke={GOLD} strokeWidth="6" opacity={h * (1 - ((frame / 30) % 1))} />
            <g transform={`scale(${0.8 + 0.5 * h}) translate(0 -34)`}>
              <path d="M0 40 C-30 0 -34 -10 -34 -26 A34 34 0 1 1 34 -26 C34 -10 30 0 0 40Z" fill={h > 0.5 ? GOLD : "#E6E0CF"} stroke={INK} strokeWidth="6" />
              <rect x="-14" y="-36" width="28" height="20" rx="3" fill="#8B4A1C" stroke={INK} strokeWidth="4" />
              <rect x="-14" y="-36" width="28" height="7" fill={GOLD_DARK} />
            </g>
            {h > 0.02 && (
              <g opacity={h} transform={`translate(0 ${-130 - 10 * h})`}>
                <rect x={-m.name.length * 14 - 24} y={-36} width={m.name.length * 28 + 48} height={62} rx={14} fill={INK} stroke={GOLD} strokeWidth="5" />
                <text x="0" y="10" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="40" fill="white" letterSpacing="1">
                  {m.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── isometric town for the fly-overs ─────────────────────────────

const ISO = 0.866;
export function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * ISO, (x + y) * 0.5 - z];
}

export const IsoBox: React.FC<{ x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string; roof?: string }> = ({
  x,
  y,
  w,
  d,
  h,
  top,
  left,
  right,
  roof,
}) => {
  const p = (a: number, b: number, c: number) => iso(a, b, c).join(",");
  return (
    <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
      <polygon points={[p(x, y + d, 0), p(x + w, y + d, 0), p(x + w, y + d, h), p(x, y + d, h)].join(" ")} fill={left} />
      <polygon points={[p(x + w, y, 0), p(x + w, y + d, 0), p(x + w, y + d, h), p(x + w, y, h)].join(" ")} fill={right} />
      <polygon points={[p(x, y, h), p(x + w, y, h), p(x + w, y + d, h), p(x, y + d, h)].join(" ")} fill={top} />
      {roof && (
        <polygon
          points={[p(x, y, h), p(x + w, y, h), p(x + w / 2, y + d / 2, h + Math.min(w, d) * 0.45), p(x, y + d, h)].join(" ")}
          fill={roof}
          opacity={0.95}
        />
      )}
    </g>
  );
};

export type TownTheme = "resort" | "lantern" | "logue";

const THEMES: Record<TownTheme, { ground: string; a: string[]; roof?: string }> = {
  resort: { ground: "#F3D9A0", a: ["#FFFFFF", "#D8F3F1", "#AEE5E0"] },
  lantern: { ground: "#5E8F4E", a: ["#C9452F", "#E7D2A8", "#9B2F22"], roof: "#3C2A2A" },
  logue: { ground: "#C9A36A", a: ["#8B5A2B", "#A9703A", "#6E4220"], roof: "#4A2E18" },
};

/** A small themed town drawn in isometric 3D. `glints` = gold chest sparkles shown. */
export const Town: React.FC<{ theme: TownTheme; frame: number; glints: number; seed: number }> = ({ theme, frame, glints, seed }) => {
  const th = THEMES[theme];
  const blocks: { x: number; y: number; w: number; d: number; h: number }[] = [];
  for (let gx = 0; gx < 6; gx++) {
    for (let gy = 0; gy < 9; gy++) {
      const r = hash(gx * 31 + gy * 7 + seed);
      if (r < 0.28) continue;
      blocks.push({ x: gx * 190 + 20, y: gy * 190 + 20, w: 110 + r * 50, d: 110 + hash(r * 9) * 50, h: 60 + hash(r * 5) * (theme === "resort" ? 220 : 120) });
    }
  }
  blocks.sort((a, b) => a.x + a.y - (b.x + b.y));
  const [gx0, gy0] = iso(-200, -200);
  return (
    <g>
      <polygon points={[iso(-300, -300), iso(1500, -300), iso(1500, 2000), iso(-300, 2000)].map((p) => p.join(",")).join(" ")} fill={th.ground} />
      {/* streets */}
      {Array.from({ length: 7 }, (_, i) => (
        <polygon
          key={`s${i}`}
          points={[iso(i * 190 - 30, -300), iso(i * 190 + 5, -300), iso(i * 190 + 5, 2000), iso(i * 190 - 30, 2000)].map((p) => p.join(",")).join(" ")}
          fill={theme === "resort" ? "#E7C98A" : theme === "lantern" ? "#7A6A55" : "#9C7A4A"}
        />
      ))}
      {theme === "resort" && (
        <>
          {/* pools with inflatable rings */}
          {[
            [400, 400],
            [780, 1150],
          ].map(([px, py], i) => (
            <g key={i}>
              <polygon points={[iso(px, py), iso(px + 170, py), iso(px + 170, py + 170), iso(px, py + 170)].map((p) => p.join(",")).join(" ")} fill="#2EE6E0" stroke={INK} strokeWidth="4" />
              {[0, 1, 2].map((k) => {
                const [rx, ry] = iso(px + 40 + k * 45, py + 60 + k * 30 + 10 * Math.sin(frame / 15 + k));
                return <ellipse key={k} cx={rx} cy={ry} rx={20} ry={11} fill="none" stroke={k % 2 ? "#FF5A5F" : GOLD} strokeWidth={9} />;
              })}
            </g>
          ))}
        </>
      )}
      {theme === "logue" && (
        <polygon points={[iso(1150, -300), iso(1500, -300), iso(1500, 2000), iso(1150, 2000)].map((p) => p.join(",")).join(" ")} fill="#1BA6A0" />
      )}
      {blocks.map((b, i) => (
        <IsoBox key={i} {...b} top={th.a[i % 3]} left={shade(th.a[i % 3], 0.8)} right={shade(th.a[i % 3], 0.65)} roof={th.roof} />
      ))}
      {theme === "lantern" &&
        blocks.slice(0, 18).map((b, i) => {
          const [lx, ly] = iso(b.x + b.w / 2, b.y + b.d, b.h * 0.7);
          const sw = Math.sin(frame / 12 + i) * 4;
          return (
            <g key={`l${i}`}>
              <circle cx={lx + sw} cy={ly} r={26} fill="#FFB347" opacity={0.35} />
              <rect x={lx - 9 + sw} y={ly - 12} width={18} height={24} rx={7} fill="#FF4D2E" stroke={INK} strokeWidth="3" />
            </g>
          );
        })}
      {Array.from({ length: glints }, (_, i) => {
        const b = blocks[i % blocks.length];
        const [cx, cy] = iso(b.x + hash(i * 3) * b.w, b.y + hash(i * 5) * b.d, i % 2 ? b.h : 0);
        const tw = 0.6 + 0.4 * Math.sin(frame / 5 + i * 1.7);
        return (
          <g key={`g${i}`} transform={`translate(${cx} ${cy}) scale(${tw})`}>
            <circle r={22} fill={GOLD} opacity={0.35} />
            <path d="M0 -18 L4 -4 L18 0 L4 4 L0 18 L-4 4 L-18 0 L-4 -4Z" fill="#FFF3B0" />
          </g>
        );
      })}
      <circle cx={gx0} cy={gy0} r={0} />
    </g>
  );
};

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

// ── ship, flag, scroll ───────────────────────────────────────────

export const Ship: React.FC<{ width: number; t: number }> = ({ width, t }) => {
  const wave = (x: number) => Math.sin(t * 4 + x) * 6;
  return (
    <svg width={width} height={width} viewBox="-200 -260 400 400" style={{ overflow: "visible" }}>
      <g fill={INK}>
        <path d="M-180 40 L180 40 L140 110 L-150 110Z" />
        <rect x="-8" y="-230" width="14" height="275" />
        <rect x="-110" y="-160" width="14" height="200" />
        <path d={`M8 -215 Q${90 + wave(1)} -150 8 -60Z`} />
        <path d={`M-96 -150 Q${-30 + wave(2)} -100 -96 -30Z`} />
        <path d="M150 40 L200 0 L190 40Z" />
        <path d={`M8 -230 L${70 + wave(3)} ${-220 + wave(4) * 0.4} L8 -205Z`} />
      </g>
    </svg>
  );
};

export const SkullFlag: React.FC<{ width: number; t: number }> = ({ width, t }) => {
  const pts = Array.from({ length: 11 }, (_, i) => {
    const x = i * 30;
    return [x, Math.sin(t * 6 - i * 0.6) * (i * 1.6)];
  });
  const top = pts.map(([x, y]) => `${x},${y}`).join(" L");
  const bottom = pts
    .slice()
    .reverse()
    .map(([x, y]) => `${x},${y + 190}`)
    .join(" L");
  const mid = pts[5][1];
  return (
    <svg width={width} height={width * 0.9} viewBox="-20 -30 340 260" style={{ overflow: "visible" }}>
      <rect x="-14" y="-30" width="10" height="320" fill="#5A3A1E" />
      <path d={`M${top} L${bottom}Z`} fill={INK} stroke="#2A2A33" strokeWidth="4" />
      <g transform={`translate(150 ${95 + mid})`} fill="white">
        <circle cx="0" cy="-14" r="34" />
        <rect x="-20" y="10" width="40" height="22" rx="6" />
        <circle cx="-13" cy="-14" r="10" fill={INK} />
        <circle cx="13" cy="-14" r="10" fill={INK} />
        <path d="M-60 40 L60 80 M60 40 L-60 80" stroke="white" strokeWidth="14" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/** Treasure-map scroll icon. */
export const ScrollIcon: React.FC<{ size: number; unroll: number }> = ({ size, unroll }) => (
  <svg width={size} height={size} viewBox="-160 -130 320 260" style={{ overflow: "visible" }}>
    <g transform={`scale(${0.15 + 0.85 * unroll} 1)`}>
      <rect x="-130" y="-100" width="260" height="200" fill="#F4E2B0" stroke={INK} strokeWidth="7" />
      <path d="M-100 60 C-60 0 -20 70 20 10 C50 -30 70 0 90 -40" fill="none" stroke="#A0522D" strokeWidth="7" strokeDasharray="14 10" />
      <path d="M70 -60 L110 -20 M110 -60 L70 -20" stroke="#E23B3B" strokeWidth="12" strokeLinecap="round" />
      <path d="M-110 -70 Q-90 -90 -70 -70" fill="none" stroke="#5FA35A" strokeWidth="8" />
    </g>
    {[-1, 1].map((d) => (
      <g key={d} transform={`translate(${d * (20 + 130 * unroll)} 0)`}>
        <rect x="-18" y="-115" width="36" height="230" rx="18" fill="#D9B46A" stroke={INK} strokeWidth="7" />
        <rect x="-8" y="-128" width="16" height="256" rx="8" fill="#8B4A1C" stroke={INK} strokeWidth="5" />
      </g>
    ))}
  </svg>
);
