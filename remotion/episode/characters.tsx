import React from "react";
import { shade } from "../../lib/scene/color";
import { rnd } from "./math";

// ── shared paints ───────────────────────────────────────────────
export const COLORS = {
  orange: "#ff8a3d",
  orangeDark: "#d9602a",
  cream: "#fff3e3",
  yellow: "#ffd84d",
  green: "#3ec46d",
  brown: "#7b4a2c",
  brownDark: "#5a321c",
  tan: "#e8b47e",
  blue: "#4c8ff5",
  red: "#e6284f",
  leaf: "#5cc97a",
  stone: "#b8c1cc",
  egg: "#a7dcff",
  bird: "#ffe04f",
  ink: "#3a2a2e",
};

type ColorName = keyof typeof COLORS;

/** Radial "soft 3D" gradients used by every shape (objectBoundingBox units). */
export const PaintDefs: React.FC = () => (
  <defs>
    {(Object.keys(COLORS) as ColorName[]).map((name) => {
      const c = COLORS[name];
      return (
        <radialGradient key={name} id={`ep-${name}`} cx="38%" cy="30%" r="75%" fx="32%" fy="24%">
          <stop offset="0%" stopColor={shade(c, 0.45)} />
          <stop offset="45%" stopColor={c} />
          <stop offset="90%" stopColor={shade(c, -0.22)} />
          <stop offset="100%" stopColor={shade(c, -0.3)} />
        </radialGradient>
      );
    })}
    <radialGradient id="ep-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fffbe6" stopOpacity={0.95} />
      <stop offset="100%" stopColor="#fffbe6" stopOpacity={0} />
    </radialGradient>
  </defs>
);

export const P = (name: ColorName) => `url(#ep-${name})`;
const EDGE = { stroke: "rgba(60,30,20,0.18)", strokeWidth: 2 };

/** Soft contact shadow on the ground. */
export const Shadow: React.FC<{ x: number; y: number; w: number; lift?: number }> = ({ x, y, w, lift = 0 }) => {
  const k = Math.max(0.35, 1 - lift / 400);
  return <ellipse cx={x} cy={y} rx={(w / 2) * k} ry={w * 0.09 * k} fill="rgba(40,60,30,0.22)" />;
};

// ── Tosia ───────────────────────────────────────────────────────
export type Eyes = "open" | "happy" | "closed" | "wide" | "cross" | "squint" | "sad";
export type Mouth = "smile" | "grin" | "o" | "sad" | "lick" | "flat" | "sneeze";
export type ArmPose = { l: number; r: number; lLen?: number; rLen?: number }; // degrees: 0 = down, 180 = straight up; positive = outward

export interface TosiaPose {
  x: number;
  y: number; // ground level under her feet (world)
  lift?: number; // height above ground
  scale?: number;
  facing?: number; // 1 or -1 (mirrors the pose)
  rot?: number; // whole-body rotation (deg, around belly)
  spin?: number; // spin around vertical axis, 0..1 = full turn
  squash?: number; // 1 = normal
  sink?: number; // hide lower part (leaf pile) – px
  ears?: number; // 0 up .. 1 droopy
  eyes?: Eyes;
  look?: [number, number]; // pupil offset -1..1
  eyeScale?: number;
  berryEyes?: boolean;
  mouth?: Mouth;
  talk?: number; // 0..1 mouth openness while talking
  arms?: ArmPose;
  headTilt?: number;
  tailWag?: number; // degrees
  scarfWind?: number; // -1..1, lifts scarf end (flight)
  scarfWave?: number; // time for flutter
  wrapped?: boolean; // wrapped in her scarf (sad)
  nose?: boolean; // wrinkled nose
  leafOnNose?: number; // 0 hidden, 1 on nose
  leafOnEar?: boolean;
  holding?: React.ReactNode; // drawn in the reaching (left) paw
  holdingR?: React.ReactNode;
}

const TOSIA_SCARF_LEN = 360;

function scarfPoints(wind: number, wave: number, lift: number) {
  // chain from the neck knot; local coordinates, feet at y=0
  const pts: [number, number][] = [[46, -132]];
  const n = 18;
  const step = TOSIA_SCARF_LEN / n;
  let x = 46;
  let y = -132;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    // hanging: points down; wind: swings back (to -x) and up
    const base = (1 - wind) * (Math.PI / 2 - 0.25) + wind * (Math.PI * 0.92 + 0.15);
    const flutter = Math.sin(wave * 7 - s * 5) * (0.12 + wind * 0.35) * s;
    const a = base + flutter + s * 0.25 * (1 - wind);
    let nx = x + Math.cos(a) * step;
    let ny = y + Math.sin(a) * step;
    const ground = lift - 7;
    if (ny > ground) {
      ny = ground;
      nx = x - step * 0.95; // trails behind on the ground
    }
    x = nx;
    y = ny;
    pts.push([x, y]);
  }
  return pts;
}

const polyPath = (pts: [number, number][]) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
};

const Arm: React.FC<{ x: number; y: number; angle: number; side: -1 | 1; len?: number; children?: React.ReactNode; color: string; tip: string }> = ({
  x,
  y,
  angle,
  side,
  len = 1,
  children,
  color,
  tip,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${-side * angle})`}>
    <ellipse cx={0} cy={30 * len} rx={15} ry={34 * len} fill={color} {...EDGE} />
    <circle cx={0} cy={60 * len} r={15} fill={tip} {...EDGE} />
    {children && <g transform={`translate(0 ${74 * len}) rotate(${side * angle})`}>{children}</g>}
  </g>
);

const TosiaEyes: React.FC<{ eyes: Eyes; look: [number, number]; blink: number; scale: number; berry: boolean }> = ({
  eyes,
  look,
  blink,
  scale,
  berry,
}) => (
  <g>
    {[-1, 1].map((side) => {
      const cx = side * 33;
      const cy = -6;
      if (eyes === "happy" || eyes === "closed" || (blink > 0.6 && eyes !== "cross")) {
        const d =
          eyes === "closed" || (blink > 0.6 && eyes !== "happy")
            ? `M ${cx - 17} ${cy + 2} Q ${cx} ${cy + 12} ${cx + 17} ${cy + 2}`
            : `M ${cx - 17} ${cy + 6} Q ${cx} ${cy - 14} ${cx + 17} ${cy + 6}`;
        return <path key={side} d={d} stroke={COLORS.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
      }
      const s = scale * (eyes === "wide" ? 1.15 : 1);
      const squint = eyes === "squint" ? 0.55 : 1;
      const px = eyes === "cross" ? -side * 7 : look[0] * 6;
      const py = eyes === "cross" ? 3 : look[1] * 6;
      return (
        <g key={side} transform={`translate(${cx} ${cy}) scale(${s} ${s * squint})`}>
          <ellipse rx={21} ry={25} fill="#ffffff" stroke="rgba(60,30,20,0.25)" strokeWidth={2} />
          <circle cx={px} cy={py + 2} r={16} fill={P("green")} />
          <circle cx={px} cy={py + 3} r={8.5} fill={COLORS.ink} />
          <circle cx={px - 6} cy={py - 6} r={6} fill="#fff" />
          <circle cx={px + 6} cy={py + 8} r={2.6} fill="#fff" />
          {berry && <circle cx={px + 2} cy={py + 1} r={4} fill={COLORS.red} opacity={0.9} />}
          {eyes === "sad" && <path d="M -22 -26 L 18 -18" stroke={COLORS.orangeDark} strokeWidth={6} strokeLinecap="round" transform={`scale(${-side} 1)`} />}
          {eyes === "squint" && <rect x={-24} y={-30} width={48} height={14} fill={COLORS.orange} />}
        </g>
      );
    })}
  </g>
);

const TosiaMouth: React.FC<{ mouth: Mouth; talk: number }> = ({ mouth, talk }) => {
  const y = 40;
  if (talk > 0.05 && mouth !== "sneeze") {
    const h = 6 + talk * 18;
    return (
      <g>
        <ellipse cx={0} cy={y + h * 0.35} rx={13 + talk * 3} ry={h * 0.6} fill="#7a2338" />
        <ellipse cx={0} cy={y + h * 0.6} rx={8} ry={h * 0.25} fill="#ff7d9a" />
      </g>
    );
  }
  switch (mouth) {
    case "grin":
      return (
        <g>
          <path d={`M -20 ${y - 2} Q 0 ${y + 28} 20 ${y - 2} Z`} fill="#7a2338" />
          <ellipse cx={0} cy={y + 13} rx={9} ry={5} fill="#ff7d9a" />
        </g>
      );
    case "o":
      return <ellipse cx={0} cy={y + 6} rx={9} ry={11} fill="#7a2338" />;
    case "sad":
      return <path d={`M -13 ${y + 10} Q 0 ${y} 13 ${y + 10}`} stroke={COLORS.ink} strokeWidth={5} fill="none" strokeLinecap="round" />;
    case "flat":
      return <path d={`M -10 ${y + 5} L 10 ${y + 5}`} stroke={COLORS.ink} strokeWidth={5} strokeLinecap="round" />;
    case "lick":
      return (
        <g>
          <path d={`M -14 ${y} Q 0 ${y + 12} 14 ${y}`} stroke={COLORS.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M 2 ${y + 6} Q 10 ${y + 26} 20 ${y + 8} Z`} fill="#ff7d9a" stroke="#d84d6e" strokeWidth={2} />
        </g>
      );
    case "sneeze":
      return <ellipse cx={0} cy={y + 8} rx={18} ry={14} fill="#7a2338" />;
    default:
      return <path d={`M -15 ${y} Q 0 ${y + 16} 15 ${y}`} stroke={COLORS.ink} strokeWidth={5} fill="none" strokeLinecap="round" />;
  }
};

export const Tosia: React.FC<{ pose: TosiaPose; time: number; withShadow?: boolean; base?: number }> = ({ pose, time, withShadow = true, base = 0 }) => {
  const {
    x,
    y,
    lift = 0,
    scale = 1,
    facing = 1,
    rot = 0,
    spin = 0,
    squash = 1,
    sink = 0,
    ears = 0,
    eyes = "open",
    look = [0, 0],
    eyeScale = 1,
    berryEyes = false,
    mouth = "smile",
    talk = 0,
    arms = { l: 12, r: 12 },
    headTilt = 0,
    tailWag = Math.sin(time * 4) * 8,
    scarfWind = 0,
    scarfWave = time,
    wrapped = false,
    nose = false,
    leafOnNose = 0,
    leafOnEar = false,
  } = pose;
  const blinkT = (time * 30) % 110;
  const blink = blinkT < 5 ? 1 : 0;
  const spinX = Math.cos(spin * Math.PI * 2);
  const sx = facing * (Math.abs(spinX) < 0.08 ? 0.08 * Math.sign(spinX || 1) : spinX);
  const scarfPts = scarfPoints(scarfWind, scarfWave, (lift - base) / scale + sink / scale);
  const backFacing = spinX < 0;

  const body = (
    <g>
      {/* tail */}
      <g transform={`rotate(${tailWag} 30 -60)`}>
        <clipPath id="tosia-tail">
          <ellipse cx={92} cy={-118} rx={40} ry={88} transform="rotate(38 92 -118)" />
        </clipPath>
        <g clipPath="url(#tosia-tail)">
          <ellipse cx={92} cy={-118} rx={40} ry={88} transform="rotate(38 92 -118)" fill={P("orange")} />
          <ellipse cx={148} cy={-184} rx={52} ry={48} fill={P("cream")} />
        </g>
      </g>
      {/* scarf tail behind the body */}
      <path d={polyPath(scarfPts)} stroke={P("yellow")} strokeWidth={28} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={polyPath(scarfPts)} stroke="#ffffff" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="0 27" />
      {/* feet */}
      <ellipse cx={-30} cy={-12} rx={28} ry={15} fill={P("orangeDark")} {...EDGE} />
      <ellipse cx={30} cy={-12} rx={28} ry={15} fill={P("orangeDark")} {...EDGE} />
      {/* body */}
      <ellipse cx={0} cy={-84} rx={62} ry={72} fill={P("orange")} {...EDGE} />
      {!backFacing && <ellipse cx={0} cy={-72} rx={38} ry={46} fill={P("cream")} />}
      {/* arms */}
      <Arm x={-50} y={-122} angle={arms.l} side={-1} len={arms.lLen} color={P("orange")} tip={P("orangeDark")}>
        {pose.holding}
      </Arm>
      <Arm x={50} y={-122} angle={arms.r} side={1} len={arms.rLen} color={P("orange")} tip={P("orangeDark")}>
        {pose.holdingR}
      </Arm>
      {/* scarf knot */}
      <path d="M -60 -144 Q 0 -112 60 -144 L 62 -118 Q 0 -86 -62 -118 Z" fill={P("yellow")} {...EDGE} />
      {[-40, -14, 14, 40].map((dx) => (
        <circle key={dx} cx={dx} cy={-124 + Math.abs(dx) * -0.28 + 10} r={5} fill="#fff" />
      ))}
      <ellipse cx={46} cy={-122} rx={18} ry={15} fill={P("yellow")} {...EDGE} />
      {wrapped && (
        <g>
          <path d="M -66 -110 Q 0 -70 66 -110 L 68 -64 Q 0 -24 -68 -64 Z" fill={P("yellow")} {...EDGE} />
          {[-44, -15, 15, 44].map((dx) => (
            <circle key={dx} cx={dx} cy={-70 + Math.abs(dx) * -0.3 + 10} r={6} fill="#fff" />
          ))}
        </g>
      )}
      {/* head */}
      <g transform={`translate(0 -196) rotate(${headTilt})`}>
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * 48} -46) rotate(${side * (12 + ears * 72)})`}>
            <path d="M -30 8 L 0 -78 L 30 8 Z" fill={P("orange")} {...EDGE} strokeLinejoin="round" />
            <path d="M -15 2 L 0 -50 L 15 2 Z" fill={P("cream")} />
            <path d="M -9 -52 L 0 -78 L 9 -52 Z" fill={COLORS.brownDark} />
          </g>
        ))}
        <ellipse cx={0} cy={0} rx={84} ry={74} fill={P("orange")} {...EDGE} />
        {!backFacing && (
          <g transform={`scale(${eyeScale})`}>
            <path d="M -76 14 Q -40 70 0 66 Q 40 70 76 14 Q 40 36 0 20 Q -40 36 -76 14 Z" fill={P("cream")} />
            <TosiaEyes eyes={eyes} look={look} blink={blink} scale={1} berry={berryEyes} />
            <ellipse cx={-56} cy={26} rx={13} ry={8} fill="#ff7096" opacity={0.45} />
            <ellipse cx={56} cy={26} rx={13} ry={8} fill="#ff7096" opacity={0.45} />
            <ellipse cx={0} cy={23} rx={11} ry={8} fill={COLORS.ink} />
            <ellipse cx={-3} cy={20} rx={4} ry={2.5} fill="#fff" opacity={0.8} />
            {nose && <path d="M -10 8 Q 0 4 10 8 M -8 13 Q 0 9 8 13" stroke={COLORS.orangeDark} strokeWidth={3} fill="none" />}
            <TosiaMouth mouth={mouth} talk={talk} />
            {leafOnNose > 0 && (
              <g transform={`translate(${4 + (1 - leafOnNose) * 30} ${8 - (1 - leafOnNose) * 140}) rotate(${-30 + leafOnNose * 40})`}>
                <ellipse rx={20} ry={11} fill="#ff9ec4" stroke="#e5709e" strokeWidth={2} />
                <path d="M -18 0 L 18 0" stroke="#e5709e" strokeWidth={2} />
              </g>
            )}
          </g>
        )}
        {leafOnEar && (
          <g transform="translate(62 -84) rotate(30)">
            <ellipse rx={18} ry={10} fill="#a8e6c9" stroke="#6fc19c" strokeWidth={2} />
          </g>
        )}
      </g>
    </g>
  );

  const sq = squash;
  return (
    <g>
      {withShadow && sink === 0 && <Shadow x={x} y={y - base} w={150 * scale} lift={Math.max(0, lift - base)} />}
      <g transform={`translate(${x} ${y - lift + sink}) scale(${scale}) rotate(${rot} 0 -100) scale(${sx / Math.sqrt(sq)} ${sq})`}>
        {body}
      </g>
    </g>
  );
};

// ── Bruno ───────────────────────────────────────────────────────
export interface BrunoPose {
  x: number;
  y: number;
  lift?: number;
  scale?: number;
  sway?: number; // deg
  eyes?: "open" | "happy" | "closed";
  look?: [number, number];
  mouth?: "smile" | "o" | "grin";
  talk?: number;
  arms?: ArmPose;
  backpack?: boolean;
  belly?: number; // tummy wobble 0..1
  bulb?: number; // 0..1 light bulb above head
  cleaning?: number; // glasses cleaning progress (arm to face)
  holdingR?: React.ReactNode;
  holdingL?: React.ReactNode;
  peek?: number; // 0 fully visible .. 1 hidden in bush (only nose)
}

const SPINE_PATH = (() => {
  const pts: string[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (0.98 + (i / n) * 1.04);
    const r = i % 2 === 0 ? 138 : 112;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(-120 + Math.sin(a) * r * 0.95).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
})();

export const Bruno: React.FC<{ pose: BrunoPose; time: number }> = ({ pose, time }) => {
  const {
    x,
    y,
    lift = 0,
    scale = 1,
    sway = 0,
    eyes = "open",
    look = [0, 0],
    mouth = "smile",
    talk = 0,
    arms = { l: 18, r: 18 },
    backpack = true,
    belly = 0,
    bulb = 0,
    cleaning = 0,
  } = pose;
  const blinkT = (time * 30 + 40) % 130;
  const blinking = blinkT < 5;
  const wob = belly * Math.sin(time * 40) * 4;
  return (
    <g>
      <Shadow x={x} y={y} w={220 * scale} lift={lift} />
      <g transform={`translate(${x} ${y - lift}) scale(${scale}) rotate(${sway} 0 0)`}>
        {/* backpack behind */}
        {backpack && <rect x={-104} y={-178} width={70} height={92} rx={22} fill={P("blue")} {...EDGE} />}
        {/* spines */}
        <path d={SPINE_PATH} fill={P("brownDark")} stroke="rgba(40,20,10,0.25)" strokeWidth={3} strokeLinejoin="round" />
        {[
          [-110, -170, 40],
          [-40, -232, -10],
          [70, -215, 25],
          [118, -140, 70],
        ].map(([lx, ly, r], i) => (
          <g key={i} transform={`translate(${lx} ${ly}) rotate(${r})`}>
            <ellipse rx={20} ry={10} fill={P("leaf")} />
            <path d="M -18 0 L 18 0" stroke="#2f9a52" strokeWidth={2} />
          </g>
        ))}
        {/* feet */}
        <ellipse cx={-38} cy={-10} rx={30} ry={14} fill={P("brown")} {...EDGE} />
        <ellipse cx={38} cy={-10} rx={30} ry={14} fill={P("brown")} {...EDGE} />
        {/* body front */}
        <ellipse cx={0} cy={-96 + wob * 0.3} rx={92 + wob} ry={88} fill={P("tan")} {...EDGE} />
        <ellipse cx={0} cy={-70 + wob * 0.3} rx={56 + wob} ry={46} fill={P("cream")} opacity={0.7} />
        {backpack && (
          <g stroke={COLORS.blue} strokeWidth={10} strokeLinecap="round" fill="none">
            <path d="M -62 -150 Q -50 -100 -60 -50" />
            <path d="M 62 -150 Q 50 -100 60 -50" />
          </g>
        )}
        {/* arms */}
        <Arm x={-80} y={-104} angle={arms.l} side={-1} len={0.8} color={P("tan")} tip={P("brown")}>
          {pose.holdingL}
        </Arm>
        <Arm x={80} y={-104} angle={cleaning > 0 ? 150 * cleaning + arms.r * (1 - cleaning) : arms.r} side={1} len={0.8} color={P("tan")} tip={P("brown")}>
          {pose.holdingR}
        </Arm>
        {/* face */}
        <ellipse cx={-60} cy={-196} rx={16} ry={14} fill={P("tan")} {...EDGE} />
        <ellipse cx={60} cy={-196} rx={16} ry={14} fill={P("tan")} {...EDGE} />
        <ellipse cx={0} cy={-160} rx={70} ry={56} fill={P("tan")} />
        <ellipse cx={-44} cy={-136} rx={12} ry={7} fill="#ff7096" opacity={0.4} />
        <ellipse cx={44} cy={-136} rx={12} ry={7} fill="#ff7096" opacity={0.4} />
        {[-1, 1].map((side) =>
          eyes === "happy" || blinking || eyes === "closed" ? (
            <path
              key={side}
              d={eyes === "happy" ? `M ${side * 26 - 10} -164 Q ${side * 26} -176 ${side * 26 + 10} -164` : `M ${side * 26 - 10} -168 Q ${side * 26} -160 ${side * 26 + 10} -168`}
              stroke={COLORS.ink}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <g key={side}>
              <ellipse cx={side * 26 + look[0] * 4} cy={-168 + look[1] * 4} rx={8} ry={10} fill={COLORS.ink} />
              <circle cx={side * 26 - 3 + look[0] * 4} cy={-172 + look[1] * 4} r={3} fill="#fff" />
            </g>
          ),
        )}
        {/* glasses */}
        <g fill="rgba(255,255,255,0.18)" stroke="#3b3f4a" strokeWidth={5}>
          <circle cx={-26} cy={-168} r={23} />
          <circle cx={26} cy={-168} r={23} />
          <path d="M -3 -170 Q 0 -176 3 -170" fill="none" />
        </g>
        <path d={`M -38 -182 L -30 -186`} stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        <path d={`M 14 -182 L 22 -186`} stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        {/* snout */}
        <ellipse cx={0} cy={-134} rx={24} ry={17} fill={P("cream")} />
        <circle cx={0} cy={-140} r={10} fill={COLORS.ink} />
        <circle cx={-3} cy={-143} r={3} fill="#fff" />
        {talk > 0.05 ? (
          <ellipse cx={0} cy={-116 + talk * 2} rx={10} ry={3 + talk * 9} fill="#7a2338" />
        ) : mouth === "o" ? (
          <ellipse cx={0} cy={-114} rx={7} ry={8} fill="#7a2338" />
        ) : mouth === "grin" ? (
          <path d="M -16 -122 Q 0 -100 16 -122 Z" fill="#7a2338" />
        ) : (
          <path d="M -12 -120 Q 0 -110 12 -120" stroke={COLORS.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
        )}
        {/* light bulb */}
        {bulb > 0 && (
          <g transform={`translate(0 ${-300 - (1 - bulb) * 40}) scale(${bulb})`} opacity={bulb}>
            <circle r={80} fill="url(#ep-glow)" />
            <circle r={30} fill={P("yellow")} {...EDGE} />
            <rect x={-14} y={24} width={28} height={20} rx={5} fill="#c9ced6" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d="M 0 -44 L 0 -62"
                stroke="#ffcf33"
                strokeWidth={6}
                strokeLinecap="round"
                transform={`rotate(${-75 + i * 30})`}
              />
            ))}
          </g>
        )}
      </g>
    </g>
  );
};

// ── props ───────────────────────────────────────────────────────
const DRUPES: [number, number][] = (() => {
  const out: [number, number][] = [];
  const rows = [3, 4, 5, 4, 3, 2];
  rows.forEach((count, r) => {
    for (let i = 0; i < count; i++) {
      out.push([(i - (count - 1) / 2) * 0.34, -0.55 + r * 0.27]);
    }
  });
  return out;
})();

/** The big raspberry. Origin = centre. `split` 0..1 opens it into two juicy halves. */
export const Raspberry: React.FC<{ r: number; time: number; sparkle?: number; split?: number; gap?: number; id?: string; noStem?: boolean }> = ({
  r,
  time,
  sparkle = 0,
  split = 0,
  gap: gapOverride,
  id = "rb",
  noStem,
}) => {
  const drupes = (
    <g>
      <ellipse cx={0} cy={0.1 * r} rx={0.92 * r} ry={0.98 * r} fill={P("red")} />
      {DRUPES.map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={dx * r * 1.2} cy={dy * r * 1.15 + 0.12 * r} r={0.24 * r} fill={P("red")} stroke="rgba(120,0,30,0.25)" strokeWidth={1.5} />
          <circle cx={dx * r * 1.2 - 0.07 * r} cy={dy * r * 1.15 + 0.05 * r} r={0.06 * r} fill="#fff" opacity={0.75} />
        </g>
      ))}
    </g>
  );
  const stem = noStem ? null : (
    <g>
      <path d={`M 0 ${-0.95 * r} L 0 ${-1.45 * r}`} stroke="#3f8f3a" strokeWidth={0.1 * r} strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={0} cy={-0.95 * r} rx={0.12 * r} ry={0.32 * r} fill={P("leaf")} transform={`rotate(${-90 + i * 45} 0 ${-0.95 * r}) translate(0 ${-0.18 * r})`} />
      ))}
    </g>
  );
  const sweep = ((time * 0.8) % 1.6) - 0.3;
  if (split > 0) {
    const gap = gapOverride ?? split * r * 1.1;
    const tilt = split * 22;
    return (
      <g>
        <clipPath id={`${id}-l`}>
          <rect x={-2 * r} y={-2 * r} width={2 * r} height={4 * r} />
        </clipPath>
        <clipPath id={`${id}-r`}>
          <rect x={0} y={-2 * r} width={2 * r} height={4 * r} />
        </clipPath>
        <g transform={`translate(${-gap} 0) rotate(${-tilt})`}>
          <g clipPath={`url(#${id}-l)`}>{drupes}</g>
          <ellipse cx={-2} cy={0.1 * r} rx={0.16 * r} ry={0.85 * r} fill="#ff6f8e" />
        </g>
        <g transform={`translate(${gap} 0) rotate(${tilt})`}>
          <g clipPath={`url(#${id}-r)`}>{drupes}</g>
          <ellipse cx={2} cy={0.1 * r} rx={0.16 * r} ry={0.85 * r} fill="#ff6f8e" />
        </g>
        {split < 1 &&
          [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            const d = split * r * (1.2 + rnd(i) * 0.8);
            return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d - split * r * 0.4} r={0.08 * r * (1 - split)} fill="#ff4d73" />;
          })}
      </g>
    );
  }
  return (
    <g>
      {sparkle > 0 && <circle r={r * 2.2} fill="url(#ep-glow)" opacity={sparkle * 0.8} />}
      {stem}
      {drupes}
      {sparkle > 0 && (
        <g opacity={sparkle}>
          <ellipse cx={(sweep - 0.5) * r * 1.6} cy={-0.1 * r} rx={0.12 * r} ry={0.9 * r} fill="#fff" opacity={0.45} transform={`rotate(25)`} />
          {[0, 1, 2].map((i) => {
            const ph = (time * 1.3 + i * 0.33) % 1;
            const s = Math.sin(ph * Math.PI);
            const a = i * 2.1 + 0.6;
            return (
              <path
                key={i}
                d={starD(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.2, 0.28 * r * s, 0.07 * r * s)}
                fill="#fff6c2"
              />
            );
          })}
        </g>
      )}
    </g>
  );
};

export function starD(cx: number, cy: number, outer: number, inner: number) {
  let d = "";
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"} ${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)} `;
  }
  return `${d}Z`;
}

export const heartD = (cx: number, cy: number, s: number) =>
  `M ${cx} ${cy + s * 0.85} C ${cx - s * 1.3} ${cy + s * 0.05}, ${cx - s * 0.75} ${cy - s * 0.95}, ${cx} ${cy - s * 0.35} C ${cx + s * 0.75} ${cy - s * 0.95}, ${cx + s * 1.3} ${cy + s * 0.05}, ${cx} ${cy + s * 0.85} Z`;

export const Backpack: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <Shadow x={0} y={0} w={170} />
    <rect x={-72} y={-142} width={144} height={142} rx={44} fill={P("blue")} {...EDGE} />
    <path d="M -72 -100 Q 0 -60 72 -100 L 72 -110 Q 70 -142 30 -142 L -30 -142 Q -70 -142 -72 -110 Z" fill={shade(COLORS.blue, -0.12)} />
    <rect x={-40} y={-62} width={80} height={46} rx={16} fill={shade(COLORS.blue, 0.2)} {...EDGE} />
    <circle cx={0} cy={-78} r={9} fill={P("yellow")} />
    <path d="M -40 -142 Q 0 -178 40 -142" stroke={shade(COLORS.blue, -0.2)} strokeWidth={10} fill="none" strokeLinecap="round" />
  </g>
);

export const Bird: React.FC<{ x: number; y: number; time: number; flap?: boolean; facing?: number; scale?: number; talk?: number }> = ({
  x,
  y,
  time,
  flap = false,
  facing = 1,
  scale = 1,
  talk = 0,
}) => {
  const w = flap ? Math.sin(time * 40) * 40 : -10;
  return (
    <g transform={`translate(${x} ${y}) scale(${facing * scale} ${scale})`}>
      <path d="M -26 4 L -46 -6 L -44 12 Z" fill={shade(COLORS.bird, -0.2)} />
      <circle r={28} fill={P("bird")} {...EDGE} />
      <g transform={`rotate(${w} -4 0)`}>
        <ellipse cx={-8} cy={6} rx={16} ry={10} fill={shade(COLORS.bird, -0.12)} />
      </g>
      <circle cx={10} cy={-8} r={5} fill={COLORS.ink} />
      <circle cx={8.5} cy={-10} r={1.8} fill="#fff" />
      <path d={`M 24 -4 L ${38 + talk * 4} 0 L 24 ${4 + talk * 6} Z`} fill="#ff9a3c" />
      <ellipse cx={4} cy={6} rx={6} ry={3.5} fill="#ff7096" opacity={0.5} />
      <path d="M -4 26 L -6 36 M 6 26 L 6 36" stroke="#e08a2e" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
};

export const Egg: React.FC<{ x: number; y: number; time: number; wobble?: number }> = ({ x, y, time, wobble = 0 }) => {
  const a = Math.sin(time * 9) * 8 * wobble;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a} 0 0)`}>
      <circle cx={0} cy={-60} r={130} fill="url(#ep-glow)" opacity={0.6 + Math.sin(time * 3) * 0.15} />
      <ellipse cx={0} cy={-58} rx={46} ry={60} fill={P("egg")} {...EDGE} />
      {[
        [-16, -80, 5],
        [12, -92, 4],
        [20, -54, 6],
        [-22, -40, 4],
        [2, -30, 3.5],
        [-4, -64, 3],
      ].map(([sx, sy, r], i) => (
        <circle key={i} cx={sx} cy={sy} r={r} fill="#ffffff" opacity={0.9} />
      ))}
      <ellipse cx={-16} cy={-86} rx={8} ry={14} fill="#fff" opacity={0.6} transform="rotate(-20 -16 -86)" />
    </g>
  );
};

/** Flying leaves (burst from a point). */
export const LeafBurst: React.FC<{ x: number; y: number; t: number; count?: number; power?: number; seed?: number }> = ({
  x,
  y,
  t,
  count = 26,
  power = 1,
  seed = 1,
}) => {
  if (t < 0 || t > 4) return null;
  const colors = ["#a8e6c9", "#ff9ec4", "#ffe58a", "#ffc28a"];
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = -Math.PI / 2 + (rnd(i, seed) - 0.5) * 2.4;
        const v = (420 + rnd(i, seed + 3) * 500) * power;
        const px = x + Math.cos(a) * v * t * 0.8 + Math.sin(t * 3 + i) * 30 * t;
        const py = y + Math.sin(a) * v * t + 360 * t * t;
        const settle = Math.min(py, y + 40);
        const rot = t * 300 * (i % 2 ? 1 : -1) + i * 40;
        const op = t > 3 ? 4 - t : 1;
        return (
          <g key={i} transform={`translate(${px} ${settle}) rotate(${rot})`} opacity={op}>
            <ellipse rx={20} ry={11} fill={colors[i % colors.length]} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
};
