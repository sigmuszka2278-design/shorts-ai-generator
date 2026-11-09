import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { ensureFonts, FONT_FAMILY } from "../fonts";
import { BananaScene, IntroScene, JellyScene, MoonScene, OctopusScene, OutroScene, SharkScene, VenusScene } from "./scenes";
import { FPS, pop, prog, timeline, type SceneProps, type Segment, type Word } from "./util";

export const FACTS_COMPOSITION_ID = "FactsShort";

const SCENES: Record<string, React.FC<SceneProps>> = {
  intro: IntroScene,
  octopus: OctopusScene,
  venus: VenusScene,
  shark: SharkScene,
  banana: BananaScene,
  moon: MoonScene,
  jelly: JellyScene,
  outro: OutroScene,
};

const ACCENT: Record<string, string> = {
  intro: "#ffe14d",
  octopus: "#ff7a5c",
  venus: "#ffc43d",
  shark: "#5ff2c8",
  banana: "#ffe14d",
  moon: "#8fd3ff",
  jelly: "#ff9cf0",
  outro: "#ffe14d",
};

/** Camera: punch-in at the start, slow push, quick zoom-blur out at the end. */
const Camera: React.FC<{ seg: Segment; t: number; children: React.ReactNode }> = ({ seg, t, children }) => {
  const st = seg.from / FPS;
  const en = (seg.from + seg.duration) / FPS;
  const inK = prog(t, st, st + 0.35, Easing.out(Easing.cubic));
  const outK = prog(t, en - 0.2, en, Easing.in(Easing.cubic));
  const push = 1 + (t - st) * 0.012;
  const scale = (seg.id === "intro" ? 1 : 1.35 - 0.35 * inK) * push * (1 + outK * 0.35);
  const blur = (seg.id === "intro" ? 0 : (1 - inK) * 14) + outK * 18;
  const rot = seg.id === "intro" ? 0 : (1 - inK) * (seg.number! % 2 ? -6 : 6);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale}) rotate(${rot}deg)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/** Groups words into short caption chunks (max 3 words, break on punctuation or pause). */
function chunks(words: Word[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const chars = cur.map((c) => c.w).join(" ").length;
    if (!next || cur.length >= 3 || /[,.!?]$/.test(w.w) || next.start - w.end > 0.25 || chars + next.w.length > 17) {
      out.push(cur);
      cur = [];
    }
  });
  return out;
}

const Captions: React.FC<{ seg: Segment; t: number }> = ({ seg, t }) => {
  let words = seg.words;
  if (seg.id === "intro") {
    // The first sentence is already the giant on-screen title.
    const k = words.findIndex((w) => w.w.startsWith("Ostatnia"));
    words = words.slice(k);
  }
  const groups = chunks(words);
  const idx = groups.findIndex((g, i) => t >= g[0].start - 0.06 && (i === groups.length - 1 || t < groups[i + 1][0].start - 0.06));
  if (idx < 0) return null;
  const g = groups[idx];
  const last = g[g.length - 1];
  if (idx === groups.length - 1 && t > last.end + 0.6) return null;
  const s = pop(t, g[0].start - 0.06, 9, 260);
  const accent = ACCENT[seg.id];
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1440,
        transform: `translateY(-50%) scale(${0.6 + 0.4 * s})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 44,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 108,
        lineHeight: 1.08,
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      {g.map((w, i) => {
        const active = t >= w.start - 0.04 && (t < w.end + 0.05 || i === g.length - 1);
        const ws = active ? 1 + 0.12 * pop(t, w.start - 0.04, 8, 300) : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: active ? accent : "#ffffff",
              transform: `scale(${ws}) rotate(${active ? -2 : 0}deg)`,
              WebkitTextStroke: "16px #0b0b1a",
              paintOrder: "stroke fill",
              textShadow: "0 10px 0 #0b0b1a, 0 18px 30px rgba(0,0,0,0.5)",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

/** "#1 OŚMIORNICE 🐙" – slams in the centre, then docks at the top. */
const FactHeader: React.FC<{ seg: Segment; t: number }> = ({ seg, t }) => {
  const st = seg.from / FPS;
  const slam = pop(t, st, 8, 240);
  const dock = prog(t, st + 0.75, st + 1.1, Easing.inOut(Easing.cubic));
  const y = interpolate(dock, [0, 1], [860, 250]);
  const scale = interpolate(dock, [0, 1], [1.35, 0.72]) * (2.2 - 1.2 * slam);
  const bg = dock < 1 ? 0.55 * (1 - dock) : 0;
  return (
    <>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${bg})` }} />
      <div
        style={{
          position: "absolute",
          left: 540,
          top: y,
          transform: `translate(-50%,-50%) scale(${scale}) rotate(${(1 - slam) * 12 - 3 * (1 - dock)}deg)`,
          display: "flex",
          alignItems: "center",
          gap: 24,
          whiteSpace: "nowrap",
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          opacity: slam > 0.02 ? 1 : 0,
        }}
      >
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            background: ACCENT[seg.id],
            color: "#0b0b1a",
            fontSize: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "10px solid #fff",
            boxShadow: "0 12px 0 rgba(0,0,0,0.45)",
          }}
        >
          {seg.number}
        </div>
        <div
          style={{
            fontSize: 120,
            color: "#fff",
            WebkitTextStroke: "16px #0b0b1a",
            paintOrder: "stroke fill",
            textShadow: "0 12px 0 #0b0b1a",
          }}
        >
          {seg.label} <span style={{ fontFamily: "'Noto Color Emoji', sans-serif", WebkitTextStroke: 0 }}>{seg.emoji}</span>
        </div>
      </div>
    </>
  );
};

/** Six dots at the very top that fill as the facts go by. */
const Progress: React.FC<{ current: number; t: number; seg: Segment }> = ({ current, t, seg }) => (
  <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
    {[1, 2, 3, 4, 5, 6].map((n) => {
      const on = n <= current;
      const isNow = n === current;
      const s = isNow ? 1 + 0.4 * (1 - pop(t, seg.from / FPS, 8)) : 1;
      return (
        <div
          key={n}
          style={{
            width: isNow ? 90 : 46,
            height: 22,
            borderRadius: 11,
            background: on ? ACCENT[seg.id] : "rgba(255,255,255,0.35)",
            border: "3px solid rgba(0,0,0,0.5)",
            transform: `scale(${s})`,
          }}
        />
      );
    })}
  </div>
);

/** Flash + colour wipe on every cut. */
const Transition: React.FC<{ t: number }> = ({ t }) => {
  let best = Infinity;
  for (const s of timeline.segments) {
    const d = t - s.from / FPS;
    if (s.from > 0 && Math.abs(d) < Math.abs(best)) best = d;
  }
  const flash = best >= 0 ? Math.max(0, 1 - best / 0.18) : 0;
  const wipe = Math.abs(best) < 0.2 ? best : null;
  return (
    <>
      {wipe !== null && (
        <div
          style={{
            position: "absolute",
            top: -400,
            bottom: -400,
            width: 700,
            left: interpolate(wipe, [-0.2, 0.2], [-800, 1200]),
            background: "linear-gradient(90deg, transparent, rgba(255,225,77,0.85), rgba(255,45,138,0.85), transparent)",
            transform: "skewX(-18deg)",
          }}
        />
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: flash * 0.85 }} />
    </>
  );
};

export const FactsShort: React.FC = () => {
  ensureFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const segs = timeline.segments;
  const current = [...segs].reverse().find((s) => frame >= s.from) ?? segs[0];
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {segs.map((seg) => {
        const Scene = SCENES[seg.id];
        return (
          <Sequence key={seg.id} from={seg.from} durationInFrames={seg.duration} layout="none">
            <Camera seg={seg} t={t}>
              <Scene seg={seg} t={t} />
            </Camera>
          </Sequence>
        );
      })}
      {current.number ? <FactHeader seg={current} t={t} /> : null}
      {current.id !== "intro" && current.id !== "outro" ? <Progress current={current.number ?? 0} t={t} seg={current} /> : null}
      <Captions seg={current} t={t} />
      <Transition t={t} />
    </AbsoluteFill>
  );
};
