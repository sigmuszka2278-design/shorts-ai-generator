import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { CostChunk, CostShot, CostTimeline } from "./types";

const W = 1080;
const H = 1920;
const YELLOW = "#FFD60A";
const FONT = "'Montserrat Black', Montserrat, 'Arial Black', Impact, sans-serif";

let fontsLoaded = false;
function ensureFonts() {
  if (fontsLoaded || typeof document === "undefined") return;
  fontsLoaded = true;
  for (const [file, range] of [
    ["montserrat-latin-900-normal.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF"],
    ["montserrat-latin-ext-900-normal.woff2", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C0, U+2C60-2C7F, U+A720-A7FF"],
  ] as const) {
    loadFont({ family: "Montserrat Black", url: staticFile(`fonts/${file}`), weight: "900", unicodeRange: range }).catch((e) =>
      console.warn("Font load failed", e),
    );
  }
}
ensureFonts();

/** "1200" stays as is, "19000" → "19 000" (Polish grouping starts at 5 digits). */
export function formatZl(value: number): string {
  const s = String(Math.round(value));
  return s.length >= 5 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : s;
}

// ───────────────────────────── shots ─────────────────────────────

const ShotView: React.FC<{ shot: CostShot; index: number; fps: number }> = ({ shot, index, fps }) => {
  const frame = useCurrentFrame();
  const len = Math.max(1, Math.round((shot.end - shot.start) * fps));
  const p = Math.min(1, frame / len);
  const mode = index % 4;
  // slow cinematic push / pull / pans, alternating per shot
  const zoom = mode === 1 ? interpolate(p, [0, 1], [1.24, 1.1]) : interpolate(p, [0, 1], [1.1, 1.24]);
  const panX = mode === 2 ? interpolate(p, [0, 1], [40, -40]) : mode === 3 ? interpolate(p, [0, 1], [-40, 40]) : 0;
  const panY = mode === 0 ? interpolate(p, [0, 1], [20, -30]) : 0;
  const rot = (index % 2 ? 1 : -1) * interpolate(p, [0, 1], [0.4, -0.4]);
  // punch-in + motion blur on the cut
  const punch = interpolate(frame, [0, 7], [0.08, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const blur = interpolate(frame, [0, 4], [8, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(shot.src)}
        style={{
          width: W,
          height: H,
          objectFit: "cover",
          transform: `translate(${panX}px, ${panY}px) scale(${zoom + punch}) rotate(${rot}deg)`,
          filter: `contrast(1.12) saturate(1.12) sepia(0.24) brightness(1.03) blur(${blur}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ───────────────────────────── grade / texture ─────────────────────────────

const Grade: React.FC<{ grain: string }> = ({ grain }) => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx${frame}`) * 720);
  const gy = Math.floor(random(`gy${frame}`) * 720);
  const leak = 0.5 + 0.5 * Math.sin(frame / 37);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* warm golden wash */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(255,170,70,0.35) 0%, rgba(255,120,40,0.18) 55%, rgba(120,40,0,0.35) 100%)",
          mixBlendMode: "soft-light",
        }}
      />
      {/* drifting light leak */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${85 - leak * 25}% ${10 + leak * 12}%, rgba(255,150,50,${0.22 + leak * 0.12}) 0%, rgba(255,120,30,0) 45%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* vignette + bottom shade for subtitle contrast */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.62) 100%)" }} />
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%)" }}
      />
      {/* film grain */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile(grain)})`,
          backgroundSize: "720px 720px",
          backgroundPosition: `${gx}px ${gy}px`,
          mixBlendMode: "overlay",
          opacity: 0.16,
        }}
      />
      <Img src={staticFile(grain)} style={{ display: "none" }} />
    </AbsoluteFill>
  );
};

const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 1, 5], [0, 0.55, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: `rgba(255,214,150,${o})`, mixBlendMode: "screen" }} />;
};

// ───────────────────────────── price counter ─────────────────────────────

const Counter: React.FC<{ timeline: CostTimeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const steps = timeline.counter.steps;

  let value = 0;
  let lastStepFrame = -1000;
  let lastAdd = 0;
  for (const s of steps) {
    const sf = Math.round(s.at * fps);
    if (frame < sf) break;
    const from = s.value - s.add;
    value = interpolate(frame, [sf, sf + 16], [from, s.value], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    lastStepFrame = sf;
    lastAdd = s.add;
  }
  const since = frame - lastStepFrame;
  const bump = spring({ frame: since, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const scaleStep = since >= 0 && since < 40 ? 1 + 0.22 * (1 - bump) * Math.max(0, 1 - since / 40) * 2.2 : 1;
  const flash = interpolate(since, [0, 4, 26], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const totalAt = timeline.counter.totalAt;
  const isTotal = totalAt !== null && t >= totalAt;
  const totalFrame = totalAt !== null ? Math.round(totalAt * fps) : 0;
  const totalPop = isTotal ? spring({ frame: frame - totalFrame, fps, config: { damping: 10, stiffness: 120 } }) : 0;
  const pulse = isTotal ? 1 + 0.04 * Math.sin((frame - totalFrame) / 4) : 1;
  const scale = scaleStep * (1 + 0.28 * totalPop) * pulse;

  const color = isTotal || flash > 0.5 ? YELLOW : "#FFFFFF";
  const glow = isTotal ? 0.9 : flash;

  // "+1200 zł" chip that drops out of the counter
  const chipT = since;
  const chipVisible = chipT >= 0 && chipT < 48;
  const chipY = interpolate(chipT, [0, 10, 48], [-10, 26, 60], { extrapolateRight: "clamp" });
  const chipO = interpolate(chipT, [0, 4, 34, 48], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const appear = spring({ frame, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 44,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        transform: `translateY(${(1 - appear) * -80}px) scale(${scale})`,
        transformOrigin: "top right",
        opacity: appear,
      }}
    >
      <div
        style={{
          padding: "14px 30px 16px",
          borderRadius: 26,
          background: "linear-gradient(180deg, rgba(28,18,8,0.82), rgba(10,6,2,0.78))",
          border: `4px solid rgba(255,214,10,${0.55 + 0.45 * glow})`,
          boxShadow: `0 10px 30px rgba(0,0,0,0.55), 0 0 ${18 + 40 * glow}px rgba(255,190,20,${0.25 + 0.5 * glow})`,
          textAlign: "right",
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 74,
            lineHeight: 1,
            letterSpacing: -1,
            color,
            WebkitTextStroke: "8px #000",
            paintOrder: "stroke fill",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatZl(value)}&nbsp;zł
        </div>
      </div>
      {chipVisible && lastAdd > 0 ? (
        <div
          style={{
            marginTop: 10,
            transform: `translateY(${chipY - 26}px)`,
            opacity: chipO,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 52,
            color: YELLOW,
            WebkitTextStroke: "7px #000",
            paintOrder: "stroke fill",
            whiteSpace: "nowrap",
          }}
        >
          +{formatZl(lastAdd)}&nbsp;zł
        </div>
      ) : null}
    </div>
  );
};

// ───────────────────────────── subtitles ─────────────────────────────

/** Subtitles show the voiceover text word for word; only "." and "," are dropped for a cleaner look. */
function displayWord(text: string): string {
  return text.replace(/[.,]+$/, "");
}

const Subtitle: React.FC<{ chunk: CostChunk }> = ({ chunk }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
  const t = chunk.start + frame / fps;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1150,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 34,
        rowGap: 0,
        transform: `translateY(${(1 - pop) * 40}px) scale(${0.75 + 0.25 * pop})`,
        opacity: Math.min(1, pop * 1.6),
      }}
    >
      {chunk.words.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.05;
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: w.highlight ? 104 : 94,
              lineHeight: 1.12,
              color: w.highlight ? YELLOW : "#FFFFFF",
              WebkitTextStroke: "16px #000",
              paintOrder: "stroke fill",
              textShadow: "0 8px 18px rgba(0,0,0,0.65)",
              transform: `scale(${active ? 1.07 : 1})`,
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            {displayWord(w.text)}
          </span>
        );
      })}
    </div>
  );
};

// ───────────────────────────── composition ─────────────────────────────

export const CostShort: React.FC<CostTimeline> = (timeline) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (s: number) => Math.round(s * fps);
  const endFade = interpolate(frame, [durationInFrames - f(0.7), durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const segStarts = timeline.segments.slice(1).map((s) => s.start);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {timeline.shots.map((shot, i) => (
        <Sequence key={shot.src} from={f(shot.start)} durationInFrames={Math.max(1, f(shot.end) - f(shot.start))} layout="none">
          <ShotView shot={shot} index={i} fps={fps} />
        </Sequence>
      ))}
      {timeline.shots.slice(1).map((shot) => (
        <Sequence key={`flash-${shot.src}`} from={f(shot.start)} durationInFrames={6} layout="none">
          <CutFlash />
        </Sequence>
      ))}

      <Grade grain={timeline.grain} />

      {timeline.chunks.map((c, i) => (
        <Sequence key={`sub-${i}`} from={f(c.start)} durationInFrames={Math.max(1, f(c.end) - f(c.start))} layout="none">
          <Subtitle chunk={c} />
        </Sequence>
      ))}

      <Counter timeline={timeline} />

      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${endFade})` }} />

      {/* sound */}
      <Audio src={staticFile(timeline.voice)} />
      <Audio
        src={staticFile(timeline.music)}
        volume={(fr) => {
          const t = fr / fps;
          const lastWordEnd = timeline.segments[timeline.segments.length - 1].end;
          return t > lastWordEnd ? 0.3 : 0.13;
        }}
      />
      {timeline.counter.steps.map((s, i) => (
        <Sequence key={`cash-${i}`} from={f(s.at)} layout="none">
          <Audio src={staticFile(timeline.cash)} volume={0.42} />
        </Sequence>
      ))}
      {segStarts.map((s, i) => (
        <Sequence key={`whoosh-${i}`} from={Math.max(0, f(s) - 8)} durationInFrames={20} layout="none">
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.22} />
        </Sequence>
      ))}
      {timeline.counter.totalAt !== null ? (
        <Sequence from={f(timeline.counter.totalAt)} durationInFrames={20} layout="none">
          <Audio src={staticFile("sfx/thump.wav")} volume={0.7} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
