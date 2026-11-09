import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { asphaltTexture, cloudTexture, earthTexture, facadeTexture, skyTexture, tileTexture } from "./textures";

// ───────────────────────── physics helpers ─────────────────────────

export const G = 9.81;

export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Height of a floating object.
 * `tf` = seconds since gravity vanished, `tb` = seconds since it came back (or null).
 * While weightless the object drifts up with its small initial push; when gravity returns
 * it falls back with g (+ a damped bounce).
 */
export function floatHeight(opts: { y0: number; push: number; tf: number; tb: number | null; bounce?: number; tFloatTotal?: number }) {
  const { y0, push, tf, tb, bounce = 0.35 } = opts;
  const drift = (t: number) => y0 + push * t + 0.06 * push * t * t;
  if (tb === null || tb <= 0) return drift(Math.max(0, tf));
  const peak = drift(Math.max(0, opts.tFloatTotal ?? tf));
  // fall from peak with gravity (scaled for drama)
  const g = G * 1.4;
  const h = peak - y0;
  const tHit = Math.sqrt((2 * h) / g);
  if (tb < tHit) return peak - 0.5 * g * tb * tb;
  // bounces
  let v = g * tHit * bounce;
  let t = tb - tHit;
  for (let i = 0; i < 4; i++) {
    const tAir = (2 * v) / g;
    if (t < tAir) return y0 + v * t - 0.5 * g * t * t;
    t -= tAir;
    v *= bounce;
  }
  return y0;
}

// ───────────────────────── environment / lighting ─────────────────────────

export const Environment: React.FC<{ intensity?: number; background?: THREE.Texture | THREE.Color | null }> = ({
  intensity = 0.6,
  background,
}) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
  }, [gl, scene, intensity]);
  useMemo(() => {
    scene.background = background ?? null;
  }, [scene, background]);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  return null;
};

export const Sun: React.FC<{ position?: [number, number, number]; intensity?: number; size?: number }> = ({
  position = [12, 20, 8],
  intensity = 2.6,
  size = 30,
}) => (
  <>
    <directionalLight
      position={position}
      intensity={intensity}
      color="#fff3e0"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-size}
      shadow-camera-right={size}
      shadow-camera-top={size}
      shadow-camera-bottom={-size}
      shadow-camera-near={1}
      shadow-camera-far={80}
      shadow-bias={-0.0005}
    />
    <hemisphereLight args={["#bfe3ff", "#5a4a3a", 0.7]} />
  </>
);

export const Camera: React.FC<{ position: [number, number, number]; target: [number, number, number]; fov?: number; roll?: number }> = ({
  position,
  target,
  fov = 45,
  roll = 0,
}) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...position);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(...target);
  if (cam.fov !== fov) {
    cam.fov = fov;
  }
  cam.near = 0.1;
  cam.far = 500;
  cam.updateProjectionMatrix();
  return null;
};

export function useSky(top: string, bottom: string) {
  return useMemo(() => skyTexture(top, bottom), [top, bottom]);
}

// ───────────────────────── space ─────────────────────────

export const Stars: React.FC<{ count?: number; radius?: number }> = ({ count = 1800, radius = 120 }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand(i * 3.1) * 2 - 1;
      const th = rand(i * 7.7) * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos[i * 3] = r * Math.cos(th) * radius;
      pos[i * 3 + 1] = u * radius;
      pos[i * 3 + 2] = r * Math.sin(th) * radius;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, radius]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.35} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
};

const atmosphereShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    uniform vec3 uColor;
    uniform float uPower;
    void main() {
      float rim = 1.0 - max(dot(vNormal, vView), 0.0);
      float a = pow(rim, uPower);
      gl_FragColor = vec4(uColor * a * 1.2, a);
    }`,
};

export const Earth: React.FC<{ rotation: number; tint?: number }> = ({ rotation, tint = 0 }) => {
  const day = useMemo(() => earthTexture(), []);
  const clouds = useMemo(() => cloudTexture(), []);
  const atmo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...atmosphereShader,
        uniforms: { uColor: { value: new THREE.Color("#5fb4ff") }, uPower: { value: 6.0 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  const rim = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...atmosphereShader,
        uniforms: { uColor: { value: new THREE.Color("#8fd0ff") }, uPower: { value: 3.5 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  return (
    <group rotation={[0.35, 0, -0.25]}>
      <mesh rotation={[0, rotation, 0]}>
        <sphereGeometry args={[10, 128, 64]} />
        <meshStandardMaterial map={day} roughness={0.75} metalness={0.05} emissive={new THREE.Color("#ff2a2a")} emissiveIntensity={tint} />
      </mesh>
      <mesh rotation={[0, rotation * 1.25 + 0.4, 0]}>
        <sphereGeometry args={[10.12, 96, 48]} />
        <meshStandardMaterial map={clouds} transparent depthWrite={false} roughness={1} opacity={0.95} />
      </mesh>
      <mesh material={rim}>
        <sphereGeometry args={[10.15, 96, 48]} />
      </mesh>
      <mesh material={atmo}>
        <sphereGeometry args={[10.7, 96, 48]} />
      </mesh>
    </group>
  );
};

// ───────────────────────── city ─────────────────────────

export const Street: React.FC = () => {
  const asphalt = useMemo(() => asphaltTexture(), []);
  const buildings = useMemo(() => {
    const cols = ["#c9b8a6", "#9fb4c7", "#d8c7a0", "#b7a2b9", "#a9b9a2"];
    const list: { x: number; z: number; w: number; h: number; d: number; tex: THREE.Texture }[] = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (13 + rand(i) * 3);
      const z = -40 + Math.floor(i / 2) * 9;
      const h = 10 + rand(i + 9) * 18;
      list.push({ x, z, w: 7, h, d: 7.5, tex: facadeTexture(i, cols[i % cols.length]) });
    }
    return list;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={asphalt} roughness={0.92} />
      </mesh>
      {/* sidewalks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 8.5, 0.12, -10]} receiveShadow>
          <boxGeometry args={[5, 0.24, 120]} />
          <meshStandardMaterial color="#b9b4ad" roughness={0.85} />
        </mesh>
      ))}
      {/* lane markings */}
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} position={[0, 0.011, 18 - i * 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.25, 3]} />
          <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
        </mesh>
      ))}
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial map={b.tex} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

export const Tree: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 1.2, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.22, 2.4, 10]} />
      <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
    </mesh>
    {[
      [0, 3, 0, 1.3],
      [0.5, 2.6, 0.3, 0.9],
      [-0.5, 2.7, -0.2, 0.95],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} castShadow>
        <icosahedronGeometry args={[r, 2]} />
        <meshStandardMaterial color={i === 0 ? "#3f8a3a" : "#4f9c45"} roughness={0.85} flatShading />
      </mesh>
    ))}
  </group>
);

export const Car: React.FC<{ color: string; position: [number, number, number]; rotation?: [number, number, number] }> = ({
  color,
  position,
  rotation = [0, 0, 0],
}) => {
  const paint = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }),
    [color],
  );
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1d2733", metalness: 0.2, roughness: 0.05, clearcoat: 1 }), []);
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.85 }), []);
  const rim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d6d6d6", metalness: 1, roughness: 0.25 }), []);
  return (
    <group position={position} rotation={rotation}>
      {/* body: rounded lower shell */}
      <mesh position={[0, 0.62, 0]} material={paint} castShadow>
        <boxGeometry args={[1.9, 0.62, 4.2, 4, 2, 6]} />
      </mesh>
      <mesh position={[0, 0.62, 2.1]} rotation={[0, 0, Math.PI / 2]} material={paint} castShadow>
        <cylinderGeometry args={[0.31, 0.31, 1.9, 16, 1, false, 0, Math.PI]} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, 1.2, -0.25]} material={paint} castShadow>
        <boxGeometry args={[1.7, 0.6, 2.2]} />
      </mesh>
      <mesh position={[0, 1.2, -0.25]} material={glass}>
        <boxGeometry args={[1.72, 0.48, 2.0]} />
      </mesh>
      <mesh position={[0, 1.18, 0.95]} rotation={[-0.6, 0, 0]} material={glass}>
        <boxGeometry args={[1.62, 0.04, 0.75]} />
      </mesh>
      {/* lights */}
      {[-0.65, 0.65].map((x) => (
        <React.Fragment key={x}>
          <mesh position={[x, 0.72, 2.11]}>
            <boxGeometry args={[0.4, 0.14, 0.04]} />
            <meshStandardMaterial color="#fffbe8" emissive="#fff6cc" emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[x, 0.75, -2.11]}>
            <boxGeometry args={[0.4, 0.14, 0.04]} />
            <meshStandardMaterial color="#c21212" emissive="#ff1a1a" emissiveIntensity={0.9} />
          </mesh>
        </React.Fragment>
      ))}
      {/* wheels */}
      {[
        [-0.92, 1.35],
        [0.92, 1.35],
        [-0.92, -1.35],
        [0.92, -1.35],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={tire} castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.26, 24]} />
          </mesh>
          <mesh material={rim} position={[0, x > 0 ? 0.135 : -0.135, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Ball: React.FC<{ color: string; radius?: number; position: [number, number, number]; spin?: number; kind?: "beach" | "soccer" | "basket" }> = ({
  color,
  radius = 0.35,
  position,
  spin = 0,
  kind = "beach",
}) => {
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    if (kind === "beach") {
      const stripes = [color, "#ffffff", "#ffd23f", "#ffffff", "#2ec4b6", "#ffffff"];
      stripes.forEach((s, i) => {
        ctx.fillStyle = s;
        ctx.fillRect((i * 256) / stripes.length, 0, 256 / stripes.length + 1, 128);
      });
    } else if (kind === "soccer") {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#111";
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc((i * 53) % 256, 20 + ((i * 37) % 90), 11, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#e0701f";
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 3;
      for (const x of [0, 64, 128, 192]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 128);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, 64);
      ctx.lineTo(256, 64);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshPhysicalMaterial({ map: tex, roughness: kind === "beach" ? 0.3 : 0.6, clearcoat: kind === "beach" ? 0.8 : 0 });
  }, [color, kind]);
  return (
    <mesh position={position} rotation={[spin, spin * 0.7, spin * 0.3]} material={mat} castShadow>
      <sphereGeometry args={[radius, 32, 24]} />
    </mesh>
  );
};

export const Person: React.FC<{
  position: [number, number, number];
  shirt: string;
  pants?: string;
  skin?: string;
  hair?: string;
  armsUp?: number; // 0 down … 1 fully up
  legs?: number; // 0 standing … 1 kicking
  rotation?: [number, number, number];
  scale?: number;
  t?: number;
}> = ({ position, shirt, pants = "#2c3e66", skin = "#f1c27d", hair = "#3b2617", armsUp = 0, legs = 0, rotation = [0, 0, 0], scale = 1, t = 0 }) => {
  const skinM = useMemo(() => new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }), [skin]);
  const shirtM = useMemo(() => new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.75 }), [shirt]);
  const pantsM = useMemo(() => new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 }), [pants]);
  const hairM = useMemo(() => new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 }), [hair]);
  const flail = Math.sin(t * 9) * 0.35 * armsUp;
  const armAngle = 0.15 + armsUp * 2.4;
  const kick = Math.sin(t * 7) * 0.5 * legs;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* legs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0.9, 0]} rotation={[s * kick, 0, s * 0.06 * (1 + legs * 2)]}>
          <mesh position={[0, -0.45, 0]} material={pantsM} castShadow>
            <capsuleGeometry args={[0.1, 0.7, 6, 12]} />
          </mesh>
          <mesh position={[0, -0.88, 0.07]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.3]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* torso */}
      <mesh position={[0, 1.3, 0]} material={shirtM} castShadow>
        <capsuleGeometry args={[0.26, 0.5, 8, 16]} />
      </mesh>
      {/* arms */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.33, 1.55, 0]} rotation={[0, 0, s * (armAngle + flail * s)]}>
          <mesh position={[0, -0.33, 0]} material={shirtM} castShadow>
            <capsuleGeometry args={[0.08, 0.3, 6, 10]} />
          </mesh>
          <mesh position={[0, -0.62, 0]} material={skinM} castShadow>
            <capsuleGeometry args={[0.065, 0.28, 6, 10]} />
          </mesh>
        </group>
      ))}
      {/* head */}
      <mesh position={[0, 1.95, 0]} material={skinM} castShadow>
        <sphereGeometry args={[0.21, 24, 18]} />
      </mesh>
      <mesh position={[0, 2.03, -0.03]} material={hairM} scale={[1.05, 0.7, 1.05]}>
        <sphereGeometry args={[0.21, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
};

/** Big, close-up surprised cartoon-realistic face (head & shoulders). */
export const SurprisedHead: React.FC<{
  position: [number, number, number];
  skin: string;
  hair: string;
  shirt: string;
  surprise: number; // 0…1
  look?: number;
  rotation?: [number, number, number];
}> = ({ position, skin, hair, shirt, surprise, look = 0, rotation = [0, 0, 0] }) => {
  const s = Math.max(0, Math.min(1, surprise));
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -1.35, 0]} castShadow>
        <capsuleGeometry args={[0.8, 0.6, 8, 24]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.4, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh scale={[0.92, 1.08, 0.95]} castShadow>
        <sphereGeometry args={[0.6, 48, 36]} />
        <meshPhysicalMaterial color={skin} roughness={0.55} sheen={0.4} sheenColor="#ffd2c0" />
      </mesh>
      {/* hair */}
      <mesh position={[0, 0.2, -0.06]} scale={[0.98, 0.85, 1.0]}>
        <sphereGeometry args={[0.6, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color={hair} roughness={0.85} />
      </mesh>
      {/* ears */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.56, 0, 0]} scale={[0.4, 0.8, 0.6]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      ))}
      {/* eyes */}
      {[-1, 1].map((k) => (
        <group key={k} position={[k * 0.2, 0.08, 0.5]}>
          <mesh scale={[1, 1 + s * 0.35, 0.6]}>
            <sphereGeometry args={[0.105, 24, 18]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0.1} clearcoat={1} />
          </mesh>
          <mesh position={[look * 0.03, 0.02 + s * 0.02, 0.06]}>
            <sphereGeometry args={[0.055 - s * 0.012, 16, 12]} />
            <meshPhysicalMaterial color="#3a2414" roughness={0.1} clearcoat={1} />
          </mesh>
          <mesh position={[look * 0.03 + 0.015, 0.04 + s * 0.02, 0.105]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* eyebrow */}
          <mesh position={[0, 0.16 + s * 0.08, 0.02]} rotation={[0, 0, k * (0.15 + s * 0.15)]}>
            <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
            <meshStandardMaterial color={hair} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* nose */}
      <mesh position={[0, -0.06, 0.57]} scale={[0.8, 1, 0.9]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      {/* mouth: open "O" */}
      <mesh position={[0, -0.3 - s * 0.03, 0.5]} scale={[0.75 + s * 0.15, 0.25 + s * 0.85, 0.22]}>
        <sphereGeometry args={[0.1, 20, 16]} />
        <meshStandardMaterial color="#2a0c0c" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ───────────────────────── water ─────────────────────────

export function useWaterMaterial(color = "#bfe9ff") {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0,
        roughness: 0.03,
        transmission: 0.92,
        thickness: 1.2,
        ior: 1.33,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 0.95,
        attenuationColor: new THREE.Color("#3fa9d8"),
        attenuationDistance: 2.5,
      }),
    [color],
  );
}

/** A wobbling water blob (in microgravity water forms near-perfect spheres that oscillate). */
export const WaterBlob: React.FC<{ position: [number, number, number]; radius: number; t: number; seed: number; material: THREE.Material }> = ({
  position,
  radius,
  t,
  seed,
  material,
}) => {
  const w = 0.12 * Math.sin(t * (5 + seed % 3) + seed);
  return (
    <mesh position={position} scale={[radius * (1 + w), radius * (1 - w * 0.8), radius * (1 + w * 0.5)]} material={material} castShadow>
      <sphereGeometry args={[1, 40, 30]} />
    </mesh>
  );
};

export const Pool: React.FC<{ waterLevel: number; waterMaterial: THREE.Material; rippleT: number }> = ({ waterLevel, waterMaterial, rippleT }) => {
  const tiles = useMemo(() => tileTexture(), []);
  const surface = useMemo(() => {
    const g = new THREE.PlaneGeometry(9.6, 5.6, 64, 40);
    return g;
  }, []);
  // ripples on the remaining surface
  const pos = surface.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = 0.05 * Math.sin(x * 2.2 + rippleT * 3) + 0.04 * Math.sin(y * 3.1 - rippleT * 2.4) + 0.03 * Math.sin((x + y) * 4 + rippleT * 5);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  surface.computeVertexNormals();
  return (
    <group>
      {/* deck */}
      {[
        [0, -23, 60, 40],
        [0, 23, 60, 40],
        [-17.5, 0, 25, 6],
        [17.5, 0, 25, 6],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, z]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#e9dcc6" roughness={0.8} />
        </mesh>
      ))}
      {/* basin */}
      <mesh position={[0, -1.01, 0]} receiveShadow>
        <boxGeometry args={[10, 2, 6]} />
        <meshStandardMaterial map={tiles} roughness={0.35} side={THREE.BackSide} />
      </mesh>
      {/* coping */}
      {[
        [0, 3.2, 10.8, 0.4],
        [0, -3.2, 10.8, 0.4],
        [5.2, 0, 0.4, 6.8],
        [-5.2, 0, 0.4, 6.8],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.06, z]} receiveShadow castShadow>
          <boxGeometry args={[w, 0.14, d]} />
          <meshStandardMaterial color="#f7f3ea" roughness={0.6} />
        </mesh>
      ))}
      <mesh geometry={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, waterLevel, 0]} material={waterMaterial} receiveShadow />
    </group>
  );
};

export const Ocean: React.FC<{ t: number; level?: number }> = ({ t, level = 0 }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(220, 220, 140, 140), []);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z =
      0.35 * Math.sin(x * 0.18 + t * 1.3) +
      0.25 * Math.sin(y * 0.23 - t * 1.1) +
      0.12 * Math.sin((x - y) * 0.6 + t * 2.4) +
      0.05 * Math.sin((x + y) * 1.7 + t * 3.3);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, level, 0]} receiveShadow>
      <meshPhysicalMaterial color="#0f5b8c" roughness={0.12} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.2} />
    </mesh>
  );
};

export const CloudPuff: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    {[
      [0, 0, 0, 2],
      [1.8, -0.3, 0.2, 1.5],
      [-1.8, -0.4, 0, 1.4],
      [0.8, 0.9, -0.2, 1.3],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[r, 20, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
      </mesh>
    ))}
  </group>
);

/** Small water / dust particles (instanced). */
export const Particles: React.FC<{
  count: number;
  seed: number;
  t: number;
  origin: [number, number, number];
  spread: number;
  color: string;
  size: number;
  mode: "rise" | "burst";
  material?: THREE.Material;
}> = ({ count, seed, t, origin, spread, color, size, mode, material }) => {
  const mat = useMemo(() => material ?? new THREE.MeshStandardMaterial({ color, roughness: 0.3, transparent: true, opacity: 0.85 }), [material, color]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, mat, count), [geo, mat, count]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const r1 = rand(seed + i * 1.31);
    const r2 = rand(seed + i * 2.17);
    const r3 = rand(seed + i * 3.07);
    const r4 = rand(seed + i * 4.73);
    let x: number, y: number, z: number;
    if (mode === "rise") {
      x = origin[0] + (r1 - 0.5) * spread + Math.sin(t * 1.5 + i) * 0.1;
      z = origin[2] + (r2 - 0.5) * spread;
      y = origin[1] + t * (0.25 + r3 * 0.8) + r4 * 0.6;
    } else {
      const ang = r1 * Math.PI * 2;
      const sp = 2 + r2 * 6;
      const vy = 3 + r3 * 7;
      x = origin[0] + Math.cos(ang) * sp * t;
      z = origin[2] + Math.sin(ang) * sp * t;
      y = Math.max(origin[1], origin[1] + vy * t - 0.5 * G * t * t);
    }
    const s = size * (0.4 + r4 * 0.9) * (mode === "burst" ? Math.max(0, 1 - t / 1.8) : 1);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};
