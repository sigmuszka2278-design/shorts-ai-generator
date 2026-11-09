import React from "react";

/** Puffs that make up the cloud body (local coordinates, cloud centred at 0,0). */
const PUFFS: Array<[number, number, number]> = [
  [-185, 40, 105],
  [-105, -55, 135],
  [30, -95, 160],
  [160, -30, 130],
  [215, 55, 95],
  [0, 40, 170],
  [-120, 80, 110],
  [120, 80, 115],
];

export interface CloudPalette {
  light: string;
  mid: string;
  dark: string;
  rim: string;
  cheek: string;
}

export const DAY_CLOUD: CloudPalette = {
  light: "#ffffff",
  mid: "#f1f7ff",
  dark: "#c9def8",
  rim: "#9ec5f2",
  cheek: "#ff8fb1",
};

export const SUNSET_CLOUD: CloudPalette = {
  light: "#fff6ef",
  mid: "#ffe1d2",
  dark: "#f7b2b4",
  rim: "#ee8ea6",
  cheek: "#ff6f96",
};

export type HandPose = { x: number; y: number; rot: number };

const REST_L: HandPose = { x: -270, y: 95, rot: 0 };
const REST_R: HandPose = { x: 270, y: 95, rot: 0 };

export interface ChmurkaProps {
  x: number;
  y: number;
  scale?: number;
  frame: number;
  /** 0..1 eyelid closure */
  blink?: number;
  /** pupil offset, -1..1 */
  lookX?: number;
  lookY?: number;
  /** 0..1 how wide the mouth is open (talking) */
  mouth?: number;
  /** 0..1 – lifts the eyebrows (curious / amazed) */
  wonder?: number;
  /** 0..1 – blends the right hand from rest to the given pose */
  rightHand?: { pose: HandPose; amount: number };
  leftHand?: { pose: HandPose; amount: number };
  palette?: CloudPalette;
  id: string;
}

const mix = (a: HandPose, b: HandPose, t: number): HandPose => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  rot: a.rot + (b.rot - a.rot) * t,
});

const Hand: React.FC<{ shoulder: [number, number]; pose: HandPose; fill: string; rim: string; side: 1 | -1 }> = ({
  shoulder,
  pose,
  fill,
  rim,
  side,
}) => {
  const [sx, sy] = shoulder;
  const mx = (sx + pose.x) / 2 + side * 25;
  const my = (sy + pose.y) / 2 + 10;
  const arm = `M ${sx} ${sy} Q ${mx} ${my} ${pose.x} ${pose.y}`;
  return (
    <g>
      <path d={arm} stroke={rim} strokeWidth={66} strokeLinecap="round" fill="none" />
      <path d={arm} stroke={fill} strokeWidth={52} strokeLinecap="round" fill="none" />
      <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rot})`}>
        {[
          [0, 0, 44],
          [side * -26, -30, 24],
          [side * 2, -40, 24],
          [side * 28, -26, 22],
        ].map(([cx, cy, r], i) => (
          <circle key={`o${i}`} cx={cx} cy={cy} r={r + 7} fill={rim} />
        ))}
        {[
          [0, 0, 44],
          [side * -26, -30, 24],
          [side * 2, -40, 24],
          [side * 28, -26, 22],
        ].map(([cx, cy, r], i) => (
          <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill={fill} />
        ))}
        <ellipse cx={-12} cy={-14} rx={14} ry={9} fill="#fff" opacity={0.9} />
      </g>
    </g>
  );
};

/** Chmurka – a small fluffy white cloud with big friendly eyes. */
export const Chmurka: React.FC<ChmurkaProps> = ({
  x,
  y,
  scale = 1,
  frame,
  blink = 0,
  lookX = 0,
  lookY = 0,
  mouth = 0,
  wonder = 0,
  rightHand,
  leftHand,
  palette = DAY_CLOUD,
  id,
}) => {
  const breathe = 1 + Math.sin(frame / 16) * 0.018;
  const squish = 1 - Math.sin(frame / 16) * 0.012;
  const g = `${id}-body`;
  const shade = `${id}-shade`;
  const clip = `${id}-clip`;
  const open = Math.max(0.06, 1 - blink);
  const rPose = rightHand ? mix(REST_R, rightHand.pose, rightHand.amount) : REST_R;
  const lPose = leftHand ? mix(REST_L, leftHand.pose, leftHand.amount) : REST_L;
  const handFill = `url(#${g})`;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * breathe} ${scale * squish})`}>
      <defs>
        <radialGradient id={g} gradientUnits="userSpaceOnUse" cx={-90} cy={-170} r={430} fx={-120} fy={-200}>
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="45%" stopColor={palette.light} />
          <stop offset="75%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.dark} stopOpacity={0} />
          <stop offset="60%" stopColor={palette.dark} stopOpacity={0} />
          <stop offset="100%" stopColor={palette.dark} stopOpacity={0.75} />
        </linearGradient>
        <clipPath id={clip}>
          {PUFFS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </clipPath>
      </defs>

      {/* soft shadow / glow */}
      <ellipse cx={0} cy={210} rx={230} ry={30} fill={palette.rim} opacity={0.25} />

      {/* arms are drawn behind the body */}
      <Hand shoulder={[-150, 60]} pose={lPose} fill={handFill} rim={palette.rim} side={-1} />
      <Hand shoulder={[150, 60]} pose={rPose} fill={handFill} rim={palette.rim} side={1} />

      {/* rim */}
      {PUFFS.map(([cx, cy, r], i) => (
        <circle key={`rim${i}`} cx={cx} cy={cy} r={r + 9} fill={palette.rim} />
      ))}
      {/* body */}
      {PUFFS.map(([cx, cy, r], i) => (
        <circle key={`b${i}`} cx={cx} cy={cy} r={r} fill={`url(#${g})`} />
      ))}
      <g clipPath={`url(#${clip})`}>
        <rect x={-320} y={-260} width={640} height={460} fill={`url(#${shade})`} />
        {/* puff separation – soft inner arcs */}
        {[
          [-105, -55, 135],
          [160, -30, 130],
          [-185, 40, 105],
          [215, 55, 95],
        ].map(([cx, cy, r], i) => (
          <circle key={`sep${i}`} cx={cx} cy={cy} r={r} fill="none" stroke={palette.dark} strokeWidth={6} opacity={0.22} />
        ))}
      </g>
      {/* glossy highlights */}
      <ellipse cx={-10} cy={-200} rx={70} ry={28} fill="#fff" opacity={0.95} transform="rotate(-18 -10 -200)" />
      <ellipse cx={-150} cy={-120} rx={36} ry={16} fill="#fff" opacity={0.9} transform="rotate(-35 -150 -120)" />
      <ellipse cx={175} cy={-110} rx={26} ry={12} fill="#fff" opacity={0.8} transform="rotate(25 175 -110)" />

      {/* face */}
      <g transform="translate(0 10)">
        {[-1, 1].map((side) => (
          <g key={side}>
            {/* eyebrow */}
            <path
              d={`M ${side * 78 - 30} ${-92 - wonder * 18 + side * 0} Q ${side * 78} ${-112 - wonder * 22} ${side * 78 + 30} ${-92 - wonder * 18}`}
              stroke="#5a6aa8"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              opacity={0.8}
            />
            <g transform={`translate(${side * 78} -20) scale(1 ${open})`}>
              <ellipse cx={0} cy={0} rx={50} ry={60} fill="#ffffff" stroke="#c4d3ee" strokeWidth={4} />
              <ellipse cx={lookX * 14} cy={6 + lookY * 14} rx={35} ry={42} fill="#2d3561" />
              <ellipse cx={lookX * 14} cy={14 + lookY * 14} rx={23} ry={28} fill="#4a5bb0" opacity={0.6} />
              <circle cx={lookX * 14 - 13} cy={-10 + lookY * 14} r={14} fill="#fff" />
              <circle cx={lookX * 14 + 13} cy={20 + lookY * 14} r={6} fill="#fff" />
            </g>
          </g>
        ))}
        <ellipse cx={-140} cy={52} rx={32} ry={18} fill={palette.cheek} opacity={0.55} />
        <ellipse cx={140} cy={52} rx={32} ry={18} fill={palette.cheek} opacity={0.55} />
        {mouth > 0.05 ? (
          <g>
            <path
              d={`M -34 52 Q 0 ${58 + mouth * 62} 34 52 Q 0 ${46 + mouth * 6} -34 52 Z`}
              fill="#8a2d4b"
              stroke="#5c1f35"
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <ellipse cx={0} cy={58 + mouth * 34} rx={14 + mouth * 4} ry={5 + mouth * 7} fill="#ff8fa8" />
          </g>
        ) : (
          <path d="M -34 50 Q 0 86 34 50" stroke="#5c1f35" strokeWidth={8} strokeLinecap="round" fill="none" />
        )}
      </g>
    </g>
  );
};

export const POSES = {
  scratchHead: { x: 120, y: -270, rot: -30 } as HandPose,
  waveUp: { x: 330, y: -130, rot: 20 } as HandPose,
  waveUpLeft: { x: -330, y: -130, rot: -20 } as HandPose,
};
