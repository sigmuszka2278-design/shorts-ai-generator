import React from "react";
import { AbsoluteFill, Freeze, interpolate, OffthreadVideo, random, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import {
  BEAT_FRAMES,
  CUT_FRAMES,
  DROP_FRAME,
  EDIT_DURATION_FRAMES,
  IMPACT_FRAMES,
  rampSpeed,
  remapFrame,
  shotAt,
  sourceLength,
  type Shot,
} from "../lib/edit/timeline";
import { ensureEditFonts, EDIT_FONT } from "./fonts";
import { Ball, Figure } from "./edit/rig";
import { sceneFor, type Camera } from "./edit/scenes";
import { LOOKS } from "./edit/palette";

ensureEditFonts();

export interface ClipSource {
  /** URL or path inside /public (e.g. "edit/clips/bicycle.mp4") */
  src: string;
  /** where to start inside the source clip */
  startSeconds?: number;
}

export interface GoatEditProps {
  /** Optional own footage per shot id (intro, bicycle, stepovers, freekick, ucl, header, net, …, siuuu, goat). */
  clips?: Record<string, ClipSource>;
  musicVolume?: number;
}

const since = (frame: number, marks: number[]) => {
  let best = Infinity;
  for (const m of marks) if (frame >= m && frame - m < best) best = frame - m;
  return best;
};
const decay = (d: number, rate: number) => (Number.isFinite(d) ? Math.exp(-d / rate) : 0);
const resolveSrc = (src: string) => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\/+/, "")));

const camTransform = (c: Camera, k = 1) => {
  const zoom = 1 + (c.zoom - 1) * k;
  const x = 540 + (c.x - 540) * k;
  const y = 960 + (c.y - 960) * k;
  return `translate(540 960) rotate(${c.rot * k}) scale(${zoom}) translate(${-x} ${-y})`;
};

/** One shot rendered as vector graphics (or the user's clip), with speed ramp + velocity ghosts. */
const ShotView: React.FC<{ shot: Shot; frame: number; clip?: ClipSource }> = ({ shot, frame, clip }) => {
  const local = frame - shot.startFrame;
  const len = sourceLength(shot);
  const src = remapFrame(shot, local);
  const u = Math.min(1, src / len);
  const speed = rampSpeed(shot.ramp, (local + 0.5) / shot.durationInFrames);
  const scene = sceneFor(shot);
  const state = scene.at(u);
  const look = scene.look;

  if (clip) {
    // Speed ramp applied to real footage: freeze on the remapped source frame.
    const startFrames = Math.round((clip.startSeconds ?? 0) * 60);
    return (
      <AbsoluteFill style={{ transform: `scale(${1 + (state.camera.zoom - 1) * 0.35}) rotate(${state.camera.rot * 0.5}deg)` }}>
        <Freeze frame={startFrames + Math.floor(src)}>
          <OffthreadVideo src={resolveSrc(clip.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Freeze>
      </AbsoluteFill>
    );
  }

  // velocity ghosts: earlier positions while the ramp is fast
  const ghosts = speed > 1.3 && state.pose ? [1, 2, 3].map((k) => ({ k, s: scene.at(Math.max(0, (src - k * speed * 1.6) / len)) })) : [];

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="ballShade" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.7" stopColor="#000000" stopOpacity="0.15" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <g transform={camTransform(state.camera, 0.55)}>{scene.backdrop({ frame, u, local })}</g>
        <g transform={camTransform(state.camera)}>
          {ghosts.map(({ k, s }) => (
            <g key={k} opacity={0.32 / k}>
              {s.pose && <Figure p={s.pose} rim={look.glow} glow={look.glow} number={false} />}
              {s.ball && <Ball {...s.ball} glow={look.glow} />}
            </g>
          ))}
          {state.pose && <Figure p={state.pose} rim={look.rim} glow={look.glow} eyes={state.eyes} />}
          {state.ball && (
            <>
              {speed > 1 && state.ball && (
                <circle cx={state.ball.x} cy={state.ball.y} r={state.ball.r * 1.25} fill={look.glow} opacity={0.25} />
              )}
              <Ball {...state.ball} glow={look.accent} />
            </>
          )}
          {scene.front?.({ frame, u, local, state })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Kinetic caption: slams in with glitch copies, glows in the team color. */
const Caption: React.FC<{ text: string; local: number; duration: number; glow: string; big?: boolean }> = ({ text, local, duration, glow, big }) => {
  if (local < 0 || local > duration) return null;
  const inT = Math.min(1, local / 7);
  const scale = interpolate(inT, [0, 1], [2.4, 1]) * (1 + 0.04 * Math.sin(local / 3));
  const out = interpolate(local, [duration - 6, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glitch = local < 8 || random(`g-${text}-${local}`) > 0.86;
  const gx = glitch ? (random(`gx-${text}-${local}`) - 0.5) * 40 : 0;
  const size = big ? 230 : text.length > 12 ? 104 : 140;
  const base: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: big ? 1250 : 1430,
    textAlign: "center",
    fontFamily: EDIT_FONT,
    fontSize: size,
    letterSpacing: big ? 10 : 6,
    lineHeight: 1,
    transform: `scale(${scale}) skewX(-8deg)`,
    filter: `blur(${(1 - inT) * 10}px)`,
    opacity: out,
  };
  return (
    <>
      {glitch && (
        <>
          <div style={{ ...base, color: "#ff0040", mixBlendMode: "screen", marginLeft: gx - 10 }}>{text}</div>
          <div style={{ ...base, color: "#00e5ff", mixBlendMode: "screen", marginLeft: -gx + 10 }}>{text}</div>
        </>
      )}
      <div style={{ ...base, color: "#ffffff", textShadow: `0 0 18px ${glow}, 0 0 50px ${glow}, 0 0 110px ${glow}, 0 6px 0 rgba(0,0,0,0.6)` }}>{text}</div>
    </>
  );
};

/** Final title "CR7 🐐 THE GOAT" with glow pulses on every beat. */
const GoatTitle: React.FC<{ local: number }> = ({ local }) => {
  if (local < 0) return null;
  const gold = "#ffc21a";
  const pulse = 1 + 0.6 * Math.exp(-((local % (BEAT_FRAMES * 2)) / 10));
  const slam = (start: number) => {
    const t = Math.min(1, Math.max(0, (local - start) / 8));
    return { t, scale: interpolate(t, [0, 1], [2.6, 1]), blur: (1 - t) * 14, opacity: t };
  };
  const cr7 = slam(0);
  const goatEmoji = slam(BEAT_FRAMES * 2);
  const words = slam(BEAT_FRAMES * 3);
  const spacing = interpolate(local, [BEAT_FRAMES * 3, BEAT_FRAMES * 5], [70, 16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = (k: number) => `0 0 ${20 * k}px ${gold}, 0 0 ${60 * k}px ${gold}, 0 0 ${140 * k}px #ff8a00`;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 300, fontFamily: EDIT_FONT }}>
      <div style={{ fontSize: 400, lineHeight: 1, color: "#fff7df", textShadow: glow(pulse), transform: `scale(${cr7.scale})`, filter: `blur(${cr7.blur}px)`, opacity: cr7.opacity, letterSpacing: 12 }}>
        CR7
      </div>
      <div
        style={{
          fontSize: 300,
          lineHeight: 1.1,
          marginTop: 10,
          fontFamily: "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif",
          transform: `scale(${goatEmoji.scale}) rotate(${(1 - goatEmoji.t) * -25}deg)`,
          opacity: goatEmoji.opacity,
          filter: `drop-shadow(0 0 ${30 * pulse}px ${gold}) blur(${goatEmoji.blur}px)`,
        }}
      >
        🐐
      </div>
      <div style={{ fontSize: 150, lineHeight: 1, marginTop: 20, color: "#ffffff", letterSpacing: spacing, textShadow: glow(pulse * 0.8), transform: `scale(${words.scale})`, filter: `blur(${words.blur}px)`, opacity: words.opacity }}>
        THE GOAT
      </div>
    </AbsoluteFill>
  );
};

export const GoatEdit: React.FC<GoatEditProps> = ({ clips = {}, musicVolume = 1 }) => {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const local = frame - shot.startFrame;
  const look = shot.kind === "goat" ? LOOKS.goat : sceneFor(shot).look;
  const afterDrop = frame >= DROP_FRAME;

  // ── beat-synced energy envelopes ──
  const sinceCut = since(frame, CUT_FRAMES);
  const sinceBeat = afterDrop ? (frame - DROP_FRAME) % BEAT_FRAMES : Infinity;
  const sinceImpact = since(frame, IMPACT_FRAMES);
  const isDrop = frame - DROP_FRAME;
  const cutE = decay(sinceCut, 5);
  const beatE = shot.kind === "goat" ? decay(sinceBeat, 8) * 0.5 : decay(sinceBeat, 4);
  const impactE = decay(sinceImpact, 6);
  const dropE = isDrop >= 0 ? decay(isDrop, 14) : 0;

  // intro build-up: tension rises during the riser (last 2 beats)
  const build = interpolate(frame, [DROP_FRAME - BEAT_FRAMES * 2, DROP_FRAME - 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gap = frame >= DROP_FRAME - 7 && frame < DROP_FRAME; // silence before the drop → black

  // ── shake ──
  const shakeAmp = 36 * cutE + 14 * beatE + 30 * impactE + 50 * dropE + 10 * build * build;
  const sx = (random(`sx-${frame}`) - 0.5) * 2 * shakeAmp;
  const sy = (random(`sy-${frame}`) - 0.5) * 2 * shakeAmp;
  const sr = (random(`sr-${frame}`) - 0.5) * shakeAmp * 0.08;

  // ── zoom punch + cut zoom-transition ──
  const punch = 1 + 0.07 * beatE + 0.22 * cutE + 0.1 * impactE + 0.25 * dropE;

  // ── RGB split + directional motion blur ──
  const speed = rampSpeed(shot.ramp, (local + 0.5) / shot.durationInFrames);
  const split = (22 * cutE + 10 * beatE + 16 * impactE + 34 * dropE + 12 * build) * (shot.kind === "goat" ? 0.4 : 1);
  const blurX = Math.min(14, 18 * cutE + Math.max(0, speed - 1.4) * 3.5 + 10 * dropE);
  const useFx = split > 0.6 || blurX > 0.4;

  // ── flashes ──
  const flash = Math.max(dropE * 1.0, cutE * 0.4, impactE * 0.42, shot.kind === "goat" ? decay(local, 10) : 0);

  const grade = shot.kind === "intro" ? "contrast(1.25) saturate(0.6) brightness(0.85)" : "contrast(1.18) saturate(1.22) brightness(0.98)";
  const clip = clips[shot.id] ?? clips[shot.kind];
  const letterbox = interpolate(frame, [DROP_FRAME - 1, DROP_FRAME + 6], [210, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroFade = interpolate(frame, [EDIT_DURATION_FRAMES - 22, EDIT_DURATION_FRAMES - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="fxchain" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={`${blurX.toFixed(2)} ${(blurX * 0.25).toFixed(2)}`} result="b" />
            <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={split.toFixed(2)} dy={(split * 0.2).toFixed(2)} result="ro" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bl" />
            <feOffset in="bl" dx={(-split).toFixed(2)} dy={(-split * 0.2).toFixed(2)} result="blo" />
            <feBlend in="ro" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="blo" mode="screen" />
          </filter>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={frame % 97} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* ── picture ── */}
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px) rotate(${sr}deg) scale(${punch})`,
          filter: `${grade}${useFx ? " url(#fxchain)" : ""}`,
        }}
      >
        {gap ? null : <ShotView shot={shot} frame={frame} clip={clip} />}
        {shot.caption && shot.kind !== "goat" && (
          <Caption text={shot.caption} local={local} duration={Math.max(BEAT_FRAMES, Math.round(shot.durationInFrames * 0.8))} glow={look.glow} big={shot.kind === "siuuu"} />
        )}
        {shot.kind === "goat" && <GoatTitle local={local} />}
      </AbsoluteFill>

      {/* ── cinematic color grading: teal/orange split tone, glow light leak, vignette, grain ── */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #00e1ff 0%, #002a3a 45%, #ff7a18 100%)", mixBlendMode: "soft-light", opacity: shot.kind === "intro" ? 0.5 : 0.32 }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, ${look.glow} 0%, transparent 55%)`, mixBlendMode: "screen", opacity: 0.12 + 0.25 * beatE + 0.4 * dropE }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.95) 100%)" }} />
      <AbsoluteFill style={{ filter: "url(#grain)", opacity: 0.09, mixBlendMode: "overlay", background: "#808080" }} />

      {/* intro letterbox */}
      {letterbox > 0 && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: letterbox, background: "#000" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: letterbox, background: "#000" }} />
        </>
      )}

      {/* flashes */}
      <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: Math.min(1, flash), mixBlendMode: "screen" }} />
      {gap && <AbsoluteFill style={{ backgroundColor: "#000" }} />}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: outroFade }} />

      <Audio src={staticFile("edit/phonk-goat.wav")} volume={musicVolume} />
    </AbsoluteFill>
  );
};

