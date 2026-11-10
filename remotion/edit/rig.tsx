import React from "react";

/**
 * A tiny 2D skeleton rig used to animate the stylized #7 player silhouette.
 *
 * Angles are in degrees. Limb angle 0 = hanging straight down along the torso,
 * positive = swung "forward" (towards +x when the figure faces right).
 */
export interface Pose {
  /** hip position in scene px (1080×1920 space) */
  x: number;
  y: number;
  /** whole-body rotation around the hips (clockwise, deg) */
  rot: number;
  /** horizontal facing: 1 = right, -1 = left (values in between = mid-spin) */
  face: number;
  scale: number;
  torso: number; // lean from vertical, + = forward
  head: number;
  lShoulder: number;
  lElbow: number;
  rShoulder: number;
  rElbow: number;
  lHip: number;
  lKnee: number; // + bends the shin backwards
  rHip: number;
  rKnee: number;
}

export const BONES = {
  torso: 300,
  neck: 46,
  headR: 62,
  upperArm: 165,
  foreArm: 155,
  thigh: 235,
  shin: 230,
  shoulderHalf: 78,
  hipHalf: 40,
};

export const BASE: Pose = {
  x: 540,
  y: 1200,
  rot: 0,
  face: 1,
  scale: 1,
  torso: 0,
  head: 0,
  lShoulder: -10,
  lElbow: 12,
  rShoulder: 10,
  rElbow: 12,
  lHip: -6,
  lKnee: 4,
  rHip: 6,
  rKnee: 4,
};

export const pose = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });

const rad = (d: number) => (d * Math.PI) / 180;
/** unit vector pointing "down" rotated by a (towards +x for positive a) */
const down = (a: number): [number, number] => [Math.sin(rad(a)), Math.cos(rad(a))];

export interface Joints {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  lShoulder: [number, number];
  rShoulder: [number, number];
  lElbow: [number, number];
  rElbow: [number, number];
  lHand: [number, number];
  rHand: [number, number];
  lHipJ: [number, number];
  rHipJ: [number, number];
  lKnee: [number, number];
  rKnee: [number, number];
  lFoot: [number, number];
  rFoot: [number, number];
}

const add = (p: [number, number], v: [number, number], k: number): [number, number] => [p[0] + v[0] * k, p[1] + v[1] * k];

/** Joint positions in the rig's local space (hip at 0,0, before rotation / facing / scale). */
export function solveLocal(p: Pose): Joints {
  const hip: [number, number] = [0, 0];
  const up: [number, number] = [Math.sin(rad(p.torso)), -Math.cos(rad(p.torso))];
  const side: [number, number] = [Math.cos(rad(p.torso)), Math.sin(rad(p.torso))];
  const neck = add(hip, up, BONES.torso);
  const headUp: [number, number] = [Math.sin(rad(p.torso + p.head)), -Math.cos(rad(p.torso + p.head))];
  const head = add(neck, headUp, BONES.neck + BONES.headR * 0.8);
  const lShoulder = add(add(neck, side, -BONES.shoulderHalf), up, -18);
  const rShoulder = add(add(neck, side, BONES.shoulderHalf), up, -18);
  const lElbow = add(lShoulder, down(p.torso + p.lShoulder), BONES.upperArm);
  const rElbow = add(rShoulder, down(p.torso + p.rShoulder), BONES.upperArm);
  const lHand = add(lElbow, down(p.torso + p.lShoulder + p.lElbow), BONES.foreArm);
  const rHand = add(rElbow, down(p.torso + p.rShoulder + p.rElbow), BONES.foreArm);
  const lHipJ = add(hip, side, -BONES.hipHalf);
  const rHipJ = add(hip, side, BONES.hipHalf);
  const lKnee = add(lHipJ, down(p.torso + p.lHip), BONES.thigh);
  const rKnee = add(rHipJ, down(p.torso + p.rHip), BONES.thigh);
  const lFoot = add(lKnee, down(p.torso + p.lHip - p.lKnee), BONES.shin);
  const rFoot = add(rKnee, down(p.torso + p.rHip - p.rKnee), BONES.shin);
  return { hip, neck, head, lShoulder, rShoulder, lElbow, rElbow, lHand, rHand, lHipJ, rHipJ, lKnee, rKnee, lFoot, rFoot };
}

/** Joint position in scene space. */
export function jointWorld(p: Pose, joint: keyof Joints): [number, number] {
  const [lx, ly] = solveLocal(p)[joint];
  const sx = lx * p.face * p.scale;
  const sy = ly * p.scale;
  const c = Math.cos(rad(p.rot));
  const s = Math.sin(rad(p.rot));
  return [p.x + sx * c - sy * s, p.y + sx * s + sy * c];
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Interpolates between keyframed poses (positions normalized 0..1). */
export function poseAt(keys: Array<[number, Pose]>, u: number): Pose {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1] = keys[i];
    const [t0, p0] = keys[i - 1];
    if (u <= t1) {
      const k = smooth((u - t0) / (t1 - t0 || 1));
      const out = { ...p0 };
      for (const key of Object.keys(p0) as Array<keyof Pose>) out[key] = p0[key] + (p1[key] - p0[key]) * k;
      return out;
    }
  }
  return keys[keys.length - 1][1];
}

const seg = (a: [number, number], b: [number, number]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;

/**
 * The player silhouette: near-black body, colored rim light, glowing "7" and optional glowing eyes.
 */
export const Figure: React.FC<{
  p: Pose;
  rim: string;
  glow: string;
  eyes?: number; // 0..1 eye glow intensity
  opacity?: number;
  number?: boolean;
}> = ({ p, rim, glow, eyes = 0, opacity = 1, number = true }) => {
  const j = solveLocal(p);
  const body = "#050507";
  const back = "#0c0c10";
  const torsoPath = (() => {
    const t = rad(p.torso);
    const side: [number, number] = [Math.cos(t), Math.sin(t)];
    const up: [number, number] = [Math.sin(t), -Math.cos(t)];
    const hl = add([0, 0], side, -BONES.hipHalf - 30);
    const hr = add([0, 0], side, BONES.hipHalf + 30);
    const sl = add(add(j.neck, side, -BONES.shoulderHalf - 26), up, -10);
    const sr = add(add(j.neck, side, BONES.shoulderHalf + 26), up, -10);
    const waistL = add(add([0, 0], up, 120), side, -BONES.hipHalf - 18);
    const waistR = add(add([0, 0], up, 120), side, BONES.hipHalf + 18);
    const f = (q: [number, number]) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    return `M${f(hl)} Q${f(waistL)} ${f(sl)} Q${f(add(j.neck, up, 14))} ${f(sr)} Q${f(waistR)} ${f(hr)} Z`;
  })();
  const limb = (a: [number, number], b: [number, number], w: number, color: string) => (
    <path d={seg(a, b)} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />
  );
  const foot = (knee: [number, number], ankle: [number, number], color: string) => {
    const dx = ankle[0] - knee[0];
    const dy = ankle[1] - knee[1];
    const len = Math.hypot(dx, dy) || 1;
    // foot points "forward" (shin direction rotated by -90°)
    const toe: [number, number] = [ankle[0] + (dy / len) * 62, ankle[1] - (dx / len) * 62];
    return limb(ankle, toe, 40, color);
  };
  const headAngle = p.torso + p.head;
  return (
    <g
      transform={`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.face * p.scale} ${p.scale})`}
      opacity={opacity}
      style={{ filter: `drop-shadow(-7px -5px 0 ${rim}) drop-shadow(0 0 26px ${glow})` }}
    >
      {/* far limbs */}
      {limb(j.lHipJ, j.lKnee, 76, back)}
      {limb(j.lKnee, j.lFoot, 60, back)}
      {foot(j.lKnee, j.lFoot, back)}
      {limb(j.lShoulder, j.lElbow, 52, back)}
      {limb(j.lElbow, j.lHand, 44, back)}
      <circle cx={j.lHand[0]} cy={j.lHand[1]} r={25} fill={back} />
      {/* torso + head */}
      <path d={torsoPath} fill={body} />
      {limb(j.neck, add(j.neck, [Math.sin(rad(headAngle)), -Math.cos(rad(headAngle))], BONES.neck), 54, body)}
      <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${headAngle})`}>
        <ellipse cx={0} cy={0} rx={BONES.headR * 0.86} ry={BONES.headR} fill={body} />
        {/* short quiff hairstyle */}
        <path d="M-50 -30 Q-46 -82 6 -84 Q40 -96 58 -60 Q60 -40 52 -26 Z" fill={body} />
        <ellipse cx={-BONES.headR * 0.86} cy={6} rx={12} ry={18} fill={body} />
        <ellipse cx={BONES.headR * 0.86} cy={6} rx={12} ry={18} fill={body} />
        {eyes > 0 && (
          <g style={{ filter: `drop-shadow(0 0 ${10 + 30 * eyes}px ${glow}) drop-shadow(0 0 6px #fff)` }} opacity={eyes}>
            <path d="M-36 -2 L-10 2 L-36 6 Z" fill="#fff" />
            <path d="M36 -2 L10 2 L36 6 Z" fill="#fff" />
          </g>
        )}
      </g>
      {number && (
        <text
          x={j.neck[0] * 0.55}
          y={j.neck[1] * 0.55}
          transform={`rotate(${p.torso} ${j.neck[0] * 0.55} ${j.neck[1] * 0.55})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Anton, Impact, sans-serif"
          fontSize={150}
          fill={rim}
          opacity={0.9}
          style={{ filter: `drop-shadow(0 0 14px ${glow})` }}
        >
          7
        </text>
      )}
      {/* near limbs */}
      {limb(j.rHipJ, j.rKnee, 80, body)}
      {limb(j.rKnee, j.rFoot, 62, body)}
      {foot(j.rKnee, j.rFoot, body)}
      {limb(j.rShoulder, j.rElbow, 54, body)}
      {limb(j.rElbow, j.rHand, 46, body)}
      <circle cx={j.rHand[0]} cy={j.rHand[1]} r={26} fill={body} />
    </g>
  );
};

/** Classic black & white football with a few panels (rotation in degrees). */
export const Ball: React.FC<{ x: number; y: number; r: number; spin: number; glow?: string; squash?: number }> = ({
  x,
  y,
  r,
  spin,
  glow = "#ffffff",
  squash = 1,
}) => {
  const pent = (cx: number, cy: number, s: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return `${(cx + Math.cos(a) * s).toFixed(1)},${(cy + Math.sin(a) * s).toFixed(1)}`;
    }).join(" ");
  return (
    <g transform={`translate(${x} ${y}) scale(${1 / squash} ${squash})`} style={{ filter: `drop-shadow(0 0 ${r * 0.5}px ${glow})` }}>
      <circle r={r} fill="#f4f4f4" />
      <g transform={`rotate(${spin})`}>
        <polygon points={pent(0, 0, r * 0.32)} fill="#111" />
        {[0, 72, 144, 216, 288].map((a) => (
          <polygon
            key={a}
            points={pent(Math.cos(rad(a - 90)) * r * 0.82, Math.sin(rad(a - 90)) * r * 0.82, r * 0.26)}
            fill="#111"
          />
        ))}
      </g>
      <circle r={r} fill="url(#ballShade)" />
    </g>
  );
};
