import React from "react";
import { AbsoluteFill } from "remotion";
import { Bokeh, Camera, Dust, GOLD, H, Rays, W, clamp01, lerp, tween } from "../fx";

/**
 * Extreme close-up of a spoon lifting thick honey from a jar.
 * Used twice: as the intro (0–3 s) and as the outro (33–40 s). Every periodic
 * motion is driven by the global time with periods that divide 40 s, and the
 * outro ends on exactly the intro's first frame, so the Short loops seamlessly.
 */

const SURFACE_Y = 1268;
const START_Y = 1035; // spoon height on the first (and last) frame
// Camera framing on the very first frame – the outro returns to it.
const F0 = { scale: 1.75, x: 0, y: -(1075 - 960) * 1.75 };

function frameTransform(scale: number, x: number, y: number, rot = 0) {
  return `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`;
}

function camera(variant: "intro" | "outro", t: number): string {
  if (variant === "intro") {
    if (t < 1.45) {
      // slow push towards the bowl – no punch-in on the very first frame
      return frameTransform(F0.scale + 0.05 * t, F0.x, F0.y - 18 * t);
    }
    const dt = t - 1.45;
    const punch = 1 + 0.05 * Math.exp(-dt * 9);
    const s = (1.22 + 0.03 * dt) * punch;
    return frameTransform(s, -20, -(1120 - 960) * s + 10 * dt);
  }
  // outro
  if (t < 2.2) {
    const dt = t;
    const punch = 1 + 0.06 * Math.exp(-dt * 9);
    const s = (2.15 + 0.06 * dt) * punch;
    return frameTransform(s, 40, -(SURFACE_Y - 960) * s + 20, -2);
  }
  if (t < 4.3) {
    const dt = t - 2.2;
    const punch = 1 + 0.06 * Math.exp(-dt * 9);
    const s = (1.38 + 0.02 * dt) * punch;
    return frameTransform(s, 60 - 12 * dt, -(1000 - 960) * s, 4);
  }
  // continuous move back to the identical framing of the first frame
  const k = tween(t, [4.3, 7], [0, 1]);
  const s = lerp(1.42, F0.scale, k);
  const x = lerp(35, F0.x, k);
  const y = lerp(-(1000 - 960) * 1.42, F0.y, k);
  return frameTransform(s, x, y, lerp(4, 0, k));
}

function spoonY(variant: "intro" | "outro", t: number): number {
  if (variant === "intro") return tween(t, [0, 3.2], [START_Y, 865]);
  // keeps lifting slowly, then sinks back to the starting height for the loop
  if (t < 4.3) return lerp(860, 800, clamp01(t / 4.3));
  return tween(t, [4.3, 7], [800, START_Y]);
}

/** Honey stream from the spoon tip to the honey surface as a tapered, wobbling ribbon. */
function streamPath(y0: number, y1: number, T: number): string {
  const n = 28;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const y = lerp(y0, y1, s);
    const w = 46 * Math.pow(1 - s, 2.4) + 13 + 2.5 * Math.sin(s * 9 - T * Math.PI * 2) + 10 * Math.pow(s, 8);
    const x = 540 + 7 * Math.sin(s * 4.2 + (T * Math.PI * 2) / 2) * s * (1 - s) * 4;
    left.push(`${(x - w / 2).toFixed(1)},${y.toFixed(1)}`);
    right.unshift(`${(x + w / 2).toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${left.join(" L")} L${right.join(" L")} Z`;
}

export const SpoonScene: React.FC<{ variant: "intro" | "outro"; t: number; T: number }> = ({ variant, t, T }) => {
  const y = spoonY(variant, t);
  const tip = y + 74;
  const coilPhase = (T % 4) / 4;
  const dropCycle = (T % 2) / 2; // a drop slides off the spoon rim every 2 s
  const dropY = lerp(y + 40, SURFACE_Y, Math.pow(clamp01((dropCycle - 0.35) / 0.65), 2));
  const dropOn = dropCycle > 0.12;
  const dropSize = dropCycle < 0.35 ? lerp(4, 15, dropCycle / 0.35) : 13;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 45% 35%, #6e3a0c 0%, #2e1503 55%, #120700 100%)" }}>
      <Camera transform={camera(variant, t)}>
        <Bokeh
          count={22}
          seed="spoon"
          phase={T}
          colors={["#ffb43c", "#ffd77a", "#ff8a1c", "#fff0b8"]}
          opacity={0.55}
          minR={40}
          maxR={170}
          blur={22}
          area={{ x: -200, y: -100, w: W + 400, h: 1300 }}
        />
        <Rays t={T} origin={[-80, 120]} angle={38} spread={40} opacity={0.28} />

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="honeyBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={GOLD.dark} />
              <stop offset="0.28" stopColor={GOLD.amber} />
              <stop offset="0.45" stopColor={GOLD.light} />
              <stop offset="0.52" stopColor={GOLD.cream} />
              <stop offset="0.62" stopColor={GOLD.honey} />
              <stop offset="1" stopColor={GOLD.dark} />
            </linearGradient>
            <linearGradient id="jarHoney" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffbf3d" />
              <stop offset="0.25" stopColor="#d97a0e" />
              <stop offset="1" stopColor="#5a2402" />
            </linearGradient>
            <radialGradient id="jarGlow" cx="0.5" cy="0.15" r="0.7">
              <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffb43c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="surface" cx="0.45" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#ffe08a" />
              <stop offset="0.5" stopColor="#f0a024" />
              <stop offset="1" stopColor="#9a4a06" />
            </radialGradient>
            <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff4dc" />
              <stop offset="0.35" stopColor="#c9b28c" />
              <stop offset="0.6" stopColor="#6b5638" />
              <stop offset="0.8" stopColor="#d8c39c" />
              <stop offset="1" stopColor="#4a3a22" />
            </linearGradient>
            <linearGradient id="bowlMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e9d6b0" />
              <stop offset="0.5" stopColor="#8a7350" />
              <stop offset="1" stopColor="#3b2c18" />
            </linearGradient>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>

          {/* ── jar ── */}
          <rect x={150} y={SURFACE_Y} width={780} height={900} fill="url(#jarHoney)" />
          <rect x={150} y={SURFACE_Y} width={780} height={900} fill="url(#jarGlow)" opacity={0.8} />
          {/* light passing through the honey */}
          <ellipse cx={600} cy={SURFACE_Y + 260} rx={240} ry={160} fill="#ffd36b" opacity={0.35} filter="url(#softGlow)" />
          {/* surface */}
          <ellipse cx={540} cy={SURFACE_Y} rx={390} ry={64} fill="url(#surface)" />
          {[0, 1, 2].map((i) => {
            const k = ((T / 2 + i / 3) % 1 + 1) % 1;
            return (
              <ellipse
                key={i}
                cx={540}
                cy={SURFACE_Y + 4}
                rx={30 + k * 260}
                ry={6 + k * 40}
                fill="none"
                stroke="#fff1c4"
                strokeWidth={3 * (1 - k)}
                opacity={0.6 * (1 - k)}
              />
            );
          })}
          {/* glass */}
          <path d={`M150 ${SURFACE_Y - 40} L150 2200 M930 ${SURFACE_Y - 40} L930 2200`} stroke="#fff3d6" strokeWidth={10} opacity={0.35} />
          <rect x={190} y={SURFACE_Y + 40} width={26} height={700} rx={13} fill="#fff8e6" opacity={0.28} filter="url(#softGlow)" />
          <rect x={860} y={SURFACE_Y + 80} width={14} height={600} rx={7} fill="#fff8e6" opacity={0.35} />
          <ellipse cx={540} cy={SURFACE_Y - 46} rx={398} ry={70} fill="none" stroke="#fff3d6" strokeWidth={9} opacity={0.4} />
          <ellipse cx={540} cy={SURFACE_Y - 46} rx={398} ry={70} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.5} strokeDasharray="160 600" strokeDashoffset={-120} />

          {/* ── coil of honey piling on the surface ── */}
          {[0, 1, 2, 3].map((i) => {
            const a = (coilPhase + i * 0.25) * Math.PI * 2;
            return (
              <ellipse
                key={i}
                cx={540 + Math.cos(a) * 16}
                cy={SURFACE_Y - 6 - i * 9}
                rx={46 - i * 7}
                ry={14 - i * 2}
                fill={i % 2 ? GOLD.honey : GOLD.light}
                stroke={GOLD.amber}
                strokeWidth={2}
                opacity={0.95}
              />
            );
          })}

          {/* ── stream ── */}
          <path d={streamPath(tip - 6, SURFACE_Y - 30, T)} fill="#ffcf5a" opacity={0.55} filter="url(#softGlow)" />
          <path d={streamPath(tip - 6, SURFACE_Y - 30, T)} fill="url(#honeyBody)" />
          <path
            d={streamPath(tip - 6, SURFACE_Y - 30, T)}
            fill="none"
            stroke="#fffbe9"
            strokeWidth={2}
            opacity={0.25}
          />
          <rect x={534} y={tip + 30} width={5} height={Math.max(0, SURFACE_Y - tip - 80)} rx={2.5} fill="#fffdf0" opacity={0.6} />

          {/* ── drop sliding off the rim ── */}
          {dropOn ? (
            <g>
              <ellipse cx={612} cy={dropY} rx={dropSize * 0.75} ry={dropSize} fill={GOLD.light} stroke={GOLD.amber} strokeWidth={2} />
              <ellipse cx={609} cy={dropY - dropSize * 0.35} rx={dropSize * 0.22} ry={dropSize * 0.3} fill="#fffbe8" opacity={0.9} />
            </g>
          ) : null}

          {/* ── spoon ── */}
          <path
            d={`M650 ${y - 8} L1010 ${y - 760} L1050 ${y - 742} L690 ${y + 6} Z`}
            fill="url(#metal)"
          />
          <path d={`M664 ${y - 12} L1018 ${y - 752}`} stroke="#fffaf0" strokeWidth={5} opacity={0.6} />
          {/* bowl (side view) */}
          <path
            d={`M372 ${y - 6} C 400 ${y + 70}, 470 ${y + 92}, 540 ${y + 92} C 610 ${y + 92}, 690 ${y + 70}, 712 ${y - 6} Z`}
            fill="url(#bowlMetal)"
          />
          <path
            d={`M392 ${y + 8} C 430 ${y + 60}, 480 ${y + 76}, 540 ${y + 78}`}
            stroke="#fff3d6"
            strokeWidth={6}
            fill="none"
            opacity={0.55}
          />
          {/* heaped honey in the bowl, overflowing at the front */}
          <path
            d={`M362 ${y - 4} C 400 ${y - 70}, 680 ${y - 76}, 722 ${y - 4} C 700 ${y + 16}, 600 ${y + 30}, 572 ${y + 52} C 560 ${y + 66}, 552 ${y + 76}, 540 ${y + 80} C 528 ${y + 76}, 520 ${y + 60}, 506 ${y + 46} C 470 ${y + 26}, 390 ${y + 18}, 362 ${y - 4} Z`}
            fill="url(#honeyBody)"
          />
          <ellipse cx={480} cy={y - 38} rx={70} ry={12} fill="#fffbe8" opacity={0.75} />
          <ellipse cx={600} cy={y - 30} rx={30} ry={7} fill="#fffbe8" opacity={0.5} />
        </svg>
        <Dust count={26} seed="spoon-dust" t={T % 40} opacity={0.5} speed={10} />
      </Camera>
      {/* warm backlight bloom */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 52% 42%, rgba(255,214,120,0.32) 0%, rgba(255,170,60,0) 45%)",
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
