/**
 * "Piracki Token" – viral Fortnite guide short (9:16, 1080×1920, 60 fps, 40 s).
 * Sections, captions, SFX and music all follow lib/pirate/timeline.ts.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import {
  BEAT_FRAMES,
  CAPTIONS,
  chestOpenFrame,
  GAME,
  PIRATE_FPS,
  PIRATE_FRAMES,
  SECTIONS,
  SPOTS,
  VO_LINES,
  type Spot,
} from "../../lib/pirate/timeline";
import {
  Chest,
  Confetti,
  FlyingBus,
  Glider,
  GOLD,
  Hero,
  INK,
  IslandMap,
  ScrollIcon,
  Ship,
  SkullFlag,
  Sparks,
  TEAL,
  Token,
  Town,
  type TownTheme,
} from "./art";
import { CAPTION_FONT, PopCaption, SmallText } from "./Captions";
import { ensurePirateFonts } from "./fonts";

ensurePirateFonts();

export interface PirateTokenProps {
  /** Optional recorded / TTS voice-over in /public (e.g. "pirate/lektor.wav"). Music is ducked under it. */
  voiceover?: string | null;
}

const W = 1080;
const H = 1920;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

/** Kick-synced "punch" (slight zoom on every beat) – disabled while the music is silent. */
function beatPunch(frame: number) {
  if (frame >= GAME.slowmo && frame < SECTIONS.tip.from) return 1;
  const k = frame % BEAT_FRAMES;
  return 1 + 0.014 * Math.exp(-k / 4);
}

// ── shared hook state (also used to close the loop at the very end) ──

const HOOK_TOKEN_START = 2700;
const hookTokenSize = (f: number) => lerp(f, 0, 42, HOOK_TOKEN_START, 640, Easing.out(Easing.exp));
const hookTokenAngle = (f: number) => 0.35 + f * 0.085;

const HookBackground: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, #0E6E6A 0%, #062A2E 45%, #020607 100%)" }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + f * 0.01;
        return (
          <path
            key={i}
            d={`M540 1050 L${540 + Math.cos(a - 0.08) * 2000} ${1050 + Math.sin(a - 0.08) * 2000} L${540 + Math.cos(a + 0.08) * 2000} ${1050 + Math.sin(a + 0.08) * 2000}Z`}
            fill={i % 2 ? GOLD : TEAL}
            opacity={0.5}
          />
        );
      })}
    </svg>
  </AbsoluteFill>
);

const TokenAt: React.FC<{ size: number; angle: number; cx?: number; cy?: number; shine: number; shake?: number }> = ({
  size,
  angle,
  cx = 540,
  cy = 1050,
  shine,
  shake = 0,
}) => (
  <div style={{ position: "absolute", left: cx - size / 2 + shake, top: cy - size / 2 - shake * 0.5, width: size, height: size }}>
    <Token size={size} angle={angle} shine={shine} />
  </div>
);

// ── 0:00–0:03 HOOK ───────────────────────────────────────────────

const Hook: React.FC<{ f: number }> = ({ f }) => {
  const hit = 69; // bass hit on "token"
  const sinceHit = f - hit;
  const shake = sinceHit >= 0 && sinceHit < 14 ? Math.sin(sinceHit * 2.6) * (14 - sinceHit) * 1.6 : 0;
  const flash = Math.max(interpolate(f, [0, 4, 16], [0, 0.85, 0], clamp), sinceHit >= 0 ? lerp(sinceHit, 0, 10, 0.5, 0) : 0);
  const size = hookTokenSize(f) * (sinceHit >= 0 ? 1 + 0.12 * Math.exp(-sinceHit / 6) : 1);
  const hover = Math.sin(f / 14) * 16;
  return (
    <AbsoluteFill>
      <HookBackground f={f} />
      <Sparks t={f / 50} cx={540} cy={1050} count={46} spread={900} seed={3} />
      <TokenAt size={size} angle={hookTokenAngle(f)} cy={1050 + hover} shine={(f / 60) % 1.5} shake={shake} />
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};

// ── 0:03–0:08 MAP ────────────────────────────────────────────────

const MapScene: React.FC<{ f: number }> = ({ f }) => {
  const scale = lerp(f, 0, 70, 1.9, 0.98) + f * 0.0006;
  const rot = lerp(f, 0, 70, -8, 0);
  const lastDive = lerp(f, 262, 288, 1, 3.2, Easing.in(Easing.cubic));
  const s0 = SPOTS[0];
  const ox = (s0.mapX - 0.5) * 1080 * (lastDive - 1);
  const oy = (s0.mapY - 0.5) * 1600 * (lastDive - 1);
  return (
    <AbsoluteFill style={{ background: "#054349" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 280,
          width: 1080,
          height: 1600,
          transform: `translate(${-ox}px, ${-oy}px) scale(${scale * lastDive}) rotate(${rot}deg)`,
          transformOrigin: "50% 50%",
        }}
      >
        <IslandMap
          frame={f}
          markers={SPOTS.map((s) => ({ x: s.mapX, y: s.mapY, name: s.name }))}
          highlight={(i) => {
            const local = f - (SPOTS[i].highlightFrame - SECTIONS.map.from);
            return local < 0 ? 0 : spring({ frame: local, fps: PIRATE_FPS, config: { damping: 11, stiffness: 160 } });
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: "linear-gradient(#021E22 0%, rgba(2,30,34,0.75) 55%, rgba(2,30,34,0) 100%)" }} />
      <SmallText text="CROSSBONES ISLE • TREASURE HUNTERS" y={1420} size={40} box opacity={lerp(f, 30, 45, 0, 1)} />
    </AbsoluteFill>
  );
};

// ── 0:08–0:20 TOP 3 ──────────────────────────────────────────────

const THEME_FOR: TownTheme[] = ["resort", "lantern", "logue"];

const Interior: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: "linear-gradient(#5A3418, #2E1A0B)" }}>
    <svg width={W} height={H}>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 95} y={0} width={90} height={1300} fill={i % 2 ? "#6B3E1D" : "#76451F"} />
      ))}
      <rect x={0} y={1300} width={W} height={620} fill="#3B220F" />
      <rect x={640} y={420} width={260} height={260} fill="#9BE7FF" stroke={INK} strokeWidth={14} />
      <line x1={770} y1={420} x2={770} y2={680} stroke={INK} strokeWidth={10} />
      <circle cx={260} cy={520} r={70 + 8 * Math.sin(f / 5)} fill="#FFB347" opacity={0.35} />
      <rect x={232} y={470} width={56} height={90} rx={22} fill="#FF4D2E" stroke={INK} strokeWidth={6} />
    </svg>
    <div style={{ position: "absolute", left: 540 - 300, top: 960 }}>
      <Chest size={600} open={0} glow={0.5 + 0.3 * Math.sin(f / 6)} />
    </div>
  </AbsoluteFill>
);

const SpotScene: React.FC<{ f: number; spot: Spot; index: number }> = ({ f, spot, index }) => {
  const len = spot.to - spot.from;
  const theme = THEME_FOR[index];
  const camX = -lerp(f, 0, len, 0, 380, Easing.linear) + (index === 1 ? 100 : 0);
  const camY = -lerp(f, 0, len, 0, 520, Easing.linear);
  const zoom = lerp(f, 0, len, 1.05, 1.4, Easing.inOut(Easing.quad));
  const count = Math.round(spot.chests * lerp(f, 30, 120, 0, 1, Easing.out(Easing.cubic)));
  const countDone = f >= 120;
  const badge = spring({ frame: f - 4, fps: PIRATE_FPS, config: { damping: 9, stiffness: 200 } });
  const card = spring({ frame: f - 10, fps: PIRATE_FPS, config: { damping: 12, stiffness: 180 } });
  const bump = countDone ? 1 + 0.18 * Math.exp(-(f - 120) / 6) : 1;
  const showInterior = index === 1 && f >= 130 && f < 196;
  const closeUp = index === 2 ? lerp(f, 140, 220, 0, 1) : 0;
  const sky = ["#0FB5AE", "#0B5C66", "#13827D"][index];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(${sky}, #032226)` }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${540 + camX} ${300 + camY}) scale(${zoom})`}>
          <Town theme={theme} frame={f} glints={18} seed={index * 50 + 3} />
        </g>
      </svg>
      {showInterior && (
        <AbsoluteFill style={{ opacity: lerp(f, 130, 136, 0, 1) * lerp(f, 190, 196, 1, 0) }}>
          <Interior f={f} />
        </AbsoluteFill>
      )}
      {closeUp > 0 && (
        <AbsoluteFill style={{ background: `rgba(3,20,22,${0.75 * closeUp})` }}>
          <div style={{ position: "absolute", left: 540 - 330 * (0.4 + closeUp * 0.6), top: 1000 - 120 * closeUp, transform: `scale(${0.4 + closeUp * 0.6})`, transformOrigin: "0 0" }}>
            <Chest size={660} open={0} glow={closeUp * (0.6 + 0.3 * Math.sin(f / 5))} />
          </div>
        </AbsoluteFill>
      )}
      {/* rank badge */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 230,
          width: 190,
          height: 190,
          borderRadius: 95,
          background: `radial-gradient(circle at 35% 30%, #FFF2A8, ${GOLD} 55%, #B87A00)`,
          border: `10px solid ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${badge}) rotate(${(1 - badge) * -90}deg)`,
          boxShadow: "0 12px 0 rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ fontFamily: CAPTION_FONT, fontSize: 104, color: INK }}>#{index + 1}</span>
      </div>
      {/* name + animated chest counter */}
      <div
        style={{
          position: "absolute",
          left: 70,
          width: 820,
          top: 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${(1 - card) * -60}px) scale(${0.6 + 0.4 * card})`,
          opacity: card,
        }}
      >
        <div style={{ fontFamily: CAPTION_FONT, fontSize: spot.name.length > 12 ? 104 : 120, color: "white", lineHeight: 1.05, WebkitTextStroke: "14px black", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.85)" }}>
          {spot.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, transform: `scale(${bump})` }}>
          <span style={{ fontFamily: CAPTION_FONT, fontSize: 96, color: "white", WebkitTextStroke: "12px black", paintOrder: "stroke fill" }}>•</span>
          <span style={{ fontFamily: CAPTION_FONT, fontSize: 150, color: GOLD, WebkitTextStroke: "16px black", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(0,0,0,0.85)", minWidth: 150, textAlign: "right" }}>
            {count}
          </span>
          <span style={{ fontFamily: CAPTION_FONT, fontSize: 96, color: GOLD, WebkitTextStroke: "12px black", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.85)" }}>
            SKRZYNEK
          </span>
        </div>
      </div>
      <SmallText text="liczba spawnów wg fanowskich map, może się różnić" y={1460} size={34} opacity={0.92} />
    </AbsoluteFill>
  );
};

// ── 0:20–0:30 GAMEPLAY ───────────────────────────────────────────

const Sky: React.FC<{ f: number; speed: number }> = ({ f, speed }) => (
  <AbsoluteFill style={{ background: "linear-gradient(#59C9F5 0%, #9CE6F0 55%, #1BB3A8 100%)" }}>
    <svg width={W} height={H}>
      {Array.from({ length: 9 }, (_, i) => {
        const y = ((i * 260 - f * speed * (1 + (i % 3) * 0.4)) % 2300 + 2300) % 2300 - 200;
        const x = 80 + ((i * 397) % 900);
        return (
          <g key={i} opacity={0.85}>
            <ellipse cx={x} cy={y} rx={150} ry={50} fill="white" />
            <ellipse cx={x + 70} cy={y - 30} rx={90} ry={50} fill="white" />
          </g>
        );
      })}
    </svg>
  </AbsoluteFill>
);

const SpeedLines: React.FC<{ f: number; amount: number; vertical?: boolean }> = ({ f, amount, vertical = true }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: amount }}>
    {Array.from({ length: 22 }, (_, i) => {
      const p = ((i * 0.137 + f * 0.05) % 1) * (vertical ? 2400 : 1500);
      const x = (i * 211) % 1080;
      return vertical ? (
        <line key={i} x1={x} y1={2000 - p} x2={x} y2={2000 - p - 180} stroke="white" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      ) : (
        <line key={i} x1={1300 - p} y1={(i * 173) % 1920} x2={1300 - p + 220} y2={(i * 173) % 1920} stroke="white" strokeWidth={6} strokeLinecap="round" opacity={0.5} />
      );
    })}
  </svg>
);

const HERO_X = 330;
const RUN_START = GAME.run - SECTIONS.gameplay.from; // local frame

/** Camera position during the run (speed ramp: accelerating scroll). */
const camAt = (lf: number) => {
  const t = Math.max(0, lf - RUN_START);
  return 9 * t + 0.045 * t * t;
};

const RunScene: React.FC<{ lf: number; abs: number }> = ({ lf, abs }) => {
  const cam = camAt(lf);
  const opened = Array.from({ length: GAME.quickChests }, (_, i) => chestOpenFrame(i)).filter((x) => abs >= x).length;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#1C4F57, #0C2A2E)" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* far wall with windows/lanterns (parallax) */}
        {Array.from({ length: 30 }, (_, i) => {
          const x = ((i * 320 - cam * 0.4) % 9600 + 9600) % 9600 - 320;
          return (
            <g key={i}>
              <rect x={x} y={600} width={300} height={700} fill={i % 2 ? "#6B3E1D" : "#7A4720"} />
              <rect x={x + 90} y={760} width={120} height={140} fill="#9BE7FF" stroke={INK} strokeWidth={8} />
              <rect x={x + 136} y={980} width={28} height={44} rx={12} fill="#FF4D2E" />
            </g>
          );
        })}
        <rect x={0} y={1300} width={W} height={620} fill="#3B220F" />
        {Array.from({ length: 24 }, (_, i) => {
          const x = ((i * 140 - cam) % 3360 + 3360) % 3360 - 140;
          return <line key={i} x1={x} y1={1300} x2={x - 60} y2={1920} stroke="#2A1608" strokeWidth={8} />;
        })}
      </svg>
      {Array.from({ length: GAME.quickChests }, (_, i) => {
        const openAbs = chestOpenFrame(i);
        const openLocal = openAbs - SECTIONS.gameplay.from;
        const worldX = camAt(openLocal) + HERO_X + 150;
        const sx = worldX - cam;
        if (sx < -400 || sx > 1400) return null;
        const since = abs - openAbs;
        const open = since < 0 ? 0 : spring({ frame: since, fps: PIRATE_FPS, config: { damping: 10, stiffness: 220 } });
        const glow = since < 0 ? 0 : Math.max(0, 1 - since / 26);
        return (
          <div key={i} style={{ position: "absolute", left: sx - 140, top: 1100 }}>
            <Chest size={280} open={open} glow={glow} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: HERO_X - 150, top: 900 }}>
        <Hero size={300} pose="run" t={lf / PIRATE_FPS} />
      </div>
      {opened > 0 && abs - chestOpenFrame(opened - 1) < 20 && (
        <AbsoluteFill style={{ background: GOLD, opacity: 0.22 * (1 - (abs - chestOpenFrame(opened - 1)) / 20) }} />
      )}
      <SpeedLines f={lf} amount={lerp(lf, RUN_START, RUN_START + 200, 0.15, 0.7)} vertical={false} />
      <ChestCounter n={opened} pulseFrom={opened > 0 ? chestOpenFrame(opened - 1) : -99} abs={abs} />
    </AbsoluteFill>
  );
};

const ChestCounter: React.FC<{ n: number; pulseFrom: number; abs: number }> = ({ n, pulseFrom, abs }) => {
  const p = abs - pulseFrom;
  const s = p >= 0 && p < 14 ? 1 + 0.3 * Math.exp(-p / 4) : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 220,
        padding: "14px 30px",
        borderRadius: 26,
        background: "rgba(5,20,22,0.85)",
        border: `6px solid ${GOLD}`,
        fontFamily: CAPTION_FONT,
        fontSize: 64,
        color: "white",
        letterSpacing: 1,
      }}
    >
      SKRZYNKI:{" "}
      <span style={{ color: GOLD, display: "inline-block", transform: `scale(${s})`, minWidth: 44, textAlign: "center" }}>{n}</span>
    </div>
  );
};

const Gameplay: React.FC<{ f: number }> = ({ f }) => {
  const abs = f + SECTIONS.gameplay.from;
  const L = (x: number) => x - SECTIONS.gameplay.from;
  const t = f / PIRATE_FPS;

  // 1) bus + jump
  if (f < L(GAME.skydive)) {
    const jump = Math.max(0, f - 12);
    const hs = 120 + jump * 6;
    return (
      <AbsoluteFill>
        <Sky f={f} speed={2} />
        <div style={{ position: "absolute", left: 180 + f * 3, top: 260 - f * 0.6 }}>
          <FlyingBus size={560} t={t} />
        </div>
        {f >= 12 && (
          <div style={{ position: "absolute", left: 440 + f * 1.5 - hs / 2, top: 560 + jump * jump * 0.2 - hs * 0.3 }}>
            <Hero size={hs} pose="fall" t={t} />
          </div>
        )}
        <SpeedLines f={f} amount={0.3} />
      </AbsoluteFill>
    );
  }
  // 2) skydive (third person, island far below)
  if (f < L(GAME.glider)) {
    const lf = f - L(GAME.skydive);
    const ground = 0.25 + lf * 0.008;
    return (
      <AbsoluteFill style={{ background: "#7AD3F0" }}>
        <div style={{ position: "absolute", left: 0, top: 160, width: 1080, height: 1600, transform: `scale(${ground}) rotate(${lf * 0.15}deg)` }}>
          <IslandMap frame={abs} markers={[]} highlight={() => 0} />
        </div>
        <AbsoluteFill style={{ background: "radial-gradient(circle, rgba(255,255,255,0) 45%, rgba(255,255,255,0.55) 100%)" }} />
        <SpeedLines f={f} amount={0.9} />
        <div style={{ position: "absolute", left: 540 - 220, top: 640 + Math.sin(lf / 9) * 14 }}>
          <Hero size={440} pose="fall" t={t} />
        </div>
      </AbsoluteFill>
    );
  }
  // 3) glider → 4) landing on a roof
  if (f < L(GAME.run)) {
    const lf = f - L(GAME.glider);
    const landAt = L(GAME.landing) - L(GAME.glider);
    const open = spring({ frame: lf, fps: PIRATE_FPS, config: { damping: 8, stiffness: 180 } });
    const approach = lerp(lf, 0, landAt, 0.45, 1.25, Easing.in(Easing.quad));
    const landed = lf >= landAt;
    const sinceLand = lf - landAt;
    const heroY = landed ? 820 : lerp(lf, 0, landAt, 440, 820, Easing.in(Easing.quad));
    const squash = landed && sinceLand < 12 ? 1 - 0.25 * Math.sin((sinceLand / 12) * Math.PI) : 1;
    return (
      <AbsoluteFill style={{ background: "linear-gradient(#7AD3F0, #2CB7AE)" }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(540 ${1500 - approach * 500}) scale(${approach}) translate(-300 -700)`}>
            <Town theme="resort" frame={abs} glints={6} seed={3} />
          </g>
        </svg>
        {!landed && (
          <div style={{ position: "absolute", left: 540 - 260, top: heroY - 330 }}>
            <Glider width={520} open={open} />
          </div>
        )}
        <div style={{ position: "absolute", left: 540 - 170, top: heroY - 60, transform: `scaleY(${squash})`, transformOrigin: "50% 100%" }}>
          <Hero size={340} pose={landed ? "fall" : "glide"} t={t} />
        </div>
        {landed && sinceLand < 24 && (
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            {[-1, 1].map((d) => (
              <circle key={d} cx={540 + d * (80 + sinceLand * 9)} cy={1240} r={40 + sinceLand * 2} fill="white" opacity={0.7 * (1 - sinceLand / 24)} />
            ))}
          </svg>
        )}
        <SpeedLines f={f} amount={landed ? 0 : 0.5} />
      </AbsoluteFill>
    );
  }
  // 5) speed-ramp run, chests 1–6
  if (f < L(GAME.slowmo)) return <RunScene lf={f} abs={abs} />;

  // 6) slow motion on the last chest → 7) ordinary loot
  const lf = f - L(GAME.slowmo);
  const revealAt = L(GAME.reveal) - L(GAME.slowmo);
  const revealed = lf >= revealAt;
  const since = lf - revealAt;
  const zoom = lerp(lf, 0, revealAt, 1, 1.25, Easing.inOut(Easing.quad));
  const lidSlow = lerp(lf, 6, revealAt, 0, 0.22, Easing.linear) + Math.sin(lf * 1.3) * 0.01;
  const lid = revealed ? 0.22 + 0.78 * spring({ frame: since, fps: PIRATE_FPS, config: { damping: 10, stiffness: 200 } }) : lidSlow;
  const glow = revealed ? Math.max(0, 0.9 - since / 10) : lerp(lf, 0, revealAt, 0.2, 0.9);
  const loot = revealed ? spring({ frame: since - 3, fps: PIRATE_FPS, config: { damping: 9, stiffness: 160 } }) : 0;
  const desat = revealed ? lerp(since, 0, 12, 0, 0.55) : 0;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#173E44, #081A1C)", filter: `saturate(${1 - desat})` }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "50% 62%" }}>
        <div style={{ position: "absolute", left: 540 - 380, top: 900 }}>
          <Chest size={760} open={lid} glow={glow} plainLoot={loot} />
        </div>
        {revealed && (
          <div style={{ position: "absolute", left: 150, top: 1060, transform: "scale(0.9)" }}>
            <Hero size={260} pose="slump" t={t} />
          </div>
        )}
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 62%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)", opacity: revealed ? 0.6 : lerp(lf, 0, 30, 0, 1) }} />
      {!revealed && <SmallText text="SLOW MO…" y={660} size={44} opacity={0.6 + 0.4 * Math.sin(lf / 6)} />}
      <ChestCounter n={7} pulseFrom={GAME.reveal} abs={abs} />
    </AbsoluteFill>
  );
};

// ── 0:30–0:36 TIP ────────────────────────────────────────────────

const Tip: React.FC<{ f: number }> = ({ f }) => {
  const unroll = spring({ frame: f - 2, fps: PIRATE_FPS, config: { damping: 14, stiffness: 120 } });
  const card1 = spring({ frame: f - 96, fps: PIRATE_FPS, config: { damping: 11, stiffness: 180 } });
  const card2 = spring({ frame: f - 140, fps: PIRATE_FPS, config: { damping: 11, stiffness: 180 } });
  const chip = spring({ frame: f - 228, fps: PIRATE_FPS, config: { damping: 9, stiffness: 200 } });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #0E5B5E 0%, #04262A 70%, #010B0C 100%)" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.12 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <path key={i} d={`M-50 ${i * 110 + ((f * 0.8) % 110)} q135 -40 270 0 t270 0 t270 0 t270 0 t270 0`} fill="none" stroke={TEAL} strokeWidth={6} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 540 - 230, top: 690 + Math.sin(f / 15) * 8 }}>
        <ScrollIcon size={460} unroll={unroll} />
      </div>
      <SmallText text={<>⏰ Soboty: Treasure Hours – szanse <span style={{ fontFamily: "'Arial Black', 'DejaVu Sans', sans-serif", fontWeight: 900 }}>×</span>1,5</>} y={1110} size={44} box scale={card1} opacity={Math.min(1, card1)} />
      <SmallText text="⚠️ Nie AFK-uj i nie kupuj kont – grozi ban i scam" y={1235} size={40} box scale={card2} opacity={Math.min(1, card2)} />
      <SmallText text="RZADKI DROP, NIE PEWNIAK!" y={1370} size={58} color={GOLD} scale={chip} opacity={Math.min(1, chip)} />
    </AbsoluteFill>
  );
};

// ── 0:36–0:40 CTA + loop ─────────────────────────────────────────

const Cta: React.FC<{ f: number }> = ({ f }) => {
  const t = f / PIRATE_FPS;
  const len = SECTIONS.cta.to - SECTIONS.cta.from;
  const arrow = Math.sin(f / 7) * 22;
  // last 26 frames: the token flies into an extreme close-up = the first frame (seamless loop)
  const loopStart = len - 26;
  const lp = lerp(f, loopStart, len - 1, 0, 1, Easing.in(Easing.cubic));
  const loopBg = lerp(f, loopStart + 8, len - 1, 0, 1, Easing.linear);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#2A0F4A 0%, #B23A48 32%, #FF9A3C 52%, #FFD27A 60%, #0FB5AE 61%, #06454B 100%)" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={540} cy={1150} r={210} fill="#FFE29A" opacity={0.95} />
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d={`M${-60 + ((i * 230 + f * 2) % 1300)} ${1200 + i * 70} q40 -16 80 0 q40 16 80 0`}
            fill="none"
            stroke="#9FF7EE"
            strokeWidth={6}
            opacity={0.5}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: -260 + f * 1.4, top: 870 + Math.sin(t * 3) * 8 }}>
        <Ship width={520} t={t} />
      </div>
      <div style={{ position: "absolute", left: 60, top: 640 }}>
        <SkullFlag width={300} t={t} />
      </div>
      <div style={{ position: "absolute", left: 540 - 190, top: 960 }}>
        <Hero size={380} pose="dance" t={t} />
      </div>
      {f < 150 && <Confetti t={f / 70} count={160} />}
      {/* arrow towards the comments button (right side of the app UI) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${790 + arrow * 0.7} ${1080 + arrow}) rotate(55)`}>
          <path d="M-20 -110 L20 -110 L20 20 L60 20 L0 100 L-60 20 L-20 20Z" fill={GOLD} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        </g>
      </svg>
      {loopBg > 0 && (
        <AbsoluteFill style={{ opacity: loopBg }}>
          <HookBackground f={0} />
        </AbsoluteFill>
      )}
      {lp > 0 && (
        <TokenAt
          size={160 + (HOOK_TOKEN_START - 160) * lp}
          angle={hookTokenAngle(0) - (1 - lp) * 6}
          cx={540 + (1 - lp) * -330}
          cy={1050 + (1 - lp) * -260}
          shine={0}
        />
      )}
    </AbsoluteFill>
  );
};

// ── transitions ──────────────────────────────────────────────────

/** Swipe in from the right with motion blur. */
const SwipeIn: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const p = lerp(f, 0, 12, 1, 0, Easing.out(Easing.cubic));
  return <AbsoluteFill style={{ transform: `translateX(${p * W}px)`, filter: p > 0.02 ? `blur(${p * 14}px)` : undefined }}>{children}</AbsoluteFill>;
};

/** Zoom-through entry: starts slightly zoomed and blurred. */
const ZoomIn: React.FC<{ f: number; children: React.ReactNode; from?: number }> = ({ f, children, from = 1.5 }) => {
  const p = lerp(f, 0, 12, 1, 0, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + (from - 1) * p})`, filter: p > 0.02 ? `blur(${p * 16}px)` : undefined, opacity: 1 - p * 0.3 }}>
      {children}
    </AbsoluteFill>
  );
};

// ── composition ──────────────────────────────────────────────────

export const PirateTokenShort: React.FC<PirateTokenProps> = ({ voiceover }) => {
  const frame = useCurrentFrame();
  const S = SECTIONS;
  const local = (from: number) => frame - from;

  let scene: React.ReactNode = null;
  if (frame < S.hook.to) {
    const f = local(0);
    const exit = lerp(f, S.hook.to - 10, S.hook.to, 0, 1, Easing.in(Easing.cubic));
    scene = (
      <AbsoluteFill style={{ transform: `scale(${1 + exit * 2})`, opacity: 1 - exit * 0.6 }}>
        <Hook f={f} />
      </AbsoluteFill>
    );
  } else if (frame < S.map.to) {
    scene = (
      <ZoomIn f={local(S.map.from)} from={0.6}>
        <MapScene f={local(S.map.from)} />
      </ZoomIn>
    );
  } else if (frame < S.spots.to) {
    const i = SPOTS.findIndex((s) => frame >= s.from && frame < s.to);
    const spot = SPOTS[i];
    const f = local(spot.from);
    scene =
      i === 0 ? (
        <ZoomIn f={f} from={1.8}>
          <SpotScene f={f} spot={spot} index={i} />
        </ZoomIn>
      ) : (
        <SwipeIn f={f}>
          <SpotScene f={f} spot={spot} index={i} />
        </SwipeIn>
      );
  } else if (frame < S.gameplay.to) {
    scene = (
      <ZoomIn f={local(S.gameplay.from)}>
        <Gameplay f={local(S.gameplay.from)} />
      </ZoomIn>
    );
  } else if (frame < S.tip.to) {
    scene = (
      <SwipeIn f={local(S.tip.from)}>
        <Tip f={local(S.tip.from)} />
      </SwipeIn>
    );
  } else {
    scene = (
      <ZoomIn f={local(S.cta.from)}>
        <Cta f={local(S.cta.from)} />
      </ZoomIn>
    );
  }

  const punch = beatPunch(frame);
  const voLines = VO_LINES.map((l) => [l.start * PIRATE_FPS, l.end * PIRATE_FPS] as const);
  const musicVolume = (f: number) => {
    if (!voiceover) return 0.85;
    const speaking = voLines.some(([a, b]) => f >= a - 6 && f <= b + 6);
    return speaking ? 0.38 : 0.85;
  };

  return (
    <AbsoluteFill style={{ background: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>{scene}</AbsoluteFill>
      {CAPTIONS.map((c, i) => (
        <PopCaption key={i} caption={c} frame={frame} pulse={c.from >= S.cta.from} />
      ))}
      <Audio src={staticFile("pirate/music.wav")} volume={musicVolume} />
      <Audio src={staticFile("pirate/sfx.wav")} volume={0.9} />
      {voiceover && <Audio src={staticFile(voiceover)} volume={1} />}
    </AbsoluteFill>
  );
};

export const PIRATE_COMPOSITION_ID = "PirateTokenShort";
export const PIRATE_DURATION = PIRATE_FRAMES;
