import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { Camera, H, Label, W, clamp01, focus, lerp, shotTransform, tween, type Shot } from "../fx";

/** A drop of honey falls onto a pH test strip, the pad turns orange-red (pH ≈ 3.9). Clean lab background. */

const SHOTS: Shot[] = [
  { at: 0, ...focus(1.05, 540, 860), drift: { scale: 0.02, y: 6 } },
  { at: 1.9, ...focus(1.9, 540, 900), drift: { scale: 0.04 } },
  { at: 4.2, ...focus(1.3, 600, 980), drift: { scale: 0.02, x: -10 } },
];

const PH_COLORS = [
  "#e2262b", "#ee4b2b", "#f47b20", "#f9a51b", "#fcd116", "#d8df20", "#9fcd3a",
  "#4bb749", "#22a46c", "#159a9c", "#2a77bb", "#3a50a2", "#4b3a92", "#5b2a86",
];

const PAD_Y = 820;
const DROP_START = 0.55;
const DROP_HIT = 1.35;

export const PhScene: React.FC<{ t: number }> = ({ t }) => {
  const cam = shotTransform(t, SHOTS);
  const fall = clamp01((t - DROP_START) / (DROP_HIT - DROP_START));
  const dropY = lerp(470, PAD_Y + 40, fall * fall);
  const hit = t >= DROP_HIT;
  const spread = tween(t, [DROP_HIT, DROP_HIT + 0.6], [0, 1]);
  const change = tween(t, [DROP_HIT + 0.15, DROP_HIT + 1.1], [0, 1]);
  const pad = interpolateColors(change, [0, 0.5, 1], ["#f2e9a8", "#f9a51b", "#ee5a24"]);
  const marker = tween(t, [2.2, 3.4], [7, 3.9]);
  const chart = tween(t, [2.0, 2.4], [0, 1]);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #f7ead2 0%, #ead2a6 55%, #c99a5c 100%)" }}>
      <Camera transform={cam.transform}>
        {/* blurred lab glassware in the background */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "blur(16px)", overflow: "visible" }}>
          <path d="M80 1500 L80 1050 L40 1050 L40 1010 L220 1010 L220 1050 L180 1050 L180 1500 Z" fill="#ffffff" opacity={0.45} />
          <path d="M820 1550 L880 1150 L880 950 L940 950 L940 1150 L1040 1550 Z" fill="#ffffff" opacity={0.4} />
          <rect x={860} y={1250} width={160} height={290} fill="#ffb84a" opacity={0.35} />
          <circle cx={900} cy={420} r={220} fill="#fff6dc" opacity={0.9} />
          <rect x={-100} y={1500} width={W + 200} height={600} fill="#a8743a" opacity={0.5} />
        </svg>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e9e2d4" />
              <stop offset="0.4" stopColor="#ffffff" />
              <stop offset="1" stopColor="#d9cfbd" />
            </linearGradient>
            <radialGradient id="drop" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fff3c0" />
              <stop offset="0.45" stopColor="#f2a52a" />
              <stop offset="1" stopColor="#8a4206" />
            </radialGradient>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* shadow of the strip */}
          <rect x={500} y={640} width={150} height={1100} rx={10} fill="#5a3410" opacity={0.18} transform="translate(26 18)" />
          {/* strip */}
          <rect x={470} y={620} width={140} height={1100} rx={10} fill="url(#strip)" />
          <rect x={486} y={PAD_Y - 70} width={108} height={140} rx={6} fill={pad} />
          {/* honey spreading on the pad */}
          {hit ? (
            <ellipse cx={540} cy={PAD_Y} rx={lerp(10, 50, spread)} ry={lerp(8, 44, spread)} fill="url(#drop)" opacity={0.85 - change * 0.35} />
          ) : null}
          {hit ? (
            <circle cx={540} cy={PAD_Y} r={lerp(20, 140, spread)} fill="none" stroke="#fff" strokeWidth={4} opacity={0.6 * (1 - spread)} />
          ) : null}
          {[0, 1, 2].map((i) => (
            <rect key={i} x={486} y={PAD_Y + 120 + i * 150} width={108} height={110} rx={6} fill={["#f6e27a", "#e7d29a", "#d9e2a8"][i]} opacity={0.9} />
          ))}
          {/* glass dropper with honey */}
          <g transform={`translate(0 ${tween(t, [0, 0.5], [-40, 0])})`}>
            <path d="M510 -40 L510 360 C 510 400, 530 430, 540 450 C 550 430, 570 400, 570 360 L570 -40 Z" fill="url(#glass)" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={3} />
            <path d="M518 200 L518 360 C 518 392, 532 418, 540 432 C 548 418, 562 392, 562 360 L562 200 Z" fill="#e8951c" opacity={0.85} />
            <rect x={496} y={-80} width={88} height={90} rx={22} fill="#7a2e12" />
          </g>
          {/* falling drop */}
          {t >= DROP_START - 0.25 && !hit ? (
            <g transform={`translate(540 ${t < DROP_START ? 462 : dropY})`}>
              <path
                d={`M0 ${-34 - fall * 14} C 12 -12, 22 2, 22 14 C 22 28, 12 36, 0 36 C -12 36, -22 28, -22 14 C -22 2, -12 -12, 0 ${-34 - fall * 14} Z`}
                fill="url(#drop)"
                transform={`scale(${t < DROP_START ? tween(t, [DROP_START - 0.25, DROP_START], [0.4, 1]) : 1})`}
              />
              <ellipse cx={-7} cy={6} rx={5} ry={8} fill="#fff" opacity={0.9} />
            </g>
          ) : null}
        </svg>
      </Camera>

      {/* warm window light */}
      <AbsoluteFill
        style={{ background: "radial-gradient(circle at 85% 18%, rgba(255,214,140,0.55) 0%, rgba(255,214,140,0) 45%)", mixBlendMode: "soft-light" }}
      />

      {/* pH scale */}
      {chart > 0 ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 250, opacity: chart, transform: `translateY(${(1 - chart) * -20}px)` }}>
          <div style={{ display: "flex", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(60,30,0,0.35)", border: "4px solid #fff" }}>
            {PH_COLORS.map((c, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 92,
                  background: c,
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              top: 104,
              left: `${((marker - 0.5) / 14) * 100}%`,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "26px solid transparent",
              borderRight: "26px solid transparent",
              borderBottom: "38px solid #3a1a04",
            }}
          />
        </div>
      ) : null}
      <Label x={90} y={410} text={`pH ≈ ${marker.toFixed(1).replace(".", ",")}`} appear={tween(t, [2.3, 2.7], [0, 1])} color="#3a1a04" size={64} />
      <Label x={90} y={500} text="KWAŚNY" sub="MIÓD: pH 3,2–4,5" appear={tween(t, [2.9, 3.3], [0, 1])} color="#c0391b" size={52} />
    </AbsoluteFill>
  );
};
