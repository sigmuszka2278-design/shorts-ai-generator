import React from "react";

/**
 * Tiny cute dragon with a golden crown, drawn in a 500×520 box centred on 0,0.
 * `funny` 0..1 – wink + tongue out, `wings` – flap phase, `mouthOpen` – puffing magic.
 */
export const Dragon: React.FC<{ funny: number; wings: number; mouthOpen: number; look: number }> = ({ funny, wings, mouthOpen, look }) => {
  const flap = Math.sin(wings) * 18;
  const wink = funny > 0.5;
  const px = look * 10;
  return (
    <svg viewBox="0 0 500 520" width={500} height={520} style={{ position: "absolute", left: -250, top: -260, overflow: "visible" }}>
      <defs>
        <radialGradient id="drBody" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#d6ffb8" />
          <stop offset="35%" stopColor="#5fe08a" />
          <stop offset="85%" stopColor="#1fa35a" />
          <stop offset="100%" stopColor="#0f6e3c" />
        </radialGradient>
        <radialGradient id="drBelly" cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="100%" stopColor="#ffd98a" />
        </radialGradient>
        <linearGradient id="drWing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c69bff" />
          <stop offset="100%" stopColor="#7b3fe4" />
        </linearGradient>
        <linearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6b0" />
          <stop offset="45%" stopColor="#ffcc1a" />
          <stop offset="100%" stopColor="#b87400" />
        </linearGradient>
        <radialGradient id="drEye" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dfe6ff" />
        </radialGradient>
      </defs>
      {/* tail */}
      <path d="M 330 430 C 420 450, 470 400, 450 340 C 445 320, 470 300, 485 320 C 500 360, 470 470, 340 470 Z" fill="url(#drBody)" stroke="#0f6e3c" strokeWidth={4} />
      <path d="M 470 315 L 498 300 L 488 330 Z" fill="#ff7ab8" />
      {/* wings */}
      <g transform={`rotate(${-flap} 170 300)`}>
        <path d="M 170 300 C 90 230, 30 240, 20 200 C 60 210, 70 180, 60 150 C 110 180, 150 220, 190 280 Z" fill="url(#drWing)" stroke="#5a24b0" strokeWidth={4} strokeLinejoin="round" />
      </g>
      <g transform={`rotate(${flap} 330 300)`}>
        <path d="M 330 300 C 410 230, 470 240, 480 200 C 440 210, 430 180, 440 150 C 390 180, 350 220, 310 280 Z" fill="url(#drWing)" stroke="#5a24b0" strokeWidth={4} strokeLinejoin="round" />
      </g>
      {/* body */}
      <ellipse cx={250} cy={385} rx={125} ry={115} fill="url(#drBody)" stroke="#0f6e3c" strokeWidth={4} />
      <ellipse cx={250} cy={405} rx={78} ry={82} fill="url(#drBelly)" />
      {[375, 405, 435].map((y) => (
        <path key={y} d={`M ${200} ${y} Q 250 ${y + 12} 300 ${y}`} stroke="#e8b45c" strokeWidth={4} fill="none" />
      ))}
      {/* arms & feet */}
      <ellipse cx={150} cy={390} rx={30} ry={22} fill="#3fc471" stroke="#0f6e3c" strokeWidth={4} transform={`rotate(${-30 - mouthOpen * 30} 150 390)`} />
      <ellipse cx={350} cy={390} rx={30} ry={22} fill="#3fc471" stroke="#0f6e3c" strokeWidth={4} transform="rotate(30 350 390)" />
      <ellipse cx={195} cy={492} rx={45} ry={24} fill="#3fc471" stroke="#0f6e3c" strokeWidth={4} />
      <ellipse cx={305} cy={492} rx={45} ry={24} fill="#3fc471" stroke="#0f6e3c" strokeWidth={4} />
      {/* head */}
      <g transform={`rotate(${funny * -10} 250 250)`}>
        {/* horns */}
        <path d="M 150 110 C 130 70, 140 40, 150 30 C 170 60, 185 85, 185 110 Z" fill="#fff1c8" stroke="#c79a4a" strokeWidth={4} />
        <path d="M 350 110 C 370 70, 360 40, 350 30 C 330 60, 315 85, 315 110 Z" fill="#fff1c8" stroke="#c79a4a" strokeWidth={4} />
        <ellipse cx={250} cy={200} rx={155} ry={130} fill="url(#drBody)" stroke="#0f6e3c" strokeWidth={4} />
        <ellipse cx={185} cy={110} rx={40} ry={18} fill="#ffffff" opacity={0.5} transform="rotate(-25 185 110)" />
        {/* snout */}
        <ellipse cx={250} cy={262} rx={92} ry={56} fill="#8af0a8" stroke="#0f6e3c" strokeWidth={3} />
        <ellipse cx={222} cy={250} rx={8} ry={6} fill="#0f6e3c" />
        <ellipse cx={278} cy={250} rx={8} ry={6} fill="#0f6e3c" />
        {/* cheeks */}
        <ellipse cx={130} cy={250} rx={26} ry={15} fill="#ff6b9a" opacity={0.6} />
        <ellipse cx={370} cy={250} rx={26} ry={15} fill="#ff6b9a" opacity={0.6} />
        {/* mouth */}
        {mouthOpen > 0.1 ? (
          <ellipse cx={250} cy={292} rx={22 + mouthOpen * 8} ry={14 + mouthOpen * 14} fill="#7a1035" stroke="#0f6e3c" strokeWidth={4} />
        ) : (
          <path d="M 205 285 Q 250 318 295 285" stroke="#0f6e3c" strokeWidth={6} fill="none" strokeLinecap="round" />
        )}
        {funny > 0.05 && mouthOpen <= 0.1 && (
          <g transform={`translate(262 300) scale(${funny})`}>
            <path d="M -20 -6 C -22 30, 22 34, 20 -6 Z" fill="#ff5c8a" stroke="#c2185b" strokeWidth={4} />
            <path d="M 0 -4 L 0 18" stroke="#c2185b" strokeWidth={3} />
          </g>
        )}
        {/* eyes */}
        <ellipse cx={190} cy={175} rx={42} ry={46} fill="url(#drEye)" stroke="#123" strokeWidth={4} />
        <circle cx={192 + px} cy={182} r={27} fill="#1b1340" />
        <circle cx={182 + px} cy={170} r={10} fill="#ffffff" />
        <circle cx={200 + px} cy={194} r={5} fill="#ffffff" />
        {wink ? (
          <path d="M 272 178 Q 310 150 348 178" stroke="#123" strokeWidth={8} fill="none" strokeLinecap="round" />
        ) : (
          <>
            <ellipse cx={310} cy={175} rx={42} ry={46} fill="url(#drEye)" stroke="#123" strokeWidth={4} />
            <circle cx={308 + px} cy={182} r={27} fill="#1b1340" />
            <circle cx={298 + px} cy={170} r={10} fill="#ffffff" />
            <circle cx={316 + px} cy={194} r={5} fill="#ffffff" />
          </>
        )}
        {/* crown */}
        <g transform={`translate(250 82) rotate(${-6 + funny * 14})`}>
          <path d="M -80 30 L -88 -40 L -45 -5 L 0 -62 L 45 -5 L 88 -40 L 80 30 Z" fill="url(#crown)" stroke="#8a5200" strokeWidth={5} strokeLinejoin="round" />
          <rect x={-82} y={18} width={164} height={22} rx={8} fill="url(#crown)" stroke="#8a5200" strokeWidth={5} />
          <circle cx={0} cy={-62} r={11} fill="#ff3b6b" stroke="#8a5200" strokeWidth={3} />
          <circle cx={-88} cy={-40} r={9} fill="#3df2ff" stroke="#8a5200" strokeWidth={3} />
          <circle cx={88} cy={-40} r={9} fill="#38f59a" stroke="#8a5200" strokeWidth={3} />
          <path d="M -12 4 L 0 -14 L 12 4 L 0 22 Z" fill="#9b5cff" stroke="#8a5200" strokeWidth={3} />
          <ellipse cx={-40} cy={-2} rx={14} ry={6} fill="#ffffff" opacity={0.7} transform="rotate(-30 -40 -2)" />
        </g>
      </g>
    </svg>
  );
};
