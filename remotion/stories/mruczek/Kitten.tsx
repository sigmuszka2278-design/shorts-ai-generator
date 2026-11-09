import React from "react";

/**
 * Mruczek – a small fluffy orange kitten with big green eyes and long white whiskers.
 * Soft "3D clay" look: radial gradients, rim light, contact shadow.
 * Both views are drawn around the point between the paws on the floor (0, 0).
 */

export const FUR = "#ff9a3d";
export const FUR_LIGHT = "#ffc27a";
export const FUR_DARK = "#e0701f";
export const STRIPE = "#e9771f";
export const CREAM = "#fff3e2";
export const PINK = "#ff9db5";
export const LINE = "#5a2f17";
export const EYE = "#43c96b";
export const EYE_DARK = "#167a3c";

export const KittenDefs: React.FC = () => (
  <defs>
    <radialGradient id="k-fur" cx="40%" cy="30%" r="75%">
      <stop offset="0%" stopColor="#ffd29a" />
      <stop offset="45%" stopColor={FUR} />
      <stop offset="100%" stopColor={FUR_DARK} />
    </radialGradient>
    <radialGradient id="k-fur-soft" cx="45%" cy="35%" r="70%">
      <stop offset="0%" stopColor="#ffc98a" />
      <stop offset="60%" stopColor={FUR} />
      <stop offset="100%" stopColor="#e57a28" />
    </radialGradient>
    <radialGradient id="k-cream" cx="45%" cy="35%" r="70%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="70%" stopColor={CREAM} />
      <stop offset="100%" stopColor="#f3d9bd" />
    </radialGradient>
    <radialGradient id="k-iris" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#b6ff8f" />
      <stop offset="55%" stopColor={EYE} />
      <stop offset="100%" stopColor={EYE_DARK} />
    </radialGradient>
    <radialGradient id="k-ear" cx="50%" cy="70%" r="70%">
      <stop offset="0%" stopColor="#ffd0dc" />
      <stop offset="100%" stopColor={PINK} />
    </radialGradient>
    <radialGradient id="k-nose" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#ffc4d3" />
      <stop offset="100%" stopColor="#f0708f" />
    </radialGradient>
    <radialGradient id="k-shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="rgba(60,30,10,0.38)" />
      <stop offset="100%" stopColor="rgba(60,30,10,0)" />
    </radialGradient>
    <radialGradient id="k-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="rgba(255,255,220,0.95)" />
      <stop offset="40%" stopColor="rgba(255,240,150,0.5)" />
      <stop offset="100%" stopColor="rgba(255,240,150,0)" />
    </radialGradient>
    <filter id="k-soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" />
    </filter>
    <filter id="k-blur8" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" />
    </filter>
  </defs>
);

/** Four-pointed twinkle. */
export const Twinkle: React.FC<{ x: number; y: number; r: number; color?: string; opacity?: number; rot?: number }> = ({
  x,
  y,
  r,
  color = "#fff7b0",
  opacity = 1,
  rot = 0,
}) => {
  if (r <= 0 || opacity <= 0) return null;
  const k = r * 0.22;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
      <circle r={r * 1.3} fill="url(#k-glow)" />
      <path
        d={`M 0 ${-r} Q ${k} ${-k} ${r} 0 Q ${k} ${k} 0 ${r} Q ${-k} ${k} ${-r} 0 Q ${-k} ${-k} 0 ${-r} Z`}
        fill={color}
      />
      <circle r={r * 0.18} fill="#ffffff" />
    </g>
  );
};

/** Fluffy outline: an ellipse with a scalloped edge. */
function fluffPath(cx: number, cy: number, rx: number, ry: number, bumps: number, depth: number, from = 0, to = Math.PI * 2) {
  let d = "";
  const steps = bumps * 6;
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const bump = Math.pow(Math.abs(Math.sin((i / 6) * Math.PI)), 0.6) * depth;
    const x = cx + Math.cos(a) * (rx + bump);
    const y = cy + Math.sin(a) * (ry + bump);
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d + "Z";
}

const Whisker: React.FC<{ x: number; y: number; angle: number; length: number; curl: number; glow: number }> = ({
  x,
  y,
  angle,
  length,
  curl,
  glow,
}) => {
  const a = (angle * Math.PI) / 180;
  const ex = x + Math.cos(a) * length;
  const ey = y + Math.sin(a) * length;
  const mx = x + Math.cos(a) * length * 0.55 - Math.sin(a) * curl;
  const my = y + Math.sin(a) * length * 0.55 + Math.cos(a) * curl;
  const d = `M ${x} ${y} Q ${mx} ${my} ${ex} ${ey}`;
  return (
    <g>
      {glow > 0 && <path d={d} stroke="#fff6a8" strokeWidth={22} strokeLinecap="round" fill="none" opacity={glow * 0.55} filter="url(#k-blur8)" />}
      <path d={d} stroke="rgba(120,70,40,0.35)" strokeWidth={7.5} strokeLinecap="round" fill="none" />
      <path d={d} stroke="#ffffff" strokeWidth={5} strokeLinecap="round" fill="none" />
    </g>
  );
};

/** End points of the whiskers (for sparkles, touch effects). Same maths as <Whisker/>. */
export function whiskerTip(x: number, y: number, angle: number, length: number) {
  const a = (angle * Math.PI) / 180;
  return { x: x + Math.cos(a) * length, y: y + Math.sin(a) * length };
}

export interface FrontPose {
  frame: number;
  /** -1..1 left/right whisker rotation (wiggle). */
  wiggle?: number;
  /** Whisker length multiplier. */
  whiskerScale?: number;
  /** Whisker spread (degrees between the three whiskers on each side). */
  spread?: number;
  /** 0..1 sparkle at the whisker tips. */
  sparkle?: number;
  /** 0..1 glow along the whiskers. */
  glow?: number;
  /** 0..1 eyes closed. */
  blink?: number;
  /** happy closed "^^" eyes. */
  happyEyes?: boolean;
  /** 0..1 right paw raised to wave; waveAngle rotates it. */
  wave?: number;
  waveAngle?: number;
  /** Body squash (1 = normal, <1 narrower). */
  squeezeX?: number;
  /** Head tilt in degrees. */
  tilt?: number;
  /** Eyes looking direction in px. */
  lookX?: number;
  lookY?: number;
  mouthOpen?: number;
  shadow?: boolean;
}

/** Whisker roots in front view, relative to (0,0) at the paws. */
export const FRONT_HEAD_Y = -330;
export const FRONT_WHISKER_ROOT = { x: 34, y: -268 };
export const FRONT_WHISKER_LEN = 160;

export const KittenFront: React.FC<FrontPose> = ({
  frame,
  wiggle = 0,
  whiskerScale = 1,
  spread = 11,
  sparkle = 0,
  glow = 0,
  blink = 0,
  happyEyes = false,
  wave = 0,
  waveAngle = 0,
  squeezeX = 1,
  tilt = 0,
  lookX = 0,
  lookY = 0,
  mouthOpen = 0,
  shadow = true,
}) => {
  const breathe = 1 + Math.sin(frame / 22) * 0.012;
  const tailSwing = Math.sin(frame / 16) * 12;
  const len = FRONT_WHISKER_LEN * whiskerScale;
  const open = Math.max(0.06, 1 - blink);
  const eyes = [-1, 1];

  const whiskers = eyes.flatMap((side) =>
    [-1, 0, 1].map((k) => {
      const base = side === 1 ? 0 : 180;
      const angle = base + side * (k * spread + wiggle * 9 * (k === 0 ? 1 : 0.8));
      return { side, k, angle };
    }),
  );

  return (
    <g>
      {shadow && <ellipse cx={0} cy={6} rx={210} ry={34} fill="url(#k-shadow)" />}

      {/* tail */}
      <g transform={`rotate(${tailSwing} 120 -40)`}>
        <path d="M 110 -40 C 230 -40 250 -150 210 -230" stroke={FUR_DARK} strokeWidth={56} strokeLinecap="round" fill="none" />
        <path d="M 110 -40 C 230 -40 250 -150 210 -230" stroke="url(#k-fur)" strokeWidth={48} strokeLinecap="round" fill="none" />
        <path d="M 222 -150 C 232 -175 228 -205 212 -228" stroke={STRIPE} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.7} />
      </g>

      {/* body */}
      <g transform={`scale(${squeezeX * breathe} ${1 / Math.sqrt(squeezeX)}) `}>
        <path d={fluffPath(0, -125, 150, 128, 14, 7)} fill="url(#k-fur)" />
        <path d={fluffPath(0, -112, 78, 92, 9, 5, -Math.PI * 0.95, Math.PI * 0.95)} fill="url(#k-cream)" opacity={0.95} />
        {/* back legs */}
        <ellipse cx={-118} cy={-42} rx={56} ry={44} fill="url(#k-fur-soft)" />
        <ellipse cx={118} cy={-42} rx={56} ry={44} fill="url(#k-fur-soft)" />
        {/* side stripes */}
        <path d="M -142 -150 q 26 6 36 24" stroke={STRIPE} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.7} />
        <path d="M -146 -112 q 26 6 34 22" stroke={STRIPE} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.7} />
        <path d="M 142 -150 q -26 6 -36 24" stroke={STRIPE} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.7} />
        <path d="M 146 -112 q -26 6 -34 22" stroke={STRIPE} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.7} />
        {/* front paws */}
        <ellipse cx={-48} cy={-22} rx={40} ry={30} fill="url(#k-cream)" />
        {wave < 0.5 && <ellipse cx={48} cy={-22} rx={40} ry={30} fill="url(#k-cream)" />}
        <path d="M -62 -12 v 10 M -48 -10 v 10 M -34 -12 v 10" stroke="#e7c3a2" strokeWidth={4} strokeLinecap="round" />
        {wave < 0.5 && <path d="M 62 -12 v 10 M 48 -10 v 10 M 34 -12 v 10" stroke="#e7c3a2" strokeWidth={4} strokeLinecap="round" />}
      </g>

      {/* waving paw */}
      {wave >= 0.5 && (
        <g transform={`rotate(${waveAngle} 92 -170)`}>
          <path d="M 92 -170 C 140 -200 170 -260 178 -320" stroke="url(#k-fur)" strokeWidth={58} strokeLinecap="round" fill="none" />
          <circle cx={180} cy={-332} r={38} fill="url(#k-cream)" />
          <ellipse cx={180} cy={-326} rx={14} ry={11} fill="url(#k-ear)" />
          {[-20, 0, 20].map((dx) => (
            <circle key={dx} cx={180 + dx} cy={-356 + Math.abs(dx) * 0.3} r={7} fill="url(#k-ear)" />
          ))}
        </g>
      )}

      {/* head */}
      <g transform={`rotate(${tilt} 0 ${FRONT_HEAD_Y + 60})`}>
        {/* ears */}
        <path d="M -128 -390 C -150 -470 -140 -520 -120 -528 C -96 -520 -60 -470 -40 -440 Z" fill="url(#k-fur)" />
        <path d="M 128 -390 C 150 -470 140 -520 120 -528 C 96 -520 60 -470 40 -440 Z" fill="url(#k-fur)" />
        <path d="M -114 -410 C -124 -462 -120 -494 -112 -500 C -96 -490 -76 -462 -64 -444 Z" fill="url(#k-ear)" />
        <path d="M 114 -410 C 124 -462 120 -494 112 -500 C 96 -490 76 -462 64 -444 Z" fill="url(#k-ear)" />
        <path d="M -108 -432 l -10 -28 M -96 -436 l -4 -30" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        <path d="M 108 -432 l 10 -28 M 96 -436 l 4 -30" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />

        <path d={fluffPath(0, FRONT_HEAD_Y, 148, 122, 18, 8)} fill="url(#k-fur)" />
        {/* cheek fluff */}
        <path d={fluffPath(-112, -282, 52, 40, 7, 6, Math.PI * 0.45, Math.PI * 1.35)} fill="url(#k-fur-soft)" />
        <path d={fluffPath(112, -282, 52, 40, 7, 6, -Math.PI * 0.35, Math.PI * 0.55)} fill="url(#k-fur-soft)" />
        {/* head tuft */}
        <path d="M -24 -448 Q -6 -486 4 -452 Q 16 -480 26 -446 Z" fill={FUR} />
        {/* forehead stripes */}
        <path d="M 0 -440 v 34 M -30 -436 q 4 18 12 26 M 30 -436 q -4 18 -12 26" stroke={STRIPE} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.8} />

        {/* muzzle */}
        <ellipse cx={-28} cy={-262} rx={38} ry={30} fill="url(#k-cream)" />
        <ellipse cx={28} cy={-262} rx={38} ry={30} fill="url(#k-cream)" />
        <ellipse cx={0} cy={-238} rx={26} ry={18} fill="url(#k-cream)" />
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => <circle key={`${s}${i}`} cx={s * (22 + i * 11)} cy={-262 + (i - 1) * 9} r={3} fill="#e2b08c" />),
        )}

        {/* eyes */}
        {eyes.map((side) => {
          const cx = side * 60;
          const cy = -330;
          if (happyEyes) {
            return (
              <path
                key={side}
                d={`M ${cx - 32} ${cy + 6} Q ${cx} ${cy - 30} ${cx + 32} ${cy + 6}`}
                stroke={LINE}
                strokeWidth={10}
                strokeLinecap="round"
                fill="none"
              />
            );
          }
          return (
            <g key={side} transform={`translate(${cx} ${cy}) scale(1 ${open})`}>
              <ellipse rx={42} ry={48} fill="#ffffff" />
              <ellipse cx={lookX} cy={lookY} rx={36} ry={42} fill="url(#k-iris)" />
              <ellipse cx={lookX} cy={lookY + 2} rx={16} ry={26} fill="#1b2a24" />
              <circle cx={lookX - 13} cy={lookY - 16} r={11} fill="#ffffff" />
              <circle cx={lookX + 12} cy={lookY + 14} r={5} fill="#ffffff" opacity={0.9} />
              <ellipse rx={42} ry={48} fill="none" stroke="rgba(90,47,23,0.35)" strokeWidth={4} />
            </g>
          );
        })}

        {/* nose + mouth */}
        <path d="M -16 -286 Q 0 -294 16 -286 Q 12 -270 0 -264 Q -12 -270 -16 -286 Z" fill="url(#k-nose)" />
        <ellipse cx={-5} cy={-286} rx={5} ry={3} fill="#fff" opacity={0.7} />
        {mouthOpen > 0.05 ? (
          <path
            d={`M -18 -248 Q 0 ${-248 + 30 * mouthOpen} 18 -248 Q 0 -256 -18 -248 Z`}
            fill="#c2415e"
            stroke={LINE}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        ) : null}
        <path d="M 0 -264 v 10 M 0 -254 q -10 12 -22 4 M 0 -254 q 10 12 22 4" stroke={LINE} strokeWidth={6} strokeLinecap="round" fill="none" />
        <ellipse cx={-96} cy={-286} rx={20} ry={11} fill="#ff7fa0" opacity={0.45} />
        <ellipse cx={96} cy={-286} rx={20} ry={11} fill="#ff7fa0" opacity={0.45} />

        {/* whiskers */}
        {whiskers.map(({ side, k, angle }) => (
          <Whisker
            key={`${side}${k}`}
            x={side * FRONT_WHISKER_ROOT.x}
            y={FRONT_WHISKER_ROOT.y + k * 9}
            angle={angle}
            length={len * (k === 0 ? 1 : 0.94)}
            curl={-side * 8 * (k === 0 ? 0.6 : 1)}
            glow={glow}
          />
        ))}
        {sparkle > 0 &&
          whiskers.map(({ side, k, angle }) => {
            const tip = whiskerTip(side * FRONT_WHISKER_ROOT.x, FRONT_WHISKER_ROOT.y + k * 9, angle, len * (k === 0 ? 1 : 0.94));
            const tw = 0.6 + 0.4 * Math.sin(frame / 3 + side * 2 + k * 1.7);
            return <Twinkle key={`sp${side}${k}`} x={tip.x} y={tip.y} r={26 * sparkle * tw} rot={frame * 2 + k * 20} />;
          })}
      </g>
    </g>
  );
};

export interface SidePose {
  frame: number;
  /** Walking cycle phase (radians); legs move when `walking` is true. */
  walkPhase?: number;
  walking?: boolean;
  /** 0..1 crouch before a pounce (front low, bottom up). */
  crouch?: number;
  /** 0..1 lying down (legs tucked). */
  lie?: number;
  /** 0..1 whiskers pointing forward. */
  forward?: number;
  whiskerScale?: number;
  glow?: number;
  sparkle?: number;
  blink?: number;
  happyEyes?: boolean;
  /** Body tilt for the jump. */
  pitch?: number;
  /** Eyes glow in the dark. */
  eyeGlow?: number;
  /** 0..1 front paws reaching forward (pounce). */
  reach?: number;
  shadow?: boolean;
  shadowY?: number;
}

/** Side view (facing right). Head centre ≈ (150, -235). */
export const SIDE_WHISKER_ROOT = { x: 222, y: -208 };
export const SIDE_WHISKER_LEN = 150;

export function sideWhiskerAngles(forward: number) {
  // Relaxed: fanned out sideways/down; forward: fanned forward and up.
  return [-1, 0, 1].map((k) => -6 + k * 13 * (1 - forward * 0.35) - forward * 14);
}

export const KittenSide: React.FC<SidePose> = ({
  frame,
  walkPhase = 0,
  walking = false,
  crouch = 0,
  lie = 0,
  forward = 0,
  whiskerScale = 1,
  glow = 0,
  sparkle = 0,
  blink = 0,
  happyEyes = false,
  pitch = 0,
  eyeGlow = 0,
  reach = 0,
  shadow = true,
  shadowY = 0,
}) => {
  const breathe = Math.sin(frame / 20) * 2.5;
  const legSwing = walking ? 22 : 0;
  const tailSwing = Math.sin(frame / 14) * (crouch > 0.3 ? 20 : 9);
  const bodyY = -150 + crouch * 20 + lie * 62 + breathe * 0.5;
  const headY = -238 + crouch * 46 + lie * 70;
  const hipLift = crouch * -18;
  const legLen = 92 * (1 - lie * 0.85);
  const len = SIDE_WHISKER_LEN * whiskerScale;
  const open = Math.max(0.06, 1 - blink);
  const angles = sideWhiskerAngles(forward);

  const leg = (x: number, phase: number, back: boolean, near: boolean) => {
    const swing = Math.sin(walkPhase + phase) * legSwing;
    const lift = walking ? Math.max(0, Math.sin(walkPhase + phase + Math.PI / 2)) * 10 : 0;
    const top = bodyY + 40 + (back ? hipLift : 0);
    const reachRot = !back ? -reach * 55 : 0;
    if (lie > 0.8) {
      // Lying down: legs tucked under the body, only the front paw peeks out.
      return back || !near ? null : <ellipse key={`${x}${near}`} cx={x + 20} cy={bodyY + 78} rx={34} ry={20} fill="url(#k-cream)" />;
    }
    return (
      <g key={`${x}${near}`} transform={`rotate(${swing + reachRot} ${x} ${top})`}>
        <path
          d={`M ${x} ${top} L ${x} ${top + legLen - lift}`}
          stroke={near ? "url(#k-fur)" : FUR_DARK}
          strokeWidth={near ? 46 : 42}
          strokeLinecap="round"
        />
        <ellipse cx={x + 8} cy={top + legLen - lift + 2} rx={near ? 27 : 24} ry={near ? 17 : 15} fill={near ? "url(#k-cream)" : "#f0d6bb"} />
      </g>
    );
  };

  return (
    <g>
      {shadow && <ellipse cx={20} cy={6 + shadowY} rx={230} ry={30} fill="url(#k-shadow)" />}
      <g transform={`rotate(${pitch} 0 -150)`}>
        {/* far legs */}
        {leg(-95, Math.PI, true, false)}
        {leg(95, 0, false, false)}

        {/* tail */}
        <g transform={`rotate(${tailSwing} -150 ${bodyY - 10})`}>
          <path
            d={`M -150 ${bodyY - 10} C -250 ${bodyY - 20} -270 ${bodyY - 130} -220 ${bodyY - 190}`}
            stroke={FUR_DARK}
            strokeWidth={50}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M -150 ${bodyY - 10} C -250 ${bodyY - 20} -270 ${bodyY - 130} -220 ${bodyY - 190}`}
            stroke="url(#k-fur)"
            strokeWidth={42}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* body */}
        <g transform={`rotate(${crouch * -8} 0 ${bodyY})`}>
          <path d={fluffPath(0, bodyY, 170, 92 + breathe, 16, 6)} fill="url(#k-fur)" />
          <path d={fluffPath(40, bodyY + 34, 110, 44, 10, 4, 0, Math.PI)} fill="url(#k-cream)" opacity={0.9} />
          {[-80, -35, 10].map((x) => (
            <path key={x} d={`M ${x} ${bodyY - 88} q 12 30 4 58`} stroke={STRIPE} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.75} />
          ))}
        </g>

        {/* near legs */}
        {leg(-60, 0, true, true)}
        {leg(130, Math.PI, false, true)}

        {/* head */}
        <g transform={`translate(0 ${headY + 238})`}>
          <path d="M 70 -300 C 60 -370 76 -400 92 -404 C 112 -394 136 -350 146 -322 Z" fill="url(#k-fur)" />
          <path d="M 152 -318 C 160 -380 186 -408 204 -404 C 214 -386 214 -340 206 -310 Z" fill="url(#k-fur)" />
          <path d="M 162 -322 C 170 -368 186 -390 198 -388 C 204 -372 202 -342 198 -322 Z" fill="url(#k-ear)" />
          <path d={fluffPath(150, -238, 120, 104, 16, 7)} fill="url(#k-fur)" />
          <path d={fluffPath(90, -200, 48, 36, 7, 5, Math.PI * 0.4, Math.PI * 1.2)} fill="url(#k-fur-soft)" />
          <path d="M 140 -336 v 30 M 112 -330 q 6 16 12 24 M 168 -330 q -6 16 -12 24" stroke={STRIPE} strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.8} />
          {/* muzzle */}
          <ellipse cx={212} cy={-206} rx={44} ry={32} fill="url(#k-cream)" />
          <ellipse cx={200} cy={-184} rx={24} ry={16} fill="url(#k-cream)" />
          <path d="M 240 -232 Q 254 -236 262 -226 Q 256 -212 244 -212 Q 236 -220 240 -232 Z" fill="url(#k-nose)" />
          <path d="M 246 -212 q -4 14 -20 14 M 246 -212 q 2 12 14 12" stroke={LINE} strokeWidth={5.5} strokeLinecap="round" fill="none" />
          <ellipse cx={150} cy={-200} rx={18} ry={10} fill="#ff7fa0" opacity={0.45} />
          {/* eyes (3/4 view) */}
          {[
            { cx: 128, s: 0.82 },
            { cx: 204, s: 0.72 },
          ].map(({ cx, s }, i) =>
            happyEyes ? (
              <path
                key={i}
                d={`M ${cx - 28 * s} ${-262 + 6} Q ${cx} ${-262 - 26 * s} ${cx + 28 * s} ${-262 + 6}`}
                stroke={LINE}
                strokeWidth={9}
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <g key={i} transform={`translate(${cx} -262) scale(${s} ${s * open})`}>
                {eyeGlow > 0 && <circle r={70} fill="#9dffb5" opacity={eyeGlow * 0.45} filter="url(#k-blur8)" />}
                <ellipse rx={40} ry={47} fill="#ffffff" />
                <ellipse cx={8} rx={34} ry={41} fill="url(#k-iris)" />
                <ellipse cx={12} cy={2} rx={15} ry={26} fill="#1b2a24" />
                <circle cx={-3} cy={-16} r={11} fill="#ffffff" />
                <circle cx={22} cy={14} r={5} fill="#ffffff" opacity={0.9} />
              </g>
            ),
          )}
          {/* far whiskers (shorter, behind muzzle) and near whiskers */}
          {angles.map((a, k) => (
            <Whisker
              key={`n${k}`}
              x={SIDE_WHISKER_ROOT.x}
              y={SIDE_WHISKER_ROOT.y + (k - 1) * 9}
              angle={a + Math.sin(frame / 9 + k) * 2}
              length={len * (k === 1 ? 1 : 0.94)}
              curl={8}
              glow={glow}
            />
          ))}
          {sparkle > 0 &&
            angles.map((a, k) => {
              const tip = whiskerTip(SIDE_WHISKER_ROOT.x, SIDE_WHISKER_ROOT.y + (k - 1) * 9, a, len * (k === 1 ? 1 : 0.94));
              const tw = 0.6 + 0.4 * Math.sin(frame / 3 + k * 1.7);
              return <Twinkle key={`sp${k}`} x={tip.x} y={tip.y} r={24 * sparkle * tw} rot={frame * 2 + k * 30} />;
            })}
        </g>
      </g>
    </g>
  );
};

/** Head-relative whisker tips for the side view, in kitten coordinates (before any translate). */
export function sideWhiskerTips(forward: number, whiskerScale = 1, crouch = 0, lie = 0) {
  const headDy = crouch * 46 + lie * 70;
  return sideWhiskerAngles(forward).map((a, k) =>
    whiskerTip(SIDE_WHISKER_ROOT.x, SIDE_WHISKER_ROOT.y + (k - 1) * 9 + headDy, a, SIDE_WHISKER_LEN * whiskerScale * (k === 1 ? 1 : 0.94)),
  );
}
