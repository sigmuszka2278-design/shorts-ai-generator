import React from "react";
import type { Shot } from "../../lib/edit/timeline";
import { Embers, GodRays, SpeedLines, Stadium } from "./backdrops";
import { LOOKS, type TeamLook } from "./palette";
import { jointWorld, pose, poseAt, type Pose } from "./rig";

export interface BallState {
  x: number;
  y: number;
  r: number;
  spin: number;
  squash?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  rot: number;
}

export interface SceneState {
  pose?: Pose;
  ball?: BallState | null;
  camera: Camera;
  eyes?: number;
}

export interface SceneDef {
  look: TeamLook;
  /** state at normalized (speed-ramped) time u ∈ [0,1] */
  at: (u: number) => SceneState;
  /** background in screen space (gets a softer, parallax camera) */
  backdrop: (p: { frame: number; u: number; local: number }) => React.ReactNode;
  /** extra elements in world space, drawn above the figure */
  front?: (p: { frame: number; u: number; local: number; state: SceneState }) => React.ReactNode;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const cam = (x: number, y: number, zoom: number, rot = 0): Camera => ({ x, y, zoom, rot });
const camLerp = (keys: Array<[number, Camera]>, u: number): Camera => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const k = ease((u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      const a = keys[i - 1][1];
      const b = keys[i][1];
      return cam(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.zoom, b.zoom, k), lerp(a.rot, b.rot, k));
    }
  }
  return keys[keys.length - 1][1];
};

/** Quadratic bezier for ball flights. */
const arc = (a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] => {
  const k = clamp01(t);
  return [
    (1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0],
    (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1],
  ];
};

/** Running leg/arm cycle added to a pose. */
const run = (p: Pose, phase: number, amount = 1): Pose => ({
  ...p,
  lHip: p.lHip + 38 * Math.sin(phase) * amount,
  rHip: p.rHip - 38 * Math.sin(phase) * amount,
  lKnee: p.lKnee + (50 + 40 * Math.sin(phase + 1.4)) * amount,
  rKnee: p.rKnee + (50 + 40 * Math.sin(phase + 1.4 + Math.PI)) * amount,
  lShoulder: p.lShoulder - 40 * Math.sin(phase) * amount,
  rShoulder: p.rShoulder + 40 * Math.sin(phase) * amount,
  lElbow: p.lElbow + 60 * amount,
  rElbow: p.rElbow + 60 * amount,
  y: p.y - Math.abs(Math.sin(phase)) * 22 * amount,
});

const GROUND = 1665;

// ── INTRO: slow motion, serious stare, dark cinematic ─────────────────

const stance = pose({ y: 1250, lHip: -15, rHip: 15, lKnee: 0, rKnee: 0, lShoulder: -12, rShoulder: 12, lElbow: 8, rElbow: 8 });
const intro: SceneDef = {
  look: LOOKS.neutral,
  at: (u) => {
    const breathe = Math.sin(u * Math.PI * 3) * 1.5;
    const p = { ...stance, torso: breathe * 0.4, head: lerp(14, -2, ease((u - 0.1) / 0.35)) };
    const head = jointWorld(p, "head");
    // slow push-in on the face, then a violent rush into the eyes before the drop
    const rush = Math.pow(clamp01((u - 0.78) / 0.2), 3);
    return {
      pose: p,
      eyes: ease((u - 0.38) / 0.12) * (0.85 + 0.15 * Math.sin(u * 60)),
      camera: cam(head[0], lerp(head[1] + 140, head[1] + 10, ease(u)), lerp(1.9, 2.5, u) + rush * 4.5, lerp(-2, 1.5, u)),
    };
  },
  backdrop: ({ frame, u }) => (
    <>
      <Stadium look={LOOKS.neutral} frame={frame} id="intro" lightsOn={0.55 + 0.45 * ease(u / 0.4)} crowdY={1180} />
      <GodRays x={540} y={420} color="#bfe3ff" frame={frame} opacity={0.18 + 0.2 * ease(u / 0.5)} />
      <Embers frame={frame} id="intro" color="#9fd8ff" speed={0.35} />
    </>
  ),
};

// ── REAL MADRID: bicycle kick ─────────────────────────────────────────

const bikeKeys: Array<[number, Pose]> = [
  [0, pose({ x: 650, y: 1215, torso: 16, lHip: 30, lKnee: 50, rHip: -25, rKnee: 70, lShoulder: -40, rShoulder: 40, rElbow: 70 })],
  [0.2, pose({ x: 590, y: 1170, rot: -20, torso: -8, lHip: 70, lKnee: 80, rHip: -10, rKnee: 30, lShoulder: -60, rShoulder: -40 })],
  [0.4, pose({ x: 545, y: 880, rot: -105, rHip: 95, rKnee: 40, lHip: 35, lKnee: 95, lShoulder: -100, rShoulder: -115, lElbow: 25, rElbow: 25 })],
  [0.5, pose({ x: 535, y: 840, rot: -150, rHip: 118, rKnee: 4, lHip: 25, lKnee: 85, lShoulder: -125, rShoulder: -80, lElbow: 10, rElbow: 30 })],
  [0.72, pose({ x: 525, y: 1000, rot: -170, rHip: 70, rKnee: 30, lHip: 50, lKnee: 60, lShoulder: -150, rShoulder: -140 })],
  [1, pose({ x: 515, y: 1480, rot: -178, rHip: 40, rKnee: 40, lHip: 45, lKnee: 50, lShoulder: -160, rShoulder: -150 })],
];
const bikeContact = jointWorld(bikeKeys[3][1], "rFoot");
const bicycle: SceneDef = {
  look: LOOKS.real,
  at: (u) => {
    const p = poseAt(bikeKeys, u);
    let ball: BallState;
    if (u < 0.5) {
      const [x, y] = arc([1250, 900], [980, 420], bikeContact, (u - 0.05) / 0.45);
      ball = { x, y, r: 40, spin: u * 900 };
    } else {
      const [x, y] = arc(bikeContact, [300, 300], [-500, 120], (u - 0.5) / 0.22);
      ball = { x, y, r: 40, spin: u * 2400, squash: u < 0.53 ? 0.72 : 1 };
    }
    return {
      pose: p,
      ball,
      camera: camLerp(
        [
          [0, cam(600, 1150, 1.05, 2)],
          [0.42, cam(560, 900, 1.25, -3)],
          [0.5, cam(bikeContact[0] - 40, bikeContact[1] + 60, 1.55, -6)],
          [0.75, cam(520, 980, 1.2, 0)],
          [1, cam(520, 1150, 1.05, 2)],
        ],
        u,
      ),
    };
  },
  backdrop: ({ frame }) => <Stadium look={LOOKS.real} frame={frame} id="bike" />,
};

// ── stepovers (dribbling) ─────────────────────────────────────────────

const makeStepovers = (look: TeamLook, mirror: boolean, id: string): SceneDef => ({
  look,
  at: (u) => {
    const ph = u * Math.PI * 2 * 3.2;
    const base = pose({ x: 470, y: 1205, torso: 20, lShoulder: -55, rShoulder: 45, lElbow: 30, rElbow: 40 });
    const p: Pose = {
      ...base,
      rHip: 22 + 34 * Math.sin(ph),
      rKnee: 45 + 45 * Math.max(0, Math.sin(ph)),
      lHip: 22 + 34 * Math.sin(ph + Math.PI),
      lKnee: 45 + 45 * Math.max(0, Math.sin(ph + Math.PI)),
      x: base.x + Math.sin(ph / 2) * 26,
      rot: Math.sin(ph / 2) * 4,
      lShoulder: -55 + 25 * Math.sin(ph),
      rShoulder: 45 - 25 * Math.sin(ph),
    };
    const out: SceneState = {
      pose: { ...p, face: mirror ? -1 : 1, x: mirror ? 1080 - p.x : p.x },
      ball: { x: mirror ? 1080 - (760 + Math.sin(ph / 2) * 40) : 760 + Math.sin(ph / 2) * 40, y: GROUND - 38, r: 40, spin: u * 1500 },
      camera: cam(mirror ? 1080 - 600 : 600, 1390, 1.32, mirror ? 3 : -3),
    };
    return out;
  },
  backdrop: ({ frame, local }) => (
    <>
      <Stadium look={look} frame={frame} id={id} scroll={(mirror ? -1 : 1) * local * 40} />
      <SpeedLines frame={frame} id={id} color={look.glow} angle={mirror ? 188 : -8} />
    </>
  ),
});

// ── MAN UNITED: the stance + knuckleball free kick ────────────────────

const fkStance = pose({ x: 420, y: 1215, torso: -4, head: -4, lHip: -17, rHip: 17, lKnee: 0, rKnee: 0, lShoulder: -9, rShoulder: 9, lElbow: 4, rElbow: 4 });
const fkImpactPose = pose({ x: 610, y: 1190, torso: -16, lHip: -4, lKnee: 12, rHip: 28, rKnee: 6, lShoulder: -75, rShoulder: -35, rElbow: 25 });
const fkKeys: Array<[number, Pose]> = [
  [0, fkStance],
  [0.2, { ...fkStance, torso: -6 }],
  [0.32, pose({ x: 540, y: 1200, torso: 18, lHip: 45, lKnee: 35, rHip: -35, rKnee: 75, lShoulder: 45, rShoulder: -45, lElbow: 40, rElbow: 40 })],
  [0.42, fkImpactPose],
  [0.56, pose({ x: 650, y: 1180, torso: -22, lHip: -8, lKnee: 10, rHip: 92, rKnee: 10, lShoulder: -85, rShoulder: -60 })],
  [1, pose({ x: 700, y: 1205, torso: 8, lHip: 15, lKnee: 20, rHip: -5, rKnee: 25, lShoulder: -30, rShoulder: 30, lElbow: 30, rElbow: 30 })],
];
const fkBallSpot = jointWorld(fkImpactPose, "rFoot");
const freekick: SceneDef = {
  look: LOOKS.united,
  at: (u) => {
    const p = poseAt(fkKeys, u);
    let ball: BallState;
    if (u < 0.42) ball = { x: fkBallSpot[0] + 20, y: GROUND - 38, r: 40, spin: 0 };
    else {
      const t = (u - 0.42) / 0.5;
      const [x, y] = arc([fkBallSpot[0] + 20, GROUND - 38], [1000, 600], [860, 560], t);
      // knuckleball: no spin, erratic wobble
      ball = { x: x + Math.sin(t * 40) * 18 * t, y: y + Math.cos(t * 33) * 10 * t, r: lerp(40, 13, ease(t)), spin: Math.sin(t * 9) * 12, squash: u < 0.45 ? 0.75 : 1 };
    }
    return {
      pose: p,
      ball,
      camera: camLerp(
        [
          [0, cam(430, 1050, 1.35, 0)],
          [0.22, cam(450, 1100, 1.25, 0)],
          [0.42, cam(fkBallSpot[0], 1350, 1.4, -4)],
          [0.7, cam(760, 950, 1.05, 2)],
          [1, cam(800, 850, 1.1, 3)],
        ],
        u,
      ),
    };
  },
  backdrop: ({ frame }) => <Stadium look={LOOKS.united} frame={frame} id="fk" />,
  front: ({ u }) => {
    const hit = clamp01((u - 0.9) / 0.1);
    return (
      <g opacity={0.9}>
        {/* distant goal */}
        <rect x={780} y={520} width={170} height={70} fill="none" stroke="#ffffff" strokeWidth={5} />
        <g opacity={0.35}>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={780 + i * 21} y1={520} x2={780 + i * 21 + (hit ? Math.sin(i) * 6 : 0)} y2={590} stroke="#fff" strokeWidth={1.5} />
          ))}
        </g>
        {hit > 0 && <circle cx={860} cy={556} r={20 + hit * 90} fill="none" stroke="#ff4a2a" strokeWidth={6} opacity={1 - hit} />}
      </g>
    );
  },
};

// ── CHAMPIONS LEAGUE nights: trophy lift ──────────────────────────────

const Stars: React.FC<{ cx: number; cy: number; r: number; spin: number; color: string }> = ({ cx, cy, r, spin, color }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${spin})`} style={{ filter: `drop-shadow(0 0 14px ${color})` }}>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r * 0.42;
      const pts = Array.from({ length: 10 }, (_, k) => {
        const rr = k % 2 ? 14 : 34;
        const aa = (k / 10) * Math.PI * 2 - Math.PI / 2;
        return `${(sx + Math.cos(aa) * rr).toFixed(1)},${(sy + Math.sin(aa) * rr).toFixed(1)}`;
      }).join(" ");
      return <polygon key={i} points={pts} fill="#ffffff" opacity={0.55 + 0.45 * Math.sin(a)} />;
    })}
  </g>
);

const Trophy: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} style={{ filter: "drop-shadow(0 0 24px #cfe0ff) drop-shadow(0 0 60px #3d7bff)" }}>
    <defs>
      <linearGradient id="silver" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d99ad" />
        <stop offset="0.45" stopColor="#ffffff" />
        <stop offset="1" stopColor="#7c879b" />
      </linearGradient>
    </defs>
    {/* big-eared generic cup */}
    <path d="M-70 -150 Q-75 -40 -20 10 L-14 70 L-50 95 L50 95 L14 70 L20 10 Q75 -40 70 -150 Z" fill="url(#silver)" />
    <path d="M-68 -130 Q-170 -150 -150 -40 Q-130 20 -40 0" fill="none" stroke="url(#silver)" strokeWidth={16} />
    <path d="M68 -130 Q170 -150 150 -40 Q130 20 40 0" fill="none" stroke="url(#silver)" strokeWidth={16} />
    <rect x={-60} y={95} width={120} height={36} rx={6} fill="#b8c2d4" />
  </g>
);

const makeUcl = (closeUp: boolean, id: string): SceneDef => ({
  look: LOOKS.ucl,
  at: (u) => {
    const p = pose({
      y: 1240 - Math.sin(u * Math.PI) * 10,
      torso: -6,
      head: -18,
      lShoulder: -168,
      lElbow: -14,
      rShoulder: 168,
      rElbow: 14,
      lHip: -12,
      rHip: 12,
    });
    const hands = jointWorld(p, "lHand");
    return {
      pose: p,
      camera: closeUp ? cam(540, hands[1] - 80, lerp(1.9, 2.2, u), -4) : cam(540, lerp(1000, 900, u), lerp(1.0, 1.15, u), lerp(-2, 2, u)),
    };
  },
  backdrop: ({ frame, u }) => (
    <>
      <Stadium look={LOOKS.ucl} frame={frame} id={id} />
      <GodRays x={540} y={closeUp ? 600 : 420} color="#a9c4ff" frame={frame} opacity={0.4} />
      <Stars cx={540} cy={closeUp ? 520 : 330} r={closeUp ? 360 : 300} spin={u * 40} color="#3d7bff" />
    </>
  ),
  front: ({ frame, state }) => {
    const hands = jointWorld(state.pose!, "lHand");
    return (
      <>
        <Trophy x={540} y={hands[1] - 150} s={1} />
        <Embers frame={frame} id={`${id}-conf`} color="#c4d6ff" count={50} speed={-1.6} />
      </>
    );
  },
});

// ── PORTUGAL: the towering header ─────────────────────────────────────

const headKeys: Array<[number, Pose]> = [
  [0, pose({ x: 380, y: 1215, torso: 22 })],
  [0.2, pose({ x: 470, y: 1300, torso: 32, lHip: 70, lKnee: 115, rHip: 62, rKnee: 105, lShoulder: -45, rShoulder: -35, lElbow: 40, rElbow: 40 })],
  [0.42, pose({ x: 535, y: 800, torso: -24, head: -12, lHip: 12, lKnee: 95, rHip: -4, rKnee: 108, lShoulder: -150, rShoulder: -125, lElbow: -15, rElbow: -20 })],
  [0.5, pose({ x: 545, y: 770, torso: 14, head: 24, lHip: 22, lKnee: 88, rHip: 6, rKnee: 98, lShoulder: -100, rShoulder: -62, lElbow: 10, rElbow: 10 })],
  [0.76, pose({ x: 560, y: 930, torso: 6, lHip: 8, lKnee: 50, rHip: 2, rKnee: 60, lShoulder: -70, rShoulder: -40 })],
  [1, pose({ x: 570, y: 1225, torso: 10, lHip: -8, lKnee: 20, rHip: 8, rKnee: 25, lShoulder: -25, rShoulder: 25, lElbow: 20, rElbow: 20 })],
];
const headContact = (() => {
  const h = jointWorld(headKeys[3][1], "head");
  return [h[0] + 70, h[1] - 10] as [number, number];
})();
const runPhase = (u: number) => u * Math.PI * 2 * 4;
const header: SceneDef = {
  look: LOOKS.portugal,
  at: (u) => {
    let p = poseAt(headKeys, u);
    if (u < 0.18) p = run(p, runPhase(u), 1 - u / 0.18);
    let ball: BallState;
    if (u < 0.5) {
      const [x, y] = arc([1300, 380], [1000, 420], headContact, (u - 0.08) / 0.42);
      ball = { x, y, r: 40, spin: u * 800 };
    } else {
      const [x, y] = arc(headContact, [120, 900], [-300, 1500], (u - 0.5) / 0.25);
      ball = { x, y, r: 40, spin: u * 2000, squash: u < 0.53 ? 0.7 : 1 };
    }
    return {
      pose: p,
      ball,
      camera: camLerp(
        [
          [0, cam(480, 1150, 1.05, 3)],
          [0.42, cam(540, 820, 1.25, -2)],
          [0.5, cam(headContact[0] - 60, headContact[1] + 120, 1.6, -5)],
          [0.8, cam(560, 950, 1.15, 0)],
          [1, cam(560, 1100, 1.05, 2)],
        ],
        u,
      ),
    };
  },
  backdrop: ({ frame }) => <Stadium look={LOOKS.portugal} frame={frame} id="head" />,
  front: ({ u, state }) => {
    const show = clamp01((u - 0.3) / 0.08) * (1 - clamp01((u - 0.72) / 0.08));
    if (show <= 0) return null;
    const head = jointWorld(state.pose!, "head");
    const top = head[1] - 70;
    return (
      <g opacity={show}>
        <line x1={250} y1={GROUND} x2={250} y2={top} stroke="#18c26a" strokeWidth={6} style={{ filter: "drop-shadow(0 0 12px #18c26a)" }} />
        <line x1={225} y1={top} x2={head[0] - 70} y2={top} stroke="#ffffff" strokeWidth={3} strokeDasharray="14 10" opacity={0.8} />
        <text x={210} y={(top + GROUND) / 2} textAnchor="end" fontFamily="Anton, Impact, sans-serif" fontSize={78} fill="#ffffff" transform={`rotate(-90 210 ${(top + GROUND) / 2})`} style={{ filter: "drop-shadow(0 0 16px #ff2b2b)" }}>
          2.56 M
        </text>
      </g>
    );
  },
};

// ── the net ripple ────────────────────────────────────────────────────

const net: SceneDef = {
  look: LOOKS.real,
  at: (u) => {
    const t = clamp01(u / 0.3);
    const ball: BallState =
      u < 0.3
        ? { x: lerp(-100, 540, t), y: lerp(1900, 960, t), r: lerp(120, 70, t), spin: u * 1500 }
        : { x: 540, y: 960 + (u - 0.3) * 60, r: lerp(70, 52, clamp01((u - 0.3) / 0.3)), spin: 600 + u * 300 };
    return { ball, camera: cam(540, 960, 1 + u * 0.12, -2 + u * 4) };
  },
  backdrop: ({ u }) => {
    const hit = Math.max(0, u - 0.3);
    const amp = hit > 0 ? 110 * Math.exp(-hit * 6) * Math.cos(hit * 30) + 60 * Math.exp(-hit * 2) : 0;
    const bump = (x: number, y: number) => {
      const d = Math.hypot(x - 540, y - 960);
      const k = Math.exp(-(d * d) / (2 * 260 * 260)) * amp;
      return [x + ((x - 540) / (d || 1)) * k * 0.25, y + k * 0.6 + ((y - 960) / (d || 1)) * k * 0.25];
    };
    const lines: React.ReactNode[] = [];
    for (let i = -6; i <= 30; i++) {
      const pts: string[] = [];
      const pts2: string[] = [];
      for (let j = -6; j <= 30; j++) {
        const [x, y] = bump(i * 60 - 300, j * 90 - 300);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        const [x2, y2] = bump(j * 60 - 300, i * 90 - 300);
        pts2.push(`${x2.toFixed(1)},${y2.toFixed(1)}`);
      }
      lines.push(<polyline key={`a${i}`} points={pts.join(" ")} fill="none" stroke="#e9edf5" strokeWidth={3} opacity={0.55} />);
      lines.push(<polyline key={`b${i}`} points={pts2.join(" ")} fill="none" stroke="#e9edf5" strokeWidth={3} opacity={0.55} />);
    }
    return (
      <>
        <rect x={-400} y={-400} width={1880} height={2720} fill="#05030c" />
        <circle cx={540} cy={960} r={900} fill="#9d6bff" opacity={0.18} />
        <g style={{ filter: "drop-shadow(0 0 8px #9d6bff)" }}>{lines}</g>
        <rect x={-400} y={120} width={1880} height={34} fill="#ffffff" style={{ filter: "drop-shadow(0 0 20px #fff)" }} />
        <rect x={110} y={120} width={34} height={2400} fill="#ffffff" style={{ filter: "drop-shadow(0 0 20px #fff)" }} />
      </>
    );
  },
};

// ── close-up power strike ─────────────────────────────────────────────

const strikeBase = pose({ x: 0, y: 0, scale: 2.5, torso: -12, lHip: -10, lKnee: 10, lShoulder: -70, rShoulder: -40 });
const strikeAt = (u: number): Pose => {
  const k = u < 0.45 ? ease(u / 0.45) : 1 + ease((u - 0.45) / 0.55);
  const p = { ...strikeBase, rHip: lerp(-55, 18, Math.min(1, k)) + (k > 1 ? (k - 1) * 70 : 0), rKnee: lerp(95, 6, Math.min(1, k)) };
  return p;
};
const strikeFoot = jointWorld(strikeAt(0.45), "rFoot");
const STRIKE_TARGET: [number, number] = [470, 1180];
const strikeOffset = (p: Pose): Pose => ({ ...p, x: STRIKE_TARGET[0] - strikeFoot[0], y: STRIKE_TARGET[1] - strikeFoot[1] });
const strike: SceneDef = {
  look: LOOKS.portugal,
  at: (u) => {
    const p = strikeOffset(strikeAt(u));
    const t = clamp01((u - 0.45) / 0.3);
    const ball: BallState = {
      x: STRIKE_TARGET[0] + 95 + t * 1300,
      y: STRIKE_TARGET[1] - 10 - t * 500,
      r: 95 - t * 20,
      spin: u * 2000,
      squash: u > 0.44 && u < 0.52 ? 0.68 : 1,
    };
    return { pose: p, ball, camera: cam(540, 1060, 1, -6) };
  },
  backdrop: ({ frame, local }) => (
    <>
      <Stadium look={LOOKS.portugal} frame={frame} id="strike" scroll={local * 25} crowdY={760} />
      <SpeedLines frame={frame} id="strike" color="#18c26a" angle={-20} strength={0.8} />
    </>
  ),
  front: ({ u }) => {
    const t = clamp01((u - 0.45) / 0.35);
    if (t <= 0 || t >= 1) return null;
    return (
      <g style={{ filter: "drop-shadow(0 0 18px #ff2b2b)" }}>
        <circle cx={STRIKE_TARGET[0] + 95} cy={STRIKE_TARGET[1] - 10} r={60 + t * 520} fill="none" stroke="#ffffff" strokeWidth={22 * (1 - t)} opacity={1 - t} />
        <circle cx={STRIKE_TARGET[0] + 95} cy={STRIKE_TARGET[1] - 10} r={30 + t * 320} fill="none" stroke="#18c26a" strokeWidth={12 * (1 - t)} opacity={1 - t} />
      </g>
    );
  },
};

// ── SIUUU celebration ─────────────────────────────────────────────────

const siuPose = pose({ y: 1215, torso: -7, head: -16, lHip: -24, rHip: 24, lKnee: 6, rKnee: 6, lShoulder: -42, rShoulder: 42, lElbow: -6, rElbow: 6 });
const siuKeys: Array<[number, Pose]> = [
  [0, pose({ y: 1110, scale: 0.5, torso: 16 })],
  [0.3, pose({ y: 1160, scale: 0.78, torso: 14 })],
  [0.36, pose({ y: 1260, scale: 0.86, torso: 26, lHip: 55, lKnee: 95, rHip: 50, rKnee: 90, lShoulder: -30, rShoulder: 30 })],
  [0.48, pose({ y: 780, scale: 0.95, torso: -4, lHip: 40, lKnee: 85, rHip: 35, rKnee: 80, lShoulder: -130, rShoulder: 130, lElbow: -10, rElbow: 10 })],
  [0.62, siuPose],
  [1, { ...siuPose, scale: 1.04 }],
];
const siuuu: SceneDef = {
  look: LOOKS.real,
  at: (u) => {
    let p = poseAt(siuKeys, u);
    if (u < 0.32) p = run(p, u * Math.PI * 2 * 4.5, 1);
    // 180° spin in the air
    const spin = clamp01((u - 0.38) / 0.22) * Math.PI;
    const c = Math.cos(spin);
    p = { ...p, face: Math.sign(c || -1) * Math.max(0.12, Math.abs(c)) };
    const landed = u >= 0.62;
    return {
      pose: p,
      camera: landed
        ? cam(540, 1060, lerp(1.25, 1.12, clamp01((u - 0.62) / 0.38)), lerp(-4, 0, clamp01((u - 0.62) / 0.3)))
        : cam(540, lerp(1150, 900, ease((u - 0.3) / 0.2)), lerp(1.0, 1.1, u), 2),
    };
  },
  backdrop: ({ frame, u }) => (
    <>
      <Stadium look={LOOKS.real} frame={frame} id="siu" />
      {u > 0.6 && <GodRays x={540} y={760} color="#e8c766" frame={frame} opacity={0.35 * clamp01((u - 0.6) / 0.06)} />}
    </>
  ),
  front: ({ u }) => {
    const t = clamp01((u - 0.62) / 0.25);
    if (t <= 0 || t >= 1) return null;
    return (
      <ellipse cx={540} cy={GROUND} rx={80 + t * 700} ry={14 + t * 90} fill="none" stroke="#e8c766" strokeWidth={18 * (1 - t)} opacity={1 - t} style={{ filter: "drop-shadow(0 0 16px #e8c766)" }} />
    );
  },
};

// ── final title: CR7 🐐 THE GOAT ──────────────────────────────────────

const goat: SceneDef = {
  look: LOOKS.goat,
  at: (u) => ({
    pose: { ...siuPose, x: 540, y: 1520, scale: 0.6 + u * 0.04 },
    camera: cam(540, 960, 1 + u * 0.08, 0),
  }),
  backdrop: ({ frame }) => (
    <>
      <rect x={-400} y={-400} width={1880} height={2720} fill="#030201" />
      <GodRays x={540} y={1050} color="#ffcf4a" frame={frame} opacity={0.32} count={18} />
      <circle cx={540} cy={1050} r={520} fill="#ffb800" opacity={0.1} />
      <Embers frame={frame} id="goat" color="#ffcf4a" count={80} speed={0.45} />
    </>
  ),
};

export const SCENES: Record<string, SceneDef> = {
  intro,
  bicycle,
  stepovers: makeStepovers(LOOKS.real, false, "step1"),
  "stepovers-2": makeStepovers(LOOKS.united, true, "step2"),
  freekick,
  ucl: makeUcl(false, "ucl1"),
  "ucl-2": makeUcl(true, "ucl2"),
  header,
  net,
  strike,
  siuuu,
  goat,
};

export function sceneFor(shot: Shot): SceneDef {
  const s = SCENES[shot.id] ?? SCENES[shot.kind];
  if (!s) throw new Error(`No scene for shot ${shot.id}`);
  return s;
}

