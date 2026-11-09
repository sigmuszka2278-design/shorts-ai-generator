import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { FONT_FAMILY, ensureFonts } from "../fonts";
import { Backpack, Bird, Bruno, Egg, heartD, LeafBurst, P, PaintDefs, Raspberry, Tosia } from "./characters";
import {
  activeLine,
  COLOR_WORD,
  COUNT,
  EPISODE_FPS,
  POPS,
  QUESTIONS,
  SONG,
  SONG_END,
  SONG_START,
  songTimeline,
  SPEAKERS,
} from "./cues";
import { clamp01, rnd, seg } from "./math";
import { stateAt, type State } from "./shots";
import { EGG_POS, GROUND, LeafPile, SPOT, WorldBack, WorldFront } from "./world";

ensureFonts();

export const EPISODE_W = 1920;
export const EPISODE_H = 1080;

const TEXT_STROKE = "#3a2a4e";

/** Height of the platform Tosia stands on (stone / backpack) – for her shadow. */
function platformUnder(st: State): number {
  const t = st.tosia;
  if (!t || st.set !== "krzak") return 0;
  const lift = t.lift ?? 0;
  if (st.backpack && st.backpack.y === GROUND && Math.abs(t.x - st.backpack.x) < 70 && lift >= SPOT.backpack.top - 2) return SPOT.backpack.top;
  if (Math.abs(t.x - SPOT.stone.x) < 90 && lift >= SPOT.stone.top - 2) return SPOT.stone.top;
  return 0;
}

const Hearts: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g>
    {Array.from({ length: 10 }, (_, i) => {
      const lt = (t - i * 0.18) % 2.4;
      if (lt < 0 || t < i * 0.18) return null;
      const a = rnd(i, 4) * Math.PI * 2;
      const r = 70 + lt * 90;
      const px = x + Math.cos(a) * r * 0.9;
      const py = y + Math.sin(a) * r * 0.5 - lt * 80;
      const op = Math.sin((lt / 2.4) * Math.PI);
      return <path key={i} d={heartD(px, py, 16 + rnd(i, 6) * 10)} fill={i % 2 ? "#ff4d73" : "#ff8fab"} opacity={op} />;
    })}
  </g>
);

/** The animated world for a given episode time (seconds). */
export const EpisodeWorld: React.FC<{ g: number; width: number; height: number; offsetX?: number }> = ({ g, width, height, offsetX = 0 }) => {
  const st = stateAt(g);
  const { cam } = st;
  const shake = st.shake ? Math.sin(g * 60) * 14 * st.shake : 0;
  const zoom = cam.z * (height / EPISODE_H);
  const base = platformUnder(st);
  const tosia = st.tosia;

  // berry held in Tosia's left paw (drawn by her arm)
  const tosiaPose =
    tosia && st.berryInPaw
      ? { ...tosia, holding: <g transform="translate(0 -46)"><Raspberry r={58} time={g} sparkle={st.berrySparkle ?? 0} id="rb-paw" /></g> }
      : tosia;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
      <PaintDefs />
      <g transform={`translate(${width / 2 + shake + offsetX} ${height / 2 + shake * 0.6}) scale(${zoom}) translate(${-cam.x} ${-cam.y})`}>
        <WorldBack
          set={st.set}
          time={g}
          bushShake={st.bushShake}
          smallBushShake={st.smallBushShake}
          leafSquash={st.leafSquash}
        />
        {st.set === "krzak" && st.berryOnBush && (
          <g transform={`translate(${SPOT.berry.x} ${SPOT.berry.y})`}>
            <Raspberry r={SPOT.berry.r} time={g} sparkle={st.berrySparkle ?? 0.6} id="rb-bush" />
          </g>
        )}
        {st.brunoNose && (
          <g>
            <ellipse cx={st.brunoNose.x + 10} cy={st.brunoNose.y} rx={34} ry={22} fill={P("tan")} />
            <circle cx={st.brunoNose.x - 20} cy={st.brunoNose.y - 4} r={13} fill="#3a2a2e" />
            <circle cx={st.brunoNose.x - 24} cy={st.brunoNose.y - 8} r={4} fill="#fff" />
          </g>
        )}
        {st.backpack && st.backpack.y === GROUND && <Backpack x={st.backpack.x} y={st.backpack.y} />}
        {st.set === "dab" && st.egg && <Egg x={EGG_POS.x} y={EGG_POS.y} time={g} wobble={st.egg.wobble} />}
        {st.bruno && <Bruno pose={st.bruno} time={g} />}
        {st.backpack && st.backpack.y !== GROUND && <Backpack x={st.backpack.x} y={st.backpack.y} scale={0.85} />}
        {tosiaPose &&
          ((tosiaPose.sink ?? 0) > 0 ? (
            <g>
              <clipPath id="ep-above-ground">
                <rect x={-4000} y={-4000} width={12000} height={4000 + GROUND + 4} />
              </clipPath>
              <g clipPath="url(#ep-above-ground)">
                <Tosia pose={tosiaPose} time={g} base={base} />
              </g>
            </g>
          ) : (
            <Tosia pose={tosiaPose} time={g} base={base} />
          ))}
        {st.pileFront && <LeafPile x={SPOT.leafPile.x} front={st.pileFront === "low"} squash={st.leafSquash} />}
        {st.berryFree && (
          <g transform={`translate(${st.berryFree.x} ${st.berryFree.y})`}>
            <Raspberry r={st.berryFree.r} time={g} sparkle={st.berryFree.sparkle ?? 0} split={st.berryFree.split} gap={st.berryFree.gap} id="rb-free" noStem={!!st.berryFree.split} />
          </g>
        )}
        {st.piece && (
          <g transform={`translate(${st.piece.x} ${st.piece.y})`}>
            <Raspberry r={14} time={g} id="rb-piece" noStem />
          </g>
        )}
        {st.bird && <Bird x={st.bird.x} y={st.bird.y} time={g} flap={st.bird.flap} facing={st.bird.facing} talk={st.bird.talk} />}
        {st.hearts && <Hearts x={st.hearts.x} y={st.hearts.y} t={st.hearts.t} />}
        {(st.bursts ?? []).map((b, i) => (
          <LeafBurst key={i} x={b.x} y={b.y} t={b.t} power={b.power} count={b.count} seed={b.seed} />
        ))}
        <WorldFront set={st.set} />
      </g>
    </svg>
  );
};

// ── overlays ────────────────────────────────────────────────────
const outlined = (px: number, color = TEXT_STROKE): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: "stroke fill",
});

export const Caption: React.FC<{ g: number; scale: number; bottom: number }> = ({ g, scale, bottom }) => {
  const line = activeLine(g);
  if (!line || (g >= SONG_START - 0.2 && g < SONG_END)) return null;
  const sp = SPEAKERS[line.who];
  const appear = clamp01((g - line.s) / 0.18);
  const fs = 50 * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        display: "flex",
        justifyContent: "center",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 20}px)`,
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "86%",
          padding: `${14 * scale}px ${34 * scale}px ${16 * scale}px`,
          borderRadius: 40 * scale,
          background: "rgba(255,255,255,0.92)",
          border: `${6 * scale}px solid ${sp.color}`,
          boxShadow: "0 8px 0 rgba(0,0,0,0.12)",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: fs,
          lineHeight: 1.15,
          color: "#3a2a4e",
          textAlign: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: -26 * scale,
            left: 28 * scale,
            background: sp.color,
            color: "#fff",
            fontSize: 26 * scale,
            padding: `${2 * scale}px ${16 * scale}px`,
            borderRadius: 20 * scale,
          }}
        >
          {sp.name}
        </span>
        {line.text}
      </div>
    </div>
  );
};

const Pops: React.FC<{ g: number; w: number; h: number; scale: number }> = ({ g, w, h, scale }) => (
  <>
    {POPS.map((p, i) => {
      const dur = p.dur ?? 1.2;
      const t = g - p.t;
      if (t < 0 || t > dur) return null;
      const s = t < 0.15 ? 0.4 + (t / 0.15) * 0.8 : t < 0.3 ? 1.2 - ((t - 0.15) / 0.15) * 0.2 : 1;
      const op = t > dur - 0.25 ? (dur - t) / 0.25 : 1;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x * w,
            top: p.y * h,
            transform: `translate(-50%, -50%) scale(${s}) rotate(${(i % 2 ? 1 : -1) * 6}deg)`,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: 110 * (p.size ?? 1) * scale,
            color: p.color,
            opacity: op,
            whiteSpace: "nowrap",
            ...outlined(14 * scale),
          }}
        >
          {p.text}
        </div>
      );
    })}
  </>
);

const Question: React.FC<{ g: number; w: number; h: number; scale: number }> = ({ g, w, h, scale }) => {
  const q = QUESTIONS.find(([s, e]) => g >= s && g < e);
  if (!q) return null;
  const t = g - q[0];
  const s = Math.min(1, t / 0.25) * (1 + Math.sin(t * 5) * 0.06);
  return (
    <div style={{ position: "absolute", right: w * 0.08, top: h * 0.12, transform: `scale(${s})`, transformOrigin: "50% 50%" }}>
      <div
        style={{
          width: 230 * scale,
          height: 230 * scale,
          borderRadius: "50%",
          background: "#ffffff",
          border: `${10 * scale}px solid #9b6bff`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 170 * scale,
          color: "#9b6bff",
          boxShadow: "0 10px 0 rgba(0,0,0,0.12)",
        }}
      >
        ?
      </div>
    </div>
  );
};

const Counting: React.FC<{ g: number; w: number; h: number; scale: number }> = ({ g, w, h, scale }) => {
  const colors = ["#ff5c8a", "#ffb000", "#3ec46d"];
  if (g < COUNT[0][0] || g > 138.2) return null;
  return (
    <div style={{ position: "absolute", top: h * 0.08, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 70 * scale }}>
      {COUNT.map(([t, n], i) => {
        const lt = g - t;
        const s = lt < 0 ? 0 : lt < 0.2 ? (lt / 0.2) * 1.3 : lt < 0.4 ? 1.3 - ((lt - 0.2) / 0.2) * 0.3 : 1;
        return (
          <div
            key={n}
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: 230 * scale,
              lineHeight: 1,
              color: colors[i],
              transform: `scale(${s}) translateY(${Math.sin(g * 6 + i) * 6}px)`,
              ...outlined(16 * scale, "#ffffff"),
              filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.15))",
            }}
          >
            {n}
          </div>
        );
      })}
    </div>
  );
};

const ColorWord: React.FC<{ g: number; w: number; h: number; scale: number }> = ({ g, h, scale }) => {
  const t = g - COLOR_WORD.s;
  if (t < 0 || g > COLOR_WORD.e) return null;
  const s = t < 0.25 ? (t / 0.25) * 1.15 : t < 0.45 ? 1.15 - ((t - 0.25) / 0.2) * 0.15 : 1 + Math.sin(t * 6) * 0.03;
  return (
    <div style={{ position: "absolute", top: h * 0.08, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 150 * scale,
          color: "#e6284f",
          transform: `scale(${s})`,
          ...outlined(16 * scale, "#ffffff"),
          filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.15))",
          letterSpacing: 4 * scale,
        }}
      >
        {COLOR_WORD.text}
      </div>
    </div>
  );
};

const SYL = songTimeline();

const Karaoke: React.FC<{ g: number; scale: number; bottom: number }> = ({ g, scale, bottom }) => {
  if (g < SONG_START - 0.3 || g >= SONG_END) return null;
  const cur = SYL.find((s) => g >= s.s && g < s.e) ?? SYL.find((s) => s.s > g) ?? SYL[SYL.length - 1];
  const li = cur.line;
  const syls = SYL.filter((s) => s.line === li && s.text);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: `${14 * scale}px ${40 * scale}px`,
          borderRadius: 44 * scale,
          background: "rgba(255,255,255,0.9)",
          border: `${6 * scale}px solid #ff7a2f`,
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 58 * scale,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span style={{ marginRight: 16 * scale }}>🎵</span>
        {syls.map((s, i) => {
          const done = g >= s.s;
          const active = g >= s.s && g < s.e;
          const joined = s.text.endsWith("~");
          const label = joined ? s.text.slice(0, -1) : s.text;
          return (
            <span
              key={i}
              style={{
                color: done ? "#ff5c1f" : "#9a8fa8",
                transform: active ? "translateY(-8px) scale(1.12)" : "none",
                display: "inline-block",
                marginRight: joined ? 0 : 22 * scale,
                transformOrigin: "50% 100%",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
void SONG;

const EndCard: React.FC<{ g: number; scale: number }> = ({ g, scale }) => {
  const t = g - 238.1;
  if (t < 0) return null;
  const s = Math.min(1, t / 0.3);
  return (
    <div style={{ position: "absolute", top: "9%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: s }}>
      <div style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 64 * scale, color: "#ffffff", ...outlined(12 * scale, "#ff7a2f") }}>
        Przygody Tosi z Kolorowego Lasu
      </div>
      <div style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 46 * scale, color: "#ffffff", ...outlined(10 * scale, "#4c8ff5") }}>
        Ciąg dalszy nastąpi…
      </div>
    </div>
  );
};

/** White flash on set changes. */
function flashAt(g: number) {
  for (const c of [190, 220]) {
    const d = Math.abs(g - c);
    if (d < 0.2) return 1 - d / 0.2;
  }
  if (g > 239.4) return 0; // handled by fade
  return 0;
}

export const EpisodeOverlays: React.FC<{ g: number; w: number; h: number; vertical?: boolean }> = ({ g, w, h, vertical }) => {
  const scale = vertical ? 1.0 : 1;
  const bottom = vertical ? h * 0.2 : 40;
  const fade = seg(g, 239.3, 240);
  return (
    <>
      <Pops g={g} w={w} h={h} scale={scale} />
      <Question g={g} w={w} h={h} scale={scale} />
      <Counting g={g} w={w} h={h} scale={scale} />
      <ColorWord g={g} w={w} h={h} scale={scale} />
      {!vertical && <EndCard g={g} scale={scale} />}
      <Caption g={g} scale={vertical ? 1.05 : 1} bottom={bottom} />
      <Karaoke g={g} scale={vertical ? 0.8 : 1} bottom={bottom} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: flashAt(g) }} />
      <AbsoluteFill style={{ background: "#000000", opacity: vertical ? 0 : fade }} />
    </>
  );
};

export const TosiaEpisode: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = frame / fps;
  return (
    <AbsoluteFill style={{ background: "#8fd3ff" }}>
      <EpisodeWorld g={g} width={EPISODE_W} height={EPISODE_H} />
      <EpisodeOverlays g={g} w={EPISODE_W} h={EPISODE_H} />
      {withAudio && <Audio src={staticFile("episode/odc01-audio.wav")} />}
    </AbsoluteFill>
  );
};

void EPISODE_FPS;
