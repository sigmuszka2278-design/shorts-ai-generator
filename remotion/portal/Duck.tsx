import React from "react";
import { FONT_FAMILY } from "../fonts";

/**
 * Giant glossy rubber duck. Drawn in a 600×560 box, origin = centre of the box.
 * `quack` 0..1 opens the beak, `look` moves the pupils, `blink` closes the eyes.
 */
export const Duck: React.FC<{ quack: number; look: number; blink: number; flap: number }> = ({ quack, look, blink, flap }) => {
  const eyeRy = 44 * (1 - blink * 0.9);
  const px = Math.sin(look) * 12;
  const py = Math.cos(look * 1.3) * 8;
  return (
    <svg viewBox="0 0 600 560" width={600} height={560} style={{ position: "absolute", left: -300, top: -280, overflow: "visible" }}>
      <defs>
        <radialGradient id="duckBody" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fffbd0" />
          <stop offset="30%" stopColor="#ffe14a" />
          <stop offset="75%" stopColor="#ffbf00" />
          <stop offset="100%" stopColor="#e08a00" />
        </radialGradient>
        <radialGradient id="duckHead" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffbd0" />
          <stop offset="35%" stopColor="#ffe14a" />
          <stop offset="85%" stopColor="#ffbf00" />
          <stop offset="100%" stopColor="#e08a00" />
        </radialGradient>
        <linearGradient id="beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="60%" stopColor="#ff7a00" />
          <stop offset="100%" stopColor="#d94f00" />
        </linearGradient>
        <radialGradient id="eyeW" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dfe6ff" />
        </radialGradient>
      </defs>
      {/* shadow */}
      <ellipse cx={310} cy={545} rx={230} ry={26} fill="#000" opacity={0.25} />
      {/* body + tail */}
      <path
        d="M 70 360 C 70 250, 200 240, 300 268 C 400 292, 470 250, 545 170 C 572 250, 575 330, 540 405 C 500 505, 390 545, 290 545 C 150 545, 70 470, 70 360 Z"
        fill="url(#duckBody)"
        stroke="#d98200"
        strokeWidth={3}
      />
      {/* wing */}
      <g transform={`rotate(${-8 + flap * 18} 330 360)`}>
        <path d="M 270 350 C 300 290, 420 290, 470 340 C 440 350, 450 380, 420 395 C 400 420, 300 430, 270 350 Z" fill="#ffc800" stroke="#e09000" strokeWidth={3} />
        <path d="M 330 330 C 370 320, 410 325, 440 345" stroke="#fff3a0" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8} />
      </g>
      {/* body gloss */}
      <ellipse cx={180} cy={330} rx={60} ry={26} fill="#ffffff" opacity={0.65} transform="rotate(-25 180 330)" />
      <ellipse cx={480} cy={230} rx={20} ry={10} fill="#ffffff" opacity={0.6} transform="rotate(-60 480 230)" />
      {/* head */}
      <circle cx={215} cy={190} r={135} fill="url(#duckHead)" stroke="#d98200" strokeWidth={3} />
      {/* tuft */}
      <path d="M 215 58 C 200 20, 240 10, 238 40 C 260 15, 285 40, 250 66" fill="#ffd21f" stroke="#d98200" strokeWidth={3} />
      <ellipse cx={160} cy={110} rx={40} ry={18} fill="#ffffff" opacity={0.7} transform="rotate(-35 160 110)" />
      {/* cheeks */}
      <ellipse cx={128} cy={240} rx={28} ry={16} fill="#ff6b8a" opacity={0.55} />
      <ellipse cx={300} cy={236} rx={26} ry={15} fill="#ff6b8a" opacity={0.55} />
      {/* beak: lower jaw opens */}
      <g transform={`rotate(${quack * 22} 170 250)`}>
        <path d="M 170 245 C 120 250, 70 255, 50 265 C 70 300, 140 300, 185 270 Z" fill="#e85d00" stroke="#b84400" strokeWidth={3} />
        <path d="M 90 275 C 110 285, 140 285, 160 275" stroke="#ff4f7a" strokeWidth={10 * quack} strokeLinecap="round" fill="none" />
      </g>
      <path d="M 185 228 C 130 210, 70 220, 38 248 C 70 268, 140 268, 190 262 Z" fill="url(#beak)" stroke="#b84400" strokeWidth={3} />
      <ellipse cx={95} cy={234} rx={22} ry={7} fill="#ffffff" opacity={0.6} />
      {/* eyes */}
      {[
        [175, 160],
        [270, 155],
      ].map(([ex, ey], i) => (
        <g key={i}>
          <ellipse cx={ex} cy={ey} rx={40} ry={eyeRy} fill="url(#eyeW)" stroke="#2b2d42" strokeWidth={4} />
          {blink < 0.6 && (
            <>
              <circle cx={ex + px - 4} cy={ey + py + 4} r={22} fill="#1b1340" />
              <circle cx={ex + px - 12} cy={ey + py - 6} r={8} fill="#ffffff" />
              <circle cx={ex + px + 4} cy={ey + py + 12} r={4} fill="#ffffff" />
            </>
          )}
        </g>
      ))}
      {/* worried brows when quacking */}
      <path d={`M 140 ${100 - quack * 10} Q 175 ${88 - quack * 4} 205 ${104}`} stroke="#c97800" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d={`M 240 ${102} Q 272 ${86 - quack * 4} 305 ${98 - quack * 10}`} stroke="#c97800" strokeWidth={8} fill="none" strokeLinecap="round" />
    </svg>
  );
};

/** Comic speech burst "KWA!". */
export const Burst: React.FC<{ text: string; scale: number; rot: number; fill?: string }> = ({ text, scale, rot, fill = "#ffffff" }) => {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 150 : 112;
    return `${(Math.cos(a) * r * 1.25).toFixed(1)},${(Math.sin(a) * r * 0.8).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="-220 -150 440 300" width={440} height={300} style={{ position: "absolute", left: -220, top: -150, overflow: "visible", transform: `scale(${scale}) rotate(${rot}deg)` }}>
      <polygon points={pts} fill="#2b1066" transform="translate(8 10)" />
      <polygon points={pts} fill={fill} stroke="#2b1066" strokeWidth={8} strokeLinejoin="round" />
      <text y={30} textAnchor="middle" fontFamily={FONT_FAMILY} fontWeight={700} fontSize={92} fill="#ff3b6b" stroke="#2b1066" strokeWidth={10} paintOrder="stroke">
        {text}
      </text>
    </svg>
  );
};
