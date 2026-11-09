import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFonts, FONT_FAMILY } from "../fonts";
import timeline from "./timeline.json";
import voiceover from "./voiceover.json";
import {
  CarCloseShot,
  EarthShot,
  FacesShot,
  OceanShot,
  PoolCrashShot,
  PoolShot,
  RewindShot,
  StreetFallShot,
  StreetFloatShot,
  weightlessSeconds,
} from "./shots";

export const GRAVITY_COMPOSITION_ID = "GravityShort";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const YELLOW = "#ffe14d";
const STROKE = "0 0 2px #000, 0 6px 0 #000, 0 0 18px rgba(0,0,0,0.65)";

const SHOTS: Record<string, React.FC<{ from: number }>> = {
  earth: EarthShot,
  streetFloat: StreetFloatShot,
  carClose: CarCloseShot,
  pool: PoolShot,
  ocean: OceanShot,
  streetFall: StreetFallShot,
  poolCrash: PoolCrashShot,
  faces: FacesShot,
  rewind: RewindShot,
  earthCalm: ({ from }) => <EarthShot from={from} calm />,
  outro: ({ from }) => <EarthShot from={from} calm />,
};

// ───────────────────────── captions ─────────────────────────

type Word = { text: string; start: number; end: number };

function captionChunks(): Word[][] {
  const chunks: Word[][] = [];
  for (const line of voiceover) {
    const words = line.text.split(/\s+/).filter(Boolean);
    const weights = words.map((w) => w.replace(/[^\p{L}\d]/gu, "").length + 1.5 + (/[!?.,]$/.test(w) ? 2.5 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let t = line.start;
    const timed = words.map((w, i) => {
      const d = (weights[i] / total) * line.duration;
      const word = { text: w, start: t, end: t + d };
      t += d;
      return word;
    });
    // groups of up to 3 words, breaking after punctuation
    let cur: Word[] = [];
    for (const w of timed) {
      cur.push(w);
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0);
      if (cur.length === 3 || chars > 15 || /[!?.,]$/.test(w.text)) {
        chunks.push(cur);
        cur = [];
      }
    }
    if (cur.length) chunks.push(cur);
  }
  return chunks;
}

const CHUNKS = captionChunks();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = CHUNKS.findIndex((c, i) => t >= c[0].start && t < (CHUNKS[i + 1]?.[0].start ?? c[c.length - 1].end + 0.4) && t < c[c.length - 1].end + 0.4);
  if (idx < 0 || frame >= timeline.shots.find((s) => s.id === "outro")!.from) return null;
  const chunk = CHUNKS[idx];
  const local = (t - chunk[0].start) * fps;
  const pop = spring({ frame: local, fps, config: { damping: 11, stiffness: 220, mass: 0.6 } });
  const tilt = (idx % 2 ? 1 : -1) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1130,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        transform: `scale(${0.6 + pop * 0.4}) rotate(${tilt * (1 - pop)}deg)`,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 104,
        lineHeight: 1.08,
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {chunk.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.05;
        const said = t >= w.start;
        const wp = spring({ frame: (t - w.start) * fps, fps, config: { damping: 9, stiffness: 260, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 22px",
              color: active ? YELLOW : "#ffffff",
              opacity: said ? 1 : 0.55,
              transform: `translateY(${active ? -10 * wp : 0}px) scale(${active ? 1 + 0.04 * wp : 1})`,
              textShadow: STROKE,
              WebkitTextStroke: "5px #000",
              paintOrder: "stroke fill",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// ───────────────────────── HUD / overlays ─────────────────────────

const SimulationBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const blink = frame % 30 < 20 ? 1 : 0.35;
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 26px",
          borderRadius: 999,
          background: "rgba(10,12,24,0.62)",
          border: "3px solid rgba(255,255,255,0.85)",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 38,
          color: "#fff",
          letterSpacing: 3,
        }}
      >
        <span style={{ width: 20, height: 20, borderRadius: 10, background: "#ff3b3b", opacity: blink, boxShadow: "0 0 12px #ff3b3b" }} />
        FIKCYJNA SYMULACJA 3D
      </div>
    </div>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 180 } });
  const out = interpolate(frame, [timeline.gravityOffFrame - 8, timeline.gravityOffFrame], [1, 0], clamp);
  const shake = frame >= timeline.flashFrame && frame < timeline.flashFrame + 14 ? Math.sin(frame * 5) * 10 : 0;
  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        left: 40,
        right: 40,
        textAlign: "center",
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        color: "#fff",
        opacity: out,
        transform: `translateX(${shake}px) scale(${inS})`,
      }}
    >
      <div style={{ fontSize: 86, lineHeight: 1.05, textShadow: STROKE, WebkitTextStroke: "4px #000", paintOrder: "stroke fill" }}>
        CO GDYBY GRAWITACJA
      </div>
      <div style={{ fontSize: 86, lineHeight: 1.05, textShadow: STROKE, WebkitTextStroke: "4px #000", paintOrder: "stroke fill" }}>
        ZNIKNĘŁA NA <span style={{ color: YELLOW, fontSize: 120 }}>5 SEKUND?!</span>
      </div>
    </div>
  );
};

const GravityMeter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const F = timeline.freezeFrame;
  const BACK = timeline.gravityBackFrame;
  const visible = frame >= F && frame < timeline.shots.find((s) => s.id === "faces")!.to;
  if (!visible) return null;
  const off = frame < BACK;
  const g = off ? interpolate(frame, [F + 6, F + 40], [100, 0], clamp) : interpolate(frame, [BACK, BACK + 10], [0, 100], clamp);
  const secs = weightlessSeconds(frame) * (5 / ((BACK - timeline.gravityOffFrame) / fps));
  const appear = spring({ frame: frame - F, fps, config: { damping: 12 } });
  const color = g < 50 ? "#ff3b3b" : "#3ddc84";
  return (
    <div
      style={{
        position: "absolute",
        top: frame < timeline.gravityOffFrame ? 520 : 170,
        left: 60,
        right: 60,
        transform: `translateY(${(1 - appear) * -40}px)`,
        opacity: appear,
        fontFamily: FONT_FAMILY,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 44, fontWeight: 700, textShadow: STROKE }}>
        <span>GRAWITACJA</span>
        <span style={{ color }}>{Math.round(g)}%</span>
      </div>
      <div style={{ height: 26, borderRadius: 13, background: "rgba(0,0,0,0.55)", border: "3px solid #fff", overflow: "hidden" }}>
        <div style={{ width: `${g}%`, height: "100%", background: color, boxShadow: `0 0 20px ${color}` }} />
      </div>
      {frame >= timeline.gravityOffFrame && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, fontWeight: 700, textShadow: STROKE }}>
          <span>{off ? "BEZ GRAWITACJI" : "GRAWITACJA WRÓCIŁA!"}</span>
          <span style={{ color: YELLOW, fontVariantNumeric: "tabular-nums" }}>{secs.toFixed(1).replace(".", ",")} s / 5,0 s</span>
        </div>
      )}
      {off && frame >= timeline.gravityOffFrame && (
        <div style={{ alignSelf: "flex-start", fontSize: 30, fontWeight: 600, padding: "4px 14px", borderRadius: 10, background: "rgba(255,255,255,0.18)" }}>
          ZWOLNIONE TEMPO ×2
        </div>
      )}
    </div>
  );
};

const Flash: React.FC<{ at: number; color: string; len?: number }> = ({ at, color, len = 14 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - 1, at, at + len], [0, 1, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen" }} />;
};

const FreezeFx: React.FC = () => {
  const frame = useCurrentFrame();
  const F = timeline.freezeFrame;
  const end = timeline.gravityOffFrame;
  if (frame < F || frame >= end) return null;
  const lines = Array.from({ length: 6 }).map((_, i) => (frame * 37 + i * 311) % 1920);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 5px)" }} />
      {lines.map((y, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: 3 + (i % 3) * 2, background: "rgba(255,255,255,0.18)" }} />
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 940,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 54,
          letterSpacing: 8,
          color: "#ff3b3b",
          textShadow: "0 0 18px rgba(255,59,59,0.8), 0 4px 0 #000",
          opacity: frame % 16 < 11 ? 1 : 0.2,
        }}
      >
        ❚❚ PAUZA
      </div>
    </AbsoluteFill>
  );
};

const GravityBack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const B = timeline.gravityBackFrame;
  if (frame < B || frame > B + 50) return null;
  const s = spring({ frame: frame - B, fps, config: { damping: 8, stiffness: 200 } });
  const o = interpolate(frame, [B + 38, B + 50], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 620,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 120,
        lineHeight: 1,
        color: "#ff3b3b",
        transform: `scale(${s}) rotate(-4deg)`,
        opacity: o,
        textShadow: STROKE,
        WebkitTextStroke: "6px #000",
        paintOrder: "stroke fill",
      }}
    >
      GRAWITACJA
      <br />
      <span style={{ color: "#fff" }}>WRACA!</span>
    </div>
  );
};

const RewindFx: React.FC = () => {
  const frame = useCurrentFrame();
  const r = timeline.shots.find((s) => s.id === "rewind")!;
  if (frame < r.from || frame >= r.to) return null;
  const local = frame - r.from;
  const bands = Array.from({ length: 5 }).map((_, i) => ({ y: (local * 53 + i * 397) % 1920, h: 14 + ((i * 7) % 30) }));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(40,60,120,0.18)", mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 4px)" }} />
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: b.y,
            height: b.h,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), rgba(120,200,255,0.25), transparent)",
            filter: "blur(1px)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 60,
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: 64,
          color: "#fff",
          textShadow: "0 0 10px rgba(0,0,0,0.9), 3px 0 0 rgba(255,0,80,0.6), -3px 0 0 rgba(0,200,255,0.6)",
        }}
      >
        <svg width="90" height="60" viewBox="0 0 90 60">
          <polygon points="45,0 45,60 0,30" fill="#fff" />
          <polygon points="90,0 90,60 45,30" fill="#fff" />
        </svg>
        COFANIE CZASU
      </div>
    </AbsoluteFill>
  );
};

const ThoughtExperiment: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = timeline.shots.find((s) => s.id === "earthCalm")!;
  if (frame < c.from + 6 || frame >= c.to) return null;
  const s = spring({ frame: frame - c.from - 6, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: 210, left: 50, right: 50, textAlign: "center", fontFamily: FONT_FAMILY, fontWeight: 700, transform: `scale(${s})` }}>
      <div
        style={{
          display: "inline-block",
          padding: "16px 30px",
          borderRadius: 24,
          background: "#3ddc84",
          color: "#06210f",
          fontSize: 50,
          letterSpacing: 2,
          boxShadow: "0 8px 0 #0b6b35",
        }}
      >
        ✓ ZIEMIA WRÓCIŁA DO NORMY
      </div>
      <div style={{ marginTop: 24, fontSize: 70, color: "#fff", textShadow: STROKE, lineHeight: 1.1 }}>
        TO TYLKO
        <br />
        <span style={{ color: YELLOW }}>EKSPERYMENT MYŚLOWY</span>
      </div>
    </div>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = timeline.shots.find((s) => s.id === "outro")!;
  if (frame < o.from) return null;
  const l = frame - o.from;
  const s = spring({ frame: l, fps, config: { damping: 9, stiffness: 160 } });
  const s2 = spring({ frame: l - 22, fps, config: { damping: 10 } });
  const bob = Math.sin(l / 5) * 10;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 230, left: 40, right: 40, textAlign: "center", fontFamily: FONT_FAMILY, fontWeight: 700, transform: `scale(${s})` }}>
        <div style={{ fontSize: 130, color: YELLOW, textShadow: STROKE, WebkitTextStroke: "5px #000", paintOrder: "stroke fill" }}>A TY?</div>
        <div style={{ fontSize: 78, color: "#fff", lineHeight: 1.1, textShadow: STROKE, WebkitTextStroke: "4px #000", paintOrder: "stroke fill" }}>
          CO ZROBIŁBYŚ PRZEZ TE <span style={{ color: YELLOW }}>5 SEKUND?</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1520,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          transform: `scale(${s2}) translateY(${bob}px)`,
        }}
      >
        <div style={{ padding: "16px 34px", borderRadius: 999, background: "#ff3b3b", color: "#fff", fontSize: 50, boxShadow: "0 8px 0 #8f1010" }}>
          NAPISZ W KOMENTARZU
        </div>
        <svg width="70" height="60" viewBox="0 0 70 60">
          <polygon points="0,0 70,0 35,55" fill="#fff" stroke="#000" strokeWidth="4" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

const Disclaimer: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 60,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: FONT_FAMILY,
      fontSize: 26,
      fontWeight: 500,
      color: "rgba(255,255,255,0.8)",
      textShadow: "0 2px 4px rgba(0,0,0,0.9)",
    }}
  >
    Animacja poglądowa – scenariusz fikcyjny, nie przedstawia prawdziwych zdarzeń
  </div>
);

/** Quick zoom-punch on every cut. */
function cutPunch(frame: number) {
  let s = 1;
  for (const shot of timeline.shots.slice(1)) {
    const d = frame - shot.from;
    if (d >= 0 && d < 8) s = Math.max(s, interpolate(d, [0, 8], [1.12, 1], { easing: Easing.out(Easing.cubic) }));
  }
  if (frame >= timeline.freezeFrame && frame < timeline.gravityOffFrame) {
    s = Math.max(s, interpolate(frame, [timeline.freezeFrame, timeline.freezeFrame + 6, timeline.gravityOffFrame], [1.0, 1.18, 1.24], clamp));
  }
  return s;
}

export const GravityShort: React.FC = () => {
  ensureFonts();
  const frame = useCurrentFrame();
  const frozen = frame >= timeline.freezeFrame && frame < timeline.gravityOffFrame;
  const rewind = timeline.shots.find((s) => s.id === "rewind")!;
  const inRewind = frame >= rewind.from && frame < rewind.to;
  const filter = frozen ? "saturate(0.55) contrast(1.25) brightness(0.95)" : inRewind ? "saturate(0.7) hue-rotate(-12deg) contrast(1.1)" : "saturate(1.12) contrast(1.05)";
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${cutPunch(frame)})`, filter }}>
        {timeline.shots.map((shot) => {
          const Comp = SHOTS[shot.id];
          return (
            <Sequence key={shot.id} from={shot.from} durationInFrames={shot.to - shot.from} name={shot.id}>
              <Comp from={shot.from} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
      {/* cinematic vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      <Sequence from={0} durationInFrames={timeline.gravityOffFrame}>
        <Hook />
      </Sequence>
      <FreezeFx />
      <GravityMeter />
      <GravityBack />
      <RewindFx />
      <ThoughtExperiment />
      <Outro />
      <Captions />
      <SimulationBadge />
      <Disclaimer />
      <Flash at={timeline.flashFrame} color="#ffffff" len={12} />
      <Flash at={timeline.gravityBackFrame} color="#ff2a2a" len={16} />
      <Flash at={timeline.shots.find((s) => s.id === "earthCalm")!.from} color="#ffffff" len={10} />
      <Audio src={staticFile("gravity/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
