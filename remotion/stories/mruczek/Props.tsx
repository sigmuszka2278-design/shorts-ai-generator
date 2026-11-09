import React from "react";

/** Living room set: wall, window with sun (or moon), floor, cozy rug, plant, frames. 1080×1920. */

export const RoomDefs: React.FC = () => (
  <defs>
    <linearGradient id="r-wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffe9c9" />
      <stop offset="100%" stopColor="#ffd6a8" />
    </linearGradient>
    <linearGradient id="r-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#e9a86a" />
      <stop offset="100%" stopColor="#c97f45" />
    </linearGradient>
    <linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#7fd3ff" />
      <stop offset="100%" stopColor="#c9f0ff" />
    </linearGradient>
    <linearGradient id="r-nightsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#1d2466" />
      <stop offset="100%" stopColor="#3d3f9e" />
    </linearGradient>
    <radialGradient id="r-sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fff9c4" />
      <stop offset="60%" stopColor="#ffe066" />
      <stop offset="100%" stopColor="#ffc93c" />
    </radialGradient>
    <radialGradient id="r-sunbeam" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stopColor="rgba(255,250,200,0.55)" />
      <stop offset="100%" stopColor="rgba(255,250,200,0)" />
    </radialGradient>
    <radialGradient id="r-rug" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stopColor="#8fd3ff" />
      <stop offset="100%" stopColor="#5fb2ee" />
    </radialGradient>
    <radialGradient id="r-ball" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stopColor="#ff9fd0" />
      <stop offset="55%" stopColor="#ff4f9a" />
      <stop offset="100%" stopColor="#c21f6a" />
    </radialGradient>
    <linearGradient id="r-sofa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#9b8cff" />
      <stop offset="100%" stopColor="#6b58e6" />
    </linearGradient>
    <linearGradient id="r-sofa-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#b9adff" />
      <stop offset="100%" stopColor="#8676f2" />
    </linearGradient>
    <linearGradient id="r-wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#ffb86b" />
      <stop offset="100%" stopColor="#e88f3d" />
    </linearGradient>
    <linearGradient id="r-gap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#c99a72" />
      <stop offset="100%" stopColor="#9c6c48" />
    </linearGradient>
    <radialGradient id="r-plant" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stopColor="#9be86f" />
      <stop offset="100%" stopColor="#3faa4a" />
    </radialGradient>
    <radialGradient id="r-vignette" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stopColor="rgba(0,0,0,0)" />
      <stop offset="100%" stopColor="rgba(80,40,10,0.22)" />
    </radialGradient>
  </defs>
);

export const FLOOR_Y = 1180;

export const Window: React.FC<{ x: number; y: number; w: number; h: number; frame: number; night: number }> = ({ x, y, w, h, frame, night }) => (
  <g>
    <rect x={x - 18} y={y - 18} width={w + 36} height={h + 36} rx={40} fill="#ffffff" />
    <rect x={x} y={y} width={w} height={h} rx={26} fill="url(#r-sky)" />
    <rect x={x} y={y} width={w} height={h} rx={26} fill="url(#r-nightsky)" opacity={night} />
    {/* clouds / sun */}
    <g opacity={1 - night}>
      <circle cx={x + w * 0.7} cy={y + h * 0.3} r={62 + Math.sin(frame / 20) * 3} fill="url(#r-sun)" />
      {[0, 1].map((i) => {
        const cx = x + ((w * (0.25 + i * 0.45) + frame * (0.4 + i * 0.2)) % (w + 120)) - 40;
        const cy = y + h * (0.55 + i * 0.18);
        return (
          <g key={i} opacity={0.95}>
            <ellipse cx={cx} cy={cy} rx={56} ry={26} fill="#fff" />
            <ellipse cx={cx - 30} cy={cy + 6} rx={36} ry={20} fill="#fff" />
            <ellipse cx={cx + 26} cy={cy - 12} rx={34} ry={24} fill="#fff" />
          </g>
        );
      })}
    </g>
    <g opacity={night}>
      <circle cx={x + w * 0.68} cy={y + h * 0.3} r={50} fill="#fff6c9" />
      <circle cx={x + w * 0.68 + 22} cy={y + h * 0.3 - 12} r={44} fill="#3a3c98" />
      {[
        [0.2, 0.2],
        [0.35, 0.55],
        [0.15, 0.75],
        [0.85, 0.65],
        [0.55, 0.15],
        [0.6, 0.8],
      ].map(([sx, sy], i) => (
        <circle key={i} cx={x + w * sx} cy={y + h * sy} r={5 + 2 * Math.sin(frame / 8 + i)} fill="#fff8d0" />
      ))}
    </g>
    <rect x={x + w / 2 - 9} y={y} width={18} height={h} fill="#ffffff" />
    <rect x={x} y={y + h / 2 - 9} width={w} height={18} fill="#ffffff" />
    {/* curtains */}
    <path d={`M ${x - 60} ${y - 40} Q ${x + 30} ${y + h * 0.5} ${x - 30} ${y + h + 60} L ${x - 90} ${y + h + 60} L ${x - 90} ${y - 40} Z`} fill="#ff8fb1" />
    <path
      d={`M ${x + w + 60} ${y - 40} Q ${x + w - 30} ${y + h * 0.5} ${x + w + 30} ${y + h + 60} L ${x + w + 90} ${y + h + 60} L ${x + w + 90} ${y - 40} Z`}
      fill="#ff8fb1"
    />
    <rect x={x - 110} y={y - 56} width={w + 220} height={22} rx={11} fill="#c9733a" />
  </g>
);

export const Plant: React.FC<{ x: number; y: number; frame: number; s?: number }> = ({ x, y, frame, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[-40, -15, 10, 35].map((a, i) => (
      <ellipse
        key={i}
        cx={0}
        cy={-150}
        rx={34}
        ry={100}
        fill="url(#r-plant)"
        transform={`rotate(${a + Math.sin(frame / 25 + i) * 3} 0 -40)`}
      />
    ))}
    <path d="M -70 -60 L 70 -60 L 52 40 Q 0 56 -52 40 Z" fill="#ff7a59" />
    <rect x={-80} y={-76} width={160} height={30} rx={15} fill="#ff9677" />
  </g>
);

export const Rug: React.FC<{ cx: number; cy: number; rx?: number; ry?: number }> = ({ cx, cy, rx = 430, ry = 120 }) => (
  <g>
    <ellipse cx={cx} cy={cy + 8} rx={rx} ry={ry} fill="rgba(90,45,15,0.18)" />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffd166" />
    <ellipse cx={cx} cy={cy} rx={rx - 34} ry={ry - 18} fill="#ff8fb1" />
    <ellipse cx={cx} cy={cy} rx={rx - 70} ry={ry - 34} fill="url(#r-rug)" />
    <ellipse cx={cx} cy={cy} rx={rx - 140} ry={ry - 60} fill="#b5f0a0" opacity={0.9} />
    {Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      return <circle key={i} cx={cx + Math.cos(a) * (rx + 10)} cy={cy + Math.sin(a) * (ry + 6)} r={9} fill="#ffd166" />;
    })}
  </g>
);

/** Sunny living room. `night` (0..1) darkens everything to a calm, blue night. */
export const LivingRoom: React.FC<{ frame: number; night?: number; rug?: boolean; rugX?: number; rugY?: number; plant?: boolean }> = ({
  frame,
  night = 0,
  rug = true,
  rugX = 540,
  rugY = 1290,
  plant = true,
}) => (
  <g>
    <rect x={0} y={0} width={1080} height={FLOOR_Y} fill="url(#r-wall)" />
    {/* wallpaper dots */}
    {Array.from({ length: 48 }, (_, i) => (
      <circle key={i} cx={((i % 8) + 0.5 + (Math.floor(i / 8) % 2) * 0.5) * 135} cy={80 + Math.floor(i / 8) * 150} r={9} fill="#ffc48a" opacity={0.6} />
    ))}
    <Window x={300} y={250} w={480} h={420} frame={frame} night={night} />
    {/* sunbeam on the floor */}
    <path d="M 330 690 L 760 690 L 980 1500 L 160 1500 Z" fill="url(#r-sunbeam)" opacity={(1 - night) * (0.75 + 0.1 * Math.sin(frame / 30))} />
    {/* picture frames */}
    <g>
      <rect x={70} y={330} width={150} height={190} rx={22} fill="#ffffff" />
      <rect x={88} y={348} width={114} height={154} rx={14} fill="#a3e4ff" />
      <circle cx={145} cy={410} r={30} fill="#ffd166" />
      <path d="M 92 500 Q 145 420 198 500 Z" fill="#7ad67a" />
      <rect x={866} y={360} width={150} height={150} rx={75} fill="#ffffff" />
      <path d={`M 941 470 C 900 440 900 400 925 395 C 935 393 941 400 941 408 C 941 400 947 393 957 395 C 982 400 982 440 941 470 Z`} fill="#ff7fa0" />
    </g>
    {/* skirting + floor */}
    <rect x={0} y={FLOOR_Y - 26} width={1080} height={30} fill="#ffffff" />
    <rect x={0} y={FLOOR_Y} width={1080} height={1920 - FLOOR_Y} fill="url(#r-floor)" />
    {Array.from({ length: 7 }, (_, i) => (
      <line key={i} x1={0} y1={FLOOR_Y + 70 + i * 110} x2={1080} y2={FLOOR_Y + 70 + i * 110} stroke="#b9703a" strokeWidth={5} opacity={0.35} />
    ))}
    {plant && <Plant x={960} y={FLOOR_Y + 40} frame={frame} s={1.05} />}
    {rug && <Rug cx={rugX} cy={rugY} />}
    <rect x={0} y={0} width={1080} height={1920} fill="url(#r-vignette)" />
    {night > 0 && <rect x={0} y={0} width={1080} height={1920} fill="#141a4f" opacity={night * 0.72} />}
  </g>
);

/** Big rounded sofa seen from the front-side (left of the gap). */
export const Sofa: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={-220} cy={14} rx={300} ry={30} fill="rgba(80,40,10,0.22)" />
    <rect x={-560} y={-560} width={540} height={330} rx={90} fill="url(#r-sofa)" />
    <rect x={-560} y={-300} width={560} height={260} rx={60} fill="url(#r-sofa-light)" />
    <rect x={-150} y={-420} width={170} height={400} rx={80} fill="url(#r-sofa)" />
    <rect x={-138} y={-410} width={70} height={360} rx={35} fill="#ffffff" opacity={0.18} />
    <rect x={-120} y={-30} width={36} height={44} rx={12} fill="#7a4a24" />
    <rect x={-520} y={-30} width={36} height={44} rx={12} fill="#7a4a24" />
    <circle cx={-390} cy={-430} r={70} fill="#ffd166" />
    <circle cx={-390} cy={-430} r={30} fill="#ff9f43" />
  </g>
);

/** Bookcase / wall corner on the right side of the gap. */
export const Bookcase: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={240} cy={14} rx={280} ry={30} fill="rgba(80,40,10,0.22)" />
    <rect x={0} y={-900} width={520} height={910} rx={40} fill="url(#r-wood)" />
    <rect x={0} y={-900} width={38} height={910} rx={18} fill="#ffcf91" />
    {[-860, -620, -380].map((sy, r) => (
      <g key={sy}>
        <rect x={50} y={sy} width={440} height={210} rx={20} fill="#c76e2e" />
        {[0, 1, 2, 3, 4].map((b) => (
          <rect
            key={b}
            x={70 + b * 62}
            y={sy + 210 - (150 + ((b * 37 + r * 13) % 50))}
            width={50}
            height={150 + ((b * 37 + r * 13) % 50)}
            rx={10}
            fill={["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc"][(b + r) % 5]}
          />
        ))}
      </g>
    ))}
    <rect x={50} y={-140} width={440} height={130} rx={20} fill="#c76e2e" />
    <circle cx={150} cy={-75} r={42} fill="#ff8fb1" />
    <circle cx={350} cy={-75} r={42} fill="#ffd166" />
  </g>
);

/** Simple, friendly chair silhouette. Origin at the floor, centre. */
export const Chair: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={10} rx={210} ry={26} fill="rgba(0,0,0,0.25)" />
    <rect x={-150} y={-640} width={44} height={650} rx={22} fill="#e07a3f" />
    <rect x={-150} y={-640} width={300} height={190} rx={40} fill="#f08a4b" />
    <rect x={-170} y={-320} width={340} height={70} rx={35} fill="#ff9e5e" />
    <rect x={106} y={-280} width={40} height={290} rx={20} fill="#e07a3f" />
    <rect x={-150} y={-280} width={40} height={290} rx={20} fill="#e07a3f" />
    <rect x={-30} y={-600} width={60} height={110} rx={30} fill="#ffc08a" />
  </g>
);

export const YarnBall: React.FC<{ x: number; y: number; r: number; spin: number; trail?: number }> = ({ x, y, r, spin, trail = 0 }) => (
  <g>
    {trail > 0 && (
      <path
        d={`M ${x - r * 0.4} ${y + r * 0.8} C ${x + 40} ${y + r * 1.3}, ${x + 120} ${y + r * 0.9}, ${x + 200 + trail} ${y + r * 1.05}`}
        stroke="#ff4f9a"
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
    )}
    <ellipse cx={x} cy={y + r + 4} rx={r * 1.05} ry={r * 0.22} fill="rgba(80,40,10,0.25)" />
    <g transform={`translate(${x} ${y}) rotate(${spin})`}>
      <circle r={r} fill="url(#r-ball)" />
      {[-0.55, -0.2, 0.15, 0.5].map((k, i) => (
        <path
          key={i}
          d={`M ${-r * 0.92} ${k * r} Q 0 ${(k - 0.35) * r} ${r * 0.92} ${k * r}`}
          stroke="#ffd0e6"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
      {[-0.4, 0.1, 0.55].map((k, i) => (
        <path
          key={`v${i}`}
          d={`M ${k * r} ${-r * 0.9} Q ${(k + 0.35) * r} 0 ${k * r} ${r * 0.9}`}
          stroke="#c21f6a"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          opacity={0.45}
        />
      ))}
      <path d={`M 0 0 m ${-r * 0.5} ${-r * 0.55} q ${r * 0.2} ${-r * 0.2} ${r * 0.45} ${-r * 0.2}`} stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.6} />
    </g>
    {/* second yarn colour stripes */}
    <circle cx={x} cy={y} r={r} fill="none" stroke="#ffd166" strokeWidth={6} strokeDasharray={`${r * 0.6} ${r * 0.9}`} transform={`rotate(${spin * 0.7} ${x} ${y})`} opacity={0.8} />
  </g>
);

/** Friendly cartoon child kneeling on the right, reaching left. `hand` = target point of the hand (scene coords). */
export const Child: React.FC<{ x: number; y: number; hand: { x: number; y: number }; frame: number; blink: number }> = ({ x, y, hand, frame, blink }) => {
  const shoulder = { x: x - 70, y: y - 330 };
  const elbow = {
    x: (shoulder.x + hand.x) / 2 + 10,
    y: Math.max(shoulder.y, hand.y) + 40,
  };
  const breathe = Math.sin(frame / 22) * 3;
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx={200} ry={30} fill="rgba(80,40,10,0.22)" />
      {/* legs (kneeling) */}
      <ellipse cx={x + 10} cy={y - 50} rx={150} ry={60} fill="#4d7cff" />
      <ellipse cx={x + 140} cy={y - 24} rx={50} ry={32} fill="#ffffff" />
      {/* body */}
      <path d={`M ${x - 110} ${y - 60} Q ${x - 120} ${y - 360 + breathe} ${x} ${y - 370 + breathe} Q ${x + 120} ${y - 360 + breathe} ${x + 110} ${y - 60} Z`} fill="#ffcf3f" />
      <path d={`M ${x - 114} ${y - 200} Q ${x} ${y - 180} ${x + 114} ${y - 200}`} stroke="#ff8f3f" strokeWidth={22} fill="none" />
      <path d={`M ${x - 108} ${y - 130} Q ${x} ${y - 110} ${x + 108} ${y - 130}`} stroke="#ff8f3f" strokeWidth={22} fill="none" />
      {/* head */}
      <g transform={`translate(0 ${breathe})`}>
        <circle cx={x + 6} cy={y - 500} r={128} fill="#ffd2b0" />
        <path d={`M ${x - 124} ${y - 520} Q ${x - 110} ${y - 660} ${x + 10} ${y - 650} Q ${x + 150} ${y - 650} ${x + 136} ${y - 500} Q ${x + 90} ${y - 590} ${x - 10} ${y - 580} Q ${x - 80} ${y - 570} ${x - 124} ${y - 520} Z`} fill="#7a3f1d" />
        <circle cx={x + 120} cy={y - 610} r={40} fill="#7a3f1d" />
        <circle cx={x + 148} cy={y - 640} r={18} fill="#ff6b9a" />
        <ellipse cx={x - 118} cy={y - 488} rx={22} ry={30} fill="#ffc29c" />
        {/* eyes looking at the kitten, smiling */}
        {[-40, 30].map((dx) => (
          <path
            key={dx}
            d={`M ${x + dx - 20} ${y - 492} Q ${x + dx} ${y - 492 - 22 * (1 - blink * 0.8)} ${x + dx + 20} ${y - 492}`}
            stroke="#3d2314"
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
          />
        ))}
        <ellipse cx={x - 70} cy={y - 450} rx={22} ry={12} fill="#ff8fa8" opacity={0.6} />
        <ellipse cx={x + 66} cy={y - 450} rx={22} ry={12} fill="#ff8fa8" opacity={0.6} />
        <path d={`M ${x - 30} ${y - 438} Q ${x - 4} ${y - 408} ${x + 22} ${y - 438}`} stroke="#3d2314" strokeWidth={8} strokeLinecap="round" fill="#ff8a8a" />
      </g>
      {/* reaching arm */}
      <path d={`M ${shoulder.x} ${shoulder.y} Q ${elbow.x} ${elbow.y} ${hand.x + 34} ${hand.y - 6}`} stroke="#ffcf3f" strokeWidth={62} strokeLinecap="round" fill="none" />
      <ellipse cx={hand.x} cy={hand.y} rx={50} ry={34} fill="#ffd2b0" />
      {[-30, -10, 10].map((dx, i) => (
        <ellipse key={i} cx={hand.x + dx} cy={hand.y + 24} rx={13} ry={18} fill="#ffd2b0" />
      ))}
    </g>
  );
};
