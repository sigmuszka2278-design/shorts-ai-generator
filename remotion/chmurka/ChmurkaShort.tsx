import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { blinkAt } from "../paint";
import { ensureFonts } from "../fonts";
import { BLUE_SKY, CloudLayer, Child, Earth, H, Meadow, rand, Sky, Sparkle, Star, Sun, W } from "./art";
import { Chmurka, DAY_CLOUD, POSES, SUNSET_CLOUD } from "./Chmurka";
import { Subtitles } from "./Subtitles";
import { CAPTIONS, FPS, LEAD_SECONDS, TIMELINE, TOTAL_FRAMES, VO, wordFrame } from "./timeline";

ensureFonts();

export { CHMURKA_COMPOSITION_ID } from "./timeline";

/** Cross-fade between scenes (frames). */
const FADE = 12;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number) => {
  const t = interpolate(f, [a, b], [0, 1], clamp);
  return t * t * (3 - 2 * t);
};

/** Mouth openness from the TTS word timings (simple lip-sync). */
function talk(scene: number, f: number): number {
  const t = f / FPS - LEAD_SECONDS;
  for (const w of VO[scene].words) {
    if (t >= w.start && t <= w.end) {
      return 0.3 + 0.7 * Math.abs(Math.sin((t - w.start) * Math.PI * 5.5));
    }
  }
  return 0;
}

const bob = (f: number) => Math.sin(f / 22) * 14;

/** Gentle camera push-in that gives every scene some depth. */
const Camera: React.FC<{ f: number; d: number; children: React.ReactNode; from?: number; to?: number }> = ({
  f,
  d,
  children,
  from = 1,
  to = 1.05,
}) => {
  const s = interpolate(f, [0, d], [from, to], clamp);
  return <g transform={`translate(${W / 2} ${H / 2}) scale(${s}) translate(${-W / 2} ${-H / 2})`}>{children}</g>;
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
    {children}
  </svg>
);

// ── Scene 1 + 6: Chmurka in the blue sky (identical framing) ──────────────

const HOME = { x: 540, y: 780, scale: 1 };

const HomeSky: React.FC<{ f: number; id: string }> = ({ f, id }) => (
  <>
    <Sky id={`${id}-sky`} stops={BLUE_SKY} />
    <defs>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0%" stopColor="#fffbe0" stopOpacity={0.95} />
        <stop offset="40%" stopColor="#fff3a8" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#fff3a8" stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={1040} cy={20} r={380} fill={`url(#${id}-glow)`} />
    <CloudLayer frame={f} />
  </>
);

const Scene1: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const ask = wordFrame(0, 3); // "Czy"
  const scratch = ease(f, ask - 8, ask + 6) * (1 - ease(f, d - 22, d - 6));
  const look = f < ask ? Math.sin(f / 18) * 0.9 : Math.sin(f / 18) * 0.9 * (1 - ease(f, ask, ask + 12));
  const lookUp = f < ask ? -0.3 + Math.cos(f / 26) * 0.3 : -0.55 * ease(f, ask, ask + 12);
  const tilt = -7 * scratch;
  return (
    <Svg>
      <Camera f={f} d={d}>
        <HomeSky f={f} id="s1" />
        <g transform={`rotate(${tilt} ${HOME.x} ${HOME.y + 150})`}>
          <Chmurka
            id="c1"
            x={HOME.x}
            y={HOME.y + bob(f)}
            scale={HOME.scale}
            frame={f}
            blink={blinkAt(f, 0)}
            lookX={look}
            lookY={lookUp}
            mouth={talk(0, f)}
            wonder={0.3 + 0.7 * scratch}
            rightHand={{
              pose: { ...POSES.scratchHead, rot: POSES.scratchHead.rot + Math.sin(f / 2.2) * 14, x: POSES.scratchHead.x + Math.sin(f / 2.2) * 8 },
              amount: scratch,
            }}
          />
        </g>
      </Camera>
    </Svg>
  );
};

const Scene6: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const wave = ease(f, 0, 10);
  const heart = ease(f, d - 70, d - 30);
  return (
    <Svg>
      <Camera f={f} d={d}>
        <HomeSky f={f} id="s6" />
        {Array.from({ length: 10 }, (_, i) => (
          <Sparkle
            key={i}
            x={120 + rand(i + 600) * 840}
            y={260 + rand(i + 620) * 1000}
            size={(16 + rand(i + 640) * 16) * heart}
            color={i % 2 ? "#ffffff" : "#ffe14d"}
            frame={f}
            phase={rand(i)}
          />
        ))}
        <Chmurka
          id="c6"
          x={HOME.x}
          y={HOME.y + bob(f)}
          scale={HOME.scale}
          frame={f}
          blink={blinkAt(f, 3)}
          lookX={0}
          lookY={0.15}
          mouth={talk(5, f)}
          wonder={0.4}
          rightHand={{ pose: { ...POSES.waveUp, rot: 15 + Math.sin(f / 4) * 28 }, amount: wave }}
        />
      </Camera>
    </Svg>
  );
};

// ── Scene 2: the sun's white light hides a rainbow ────────────────────────

const RAINBOW = ["#ff4d4d", "#ff9f1c", "#ffe14d", "#4cd964", "#3db8ff", "#3d6bff", "#9b5cff"];

const Scene2: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const S = { x: 240, y: 360 };
  const P = { x: 560, y: 545 };
  const beamStart = wordFrame(1, 0) + 4;
  const splitAt = wordFrame(1, 4) - 4; // "Ale"
  const beam = ease(f, beamStart, beamStart + 34);
  const fan = ease(f, splitAt, splitAt + 40);
  const flash = interpolate(f - splitAt, [0, 6, 26], [0, 1, 0], clamp);
  const bx = S.x + (P.x - S.x) * beam;
  const by = S.y + (P.y - S.y) * beam;
  const ang = Math.atan2(P.y - S.y, P.x - S.x);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const w0 = 26;
  const w1 = 48;
  const shimmer = (i: number) => 0.85 + 0.15 * Math.sin(f / 4 + i);
  return (
    <Svg>
      <Camera f={f} d={d} from={1} to={1.04}>
        <Sky id="s2-sky" stops={BLUE_SKY} />
        <CloudLayer frame={f + 200} opacity={0.7} />
        {/* rainbow fan */}
        {fan > 0 &&
          RAINBOW.map((c, i) => {
            const a = ((48 + i * 7.5) * Math.PI) / 180;
            const len = 1700 * fan;
            const ex = P.x + Math.cos(a) * len;
            const ey = P.y + Math.sin(a) * len;
            return (
              <g key={c} opacity={shimmer(i)}>
                <line x1={P.x} y1={P.y} x2={ex} y2={ey} stroke={c} strokeWidth={70} opacity={0.25} strokeLinecap="round" />
                <line x1={P.x} y1={P.y} x2={ex} y2={ey} stroke={c} strokeWidth={30} strokeLinecap="round" />
                <line x1={P.x} y1={P.y} x2={ex} y2={ey} stroke="#ffffff" strokeWidth={6} opacity={0.6} strokeLinecap="round" />
              </g>
            );
          })}
        {/* white beam */}
        {beam > 0 && (
          <g>
            <polygon
              points={`${S.x + nx * w0 * 2},${S.y + ny * w0 * 2} ${bx + nx * w1 * 2},${by + ny * w1 * 2} ${bx - nx * w1 * 2},${by - ny * w1 * 2} ${S.x - nx * w0 * 2},${S.y - ny * w0 * 2}`}
              fill="#ffffff"
              opacity={0.3}
            />
            <polygon
              points={`${S.x + nx * w0},${S.y + ny * w0} ${bx + nx * w1},${by + ny * w1} ${bx - nx * w1},${by - ny * w1} ${S.x - nx * w0},${S.y - ny * w0}`}
              fill="#ffffff"
            />
            <circle cx={bx} cy={by} r={w1 + 6} fill="#ffffff" />
          </g>
        )}
        {/* sparkles along the rainbow */}
        {fan > 0.3 &&
          Array.from({ length: 14 }, (_, i) => {
            const a = ((48 + rand(i + 10) * 45) * Math.PI) / 180;
            const t = 200 + rand(i + 30) * 1100 * fan;
            return (
              <Sparkle
                key={i}
                x={P.x + Math.cos(a) * t}
                y={P.y + Math.sin(a) * t}
                size={14 + rand(i + 50) * 14}
                color="#ffffff"
                frame={f}
                phase={rand(i + 70)}
                glow={false}
              />
            );
          })}
        {flash > 0 && <Sparkle x={P.x} y={P.y} size={40 + flash * 110} color="#ffffff" frame={f} />}
        <Sun x={S.x} y={S.y} r={130} frame={f} id="s2-sun" />
        <Chmurka
          id="c2"
          x={820}
          y={560 + bob(f) * 0.7}
          scale={0.6}
          frame={f}
          blink={blinkAt(f, 1)}
          lookX={-0.8 + fan * 0.3}
          lookY={-0.5 + fan * 0.9}
          mouth={fan > 0.2 ? 0.45 * Math.min(1, fan * 2) : 0}
          wonder={0.2 + fan * 0.8}
          leftHand={{ pose: { x: -300, y: -40, rot: -30 + Math.sin(f / 6) * 10 }, amount: fan }}
          rightHand={{ pose: { x: 300, y: -40, rot: 30 - Math.sin(f / 6) * 10 }, amount: fan }}
        />
      </Camera>
    </Svg>
  );
};

// ── Scene 3: air particles scatter blue light ─────────────────────────────

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  x: 90 + ((i * 263) % 900) + (rand(i + 1) - 0.5) * 60,
  y: 520 + rand(i + 2) * 760,
  r: 24 + rand(i + 3) * 12,
}));

type Photon = { color: string; spawn: number; path: Array<[number, number]>; blue: boolean };

function buildPhotons(d: number, blueFrom: number): Photon[] {
  const out: Photon[] = [];
  const straight = ["#ff4d4d", "#ffe14d", "#ff9f1c", "#ffe14d", "#ff4d4d", "#4cd964"];
  let k = 0;
  for (let s = 0; s < d; s += 4) {
    k++;
    const x0 = 40 + rand(k * 3.1) * 820;
    const isBlue = s >= blueFrom && k % 3 !== 0;
    if (!isBlue) {
      const x1 = x0 + 220;
      out.push({ color: straight[k % straight.length], spawn: s, path: [[x0, -60], [x1, 1720]], blue: false });
    } else {
      const p = PARTICLES[Math.floor(rand(k * 7.7) * PARTICLES.length)];
      const a1 = rand(k * 1.3) * Math.PI * 2;
      const b1: [number, number] = [p.x + Math.cos(a1) * (260 + rand(k) * 220), p.y + Math.sin(a1) * (220 + rand(k * 2) * 200)];
      const a2 = rand(k * 5.9) * Math.PI * 2;
      const b2: [number, number] = [b1[0] + Math.cos(a2) * 300, b1[1] + Math.sin(a2) * 260];
      out.push({ color: k % 4 === 0 ? "#3db8ff" : "#3d6bff", spawn: s, path: [[p.x - 200, -60], [p.x, p.y], b1, b2], blue: true });
    }
  }
  return out;
}

function along(path: Array<[number, number]>, dist: number): [number, number] | null {
  let rest = dist;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (rest <= len) return [ax + ((bx - ax) * rest) / len, ay + ((by - ay) * rest) / len];
    rest -= len;
  }
  return null;
}

const SPEED = 24;

const Scene3: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const blueFrom = wordFrame(2, 5) - 40; // blue starts bouncing just before "niebieski"
  const photons = React.useMemo(() => buildPhotons(d, blueFrom), [d, blueFrom]);
  const blueSky = ease(f, blueFrom + 10, d - 40);
  const burstAt = wordFrame(2, 12); // "Najbardziej"
  const burst = ease(f, burstAt, burstAt + 30);
  return (
    <Svg>
      <Camera f={f} d={d} from={1.02} to={1.06}>
        <Sky id="s3-pale" stops={[[0, "#dce6f7"], [0.7, "#eef3fb"], [1, "#f7f9ff"]]} />
        <g opacity={blueSky}>
          <Sky id="s3-blue" stops={BLUE_SKY} />
        </g>
        <circle cx={-40} cy={-40} r={330} fill="#fff4b0" opacity={0.6} />
        <Sun x={40} y={40} r={120} frame={f} id="s3-sun" />
        {/* faint straight paths of red / yellow light */}
        {[160, 470, 780].map((x, i) => (
          <line key={i} x1={x} y1={-60} x2={x + 220} y2={1720} stroke={["#ff4d4d", "#ffe14d", "#ff9f1c"][i]} strokeWidth={16} opacity={0.22} strokeLinecap="round" />
        ))}
        <Earth id="s3-earth" frame={f} />
        {/* accumulating blue glow in the sky */}
        {Array.from({ length: 40 }, (_, i) => {
          const appear = blueFrom + 20 + rand(i + 300) * (d - blueFrom - 40);
          const o = ease(f, appear, appear + 15);
          if (o <= 0) return null;
          return (
            <Sparkle
              key={i}
              x={40 + rand(i + 310) * 1000}
              y={80 + rand(i + 320) * 1450}
              size={(10 + rand(i + 330) * 12) * o * (1 + burst * 0.6)}
              color={i % 3 ? "#7cc4ff" : "#ffffff"}
              frame={f}
              phase={rand(i + 340)}
              glow={false}
            />
          );
        })}
        {/* photons */}
        {photons.map((p, i) => {
          const t = f - p.spawn;
          if (t < 0) return null;
          const head = along(p.path, t * SPEED);
          if (!head) return null;
          const tail = along(p.path, Math.max(0, t * SPEED - 70)) ?? head;
          const mid = along(p.path, Math.max(0, t * SPEED - 35)) ?? head;
          return (
            <g key={i}>
              <polyline points={`${tail[0]},${tail[1]} ${mid[0]},${mid[1]} ${head[0]},${head[1]}`} stroke={p.color} strokeWidth={36} opacity={0.3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <polyline points={`${tail[0]},${tail[1]} ${mid[0]},${mid[1]} ${head[0]},${head[1]}`} stroke={p.color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx={head[0]} cy={head[1]} r={5} fill="#fff" />
            </g>
          );
        })}
        {/* air particles */}
        {PARTICLES.map((p, i) => {
          const wob = Math.sin(f / 7 + i * 1.7);
          const px = p.x + Math.sin(f / 23 + i) * 10;
          const py = p.y + Math.cos(f / 19 + i) * 10;
          const r = p.r * (1 + wob * 0.08);
          return (
            <g key={i}>
              <defs>
                <radialGradient id={`s3-p${i}`} cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#d9e8ff" />
                  <stop offset="100%" stopColor="#9fb9ef" />
                </radialGradient>
              </defs>
              <circle cx={px} cy={py} r={r * 1.9} fill="#ffffff" opacity={0.25} />
              <circle cx={px} cy={py} r={r} fill={`url(#s3-p${i})`} />
              <circle cx={px - r * 0.3} cy={py - r * 0.1} r={r * 0.11} fill="#2d3561" />
              <circle cx={px + r * 0.3} cy={py - r * 0.1} r={r * 0.11} fill="#2d3561" />
              <path d={`M ${px - r * 0.22} ${py + r * 0.22} Q ${px} ${py + r * 0.42} ${px + r * 0.22} ${py + r * 0.22}`} stroke="#2d3561" strokeWidth={2.5} fill="none" strokeLinecap="round" />
              <Sparkle x={px + r * 0.9} y={py - r * 0.9} size={8} color="#ffffff" frame={f} phase={i * 0.13} glow={false} />
            </g>
          );
        })}
        <Chmurka
          id="c3"
          x={880}
          y={300 + bob(f) * 0.5}
          scale={0.36}
          frame={f}
          blink={blinkAt(f, 2)}
          lookX={-0.6}
          lookY={0.7}
          mouth={0.4 + 0.2 * burst}
          wonder={0.8}
        />
      </Camera>
    </Svg>
  );
};

// ── Scene 4: a child on the meadow points at the blue sky ─────────────────

const Scene4: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const pointAt = wordFrame(3, 1) - 6; // "gdy"
  const point = spring({ frame: f - pointAt, fps: FPS, config: { damping: 12, mass: 0.7 } });
  const lookUp = ease(f, wordFrame(3, 3) - 10, wordFrame(3, 3) + 10); // "w górę"
  return (
    <Svg>
      <Camera f={f} d={d} from={1.06} to={1.0}>
        <Sky id="s4-sky" stops={BLUE_SKY} />
        <CloudLayer frame={f + 500} opacity={0.75} />
        {Array.from({ length: 46 }, (_, i) => (
          <Sparkle
            key={i}
            x={30 + rand(i + 900) * 1020}
            y={60 + rand(i + 910) * 1300}
            size={12 + rand(i + 920) * 20}
            color={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#bfe4ff" : "#3d8bff"}
            frame={f}
            phase={rand(i + 930)}
          />
        ))}
        <Chmurka id="c4" x={790} y={520 + bob(f) * 0.6} scale={0.45} frame={f} blink={blinkAt(f, 4)} lookX={-0.6} lookY={0.8} wonder={0.4} rightHand={{ pose: { ...POSES.waveUp, rot: 15 + Math.sin(f / 4) * 25 }, amount: point }} />
        <Meadow frame={f} id="s4-meadow" top={1470} />
        <Child x={300} y={1850} s={0.82} frame={f} point={point} lookUp={lookUp} blink={blinkAt(f, 5)} />
      </Camera>
    </Svg>
  );
};

// ── Scene 5: sunset ───────────────────────────────────────────────────────

const Scene5: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const wave = ease(f, 6, 18);
  const riddleAt = wordFrame(4, 8); // "zagadka"
  const q = spring({ frame: f - riddleAt + 4, fps: FPS, config: { damping: 8, mass: 0.6 } });
  return (
    <Svg>
      <Camera f={f} d={d} from={1} to={1.04}>
        <Sky id="s5-sky" stops={[[0, "#7a5bc4"], [0.32, "#ff7aa8"], [0.62, "#ff9e5e"], [0.82, "#ffc65c"], [1, "#ffe08a"]]} />
        {Array.from({ length: 12 }, (_, i) => (
          <Star key={i} x={60 + rand(i + 500) * 960} y={60 + rand(i + 510) * 320} r={8 + rand(i + 520) * 8} color="#fff6c8" opacity={0.5 + 0.5 * Math.sin(f / 8 + i)} />
        ))}
        <CloudLayer frame={f + 800} tint="#ffd0c2" opacity={0.6} />
        <Sun x={540} y={1560 + f * 0.35} r={180} frame={f} id="s5-sun" sleepy />
        <path d="M -100 1560 Q 250 1450 560 1560 T 1200 1520 L 1200 2100 L -100 2100 Z" fill="#9b5a9e" />
        <path d="M -100 1680 Q 380 1580 760 1680 T 1200 1650 L 1200 2100 L -100 2100 Z" fill="#7a4386" />
        <ellipse cx={540} cy={1600} rx={420} ry={30} fill="#ffd27a" opacity={0.35} />
        <Chmurka
          id="c5"
          x={540}
          y={790 + bob(f)}
          scale={0.95}
          frame={f}
          blink={blinkAt(f, 6)}
          lookX={0}
          lookY={0.1}
          mouth={talk(4, f)}
          wonder={0.3 + q * 0.5}
          palette={SUNSET_CLOUD}
          rightHand={{ pose: { ...POSES.waveUp, rot: 15 + Math.sin(f / 4) * 28 }, amount: wave }}
        />
        {q > 0.01 && (
          <g transform={`translate(870 420) scale(${q}) rotate(${Math.sin(f / 6) * 10})`}>
            <circle r={90} fill="#ffffff" opacity={0.25} />
            <text
              x={0}
              y={50}
              textAnchor="middle"
              fontFamily="Fredoka, sans-serif"
              fontWeight={700}
              fontSize={170}
              fill="#ffe14d"
              stroke="#c2457a"
              strokeWidth={14}
              paintOrder="stroke"
            >
              ?
            </text>
            <Sparkle x={70} y={-70} size={22} color="#ffffff" frame={f} />
          </g>
        )}
      </Camera>
    </Svg>
  );
};

// ── Assembly ──────────────────────────────────────────────────────────────

const SCENES: Array<{ C: React.FC<{ d: number }>; outline: string }> = [
  { C: Scene1, outline: "#4f6fd8" },
  { C: Scene2, outline: "#e0748f" },
  { C: Scene3, outline: "#4f6fd8" },
  { C: Scene4, outline: "#3f9a52" },
  { C: Scene5, outline: "#c2457a" },
  { C: Scene6, outline: "#4f6fd8" },
];

/** Sound effects, frames relative to the scene start. */
const SFX: Array<{ scene: number; frame: number; sfx: string; volume: number; len: number }> = [
  { scene: 0, frame: wordFrame(0, 3), sfx: "squeak", volume: 0.18, len: 10 },
  { scene: 1, frame: wordFrame(1, 0) + 4, sfx: "whoosh", volume: 0.22, len: 18 },
  { scene: 1, frame: wordFrame(1, 4) - 4, sfx: "magic", volume: 0.3, len: 42 },
  { scene: 2, frame: wordFrame(2, 5) - 10, sfx: "sparkle", volume: 0.22, len: 28 },
  { scene: 2, frame: wordFrame(2, 12), sfx: "sparkle", volume: 0.25, len: 28 },
  { scene: 3, frame: wordFrame(3, 3), sfx: "chime", volume: 0.25, len: 48 },
  { scene: 4, frame: wordFrame(4, 8), sfx: "bubble", volume: 0.3, len: 9 },
  { scene: 5, frame: 6, sfx: "chime", volume: 0.2, len: 48 },
];

const SceneFade: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
  const f = useCurrentFrame();
  const o = index === 0 ? 1 : interpolate(f, [0, FADE], [0, 1], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const SceneCaptions: React.FC<{ index: number; outline: string; durationInFrames: number }> = ({ index, outline, durationInFrames }) => {
  const f = useCurrentFrame();
  const time = f / FPS - LEAD_SECONDS;
  return <Subtitles captions={CAPTIONS[index]} time={time} fps={FPS} outline={outline} hideAfter={durationInFrames / FPS - LEAD_SECONDS - 0.05} />;
};

export const ChmurkaShort: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#5fb2ff" }}>
      {TIMELINE.map((t) => {
        const { C, outline } = SCENES[t.index];
        const last = t.index === TIMELINE.length - 1;
        return (
          <Sequence key={t.index} from={t.startFrame} durationInFrames={t.durationInFrames + (last ? 0 : FADE)} name={`Scena ${t.index + 1}`}>
            <SceneFade index={t.index}>
              <C d={t.durationInFrames} />
              <SceneCaptions index={t.index} outline={outline} durationInFrames={t.durationInFrames} />
            </SceneFade>
          </Sequence>
        );
      })}

      {/* voiceover */}
      {TIMELINE.map((t) => (
        <Sequence key={`vo${t.index}`} from={t.voFrame} durationInFrames={Math.ceil(VO[t.index].duration * FPS)} layout="none">
          <Audio src={staticFile(VO[t.index].file)} volume={1} />
        </Sequence>
      ))}

      {/* calm background music */}
      <Audio
        src={staticFile("music/marzycielska.wav")}
        loop
        volume={(f) => 0.09 * interpolate(f, [0, 20, TOTAL_FRAMES - 40, TOTAL_FRAMES], [0, 1, 1, 0], clamp)}
      />

      {SFX.map((s, i) => (
        <Sequence key={`sfx${i}`} from={TIMELINE[s.scene].startFrame + s.frame} durationInFrames={s.len} layout="none">
          <Audio src={staticFile(`sfx/${s.sfx}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
