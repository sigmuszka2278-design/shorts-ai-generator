import React from "react";
import { shade } from "../../lib/scene/color";
import { COLORS, P } from "./characters";
import { rnd } from "./math";

export const WORLD_W = 3840;
export const WORLD_H = 2160;
export const HORIZON = 1430;
export const GROUND = 1700;

export type SetId = "krzak" | "polana" | "dab";

// Layout of the raspberry clearing (world units)
export const SPOT = {
  berry: { x: 2080, y: 1250, r: 58 },
  bushX: 1900,
  stone: { x: 1955, top: 90 },
  backpack: { x: 2210, top: 142 },
  jumpX: 2208,
  leafPile: { x: 1580 },
  brunoBush: { x: 2580 },
  bird: { x: 1960, y: 1130 },
};

const TREE_COLORS = ["#a8ecd0", "#ffc4dc", "#ffe58f", "#c9b8ff", "#9fe3c0", "#ffcfa8"];

const LollipopTree: React.FC<{ x: number; y: number; s: number; color: string; seed: number; sway: number }> = ({
  x,
  y,
  s,
  color,
  seed,
  sway,
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={4} rx={70} ry={14} fill="rgba(40,80,40,0.12)" />
    <path d="M -22 0 Q -14 -120 -18 -230 L 18 -230 Q 14 -120 22 0 Z" fill={P("brown")} />
    <g transform={`rotate(${sway} 0 -230)`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + seed;
        return (
          <circle
            key={i}
            cx={Math.cos(a) * 70}
            cy={-330 + Math.sin(a) * 55}
            r={95 + rnd(i, seed) * 30}
            fill={color}
            stroke={shade(color, -0.12)}
            strokeWidth={3}
          />
        );
      })}
      <circle cx={0} cy={-340} r={110} fill={color} />
      <ellipse cx={-50} cy={-400} rx={45} ry={25} fill="#ffffff" opacity={0.35} transform="rotate(-25 -50 -400)" />
    </g>
  </g>
);

const Flower: React.FC<{ x: number; y: number; c: string; s?: number }> = ({ x, y, c, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M 0 0 L 0 -30" stroke="#4fae5a" strokeWidth={5} />
    {[0, 1, 2, 3, 4].map((i) => (
      <circle key={i} cx={Math.cos((i / 5) * 6.283) * 11} cy={-36 + Math.sin((i / 5) * 6.283) * 11} r={9} fill={c} />
    ))}
    <circle cx={0} cy={-36} r={7} fill="#ffd84d" />
  </g>
);

const GrassTuft: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M -30 0 Q -26 -40 -34 -64 Q -16 -38 -10 0 Q -6 -54 0 -80 Q 6 -50 10 0 Q 16 -38 34 -62 Q 24 -30 30 0 Z"
    fill="#6fcf6a"
  />
);

/** Sky, hills and pastel trees – drawn with parallax relative to the camera. */
const Backdrop: React.FC<{ time: number; set: SetId }> = ({ time, set }) => {
  const sway = Math.sin(time * 0.8) * 1.5;
  const trees: [number, number, number][] =
    set === "krzak"
      ? [
          [300, 1450, 1.2],
          [800, 1440, 0.9],
          [1250, 1460, 1.3],
          [2700, 1450, 1.0],
          [3150, 1440, 1.25],
          [3600, 1455, 0.95],
        ]
      : set === "polana"
        ? [
            [350, 1450, 1.2],
            [900, 1445, 1.0],
            [1450, 1460, 1.25],
            [3500, 1450, 1.1],
          ]
        : [
            [500, 1450, 1.1],
            [1000, 1440, 0.9],
            [2900, 1450, 1.0],
            [3400, 1455, 1.2],
          ];
  return (
    <g>
      <defs>
        <linearGradient id="ep-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fd3ff" />
          <stop offset="70%" stopColor="#d7f0ff" />
          <stop offset="100%" stopColor="#fff2d9" />
        </linearGradient>
        <linearGradient id="ep-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdeb8d" />
          <stop offset="100%" stopColor="#86cf5f" />
        </linearGradient>
        <radialGradient id="ep-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="35%" stopColor="#fff0a8" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#fff0a8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-2000} y={-1500} width={WORLD_W + 4000} height={HORIZON + 1600} fill="url(#ep-sky)" />
      <circle cx={3150} cy={420} r={520} fill="url(#ep-sun)" />
      <circle cx={3150} cy={420} r={120} fill="#fff8c9" />
      {[0, 1, 2].map((i) => {
        const cx = ((i * 1500 + time * 25) % 5200) - 700;
        return (
          <g key={i} transform={`translate(${cx} ${300 + i * 140})`} opacity={0.9}>
            <ellipse rx={170} ry={60} fill="#ffffff" />
            <circle cx={-70} cy={-30} r={70} fill="#ffffff" />
            <circle cx={40} cy={-50} r={85} fill="#ffffff" />
          </g>
        );
      })}
      <ellipse cx={600} cy={HORIZON + 40} rx={1300} ry={260} fill="#bfe9c9" />
      <ellipse cx={2400} cy={HORIZON + 60} rx={1500} ry={280} fill="#c8eebb" />
      <ellipse cx={3900} cy={HORIZON + 40} rx={1100} ry={240} fill="#bfe9c9" />
      {trees.map(([x, y, s], i) => (
        <LollipopTree key={i} x={x} y={y} s={s} color={TREE_COLORS[(i + (set === "polana" ? 2 : 0)) % TREE_COLORS.length]} seed={i * 1.7} sway={sway * (i % 2 ? 1 : -1)} />
      ))}
    </g>
  );
};

const Stream: React.FC<{ time: number }> = ({ time }) => (
  <g>
    <path d="M 2620 1430 Q 2700 1600 2760 1720 Q 2860 1920 2980 2300 L 3480 2300 Q 3260 1900 3120 1700 Q 3000 1560 2900 1430 Z" fill="#8fd8ff" />
    <path d="M 2660 1430 Q 2740 1600 2800 1720 Q 2900 1920 3020 2300" stroke="#c9efff" strokeWidth={10} fill="none" opacity={0.7} />
    {Array.from({ length: 9 }, (_, i) => {
      const k = ((time * 0.35 + i / 9) % 1);
      const y = 1460 + k * 760;
      const x = 2700 + k * 420 + Math.sin(i * 3) * 60;
      return <path key={i} d={`M ${x - 40} ${y} Q ${x} ${y - 12} ${x + 40} ${y}`} stroke="#ffffff" strokeWidth={6} fill="none" opacity={0.75 * Math.sin(k * Math.PI)} strokeLinecap="round" />;
    })}
    {[
      [2860, 1640, 1],
      [2960, 1800, 1.2],
      [3080, 1980, 1.1],
    ].map(([x, y, s], i) => (
      <ellipse key={i} cx={x} cy={y} rx={52 * s} ry={22 * s} fill={P("stone")} />
    ))}
  </g>
);

/** Raspberry bush; `berryOn` draws the arching cane that holds the big berry. */
export const RaspberryBush: React.FC<{ time: number; shake?: number }> = ({ time, shake = 0 }) => {
  const sx = SPOT.bushX;
  const wob = Math.sin(time * 30) * shake * 6;
  const leaves: [number, number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const a = rnd(i, 7) * Math.PI;
    const rr = 120 + rnd(i, 9) * 260;
    leaves.push([sx - 40 + Math.cos(a) * rr * 0.9, GROUND - 120 - Math.sin(a) * rr * 1.25, 30 + rnd(i, 11) * 22, rnd(i, 13) * 180]);
  }
  return (
    <g transform={`translate(${wob} 0)`}>
      {/* canes */}
      {[
        `M ${sx - 60} ${GROUND} Q ${sx - 140} ${GROUND - 300} ${sx - 120} ${GROUND - 560}`,
        `M ${sx} ${GROUND} Q ${sx - 20} ${GROUND - 380} ${sx + 10} ${GROUND - 640}`,
        `M ${sx + 40} ${GROUND} Q ${sx + 120} ${GROUND - 300} ${sx + 70} ${GROUND - 520}`,
        `M ${sx + 20} ${GROUND - 300} Q ${sx + 120} ${GROUND - 600} ${SPOT.berry.x} ${SPOT.berry.y - SPOT.berry.r * 1.45}`,
      ].map((d, i) => (
        <path key={i} d={d} stroke="#7a9a3a" strokeWidth={i === 3 ? 12 : 16} fill="none" strokeLinecap="round" />
      ))}
      {leaves.map(([x, y, s, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r + Math.sin(time * 1.5 + i) * 4})`}>
          <ellipse rx={s} ry={s * 0.6} fill={i % 3 === 0 ? "#57c36f" : i % 3 === 1 ? "#6fd585" : "#48b261"} stroke="#3a9c52" strokeWidth={2} />
          <path d={`M ${-s} 0 L ${s} 0`} stroke="#3a9c52" strokeWidth={2} />
        </g>
      ))}
      {/* small berries */}
      {[
        [sx - 150, GROUND - 420],
        [sx + 80, GROUND - 260],
        [sx - 60, GROUND - 600],
        [sx + 150, GROUND - 450],
        [sx - 220, GROUND - 230],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={14} fill={P("red")} />
          <circle cx={x - 4} cy={y - 5} r={4} fill="#fff" opacity={0.7} />
        </g>
      ))}
      {[
        [sx - 90, GROUND - 330],
        [sx + 30, GROUND - 520],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 1, 2, 3, 4].map((k) => (
            <circle key={k} cx={Math.cos((k / 5) * 6.283) * 9} cy={Math.sin((k / 5) * 6.283) * 9} r={8} fill="#ffffff" />
          ))}
          <circle r={5} fill="#ffd84d" />
        </g>
      ))}
    </g>
  );
};

export const SmallBush: React.FC<{ x: number; time: number; shake: number }> = ({ x, time, shake }) => {
  const wob = Math.sin(time * 28) * shake * 10;
  return (
    <g transform={`translate(${x + wob} ${GROUND})`}>
      {[
        [-90, -70, 85],
        [0, -120, 110],
        [95, -70, 85],
        [-40, -40, 80],
        [50, -40, 80],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? "#5fcf7c" : "#4fbf6c"} stroke="#3a9c52" strokeWidth={3} />
      ))}
      <circle cx={-30} cy={-150} r={10} fill="#ff9ec4" />
      <circle cx={60} cy={-110} r={10} fill="#ffe58a" />
    </g>
  );
};

export const Stone: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <ellipse cx={0} cy={4} rx={110} ry={20} fill="rgba(40,60,30,0.2)" />
    <path d="M -95 0 Q -105 -70 -40 -88 Q 20 -100 70 -80 Q 110 -60 98 0 Z" fill={P("stone")} stroke="rgba(0,0,0,0.12)" strokeWidth={3} />
    <ellipse cx={-30} cy={-70} rx={34} ry={10} fill="#ffffff" opacity={0.45} />
    <circle cx={50} cy={-30} r={8} fill={shade(COLORS.stone, -0.12)} />
  </g>
);

export const LeafPile: React.FC<{ x: number; front: boolean; squash?: number }> = ({ x, front, squash = 0 }) => {
  const colors = ["#a8e6c9", "#ff9ec4", "#ffe58a", "#ffc28a"];
  const items = Array.from({ length: 60 }, (_, i) => {
    const u = rnd(i, 21) * 2 - 1;
    const h = (1 - u * u) * (150 - squash * 40);
    const yy = -rnd(i, 23) * h;
    return { x: u * 190, y: yy, r: rnd(i, 25) * 180, c: colors[i % 4], k: i };
  });
  const list = front ? items.filter((it) => it.y > -95) : items;
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      {!front && <ellipse cx={0} cy={6} rx={220} ry={28} fill="rgba(40,60,30,0.2)" />}
      {!front && <path d={`M -210 0 Q -170 ${-150 + squash * 40} 0 ${-160 + squash * 40} Q 170 ${-150 + squash * 40} 210 0 Z`} fill="#ffd0a6" />}
      {list.map((it) => (
        <g key={it.k} transform={`translate(${it.x} ${it.y}) rotate(${it.r})`}>
          <ellipse rx={26} ry={14} fill={it.c} stroke="rgba(0,0,0,0.07)" strokeWidth={2} />
        </g>
      ))}
    </g>
  );
};

const MushroomHouse: React.FC<{ x: number; time: number }> = ({ x, time }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <ellipse cx={0} cy={6} rx={300} ry={40} fill="rgba(40,60,30,0.2)" />
    <path d="M -150 0 Q -170 -220 -120 -330 L 120 -330 Q 170 -220 150 0 Z" fill={P("cream")} stroke="rgba(0,0,0,0.1)" strokeWidth={3} />
    <path d="M -55 0 L -55 -120 Q 0 -190 55 -120 L 55 0 Z" fill="#c9875a" stroke="#9c6440" strokeWidth={5} />
    <circle cx={32} cy={-60} r={7} fill="#ffd84d" />
    <circle cx={-100} cy={-230} r={34} fill="#bfe8ff" stroke="#c9875a" strokeWidth={8} />
    <circle cx={100} cy={-230} r={34} fill="#bfe8ff" stroke="#c9875a" strokeWidth={8} />
    <path d="M -360 -300 Q -320 -620 0 -640 Q 320 -620 360 -300 Q 0 -250 -360 -300 Z" fill={P("red")} stroke="rgba(0,0,0,0.1)" strokeWidth={3} />
    {[
      [-200, -420, 40],
      [-40, -560, 46],
      [140, -470, 38],
      [260, -360, 28],
      [-290, -340, 24],
      [40, -380, 30],
    ].map(([cx, cy, r], i) => (
      <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.75} fill="#ffffff" />
    ))}
    <path d={`M 160 -620 Q 175 ${-700 - Math.sin(time * 2) * 10} 150 -760`} stroke="#ffffff" strokeWidth={0} fill="none" />
  </g>
);

const Oak: React.FC<{ x: number; time: number }> = ({ x, time }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <ellipse cx={0} cy={10} rx={520} ry={60} fill="rgba(40,60,30,0.22)" />
    <path
      d="M -330 0 Q -200 -20 -170 -200 Q -150 -500 -160 -820 L 160 -820 Q 150 -500 170 -200 Q 200 -20 330 0 Q 200 10 120 -40 Q 60 0 0 -30 Q -60 0 -120 -40 Q -200 10 -330 0 Z"
      fill={P("brown")}
      stroke="rgba(0,0,0,0.15)"
      strokeWidth={4}
    />
    <path d="M -80 -300 Q -60 -420 -90 -560 M 60 -200 Q 80 -380 50 -620 M -10 -100 Q 0 -260 -20 -400" stroke={COLORS.brownDark} strokeWidth={8} fill="none" opacity={0.5} />
    <ellipse cx={30} cy={-470} rx={40} ry={55} fill={COLORS.brownDark} opacity={0.7} />
    <g transform={`rotate(${Math.sin(time * 0.7) * 1} 0 -820)`}>
      {[
        [-420, -980, 260],
        [0, -1140, 330],
        [420, -980, 260],
        [-220, -820, 220],
        [240, -820, 220],
        [-520, -760, 170],
        [520, -760, 170],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? "#7fdcae" : "#9fe8c2"} stroke="#5cbf8c" strokeWidth={4} />
      ))}
      <ellipse cx={-120} cy={-1260} rx={120} ry={50} fill="#fff" opacity={0.3} transform="rotate(-20 -120 -1260)" />
    </g>
    {/* moss nest */}
    <ellipse cx={330} cy={-6} rx={130} ry={34} fill="#6fcf6a" />
    <ellipse cx={330} cy={-16} rx={100} ry={22} fill="#8ee08a" />
  </g>
);

export const OAK_X = 1780;
export const EGG_POS = { x: OAK_X + 330, y: GROUND - 14 };

/** Everything behind the characters for a given set. */
export const WorldBack: React.FC<{ set: SetId; time: number; bushShake?: number; smallBushShake?: number; leafSquash?: number; showStone?: boolean }> = ({
  set,
  time,
  bushShake = 0,
  smallBushShake = 0,
  leafSquash = 0,
  showStone = true,
}) => (
  <g>
    <Backdrop time={time} set={set} />
    <rect x={-2000} y={HORIZON} width={WORLD_W + 4000} height={WORLD_H - HORIZON + 1200} fill="url(#ep-meadow)" />
    {set === "krzak" && (
      <g>
        <Stream time={time} />
        <LeafPile x={SPOT.leafPile.x} front={false} squash={leafSquash} />
        <RaspberryBush time={time} shake={bushShake} />
        <SmallBush x={SPOT.brunoBush.x} time={time} shake={smallBushShake} />
        {showStone && <Stone x={SPOT.stone.x} />}
      </g>
    )}
    {set === "polana" && <MushroomHouse x={3000} time={time} />}
    {set === "dab" && <Oak x={OAK_X} time={time} />}
    {[
      [400, 1560, "#ff9ec4"],
      [700, 1800, "#c9b8ff"],
      [1150, 1620, "#ffe58a"],
      [2500, 1850, "#ff9ec4"],
      [3300, 1620, "#c9b8ff"],
      [1300, 1950, "#ffffff"],
      [3600, 1900, "#ffe58a"],
    ].map(([x, y, c], i) => (
      <Flower key={i} x={x as number} y={y as number} c={c as string} s={1.3} />
    ))}
  </g>
);

/** Foreground layer (in front of the characters). */
export const WorldFront: React.FC<{ set: SetId }> = ({ set }) => (
  <g>
    {[
      [200, 2100, 1.6],
      [900, 2140, 1.3],
      [1700, 2120, 1.7],
      [2400, 2140, 1.4],
      [3300, 2110, 1.6],
    ].map(([x, y, s], i) => (
      <GrassTuft key={i} x={x} y={y} s={s} />
    ))}
    {set === "polana" && <Flower x={1500} y={2080} c="#ff9ec4" s={2} />}
  </g>
);
