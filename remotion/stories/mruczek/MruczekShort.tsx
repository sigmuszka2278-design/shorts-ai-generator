import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { ensureFonts } from "../../fonts";
import { blinkAt, heartPath } from "../../paint";
import {
  FRONT_WHISKER_LEN,
  FRONT_WHISKER_ROOT,
  KittenDefs,
  KittenFront,
  KittenSide,
  sideWhiskerTips,
  Twinkle,
} from "./Kitten";
import { Bookcase, Chair, Child, FLOOR_Y, LivingRoom, RoomDefs, Sofa, YarnBall } from "./Props";
import { Subtitles } from "./Subtitles";
import { buildCaptions, buildTimeline, FPS, HEIGHT, SceneTiming, WIDTH, wordTime } from "./timeline";

ensureFonts();

export const MRUCZEK_TIMELINE = buildTimeline();
const CAPTIONS = buildCaptions(MRUCZEK_TIMELINE.scenes);
const CROSSFADE = 9;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.inOut(Easing.cubic);
/** 0→1 between a and b seconds, eased. */
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: smooth });
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

interface SceneProps {
  scene: SceneTiming;
  /** Frame relative to the scene start. */
  f: number;
}

const Svg: React.FC<{ children: React.ReactNode; camera?: { s: number; x?: number; y?: number } }> = ({ children, camera }) => (
  <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: "absolute", inset: 0 }}>
    <KittenDefs />
    <RoomDefs />
    <g
      transform={
        camera
          ? `translate(${540 + (camera.x ?? 0)} ${1100 + (camera.y ?? 0)}) scale(${camera.s}) translate(-540 -1100)`
          : undefined
      }
    >
      {children}
    </g>
  </svg>
);

const FloatingHearts: React.FC<{ f: number; x: number; y: number; from: number; count?: number; color?: string }> = ({
  f,
  x,
  y,
  from,
  count = 5,
  color = "#ff7fa8",
}) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const t = (f - from - i * 14) / 60;
      if (t < 0 || t > 1) return null;
      const dx = Math.sin(i * 2.3 + t * 4) * 50 + (i - count / 2) * 30;
      const s = 18 + (i % 3) * 6;
      return (
        <path
          key={i}
          d={heartPath(x + dx, y - t * 260, s)}
          fill={color}
          opacity={interpolate(t, [0, 0.15, 0.75, 1], [0, 1, 1, 0])}
          stroke="#ffffff"
          strokeWidth={4}
        />
      );
    })}
  </g>
);

/* ---------- Scene 1 & 6: Mruczek on the cozy rug ---------- */

const RUG_KITTEN = { x: 540, y: 1300, s: 1.5 };

const RugScene: React.FC<SceneProps & { goodbye?: boolean }> = ({ scene, f, goodbye }) => {
  const t = f / FPS;
  const wasy = wordTime(scene, goodbye ? "wąsami" : "wąsy", 4);
  const macha = wordTime(scene, "macha", 2);
  // Proud whisker wiggle: gentle all the time, strong around the word "wąsy"/"macha … wąsami".
  const strong = goodbye ? ramp(t, macha - 0.3, macha) : ramp(t, wasy - 0.4, wasy) * (1 - ramp(t, wasy + 2.2, wasy + 2.8));
  const wiggle = Math.sin(f / 3.2) * (0.25 + 0.75 * strong);
  const sparkle = goodbye ? 0.4 + 0.6 * strong : 0.25 + 0.75 * strong;
  const blink = blinkAt(f, 3);
  const proud = goodbye ? 0 : ramp(t, wordTime(scene, "Mruczek", 2), wordTime(scene, "Mruczek", 2) + 0.6) * (1 - ramp(t, wasy - 0.6, wasy));
  const wave = goodbye ? ramp(t, 0.05, 0.35) : 0;
  const waveAngle = Math.sin(f / 4) * 18 * wave;
  const hello = goodbye ? 0 : 1 - ramp(t, 0.8, 1.3);
  return (
    <Svg>
      <LivingRoom frame={f} />
      <g transform={`translate(${RUG_KITTEN.x} ${RUG_KITTEN.y}) scale(${RUG_KITTEN.s})`}>
        <KittenFront
          frame={f}
          wiggle={wiggle}
          sparkle={sparkle}
          glow={0.25 * strong}
          blink={proud > 0.5 ? 0 : blink}
          happyEyes={proud > 0.5 || (goodbye && t > macha + 1.4)}
          tilt={Math.sin(f / 30) * 3 + proud * 6 + hello * Math.sin(f / 5) * 4}
          wave={goodbye ? (wave > 0.5 ? 1 : 0) : 0}
          waveAngle={waveAngle - 6}
          mouthOpen={goodbye ? 0.55 + 0.25 * Math.sin(f / 5) : hello * 0.8 + proud * 0.4}
        />
      </g>
      {/* ambient sparkles in the sunbeam */}
      {Array.from({ length: 10 }, (_, i) => {
        const p = ((f / FPS) * 0.07 + i * 0.1) % 1;
        return (
          <Twinkle
            key={i}
            x={180 + ((i * 97) % 720)}
            y={1100 - p * 600}
            r={10 + (i % 3) * 4}
            opacity={Math.sin(p * Math.PI) * 0.8}
            rot={f * 2 + i * 40}
          />
        );
      })}
      {goodbye && <FloatingHearts f={f} x={540} y={760} from={Math.round((macha + 0.2) * FPS)} count={6} />}
    </Svg>
  );
};

/* ---------- Scene 2: the narrow gap ---------- */

const GAP_LEFT = 356;
const GAP_RIGHT = 724;

const GapScene: React.FC<SceneProps> = ({ scene, f }) => {
  const t = f / FPS;
  const zmiesci = wordTime(scene, "zmieści", 5);
  const dziurce = wordTime(scene, "dziurce", 6.4);
  const reach = ramp(t, 0.5, 1.4); // whiskers stretch out to touch the walls
  const measure = ramp(t, 1.3, 1.9);
  const measureDown = ramp(t, 2.6, 3.6);
  const check = spring({ frame: f - Math.round((zmiesci - 0.2) * FPS), fps: FPS, config: { damping: 9, stiffness: 140 } });
  const go = ramp(t, zmiesci + 0.4, dziurce + 0.7);
  const scale = mix(0.95, 1.18, go);
  const y = mix(FLOOR_Y + 8, 1360, go);
  const step = Math.abs(Math.sin(go * Math.PI * 4)) * 18 * (go > 0 && go < 1 ? 1 : 0);
  const squeeze = go > 0 && go < 0.45 ? 1 - Math.sin((go / 0.45) * Math.PI) * 0.1 : 1;
  const done = ramp(t, dziurce + 0.6, dziurce + 0.9);
  const hop = done > 0 && done < 1 ? Math.sin(done * Math.PI) * 30 : 0;

  // Middle whiskers are horizontal: tip x = root + length. Scale so the tips just touch the furniture.
  const touchScale = (GAP_RIGHT - 540) / 0.95 / (FRONT_WHISKER_ROOT.x + FRONT_WHISKER_LEN);
  const whiskerScale = mix(0.75, touchScale * 1.0, reach) * (1 - go) + go * 1;
  const whiskerY = FLOOR_Y + 8 + FRONT_WHISKER_ROOT.y * 0.95;
  const span = (GAP_RIGHT - GAP_LEFT) * (0.98 + 0.02 * measure);
  const measureY = mix(whiskerY - 60, FLOOR_Y - 120, measureDown);
  const touchGlow = reach > 0.95 ? 1 - go : 0;

  return (
    <Svg>
      <LivingRoom frame={f} rug={false} plant={false} />
      {/* shadowy gap behind the kitten */}
      <rect x={GAP_LEFT - 10} y={FLOOR_Y - 560} width={GAP_RIGHT - GAP_LEFT + 20} height={580} rx={30} fill="url(#r-gap)" opacity={0.35} />
      <ellipse cx={540} cy={FLOOR_Y + 30} rx={260} ry={40} fill="rgba(80,40,10,0.18)" />
      <Sofa x={GAP_LEFT - 20} y={FLOOR_Y + 30} />
      <Bookcase x={GAP_RIGHT} y={FLOOR_Y + 30} />
      {<Kitten2 f={f} y={y - hop} scale={scale} whiskerScale={whiskerScale} squeeze={squeeze} step={step} happy={done > 0.3} />}

      {/* touch points */}
      {touchGlow > 0 &&
        [GAP_LEFT, GAP_RIGHT].map((x, i) => {
          const pulse = ((f + i * 8) % 24) / 24;
          return (
            <g key={x}>
              <circle cx={x} cy={whiskerY} r={20 + pulse * 50} fill="none" stroke="#fff27a" strokeWidth={6} opacity={(1 - pulse) * touchGlow} />
              <Twinkle x={x} y={whiskerY} r={28 * touchGlow} rot={f * 3} />
            </g>
          );
        })}

      {/* measuring arrow: whisker span ≈ kitten width */}
      {measure > 0 && go < 0.2 && (
        <g opacity={measure * (1 - ramp(t, zmiesci + 0.2, zmiesci + 0.5))}>
          <line
            x1={540 - span / 2 + 18}
            x2={540 + span / 2 - 18}
            y1={measureY}
            y2={measureY}
            stroke="#ffe14d"
            strokeWidth={10}
            strokeDasharray="22 16"
            strokeLinecap="round"
          />
          {[-1, 1].map((s) => (
            <path
              key={s}
              d={`M ${540 + (s * span) / 2} ${measureY} l ${-s * 36} -24 l 0 48 Z`}
              fill="#ffe14d"
              stroke="#ff9f1c"
              strokeWidth={4}
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}

      {/* "it fits!" check */}
      {check > 0.01 && go < 0.9 && (
        <g transform={`translate(540 520) scale(${check})`} opacity={1 - ramp(t, dziurce, dziurce + 0.5)}>
          <circle r={78} fill="#5bd67a" stroke="#ffffff" strokeWidth={12} />
          <path d="M -36 2 L -10 28 L 40 -26" stroke="#ffffff" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
      {done > 0 && <FloatingHearts f={f} x={540} y={y - 560 * scale} from={Math.round((dziurce + 0.6) * FPS)} count={4} />}
    </Svg>
  );
};

const Kitten2: React.FC<{ f: number; y: number; scale: number; whiskerScale: number; squeeze: number; step: number; happy: boolean }> = ({
  f,
  y,
  scale,
  whiskerScale,
  squeeze,
  step,
  happy,
}) => (
  <g transform={`translate(540 ${y - step}) scale(${scale})`}>
    <KittenFront
      frame={f}
      whiskerScale={whiskerScale}
      spread={9}
      wiggle={Math.sin(f / 5) * 0.12}
      squeezeX={squeeze}
      blink={blinkAt(f, 1)}
      happyEyes={happy}
      lookY={4}
      mouthOpen={happy ? 0.7 : 0}
    />
  </g>
);

/* ---------- Scene 3: dark room, sensing the air ---------- */

const CHAIR = { x: 650, y: 1240, s: 0.85 };

const NightScene: React.FC<SceneProps> = ({ scene, f }) => {
  const t = f / FPS;
  const night = ramp(t, 0.1, 1.1);
  const ruch = wordTime(scene, "ruch", 2.6);
  const tak = wordTime(scene, "Tak", 4.3);
  // Path: walk in → stop in front of the chair leg → curve around it (towards the camera) → walk on.
  const walkIn = ramp(t, 0.4, ruch - 0.2);
  const around = ramp(t, tak + 0.1, scene.durationInFrames / FPS - 0.2);
  const stopX = CHAIR.x - 150 * CHAIR.s - 0.82 * 380;
  let x = mix(-260, stopX, walkIn);
  let y = 1255;
  let s = 0.82;
  if (around > 0) {
    x = mix(stopX, 1180, around);
    const bend = Math.sin(Math.min(1, around * 1.35) * Math.PI * 0.5);
    y = mix(1255, 1372, bend);
    s = mix(0.82, 0.92, bend);
  }
  const walking = (walkIn > 0 && walkIn < 1) || (around > 0 && around < 1);
  const sensing = ramp(t, ruch - 0.4, ruch + 0.2) * (1 - ramp(t, tak + 0.6, tak + 1.2));
  const tips = sideWhiskerTips(0.5).map((p) => ({ x: x + p.x * s, y: y + p.y * s }));

  return (
    <Svg>
      <LivingRoom frame={f} night={night} />
      <g style={{ filter: `brightness(${1 - night * 0.45}) saturate(${1 - night * 0.25})` }}>
        <Chair x={CHAIR.x} y={CHAIR.y} s={CHAIR.s} />
      </g>
      {/* glowing air currents flowing around the chair towards Mruczek */}
      <AirLines f={f} amount={ramp(t, 0.9, 1.6) * (1 - around * 0.6)} tips={tips} sensing={sensing} />
      <g transform={`translate(${x} ${y}) scale(${s})`} style={{ filter: `brightness(${1 - night * 0.3})` }}>
        <KittenSide
          frame={f}
          walking={walking}
          walkPhase={f / 3.2}
          forward={0.5}
          glow={0.25 + sensing * 0.75}
          sparkle={sensing}
          eyeGlow={night}
          blink={blinkAt(f, 5)}
          crouch={0.15}
        />
      </g>
    </Svg>
  );
};

const AirLines: React.FC<{ f: number; amount: number; tips: { x: number; y: number }[]; sensing: number }> = ({ f, amount, tips, sensing }) => {
  if (amount <= 0) return null;
  const legX = CHAIR.x - 128 * CHAIR.s;
  const tipY = tips[1].y;
  const lines = [-110, -40, 30, 100].map((dy, i) => {
    const y0 = tipY + dy;
    // wind comes from the right, bends around the chair leg and reaches the whiskers
    return `M 1100 ${y0 - 30} C 900 ${y0 - 60}, ${legX + 120} ${y0 + (dy < 0 ? -120 : 120)}, ${legX} ${y0 + (dy < 0 ? -60 : 60)} S ${tips[1].x + 60} ${tipY + dy * 0.35}, ${tips[1].x - 20} ${tipY + dy * 0.2}`;
  });
  return (
    <g opacity={amount}>
      {lines.map((d, i) => (
        <g key={i}>
          <path d={d} stroke="#7ff7ff" strokeWidth={22} fill="none" opacity={0.25} filter="url(#k-blur8)" />
          <path
            d={d}
            stroke={i % 2 ? "#b8ffe9" : "#9fe8ff"}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="60 46"
            strokeDashoffset={f * 5 + i * 30}
            opacity={0.9}
          />
        </g>
      ))}
      {tips.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={14 + 10 * sensing * (0.5 + 0.5 * Math.sin(f / 3 + i))} fill="#d6fff8" opacity={0.35 + 0.5 * sensing} filter="url(#k-blur8)" />
      ))}
    </g>
  );
};

/* ---------- Scene 4: playing with a ball of yarn ---------- */

const PlayScene: React.FC<SceneProps> = ({ scene, f }) => {
  const t = f / FPS;
  const hop = wordTime(scene, "Hop", 4.8);
  const wasy = wordTime(scene, "wąsy", 1.5);
  const roll = ramp(t, 0, 1.4);
  const ballStop = 830;
  let ballX = mix(1250, ballStop, Easing.out(Easing.cubic)(roll));
  const ballR = 72;
  let ballY = FLOOR_Y + 120 - ballR;
  const jumpStart = hop - 0.15;
  const jump = interpolate(t, [jumpStart, jumpStart + 0.5], [0, 1], clamp);
  const landed = t >= jumpStart + 0.5;
  const after = ramp(t, jumpStart + 0.5, jumpStart + 1.4);
  if (landed) ballX = ballStop + after * 60;
  const squish = landed ? 1 - Math.sin(Math.min(1, (t - jumpStart - 0.5) / 0.25) * Math.PI) * 0.16 : 1;
  ballY += (1 - squish) * ballR;

  const kx0 = 250;
  const kx1 = ballStop - 330;
  const kx = landed ? kx1 + after * 60 : mix(kx0, kx1, jump);
  const ky = FLOOR_Y + 120 - Math.sin(jump * Math.PI) * 300 * (landed ? 0 : 1);
  const forward = ramp(t, wasy - 0.3, wasy + 0.5);
  const crouch = ramp(t, 1.4, 2.4) * (jump > 0 ? 0 : 1);
  const wiggle = crouch > 0.5 && jump === 0 ? Math.sin(f / 2.2) * 4 : 0;
  const s = 0.95;
  const tips = sideWhiskerTips(forward, 1, crouch).map((p) => ({ x: kx + p.x * s, y: ky + p.y * s }));
  const aim = ramp(t, wasy + 0.2, wasy + 0.8) * (jump > 0 ? 0 : 1);
  const burst = landed ? ramp(t, jumpStart + 0.5, jumpStart + 1.1) : 0;

  return (
    <Svg>
      <LivingRoom frame={f} rugY={1310} />
      {aim > 0 && (
        <g opacity={aim * 0.9}>
          {tips.map((p, i) => (
            <line
              key={i}
              x1={p.x + 10}
              y1={p.y}
              x2={ballX - ballR * 0.9}
              y2={ballY + (i - 1) * 30}
              stroke="#ffe14d"
              strokeWidth={7}
              strokeDasharray="4 22"
              strokeLinecap="round"
              strokeDashoffset={-f * 2}
            />
          ))}
        </g>
      )}
      <YarnBall x={ballX} y={ballY} r={ballR} spin={(ballX - 1250) * 0.9} trail={60} />
      <g transform={`translate(${kx} ${ky}) scale(${s}) rotate(${wiggle} -150 -120)`}>
        <KittenSide
          frame={f}
          crouch={crouch}
          forward={forward}
          sparkle={forward * (1 - ramp(t, wasy + 1.5, wasy + 2)) + burst * (1 - burst)}
          glow={forward * 0.3}
          reach={jump > 0 && !landed ? Math.sin(jump * Math.PI) : landed ? 0.35 * (1 - after) : 0}
          pitch={jump > 0 && !landed ? interpolate(jump, [0, 0.5, 1], [-14, 0, 10]) : 0}
          blink={blinkAt(f, 7)}
          happyEyes={landed && after > 0.15}
          shadowY={ky < FLOOR_Y + 120 ? (FLOOR_Y + 120 - ky) / s : 0}
        />
      </g>
      {burst > 0 &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const d = 60 + burst * 170;
          return (
            <Twinkle
              key={i}
              x={ballX + Math.cos(a) * d}
              y={ballY - 40 + Math.sin(a) * d * 0.8}
              r={26 * (1 - burst * 0.6)}
              color={["#fff7b0", "#ffb3d9", "#b3f0ff"][i % 3]}
              opacity={1 - burst}
              rot={i * 30}
            />
          );
        })}
    </Svg>
  );
};

/* ---------- Scene 5: gentle petting ---------- */

const PetScene: React.FC<SceneProps> = ({ scene, f }) => {
  const t = f / FPS;
  const obcinamy = wordTime(scene, "obcinamy", 1.8);
  const wazne = wordTime(scene, "ważne", 5.8);
  const kx = 560;
  const ky = 1290;
  const ks = 1.0;
  // Hand strokes along the back – from the shoulders to the tail, never near the head / whiskers.
  const stroke = (Math.sin(f / 13 - Math.PI / 2) + 1) / 2;
  const hand = { x: mix(kx - 40, kx - 150, stroke), y: ky - 196 * ks + Math.sin(stroke * Math.PI) * -6 };
  const handIn = ramp(t, 0, 0.6);
  const purr = 0.5 + 0.5 * Math.sin(f / 2);
  const badge = spring({ frame: f - Math.round((obcinamy - 0.35) * FPS), fps: FPS, config: { damping: 10, stiffness: 150 } });
  const badgeOut = ramp(t, wazne - 1.0, wazne - 0.6);
  const important = ramp(t, wazne - 0.5, wazne + 0.2);
  const mirroredHand = { x: 1080 - mix(-200, hand.x, handIn), y: mix(hand.y - 120, hand.y, handIn) };

  return (
    <Svg>
      <LivingRoom frame={f} rugX={520} rugY={1310} />
      {/* child kneeling on the left (mirrored drawing) */}
      <g transform="translate(1080 0) scale(-1 1)">
        <Child x={1080 - 190} y={1350} hand={mirroredHand} frame={f} blink={0} />
      </g>
      <g transform={`translate(${kx} ${ky}) scale(${ks})`}>
        <KittenSide frame={f} lie={1} happyEyes forward={0} glow={important * 0.6} sparkle={important} />
      </g>
      {/* the hand is drawn on top of the kitten's back */}
      <g transform="translate(1080 0) scale(-1 1)">
        <ellipse cx={mirroredHand.x} cy={mirroredHand.y} rx={50} ry={34} fill="#ffd2b0" />
        {[-30, -10, 10].map((dx, i) => (
          <ellipse key={i} cx={mirroredHand.x + dx} cy={mirroredHand.y + 24} rx={13} ry={18} fill="#ffd2b0" />
        ))}
      </g>
      {/* purr waves */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M ${kx + 300 + i * 34} ${ky - 260 - i * 8} q 14 26 0 52`}
          stroke="#ffffff"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          opacity={0.35 + 0.55 * ((purr + i * 0.3) % 1)}
        />
      ))}
      <FloatingHearts f={f % 150} x={kx + 120} y={ky - 330} from={0} count={4} />
      {/* "no cutting" badge */}
      {badge > 0.01 && badgeOut < 1 && (
        <g transform={`translate(840 640) scale(${badge * (1 - badgeOut)})`}>
          <circle r={128} fill="#ffffff" stroke="#ff5c7a" strokeWidth={14} />
          <Scissors />
          <line x1={-86} y1={-86} x2={86} y2={86} stroke="#ff5c7a" strokeWidth={22} strokeLinecap="round" />
        </g>
      )}
      {important > 0 && <FloatingHearts f={f} x={kx + 220} y={ky - 300} from={Math.round((wazne - 0.4) * FPS)} count={5} color="#ffd43b" />}
    </Svg>
  );
};

const Scissors: React.FC = () => (
  <g transform="rotate(-35)">
    <circle cx={-52} cy={30} r={26} fill="none" stroke="#4d7cff" strokeWidth={14} />
    <circle cx={-52} cy={-30} r={26} fill="none" stroke="#4d7cff" strokeWidth={14} />
    <path d="M -30 18 L 80 -14 L 84 -4 Z" fill="#a9b8d6" stroke="#7a8aa8" strokeWidth={4} strokeLinejoin="round" />
    <path d="M -30 -18 L 80 14 L 84 4 Z" fill="#c9d4ea" stroke="#7a8aa8" strokeWidth={4} strokeLinejoin="round" />
    <circle cx={6} cy={0} r={7} fill="#7a8aa8" />
  </g>
);

const SCENES: Record<string, React.FC<SceneProps>> = {
  s1: (p) => <RugScene {...p} />,
  s2: GapScene,
  s3: NightScene,
  s4: PlayScene,
  s5: PetScene,
  s6: (p) => <RugScene {...p} goodbye />,
};

const SFX: { scene: string; sfx: string; at: (s: SceneTiming) => number; volume: number; len: number }[] = [
  { scene: "s1", sfx: "sparkle", at: (s) => wordTime(s, "wąsy", 4) - 0.1, volume: 0.35, len: 0.9 },
  { scene: "s2", sfx: "bubble", at: () => 1.35, volume: 0.35, len: 0.25 },
  { scene: "s2", sfx: "chime", at: (s) => wordTime(s, "zmieści", 5) - 0.2, volume: 0.25, len: 1.6 },
  { scene: "s2", sfx: "squeak", at: (s) => wordTime(s, "dziurce", 6.4) + 0.6, volume: 0.3, len: 0.3 },
  { scene: "s3", sfx: "whoosh", at: (s) => wordTime(s, "ruch", 2.6) - 0.5, volume: 0.2, len: 0.55 },
  { scene: "s3", sfx: "sparkle", at: (s) => wordTime(s, "powietrza", 3) + 0.1, volume: 0.22, len: 0.9 },
  { scene: "s4", sfx: "sparkle", at: (s) => wordTime(s, "wąsy", 1.5) + 0.1, volume: 0.25, len: 0.9 },
  { scene: "s4", sfx: "boing", at: (s) => wordTime(s, "Hop", 4.8) - 0.15, volume: 0.35, len: 0.6 },
  { scene: "s4", sfx: "pop", at: (s) => wordTime(s, "Hop", 4.8) + 0.35, volume: 0.35, len: 0.2 },
  { scene: "s5", sfx: "pop", at: (s) => wordTime(s, "obcinamy", 1.8) - 0.35, volume: 0.25, len: 0.2 },
  { scene: "s5", sfx: "chime", at: (s) => wordTime(s, "ważne", 5.8) - 0.4, volume: 0.2, len: 1.6 },
  { scene: "s6", sfx: "sparkle", at: (s) => wordTime(s, "macha", 2) - 0.2, volume: 0.3, len: 0.9 },
];

const SceneFrame: React.FC<{ scene: SceneTiming; comp: React.FC<SceneProps>; f: number; first: boolean }> = ({ scene, comp: Comp, f, first }) => (
  <AbsoluteFill style={{ opacity: first ? 1 : interpolate(f, [0, CROSSFADE], [0, 1], clamp) }}>
    <Comp scene={scene} f={f} />
  </AbsoluteFill>
);

export const MruczekShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { scenes, durationInFrames } = MRUCZEK_TIMELINE;
  const s5 = scenes.find((s) => s.id === "s5")!;
  return (
    <AbsoluteFill style={{ backgroundColor: "#ffe9c9", overflow: "hidden" }}>
      {scenes.map((scene, i) => {
        const Comp = SCENES[scene.id];
        const last = i === scenes.length - 1;
        const len = scene.durationInFrames + (last ? 0 : CROSSFADE);
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={len} name={`Scena ${i + 1}`}>
            <SceneFrame scene={scene} comp={Comp} f={frame - scene.from} first={i === 0} />
          </Sequence>
        );
      })}

      <Subtitles frame={frame} captions={CAPTIONS} scenes={scenes} />
      <AbsoluteFill
        style={{ backgroundColor: "#fff", opacity: interpolate(frame, [durationInFrames - 10, durationInFrames - 1], [0, 0.5], clamp) }}
      />

      {/* narration */}
      {scenes.map((scene) => (
        <Sequence key={`vo-${scene.id}`} from={scene.from + scene.voiceFrom} layout="none" name={`Lektor ${scene.id}`}>
          <Audio src={staticFile(`stories/mruczek/${scene.id}.mp3`)} volume={1} />
        </Sequence>
      ))}
      {/* soft background music, ducked under the voice */}
      <Audio
        src={staticFile("music/marzycielska.wav")}
        loop
        volume={(f) => 0.07 * interpolate(f, [0, 15, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], clamp)}
      />
      {/* purring while being petted */}
      <Sequence from={s5.from} durationInFrames={s5.durationInFrames} layout="none" name="Mruczenie">
        <Audio src={staticFile("stories/mruczek/purr.wav")} loop volume={(f) => 0.3 * interpolate(f, [0, 15, s5.durationInFrames - 15, s5.durationInFrames], [0, 1, 1, 0], clamp)} />
      </Sequence>
      {SFX.map((cue, i) => {
        const scene = scenes.find((s) => s.id === cue.scene)!;
        return (
          <Sequence key={i} from={scene.from + Math.max(0, Math.round(cue.at(scene) * FPS))} durationInFrames={Math.ceil(cue.len * FPS) + 2} layout="none">
            <Audio src={staticFile(`sfx/${cue.sfx}.wav`)} volume={cue.volume} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

