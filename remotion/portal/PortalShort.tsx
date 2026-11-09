import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ensureFonts } from "../fonts";
import { Balloons } from "./Balloons";
import { Dragon } from "./Dragon";
import { Burst, Duck } from "./Duck";
import { Dust, Floor, Sky } from "./Hall";
import { Banner, Captions, Countdown, DiamondCounter, StarBurst } from "./Overlays";
import { Portal, PORTAL_H, PORTAL_W, PORTALS, RIM } from "./Portal";
import { DURATION_SECONDS, T } from "./timeline";
import { Candy, TARGET_GEM, TreasureRoom } from "./Treasure";
import { clamp01, easeIn, easeOut, prog, springAt, track, wobble, type Key } from "./util";

const RED = PORTALS[0];
const BLUE = PORTALS[1];
const GOLD = PORTALS[2];
const LOOP_ZOOM = 8;

// ── hall camera ──────────────────────────────────────────────────
const CAM_X: Key[] = [
  [0, 540], [T.pushIn, 540], [T.panRed, 540], [T.panRed + 0.3, RED.x, easeOut], [7.7, RED.x], [8.5, 235], [T.panBlue, 235],
  [T.panBlue + 0.3, BLUE.x, easeOut], [T.panGold, BLUE.x], [T.panGold + 0.3, GOLD.x, easeOut], [T.reveal, GOLD.x],
];
const CAM_Y: Key[] = [
  [0, 1000], [T.pushIn, 1000], [T.panRed, 1010], [T.panRed + 0.3, 980, easeOut], [7.7, 980], [8.5, 930], [T.panBlue, 930],
  [T.panBlue + 0.3, 980, easeOut], [13.7, 880], [T.panGold, 880], [T.panGold + 0.3, GOLD.y, easeOut], [T.reveal, GOLD.y],
];
// zoom is interpolated in log space so fast zooms feel even
const CAM_S: Key[] = (
  [
    [0, 1], [T.pushIn, 1], [T.panRed, 1.16], [T.panRed + 0.3, 1.55, easeOut], [7.7, 1.55], [8.5, 1.3], [T.panBlue, 1.3],
    [T.panBlue + 0.3, 1.55, easeOut], [13.7, 1.2], [T.panGold, 1.2], [T.panGold + 0.3, 1.55, easeOut], [T.flyIn, 1.95], [T.reveal + 0.05, 18, easeIn],
  ] as Key[]
).map(([t, v, e]) => [t, Math.log(v), e]);

function hallCam(t: number) {
  if (t >= T.loopBack) {
    const p = prog(t, T.loopBack, DURATION_SECONDS, easeOut);
    return { x: GOLD.x + (540 - GOLD.x) * p, y: GOLD.y + (1000 - GOLD.y) * p, s: Math.exp(Math.log(LOOP_ZOOM) * (1 - p)) };
  }
  return { x: track(t, CAM_X), y: track(t, CAM_Y), s: Math.exp(track(t, CAM_S)) };
}

function shakeAmount(t: number) {
  const bump = (at: number, amp: number, decay = 6) => (t >= at ? amp * Math.exp(-(t - at) * decay) : 0);
  return (
    bump(T.count3, 9) + bump(T.count2, 11) + bump(T.count1, 14) + bump(T.duckOut, 16) + bump(T.duckBounce + 0.6, 14) + bump(T.balloonsOut, 10) +
    (t > T.goldCharge && t < T.reveal ? 22 * Math.pow(prog(t, T.goldCharge, T.flyIn), 2) : 0) + bump(T.reveal, 12) + bump(T.dragonOut, 14) + bump(T.candy, 8)
  );
}

const camTransform = (c: { x: number; y: number; s: number }, sx = 0, sy = 0) =>
  `translate(${540 - c.x * c.s + sx}px, ${960 - c.y * c.s + sy}px) scale(${c.s})`;

// ── duck ─────────────────────────────────────────────────────────
function bumpsAt(t: number, ranges: [number, number][]) {
  return Math.max(0, ...ranges.map(([a, b]) => (t >= a && t <= b ? Math.sin(((t - a) / (b - a)) * Math.PI) : 0)));
}

const DuckLayer: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.duckOut - 0.05 || t > 11.95) return null;
  const e = springAt(t, T.duckOut, 11, 4.5);
  const suck = prog(t, 11.5, 11.9, easeIn);
  const jumpP = prog(t, T.duckBounce, T.duckBounce + 0.6);
  const jump = jumpP > 0 && jumpP < 1 ? Math.sin(jumpP * Math.PI) : 0;
  const land = t > T.duckBounce + 0.6 ? Math.exp(-(t - T.duckBounce - 0.6) * 7) * Math.cos((t - T.duckBounce - 0.6) * 25) : 0;
  const base = 0.12 + 1.0 * e;
  const scale = base * (1 - suck);
  const sx = scale * (1 + land * 0.15);
  const sy = scale * (1 - land * 0.15 + jump * 0.08);
  const x = RED.x + (25 * e) * (1 - suck);
  const y = RED.y + (-40 * e + Math.sin(t * 4) * 10 - 190 * jump) * (1 - suck);
  const rot = Math.sin(t * 3) * 5 + suck * 540 + jump * -12;
  const quack = bumpsAt(t, [[8.55, 8.8], [9.05, 9.27], [9.37, 9.58], [11.0, 11.22], [11.32, 11.52]]);
  const blink = bumpsAt(t, [[8.15, 8.3], [10.45, 10.6]]);
  const flap = e < 0.98 || jump > 0 ? 0.5 + 0.5 * Math.sin(t * 30) : 0.5 + 0.5 * Math.sin(t * 3);
  const bursts: [number, string][] = [
    [9.05, "KWA!"],
    [11.0, "KWA!"],
  ];
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sx}, ${sy}) rotate(${rot}deg)` }}>
        <Duck quack={quack} look={t * 2} blink={blink} flap={flap} />
      </div>
      {bursts.map(([at, label], i) => {
        if (t < at || t > at + 0.75) return null;
        const s = springAt(t, at, 20, 7) * (1 - prog(t, at + 0.55, at + 0.75));
        return (
          <div key={i} style={{ position: "absolute", left: x - 230 + i * 470, top: y - 360 - 60 * i }}>
            <Burst text={label} scale={s * 0.75} rot={i ? 10 : -10} />
          </div>
        );
      })}
    </>
  );
};

// ── treasure room + dragon ───────────────────────────────────────
const CH_S: Key[] = [
  [T.reveal, 1.4], [T.reveal + 1.3, 1.0, easeOut], [T.dragonOut, 1.05], [T.dragonOut + 0.4, 1.12], [DURATION_SECONDS, 1.15],
];
const CH_Y: Key[] = [
  [T.reveal, 1050], [T.reveal + 1.3, 960, easeOut], [T.dragonOut, 960], [T.dragonOut + 0.4, 1010],
];

const DRAGON_Y = 800;

const Chamber: React.FC<{ t: number; shake: [number, number] }> = ({ t, shake }) => {
  const s = track(t, CH_S);
  const fy = track(t, CH_Y);
  const pop = springAt(t, T.dragonOut, 12, 5.5);
  const dragonOn = t >= T.dragonOut;
  const dx = 540;
  const dy = 1060 + (DRAGON_Y - 1060) * pop + Math.sin(t * 5) * 12 * clamp01(pop);
  const ds = 0.15 + 0.85 * pop;
  const funny = Math.max(track(t, [[T.funnyFace - 0.05, 0], [T.funnyFace + 0.08, 1], [T.zap - 0.1, 1], [T.zap, 0]]), track(t, [[23.95, 0], [24.05, 1]]));
  const mouthOpen = track(t, [[T.zap - 0.02, 0], [T.zap + 0.06, 1], [T.candy + 0.05, 1], [T.candy + 0.15, 0]]);
  const look = track(t, [[T.zap - 0.2, 0], [T.zap, 1], [23.9, 1], [24.1, 0]]);
  const beamP = prog(t, T.zap, T.candy + 0.02);
  const mouth = { x: dx, y: dy + 32 * ds };
  const candyS = springAt(t, T.candy + 0.03, 16, 6);
  const poofP = prog(t, T.candy, T.candy + 0.55);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${540 - 540 * s + shake[0]}px, ${960 - fy * s + shake[1]}px) scale(${s})`, transformOrigin: "0 0" }}>
      <TreasureRoom t={t} hideTarget={t >= T.candy + 0.03} chestGlow={dragonOn ? Math.exp(-(t - T.dragonOut) * 3) : 0.3 + 0.2 * Math.sin(t * 4)} />
      {/* pop-out poof at the chest */}
      <StarBurst x={540} y={1000} p={prog(t, T.dragonOut, T.dragonOut + 0.6)} count={16} radius={380} />
      {dragonOn && (
        <div style={{ position: "absolute", left: dx, top: dy, transform: `scale(${ds * 0.95}) rotate(${Math.sin(t * 3) * 4 + funny * -6}deg)` }}>
          <Dragon funny={funny} wings={t * 18} mouthOpen={mouthOpen} look={look} />
        </div>
      )}
      {/* magic beam: dragon → diamond */}
      {beamP > 0 && beamP < 1 && (
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible" }}>
          {Array.from({ length: 14 }, (_, i) => {
            const q = clamp01(beamP * 1.6 - i * 0.04);
            if (q <= 0) return null;
            const x = mouth.x + (TARGET_GEM.x - mouth.x) * q;
            const y = mouth.y + (TARGET_GEM.y - mouth.y) * q - Math.sin(q * Math.PI) * 140;
            const c = ["#ff3b6b", "#ffd23f", "#38f59a", "#3df2ff", "#9b5cff"][i % 5];
            return <circle key={i} cx={x} cy={y} r={26 - i} fill={c} stroke="#ffffff" strokeWidth={4} />;
          })}
        </svg>
      )}
      {/* poof cloud + candy */}
      {poofP > 0 && poofP < 1 && (
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: 1080, height: 1920, overflow: "visible" }}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2;
            const d = 40 + poofP * 120;
            return <circle key={i} cx={TARGET_GEM.x + Math.cos(a) * d} cy={TARGET_GEM.y + Math.sin(a) * d * 0.7} r={70 * (1 - poofP) + 20} fill="#ffffff" opacity={0.9 * (1 - poofP)} />;
          })}
        </svg>
      )}
      <StarBurst x={TARGET_GEM.x} y={TARGET_GEM.y} p={prog(t, T.candy, T.candy + 0.8)} count={14} radius={330} />
      {t >= T.candy + 0.03 && (
        <div style={{ position: "absolute", left: TARGET_GEM.x, top: TARGET_GEM.y - Math.abs(Math.sin((t - T.candy) * 7)) * 40 * Math.exp(-(t - T.candy) * 2), transform: `scale(${candyS * 1.15}) rotate(${Math.sin(t * 4) * 10}deg)` }}>
          <div style={{ position: "absolute", left: -160, top: -130, width: 320, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,122,217,0.6), transparent 65%)" }} />
          <Candy s={1} t={t} />
        </div>
      )}
      <Dust t={t} count={30} seed={9} color="#ffe9a0" />
    </div>
  );
};

// ── main composition ─────────────────────────────────────────────
export const PortalShort: React.FC = () => {
  ensureFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const cam = hallCam(t);
  const prev = hallCam(Math.max(0, t - 1 / fps));
  const speed = Math.abs(cam.x - prev.x) * cam.s + Math.abs(cam.y - prev.y) * cam.s + Math.abs(Math.log(cam.s / prev.s)) * 900;
  const blur = t < T.flyIn ? Math.min(14, Math.max(0, speed - 12) * 0.12) : 0;
  const sh = shakeAmount(t);
  const shake: [number, number] = [wobble(t * 2.2, 1) * sh, wobble(t * 2.2, 5) * sh];
  const bgCam = { x: 540 + (cam.x - 540) * 0.3, y: 1000 + (cam.y - 1000) * 0.3, s: 1 + (Math.min(cam.s, 6) - 1) * 0.3 };

  const hallVisible = t < T.reveal + 0.2 || t >= T.loopBack;
  const chamberVisible = t >= T.reveal - 0.05;

  const redOpen = track(t, [[T.redOpen - 0.05, 0], [T.redOpen + 0.15, 1], [8.0, 0.45], [11.5, 0.5], [12.0, 0]]);
  const blueOpen = track(t, [[T.blueOpen - 0.05, 0], [T.blueOpen + 0.15, 1], [13.2, 0.55], [16.4, 0.45], [17.0, 0]]);
  const goldCharge =
    t >= T.loopBack ? track(t, [[T.loopBack, 0.7], [DURATION_SECONDS, 0]]) : track(t, [[T.goldCharge, 0], [T.flyIn, 1, easeIn]]);
  const portalState = [
    { open: redOpen, charge: 0 },
    { open: blueOpen, charge: 0 },
    { open: 0, charge: goldCharge },
  ];

  // chamber placement during the loop-back (it shrinks into the gold portal)
  let chamberWrap: React.CSSProperties = {};
  let chamberOpacity = 1;
  if (t >= T.loopBack) {
    const k = cam.s / LOOP_ZOOM;
    const px = 540 + (GOLD.x - cam.x) * cam.s;
    const py = 960 + (GOLD.y - cam.y) * cam.s;
    const rx = (PORTAL_W / 2 - RIM + 4) * cam.s;
    const ry = (PORTAL_H / 2 - RIM + 4) * cam.s;
    chamberWrap = {
      transform: `translate(${px - 540 * k}px, ${py - 960 * k}px) scale(${k})`,
      transformOrigin: "0 0",
      clipPath: `ellipse(${rx / k}px ${ry / k}px at 540px 960px)`,
    };
    chamberOpacity = 1 - prog(t, 24.7, 24.98);
  }

  const flash = Math.max(
    prog(t, T.flyIn + 0.1, T.reveal) * (1 - prog(t, T.reveal, T.reveal + 0.45)),
    0.55 * Math.max(0, 1 - Math.abs(t - T.redOpen - 0.1) / 0.15),
    0.5 * Math.max(0, 1 - Math.abs(t - T.blueOpen - 0.1) / 0.15),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#12062e", overflow: "hidden" }}>
      {hallVisible && (
        <AbsoluteFill style={{ filter: blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: camTransform(bgCam, shake[0] * 0.4, shake[1] * 0.4) }}>
            <Sky t={t} />
          </div>
          <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: camTransform(cam, shake[0], shake[1]) }}>
            <Floor t={t} />
            {PORTALS.map((p, i) => (
              <Portal key={p.id} look={p} x={p.x} y={p.y} t={t} open={portalState[i].open} charge={portalState[i].charge} />
            ))}
            <DuckLayer t={t} />
            {t >= T.balloonsOut - 0.05 && t < T.reveal + 0.2 && <Balloons t={t} ox={BLUE.x} oy={BLUE.y} start={T.balloonsOut} />}
            <Dust t={t} />
          </div>
        </AbsoluteFill>
      )}

      {chamberVisible && (
        <AbsoluteFill style={{ ...chamberWrap, opacity: chamberOpacity }}>
          <Chamber t={t} shake={shake} />
        </AbsoluteFill>
      )}

      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(10,0,30,0.55) 100%)", pointerEvents: "none" }} />

      <Banner t={t} />
      <Countdown t={t} />
      <DiamondCounter t={t} />
      <Captions t={t} />

      <AbsoluteFill style={{ background: "radial-gradient(circle, #ffffff 0%, #fff3b0 60%, #ffd23f 100%)", opacity: flash, pointerEvents: "none" }} />

      <Audio src={staticFile("portal-short/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
