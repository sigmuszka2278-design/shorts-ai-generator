/**
 * "Chmurka i tęcza" – a 9:16 educational short for children (4–8) about where rainbows come from.
 * Six scenes, Polish voiceover (remotion/chmurka/voiceover.json + public/chmurka/*.mp3) and burned-in,
 * word-synchronised subtitles.
 */
import React from "react";
import { AbsoluteFill, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ensureFonts, FONT_FAMILY } from "../fonts";
import {
  BigDrop,
  Child,
  Chmurka,
  ease,
  Hills,
  PuffCloud,
  Rainbow,
  RAINBOW,
  Raindrop,
  RaindropDefs,
  Sky,
  Sparkle,
  Sun,
} from "./art";
import { SCENES, speakingAt, wordStart, type Chunk } from "./timeline";

ensureFonts();

const XFADE = 12; // frames of cross-fade between scenes

interface SceneProps {
  /** Frame relative to the scene start. */
  f: number;
  /** Seconds relative to the scene start. */
  t: number;
  fps: number;
}

// ── helpers ───────────────────────────────────────────────────────

const pop = (f: number, at: number, fps: number) => (f < at ? 0 : spring({ frame: f - at, fps, config: { damping: 12, mass: 0.6 } }));

/** Falling rain. Drops loop vertically between y0 and y1 inside [x0, x1]. */
const Rain: React.FC<{
  f: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  count: number;
  start: number;
  seed: string;
  faces?: boolean;
  size?: [number, number];
  glintFrom?: number;
}> = ({ f, x0, x1, y0, y1, count, start, seed, faces = true, size = [0.5, 0.85], glintFrom }) => {
  if (f < start) return null;
  const local = f - start;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: string) => random(`${seed}-${k}-${i}`);
        const speed = 5 + r("v") * 3;
        const span = y1 - y0;
        const delay = r("d") * 40; // staggered start so the rain begins softly
        const lt = local - delay;
        if (lt < 0) return null;
        const y = y0 + ((lt * speed + r("o") * span * (local > 60 ? 1 : 0)) % span);
        const x = x0 + r("x") * (x1 - x0) + Math.sin((f + i * 13) / 18) * 6;
        const s = size[0] + r("s") * (size[1] - size[0]);
        const fade = interpolate(y, [y0, y0 + 40, y1 - 80, y1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const glint = glintFrom !== undefined && f > glintFrom ? 0.5 + 0.5 * Math.sin(f / 4 + i) : 0;
        return (
          <g key={i} opacity={fade}>
            <Raindrop x={x} y={y} s={s} face={faces && s > 0.6} rot={Math.sin((f + i * 7) / 14) * 6} glint={glint} />
          </g>
        );
      })}
    </g>
  );
};

const Floaty: React.FC<{ f: number; y: number; amp?: number; speed?: number; children: React.ReactNode; x: number; scale: number }> = ({
  f,
  x,
  y,
  amp = 14,
  speed = 26,
  scale,
  children,
}) => <g transform={`translate(${x} ${y + Math.sin(f / speed) * amp}) rotate(${Math.sin(f / (speed * 1.7)) * 2}) scale(${scale})`}>{children}</g>;

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
    {children}
  </svg>
);

// ── Scene 1 + 6: Chmurka next to the rainbow (identical framing) ──

const RAINBOW_SHOT = { rainbow: { cx: 650, cy: 1330, r: 470, width: 50 }, chmurka: { x: 320, y: 590, scale: 0.82 } };

const RainbowShot: React.FC<SceneProps & { scene: 0 | 5 }> = ({ f, t, fps, scene }) => {
  const isIntro = scene === 0;
  const grow = isIntro ? ease(f, 0, 32) : 1;
  const lookAt = isIntro ? ease(t, wordStart(0, "zobacz") - 0.2, wordStart(0, "zobacz") + 0.3) - ease(t, wordStart(0, "a") - 0.1, wordStart(0, "a") + 0.4) * 0.8 : 0;
  const amazed = isIntro ? Math.max(0.35, lookAt) : 0.3;
  const waveStart = 4;
  const wave = isIntro ? undefined : 30 + ease(f, 0, waveStart + 6) * (35 + Math.sin(f / 4.5) * 30);
  const { rainbow, chmurka } = RAINBOW_SHOT;
  return (
    <AbsoluteFill>
      <Sky frame={f + scene * 300} uid={`s${scene}`}>
        <Rainbow {...rainbow} grow={grow} frame={f} />
        <Hills frame={f} y={1560} flowers />
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (0.08 + (i / 8) * 0.84);
          const rr = rainbow.r + 40 + random(`sp${i}`) * 60;
          const o = (0.5 + 0.5 * Math.sin(f / 6 + i * 1.7)) * grow;
          return <Sparkle key={i} x={rainbow.cx - Math.cos(a) * rr} y={rainbow.cy - Math.sin(a) * rr} s={0.6 + random(`ss${i}`) * 0.7} o={o} />;
        })}
        <Floaty f={f} x={chmurka.x} y={chmurka.y} scale={chmurka.scale}>
          <Chmurka uid={`c${scene}`} frame={f} lookX={lookAt * 0.75} lookY={lookAt * 0.45} amazed={amazed} talk={speakingAt(scene, t)} wave={wave} />
        </Floaty>
      </Sky>
    </AbsoluteFill>
  );
};

// ── Scene 2: Chmurka turns grey and it starts to rain ──────────────

const RainScene: React.FC<SceneProps> = ({ f, t, fps }) => {
  const grey = ease(t, 0.2, 1.4, 0, 0.6);
  const rainStart = Math.round(wordStart(1, "deszczyk") * fps);
  const kaps = [0, 1, 2].map((i) => Math.round(wordStart(1, "kap", i) * fps));
  const squash = kaps.reduce((s, k) => s - (f >= k ? Math.exp(-(f - k) / 4) * Math.sin(((f - k) / 8) * Math.PI) * 0.07 : 0), 1);
  const tiny = ease(t, wordStart(1, "powietrzu") - 0.2, wordStart(1, "mnóstwo") + 0.3);
  return (
    <AbsoluteFill>
      <Sky frame={f + 600} top="#8fbbe2" bottom="#e2eef8" uid="s1">
        <RaindropDefs />
        <Hills frame={f} y={1600} />
        <Rain f={f} x0={300} x1={780} y0={820} y1={1380} count={22} start={rainStart} seed="r2" />
        {kaps.map((k, i) => {
          if (f < k) return null;
          const lt = f - k;
          const y = 800 + lt * 9;
          const o = interpolate(y, [800, 830, 1300, 1380], [0, 1, 1, 0], { extrapolateRight: "clamp" });
          return (
            <g key={i} opacity={o}>
              <Raindrop x={[430, 540, 650][i]} y={y} s={1.05} />
            </g>
          );
        })}
        {/* tiny droplets floating in the air */}
        <g opacity={tiny}>
          {Array.from({ length: 40 }, (_, i) => {
            const x = 60 + random(`tx${i}`) * 960;
            const y = 300 + random(`ty${i}`) * 1250 + Math.sin(f / 20 + i) * 18;
            const s = 0.16 + random(`ts${i}`) * 0.14;
            return (
              <g key={i} transform={`scale(${0.6 + 0.4 * tiny})`} style={{ transformOrigin: `${x}px ${y}px` }}>
                <Raindrop x={x} y={y} s={s} face={false} rot={Math.sin(f / 15 + i) * 15} />
              </g>
            );
          })}
        </g>
        <Floaty f={f} x={540} y={560} scale={0.82} amp={10}>
          <Chmurka uid="c1" frame={f} grey={grey} lookY={0.55} lookX={Math.sin(f / 30) * 0.3} amazed={0.1} talk={speakingAt(1, t)} squash={squash} />
        </Floaty>
      </Sky>
    </AbsoluteFill>
  );
};

// ── Scene 3: the sun peeks out and shines on the drops ────────────

const SunScene: React.FC<SceneProps> = ({ f, t, fps }) => {
  const out = ease(t, 0.25, 1.5);
  const sunX = interpolate(out, [0, 1], [560, 830]);
  const sunY = interpolate(out, [0, 1], [640, 380]);
  const beamAt = wordStart(2, "świeci") - 0.1;
  const beam = ease(t, beamAt, beamAt + 0.7);
  const target = { x: 470, y: 1230 };
  const ang = Math.atan2(target.y - sunY, target.x - sunX);
  const len = Math.hypot(target.x - sunX, target.y - sunY) * beam;
  const brighten = ease(t, 0.2, 1.6);
  return (
    <AbsoluteFill>
      <Sky frame={f + 900} top={brighten > 0.5 ? "#6ec6ff" : "#8fbbe2"} bottom="#e8f6ff" uid="s2">
        <defs>
          <linearGradient id="beam-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0.55} />
          </linearGradient>
          <filter id="beam-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <RaindropDefs />
        <Hills frame={f} y={1600} />
        <g transform={`translate(${sunX} ${sunY})`}>
          <Sun frame={f} r={115} glow={out} />
        </g>
        <Rain f={f + 200} x0={250} x1={700} y0={830} y1={1380} count={20} start={0} seed="r3" glintFrom={Math.round((beamAt + 0.6) * fps) + 200} />
        <Floaty f={f} x={430} y={620} scale={0.8} amp={10}>
          <Chmurka uid="c2" frame={f} grey={interpolate(out, [0, 1], [0.6, 0.35])} lookX={0.4 + out * 0.4} lookY={-0.3 + beam * 0.9} amazed={out * 0.6} talk={speakingAt(2, t)} />
        </Floaty>
        {beam > 0 && (
          <g transform={`translate(${sunX} ${sunY}) rotate(${(ang * 180) / Math.PI})`}>
            <path d={`M 90 -30 L ${len} -70 L ${len} 70 L 90 30 Z`} fill="#ffffff" opacity={0.55} filter="url(#beam-blur)" />
            <path d={`M 90 -18 L ${len} -42 Q ${len + 30} 0 ${len} 42 L 90 18 Z`} fill="url(#beam-g)" opacity={0.9} />
          </g>
        )}
        {beam > 0.9 &&
          Array.from({ length: 6 }, (_, i) => (
            <Sparkle key={i} x={target.x + Math.cos(i * 1.05 + f / 12) * 170} y={target.y + Math.sin(i * 1.05 + f / 12) * 120} s={0.8} o={0.5 + 0.5 * Math.sin(f / 5 + i)} />
          ))}
      </Sky>
    </AbsoluteFill>
  );
};

// ── Scene 4: close-up of one drop splitting light into colours ────

const PrismScene: React.FC<SceneProps> = ({ f, t, fps }) => {
  const zoom = spring({ frame: f, fps, config: { damping: 16, mass: 0.9 } });
  const dropScale = interpolate(zoom, [0, 1], [0.55, 1]);
  const lupa = ease(t, wordStart(3, "magiczna") - 0.1, wordStart(3, "lupa") + 0.3) - ease(t, wordStart(3, "rozdziela") - 0.3, wordStart(3, "rozdziela"));
  const beamAt = wordStart(3, "rozdziela") - 0.45;
  const beamIn = ease(t, beamAt, beamAt + 0.6);
  const inside = ease(t, beamAt + 0.5, beamAt + 0.9);
  const colorWords = ["czerwony", "pomarańczowy", "żółty", "zielony", "niebieski", "fioletowy"];
  const drop = { x: 430, y: 820 };
  const enter = { x: 220, y: 800 };
  const exit = { x: 632, y: 920 };
  return (
    <AbsoluteFill>
      <Sky frame={f + 1200} top="#7aa6f0" bottom="#efe6ff" uid="s3">
        <defs>
          <filter id="pr-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        {/* incoming white beam */}
        {beamIn > 0 && (
          <g>
            <path
              d={`M -40 ${enter.y - 230 - 40} L ${-40 + (enter.x + 40) * beamIn} ${enter.y - 230 + 230 * beamIn - 22} L ${-40 + (enter.x + 40) * beamIn} ${enter.y - 230 + 230 * beamIn + 22} L -40 ${enter.y - 230 + 40} Z`}
              fill="#ffffff"
              opacity={0.6}
              filter="url(#pr-blur)"
            />
            <path
              d={`M -40 ${enter.y - 230 - 26} L ${-40 + (enter.x + 40) * beamIn} ${enter.y - 230 + 230 * beamIn - 14} L ${-40 + (enter.x + 40) * beamIn} ${enter.y - 230 + 230 * beamIn + 14} L -40 ${enter.y - 230 + 26} Z`}
              fill="#ffffff"
            />
          </g>
        )}
        {/* colour stripes fanning out */}
        {colorWords.map((w, i) => {
          const at = wordStart(3, w) - 0.15;
          const g = ease(t, at, at + 0.55);
          if (g <= 0) return null;
          const endX = exit.x + (1110 - exit.x) * g;
          const yC = exit.y + (-190 + i * 92) * g;
          const half = 10 + 36 * g;
          return (
            <g key={w}>
              <path d={`M ${exit.x} ${exit.y - 6 + i * 2.5} L ${endX} ${yC - half} L ${endX} ${yC + half} L ${exit.x} ${exit.y + 1 + i * 2.5} Z`} fill={RAINBOW[i]} opacity={0.5} filter="url(#pr-blur)" />
              <path d={`M ${exit.x} ${exit.y - 6 + i * 2.5} L ${endX} ${yC - half} L ${endX} ${yC + half} L ${exit.x} ${exit.y + 1 + i * 2.5} Z`} fill={RAINBOW[i]} />
              <path d={`M ${exit.x} ${exit.y - 5 + i * 2.5} L ${endX} ${yC - half + 6}`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={6} />
              <Sparkle x={endX - 40} y={yC} s={0.7 * g} o={g * (0.6 + 0.4 * Math.sin(f / 5 + i))} />
            </g>
          );
        })}
        <g transform={`translate(${drop.x} ${drop.y + Math.sin(f / 24) * 8}) scale(${dropScale})`}>
          {lupa > 0 &&
            Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2 + f / 18;
              return <Sparkle key={i} x={Math.cos(a) * 330} y={50 + Math.sin(a) * 380} s={1.1} o={lupa * (0.6 + 0.4 * Math.sin(f / 4 + i))} />;
            })}
          <BigDrop frame={f} size={640} />
          {/* white light travelling inside the drop */}
          {inside > 0 && (
            <path
              d={`M ${enter.x - drop.x} ${enter.y - drop.y} Q 40 ${60} ${(exit.x - drop.x) * inside + (enter.x - drop.x) * (1 - inside)} ${(exit.y - drop.y) * inside + (enter.y - drop.y) * (1 - inside)}`}
              stroke="#ffffff"
              strokeWidth={22}
              strokeOpacity={0.75}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>
      </Sky>
    </AbsoluteFill>
  );
};

// ── Scene 5: a child on a meadow – sun behind, rainbow in front ──

const MeadowScene: React.FC<SceneProps> = ({ f, t, fps }) => {
  const rb = ease(t, 0.3, 1.5);
  const sunCue = pop(f, Math.round(wordStart(4, "słoneczko") * fps), fps);
  const sunBump = 1 + Math.sin(Math.min(1, sunCue) * Math.PI) * 0.18;
  const rainCue = pop(f, Math.round(wordStart(4, "deszczyk") * fps), fps);
  const rainBump = 1 + Math.sin(Math.min(1, rainCue) * Math.PI) * 0.15;
  const sun = { x: 150, y: 560 };
  const cloud = { x: 860, y: 600 };
  return (
    <AbsoluteFill>
      <Sky frame={f + 1500} uid="s4">
        <RaindropDefs />
        <g transform={`translate(${sun.x} ${sun.y}) scale(${sunBump})`}>
          <Sun frame={f} r={95} />
        </g>
        {/* soft sunlight in the direction the child is looking */}
        <path d={`M ${sun.x} ${sun.y} L 1080 1000 L 1080 1340 Z`} fill="#fff8c4" opacity={0.18 * (0.5 + sunCue * 0.5)} />
        <Rainbow cx={860} cy={1290} r={300} width={34} grow={rb} frame={f} cloudScale={0.5} />
        <Rain f={f + 300} x0={720} x1={1000} y0={680} y1={1180} count={12} start={0} seed="r5" faces={false} size={[0.28, 0.4]} />
        <g transform={`translate(${cloud.x} ${cloud.y}) scale(${rainBump})`}>
          <PuffCloud x={0} y={0} scale={0.85} tint="#dfe5ee" />
        </g>
        <Hills frame={f} y={1290} flowers />
        {/* child's shadow falls towards the rainbow (sun is behind) */}
        <ellipse cx={540} cy={1376} rx={150} ry={22} fill="#1f5e2a" opacity={0.28} />
        <g transform={`translate(420 1372)`}>
          <Child frame={f} scale={1} />
        </g>
      </Sky>
    </AbsoluteFill>
  );
};

// ── Subtitles ─────────────────────────────────────────────────────

const OUTLINE = "#6b4de6";

const SubtitleChunk: React.FC<{ chunk: Chunk; t: number; fps: number }> = ({ chunk, t, fps }) => {
  const local = (t - chunk.start) * fps;
  const appear = spring({ frame: local, fps, config: { damping: 14, mass: 0.5, stiffness: 180 } });
  const chars = chunk.words.map((w) => w.display).join(" ").length;
  const size = chars <= 12 ? 112 : chars <= 16 ? 100 : 88;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 90,
        top: 1395,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        columnGap: size * 0.42,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.15,
        transform: `scale(${0.8 + 0.2 * appear}) translateY(${(1 - appear) * 30}px)`,
        opacity: Math.min(1, appear * 1.6),
      }}
    >
      {chunk.words.map((w, i) => {
        const active = t >= w.start - 0.05 && t <= w.end + 0.05;
        const s = active ? 1.08 : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: w.highlight ? "#ffe14d" : "#ffffff",
              WebkitTextStroke: `${size * 0.2}px ${OUTLINE}`,
              paintOrder: "stroke fill",
              textShadow: `0 ${size * 0.07}px 0 #4b36b8, 0 ${size * 0.12}px ${size * 0.2}px rgba(40,20,90,0.35)`,
              transform: `scale(${s}) translateY(${active ? -4 : 0}px)`,
            }}
          >
            {w.display}
          </span>
        );
      })}
    </div>
  );
};

const Subtitles: React.FC<{ scene: number; t: number; fps: number }> = ({ scene, t, fps }) => {
  const chunk = SCENES[scene].chunks.find((c) => t >= c.start && t < c.end);
  return chunk ? <SubtitleChunk key={chunk.start} chunk={chunk} t={t} fps={fps} /> : null;
};

// ── Composition ───────────────────────────────────────────────────

const SceneView: React.FC<{ index: number }> = ({ index }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const props = { f, t, fps };
  const fadeIn = index === 0 ? 1 : interpolate(f, [0, XFADE], [0, 1], { extrapolateRight: "clamp" });
  const zoom = interpolate(f, [0, SCENES[index].frames], [1, 1.035]);
  const pictures = [
    <RainbowShot key={0} {...props} scene={0} />,
    <RainScene key={1} {...props} />,
    <SunScene key={2} {...props} />,
    <PrismScene key={3} {...props} />,
    <MeadowScene key={4} {...props} />,
    <RainbowShot key={5} {...props} scene={5} />,
  ];
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill style={{ transform: `scale(${index === 5 ? 1 : zoom})`, transformOrigin: "50% 45%" }}>{pictures[index]}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const SubtitleLayer: React.FC<{ index: number }> = ({ index }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Subtitles scene={index} t={f / fps} fps={fps} />;
};

/** Gentle sound effects, synced to the narration. */
const SFX: { scene: number; at: number; sfx: string; volume: number; len: number }[] = [
  { scene: 0, at: 0.05, sfx: "sparkle", volume: 0.25, len: 28 },
  ...[0, 1, 2].map((i) => ({ scene: 1, at: wordStart(1, "kap", i), sfx: "bubble", volume: 0.45, len: 9 })),
  { scene: 2, at: wordStart(2, "słoneczko") - 0.1, sfx: "chime", volume: 0.22, len: 48 },
  { scene: 3, at: wordStart(3, "magiczna"), sfx: "magic", volume: 0.18, len: 42 },
  ...["czerwony", "pomarańczowy", "żółty", "zielony", "niebieski", "fioletowy"].map((w) => ({
    scene: 3,
    at: wordStart(3, w) - 0.12,
    sfx: "pop",
    volume: 0.22,
    len: 8,
  })),
  { scene: 5, at: 0.1, sfx: "sparkle", volume: 0.2, len: 28 },
];

export const ChmurkaTecza: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#bfe6ff", overflow: "hidden" }}>
      {SCENES.map((s) => (
        <Sequence key={`v${s.index}`} from={s.from} durationInFrames={s.frames + (s.index < SCENES.length - 1 ? XFADE : 0)} name={`Scena ${s.index + 1}`}>
          <SceneView index={s.index} />
        </Sequence>
      ))}
      {SCENES.map((s) => (
        <Sequence key={`t${s.index}`} from={s.from} durationInFrames={s.frames} name={`Napisy ${s.index + 1}`}>
          <SubtitleLayer index={s.index} />
        </Sequence>
      ))}
      {SCENES.map((s) => (
        <Sequence key={`a${s.index}`} from={s.from} durationInFrames={s.frames} layout="none" name={`Lektor ${s.index + 1}`}>
          <Audio src={staticFile(s.audio)} volume={1} />
        </Sequence>
      ))}
      {SFX.map((c, i) => (
        <Sequence key={`sfx${i}`} from={SCENES[c.scene].from + Math.max(0, Math.round(c.at * fps))} durationInFrames={c.len} layout="none">
          <Audio src={staticFile(`sfx/${c.sfx}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
      <Audio
        src={staticFile("music/marzycielska.wav")}
        loop
        volume={(f) =>
          0.09 * interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        }
      />
    </AbsoluteFill>
  );
};
