import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import timeline from "./timeline.json";
import {
  Ball,
  Camera,
  Car,
  CloudPuff,
  Earth,
  Environment,
  Ocean,
  Particles,
  Person,
  Pool,
  Stars,
  Street,
  Sun,
  SurprisedHead,
  Tree,
  WaterBlob,
  floatHeight,
  rand,
  useSky,
  useWaterMaterial,
} from "./world";

const W = 1080;
const H = 1920;
const FPS = timeline.fps;
const OFF = timeline.gravityOffFrame;
const BACK = timeline.gravityBackFrame;
/** Narrative "slow motion": 9.9 s of screen time show the 5 weightless seconds. */
const FLOAT_SCREEN = (BACK - OFF) / FPS;
/** Weightless seconds the street objects drift before the fall shot. */
const STREET_FLOAT = 4.6;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Seconds of weightlessness at a global frame (0 before, capped at gravity return). */
export function weightlessSeconds(globalFrame: number) {
  return Math.max(0, Math.min(globalFrame, BACK) - OFF) / FPS;
}

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThreeCanvas width={W} height={H} gl={{ antialias: true, preserveDrawingBuffer: true }} shadows camera={{ fov: 45, position: [0, 0, 10] }}>
    {children}
  </ThreeCanvas>
);

// ───────────────────────── 1. Earth ─────────────────────────

export const EarthShot: React.FC<{ from: number; calm?: boolean }> = ({ from, calm = false }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const f = calm ? g : Math.min(g, timeline.freezeFrame); // freeze frame after the flash
  const space = useMemo(() => new THREE.Color("#02030a"), []);
  let camZ: number;
  let camY: number;
  if (calm) {
    camZ = interpolate(local, [0, 90], [44, 62], { ...clamp, easing: Easing.out(Easing.cubic) });
    camY = interpolate(local, [0, 90], [-2, 1], clamp);
  } else {
    camZ = interpolate(f, [0, 60], [140, 40], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    camY = interpolate(f, [0, 60], [14, 2], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  }
  const rot = f * 0.006 + (calm ? 1.2 : 0);
  return (
    <Canvas>
      <Environment intensity={0.15} background={space} />
      <Camera position={[0, camY, camZ]} target={[0, calm ? -2 : 0, 0]} fov={45} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[-30, 12, 22]} intensity={3.2} color="#fff8ee" />
      <Earth rotation={rot} />
      <Stars />
    </Canvas>
  );
};

// ───────────────────────── 2/6/9. Street ─────────────────────────

type StreetObj =
  | { kind: "car"; x: number; z: number; color: string; push: number; ry: number; spin: [number, number, number] }
  | { kind: "ball"; x: number; z: number; color: string; ball: "beach" | "soccer" | "basket"; push: number; r: number }
  | { kind: "person"; x: number; z: number; shirt: string; skin: string; hair: string; push: number; ry: number };

const STREET: StreetObj[] = [
  { kind: "car", x: -2.3, z: -2, color: "#d62828", push: 0.62, ry: 0, spin: [0.05, 0.06, 0.08] },
  { kind: "car", x: 2.4, z: -10, color: "#f4c430", push: 0.5, ry: Math.PI, spin: [-0.04, 0.05, -0.06] },
  { kind: "car", x: -2.2, z: -17, color: "#2a6fdb", push: 0.56, ry: 0, spin: [0.06, -0.04, 0.05] },
  { kind: "person", x: 6.8, z: 2, shirt: "#e76f51", skin: "#f1c27d", hair: "#2b1a10", push: 0.55, ry: -0.5 },
  { kind: "person", x: 7.6, z: -4, shirt: "#2a9d8f", skin: "#c68642", hair: "#120c08", push: 0.5, ry: -0.9 },
  { kind: "person", x: -7.2, z: 0, shirt: "#8338ec", skin: "#ffdbac", hair: "#a0522d", push: 0.6, ry: 0.6 },
  { kind: "person", x: -6.6, z: -7, shirt: "#ffb703", skin: "#8d5524", hair: "#0d0907", push: 0.48, ry: 0.8 },
  { kind: "ball", x: 0.8, z: 3, color: "#e63946", ball: "beach", push: 0.9, r: 0.42 },
  { kind: "ball", x: 5.6, z: 4, color: "#fff", ball: "soccer", push: 0.8, r: 0.3 },
  { kind: "ball", x: -5.2, z: 3.5, color: "#fff", ball: "basket", push: 0.85, r: 0.33 },
  { kind: "ball", x: 3.5, z: -1, color: "#3a86ff", ball: "beach", push: 1.0, r: 0.5 },
  { kind: "ball", x: -4.2, z: -3, color: "#ff006e", ball: "beach", push: 0.75, r: 0.38 },
];

/** Street at simulation state: `tf` seconds weightless, `tb` seconds since gravity returned. */
const StreetScene: React.FC<{ tf: number; tb: number | null; t: number }> = ({ tf, tb, t }) => {
  const sky = useSky("#5aa7e8", "#dff1ff");
  const tFloatTotal = STREET_FLOAT;
  return (
    <>
      <Environment intensity={0.55} background={sky} />
      <Sun position={[14, 22, 10]} intensity={2.8} size={26} />
      <fog attach="fog" args={["#cfe6f7", 30, 95]} />
      <Street />
      {[-9, 9].flatMap((x) => [6, -6, -18].map((z) => <Tree key={`${x}${z}`} position={[x, 0.24, z]} scale={1.1} />))}
      {STREET.map((o, i) => {
        const y = floatHeight({ y0: 0, push: o.push, tf, tb, tFloatTotal, bounce: o.kind === "ball" ? 0.55 : o.kind === "car" ? 0.15 : 0.25 });
        const up = y > 0.02 ? 1 : 0;
        const airtime = tb !== null && tb > 0 ? Math.min(tf, tFloatTotal) : tf;
        if (o.kind === "car") {
          const k = Math.min(1, y / 2) * airtime;
          return <Car key={i} color={o.color} position={[o.x, y, o.z]} rotation={[o.spin[0] * k, o.ry + o.spin[1] * k, o.spin[2] * k]} />;
        }
        if (o.kind === "ball") {
          return <Ball key={i} color={o.color} kind={o.ball} radius={o.r} position={[o.x, o.r + y, o.z]} spin={airtime * 0.9 + i} />;
        }
        const tumble = Math.min(1, y / 1.5) * airtime * 0.12;
        return (
          <Person
            key={i}
            position={[o.x, 0.24 + y, o.z]}
            rotation={[tumble * (i % 2 ? 1 : -1), o.ry, tumble * 0.6]}
            shirt={o.shirt}
            skin={o.skin}
            hair={o.hair}
            armsUp={up * Math.min(1, y / 0.8)}
            legs={up * Math.min(1, y / 1.2)}
            t={t + i}
          />
        );
      })}
    </>
  );
};

export const StreetFloatShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const tf = weightlessSeconds(g);
  const p = local / 60;
  return (
    <Canvas>
      <Camera position={[interpolate(p, [0, 1], [-3, 2]), interpolate(p, [0, 1], [2.2, 3.6]), 17 - p * 3]} target={[0, 2.2 + p * 1.2, -2]} fov={50} />
      <StreetScene tf={tf} tb={null} t={g / FPS} />
    </Canvas>
  );
};

export const CarCloseShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const tf = weightlessSeconds(g);
  const carY = floatHeight({ y0: 0, push: STREET[0].push, tf, tb: null });
  const p = local / 66;
  return (
    <Canvas>
      <Camera
        position={[-6.8 + p * 1.2, 0.5 + p * 0.3, 4.5 - p * 0.8]}
        target={[-2.3, 0.9 + carY * 0.9, -2]}
        fov={42}
        roll={-0.12 + p * 0.08}
      />
      <StreetScene tf={tf} tb={null} t={g / FPS} />
    </Canvas>
  );
};

export const StreetFallShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const tf = STREET_FLOAT;
  const tb = local / FPS;
  // camera shake on impacts
  const shake = Math.max(0, 1 - Math.abs(tb - 0.75) * 2.5) * 0.25 + Math.max(0, 1 - Math.abs(tb - 1.15) * 3) * 0.15;
  const sx = Math.sin(local * 2.7) * shake;
  const sy = Math.cos(local * 3.3) * shake;
  return (
    <Canvas>
      <Camera position={[4 + sx, 4.2 + sy - local * 0.012, 18 - local * 0.03]} target={[0, 2.4 - local * 0.015, -3]} fov={52} />
      <StreetScene tf={tf} tb={tb} t={g / FPS} />
      {tb > 0.6 && (
        <Particles count={70} seed={9} t={tb - 0.6} origin={[-2.3, 0.1, -2]} spread={3} color="#cfc7bb" size={0.12} mode="burst" />
      )}
    </Canvas>
  );
};

export const RewindShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const total = 90;
  // play the whole story backwards: fall → float → ground
  const p = local / total;
  const tFloatTotal = STREET_FLOAT;
  const fallDur = 2.4;
  const storyLen = tFloatTotal + fallDur;
  const s = storyLen * (1 - Easing.inOut(Easing.quad)(Math.min(1, p * 1.12)));
  const tf = Math.min(s, tFloatTotal);
  const tb = s > tFloatTotal ? s - tFloatTotal : null;
  return (
    <Canvas>
      <Camera position={[0, 4.5, 20 - p * 2]} target={[0, 2.2, -3]} fov={52} />
      <StreetScene tf={tf} tb={tb} t={(from + total - local) / FPS} />
    </Canvas>
  );
};

// ───────────────────────── 4/7. Pool ─────────────────────────

const BLOBS = Array.from({ length: 16 }).map((_, i) => ({
  x: (rand(i * 5.3) - 0.5) * 8,
  z: (rand(i * 9.1) - 0.5) * 4.4,
  r: 0.18 + rand(i * 2.9) ** 2 * 0.75,
  push: 0.5 + rand(i * 4.1) * 1.1,
  delay: rand(i * 6.7) * 0.6,
}));

const PoolScene: React.FC<{ tf: number; tb: number | null; t: number }> = ({ tf, tb, t }) => {
  const sky = useSky("#3d8fe0", "#e9f6ff");
  const water = useWaterMaterial();
  const surfaceMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#5ccbf0",
        roughness: 0.05,
        transmission: 0.55,
        thickness: 1,
        ior: 1.33,
        clearcoat: 1,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );
  const tFloatTotal = 3.2;
  const lifted = BLOBS.reduce((a, b) => a + b.r ** 3, 0);
  const levelDrop = tb === null ? Math.min(1, tf / 2.5) * 0.35 : Math.max(0, 0.35 - tb * 0.5);
  return (
    <>
      <Environment intensity={0.7} background={sky} />
      <Sun position={[-10, 18, 8]} intensity={3} size={14} />
      <Pool waterLevel={-0.18 - levelDrop * Math.min(1, lifted)} waterMaterial={surfaceMat} rippleT={t} />
      {/* deck chairs + palms for scale */}
      <Tree position={[-7.5, 0, -5]} scale={1.3} />
      <Tree position={[7.8, 0, -4.5]} scale={1.1} />
      {/* pool ring */}
      {(() => {
        const y = floatHeight({ y0: -0.15, push: 0.7, tf, tb, tFloatTotal, bounce: 0.2 });
        return (
          <mesh position={[1.8, y, 1.2]} rotation={[-Math.PI / 2 + tf * 0.3, tf * 0.2, 0]} castShadow>
            <torusGeometry args={[0.55, 0.2, 18, 36]} />
            <meshPhysicalMaterial color="#ff4d4d" roughness={0.3} clearcoat={0.8} />
          </mesh>
        );
      })()}
      {BLOBS.map((b, i) => {
        const tfi = Math.max(0, tf - b.delay);
        const tbi = tb;
        const y = floatHeight({ y0: -0.25, push: b.push, tf: tfi, tb: tbi, tFloatTotal: Math.max(0, tFloatTotal - b.delay), bounce: 0 });
        if (tb !== null && y <= -0.2) return null; // merged back into the pool
        const grow = Math.min(1, tfi * 1.6);
        return <WaterBlob key={i} position={[b.x, y + b.r * grow, b.z]} radius={b.r * Math.max(0.05, grow)} t={t + i} seed={i} material={water} />;
      })}
      <Particles count={60} seed={3} t={tb === null ? tf : tFloatTotal} origin={[0, -0.1, 0]} spread={8} color="#d7f3ff" size={0.05} mode="rise" material={water} />
      {tb !== null && tb > 0.35 && (
        <>
          <Particles count={120} seed={21} t={tb - 0.35} origin={[-1, -0.2, 0]} spread={4} color="#e8f8ff" size={0.09} mode="burst" material={water} />
          <Particles count={90} seed={57} t={tb - 0.5} origin={[2.5, -0.2, -1]} spread={4} color="#e8f8ff" size={0.08} mode="burst" material={water} />
        </>
      )}
    </>
  );
};

export const PoolShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const tf = local / FPS * 1.1;
  const a = -0.6 + local * 0.006;
  return (
    <Canvas>
      <Camera position={[Math.sin(a) * 10, 3.4 + local * 0.012, Math.cos(a) * 10]} target={[0, 1.1 + local * 0.008, 0]} fov={50} />
      <PoolScene tf={tf} tb={null} t={g / FPS} />
    </Canvas>
  );
};

export const PoolCrashShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const tb = local / FPS;
  const shake = Math.max(0, 1 - Math.abs(tb - 0.5) * 2) * 0.18;
  return (
    <Canvas>
      <Camera position={[7 + Math.sin(local * 3) * shake, 2.6 + Math.cos(local * 2.5) * shake, 7.5]} target={[0, 0.6, 0]} fov={48} />
      <PoolScene tf={3.2} tb={tb} t={g / FPS} />
    </Canvas>
  );
};

// ───────────────────────── 5. Ocean ─────────────────────────

const OCEAN_BLOBS = Array.from({ length: 14 }).map((_, i) => ({
  x: (rand(i * 3.7) - 0.5) * 70,
  z: -12 - rand(i * 8.3) * 60,
  r: 1.2 + rand(i * 1.9) * 4.2,
  push: 1.2 + rand(i * 2.2) * 2.2,
}));

export const OceanShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const t = g / FPS;
  const tf = local / FPS + 0.4;
  const sky = useSky("#ff8c5a", "#ffe2b8");
  const water = useWaterMaterial("#a8e4ff");
  const boatY = floatHeight({ y0: 0.2, push: 0.9, tf, tb: null });
  return (
    <Canvas>
      <Environment intensity={0.9} background={sky} />
      <fog attach="fog" args={["#ffd6b0", 40, 150]} />
      <directionalLight position={[-20, 10, -60]} intensity={3.4} color="#ffd1a1" />
      <hemisphereLight args={["#ffd8b0", "#1b4a6b", 0.8]} />
      <Camera position={[0, 5 + local * 0.03, 24]} target={[0, 6 + local * 0.05, -20]} fov={55} />
      <Ocean t={t} />
      {/* sun disc */}
      <mesh position={[-30, 18, -140]}>
        <circleGeometry args={[9, 48]} />
        <meshBasicMaterial color="#fff2c8" fog={false} />
      </mesh>
      <CloudPuff position={[25, 30, -110]} scale={3} />
      <CloudPuff position={[-40, 26, -120]} scale={2.4} />
      {/* small sailboat drifting up */}
      <group position={[8, boatY, -6]} rotation={[tf * 0.08, 0.6, tf * 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.5, 3.4]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3.2, 8]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        <mesh position={[0, 1.9, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.2, 2.6]} />
          <meshStandardMaterial color="#ff6b6b" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {OCEAN_BLOBS.map((b, i) => {
        const grow = Math.min(1, tf * 0.9);
        const y = b.push * tf + 0.08 * b.push * tf * tf;
        return <WaterBlob key={i} position={[b.x, y + b.r * grow * 0.7, b.z]} radius={b.r * Math.max(0.1, grow)} t={t + i} seed={i} material={water} />;
      })}
      <Particles count={140} seed={11} t={tf} origin={[0, 0, -20]} spread={60} color="#d7f3ff" size={0.25} mode="rise" material={water} />
    </Canvas>
  );
};

// ───────────────────────── 8. Faces ─────────────────────────

export const FacesShot: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const g = local + from;
  const t = g / FPS;
  const sky = useSky("#4a9be6", "#e3f3ff");
  const s = (d: number) => interpolate(local, [d, d + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return (
    <Canvas>
      <Environment intensity={0.6} background={sky} />
      <Sun position={[6, 10, 12]} intensity={2.4} size={10} />
      <pointLight position={[-3, 1, 4]} intensity={18} color="#ffd9b0" />
      <Camera position={[0, 0.1, 6.2 - local * 0.025]} target={[0, -0.1, 0]} fov={40} />
      <SurprisedHead position={[-1.45, -0.35, -0.6]} rotation={[0.1, 0.35, 0]} skin="#ffdbac" hair="#a0522d" shirt="#8338ec" surprise={s(2)} look={0.6} />
      <SurprisedHead position={[1.45, -0.3, -0.5]} rotation={[0.1, -0.35, 0]} skin="#8d5524" hair="#0d0907" shirt="#ffb703" surprise={s(8)} look={-0.6} />
      <SurprisedHead position={[0, -0.2, 0.4]} rotation={[0.18, 0, 0]} skin="#f1c27d" hair="#2b1a10" shirt="#e76f51" surprise={s(5)} />
      {/* things still bouncing in the background */}
      <group position={[0, -2.6, -9]}>
        <Street />
        {[0, 1, 2].map((i) => {
          const y = Math.abs(Math.sin(t * 4 + i * 2)) * 2 * Math.exp(-((local / FPS) * 0.6));
          return <Ball key={i} color={["#e63946", "#3a86ff", "#ff006e"][i]} position={[-3 + i * 3, 0.5 + y, -2]} radius={0.5} spin={t * 3} />;
        })}
      </group>
    </Canvas>
  );
};
