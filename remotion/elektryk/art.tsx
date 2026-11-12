/** SVG illustrations for the electrician short. All drawn in code – no external assets. */
import React from "react";

export const C = {
  navy: "#0B1630",
  navy2: "#16264D",
  yellow: "#FFD23F",
  orange: "#FF8A3D",
  blue: "#2EC4F1",
  green: "#3DDC84",
  red: "#FF4D5E",
  white: "#FFFFFF",
  wall: "#F4E3C3",
  steel: "#8FA3BF",
  dark: "#22304F",
};

/** Deterministic pseudo random in [0,1). */
export const prand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ── City skyline ─────────────────────────────────────────────────

const BUILDINGS = [
  { x: 0, w: 170, h: 520, c: "#3B4D7A" },
  { x: 160, w: 140, h: 760, c: "#2F4170" },
  { x: 290, w: 200, h: 600, c: "#46598A" },
  { x: 480, w: 130, h: 880, c: "#33467A" },
  { x: 600, w: 190, h: 680, c: "#3E5285" },
  { x: 780, w: 150, h: 820, c: "#2C3D6B" },
  { x: 920, w: 170, h: 560, c: "#41558A" },
];

/** City silhouette. `lit` 0..1 = fraction of lit windows. Draws inside a 1080-wide group, ground at y=0. */
export const City: React.FC<{ lit: number; glow?: boolean }> = ({ lit, glow = true }) => {
  let idx = 0;
  return (
    <g>
      {BUILDINGS.map((b, bi) => {
        const cols = Math.floor((b.w - 30) / 36);
        const rows = Math.floor((b.h - 40) / 54);
        const wins: React.ReactNode[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const order = prand(idx++ + bi * 991);
            const on = order < lit;
            wins.push(
              <rect
                key={`${r}-${c}`}
                x={b.x + 18 + c * 36}
                y={-b.h + 30 + r * 54}
                width={20}
                height={30}
                rx={3}
                fill={on ? C.yellow : "#1A2440"}
                opacity={on ? 0.95 : 1}
                style={on && glow ? { filter: "drop-shadow(0 0 8px rgba(255,210,63,0.9))" } : undefined}
              />,
            );
          }
        }
        return (
          <g key={bi}>
            <rect x={b.x} y={-b.h} width={b.w} height={b.h} fill={b.c} />
            <rect x={b.x} y={-b.h} width={b.w} height={10} fill="rgba(255,255,255,0.12)" />
            {wins}
          </g>
        );
      })}
    </g>
  );
};

// ── Room: ceiling lamp & light switch ───────────────────────────

export const CeilingLamp: React.FC<{ on: number; swing?: number }> = ({ on, swing = 0 }) => (
  <g transform={`rotate(${swing} 0 0)`}>
    <line x1={0} y1={0} x2={0} y2={300} stroke="#333" strokeWidth={6} />
    {on > 0 && (
      <ellipse cx={0} cy={520} rx={520} ry={420} fill="url(#lampGlow)" opacity={on} />
    )}
    <path d="M -150 440 Q 0 260 150 440 Z" fill={C.orange} />
    <path d="M -150 440 Q 0 260 150 440" fill="none" stroke="#C25E1C" strokeWidth={8} />
    <rect x={-22} y={290} width={44} height={40} rx={8} fill="#555" />
    <circle cx={0} cy={455} r={46} fill={on > 0.5 ? "#FFF6C8" : "#8A8A8A"} />
    {on > 0.5 && <circle cx={0} cy={455} r={46} fill="none" stroke={C.yellow} strokeWidth={6} opacity={on} />}
  </g>
);

export const LightSwitch: React.FC<{ on: boolean; press: number }> = ({ on, press }) => (
  <g>
    <rect x={-80} y={-110} width={160} height={220} rx={24} fill="#FAFAFA" stroke="#BDBDBD" strokeWidth={6} />
    <rect x={-46} y={-70} width={92} height={140} rx={14} fill="#EDEDED" stroke="#C8C8C8" strokeWidth={4} />
    <rect x={-40} y={on ? -64 : 4} width={80} height={60} rx={10} fill={on ? "#FFFFFF" : "#D6D6D6"} />
    {/* finger */}
    <g transform={`translate(${70 - press * 40} ${on ? -60 : 30})`} opacity={press > 0.02 ? 1 : 0}>
      <rect x={0} y={-30} width={260} height={64} rx={32} fill="#F2C7A5" stroke="#C99572" strokeWidth={4} />
      <rect x={6} y={-22} width={40} height={48} rx={14} fill="#FBE2D0" />
    </g>
  </g>
);

// ── Objects for the region scene ─────────────────────────────────

export const Crane: React.FC = () => (
  <g>
    <rect x={-14} y={-620} width={28} height={620} fill={C.yellow} />
    {Array.from({ length: 12 }).map((_, i) => (
      <line key={i} x1={-14} y1={-i * 50} x2={14} y2={-i * 50 - 50} stroke="#C79A12" strokeWidth={5} />
    ))}
    <rect x={-260} y={-640} width={560} height={24} fill={C.yellow} />
    <rect x={-250} y={-616} width={70} height={50} fill="#666" />
    <line x1={220} y1={-616} x2={220} y2={-420} stroke="#333" strokeWidth={4} />
    <rect x={180} y={-420} width={80} height={40} fill={C.orange} />
    <rect x={-40} y={-700} width={80} height={60} fill="#E8B92E" />
  </g>
);

export const NewBlock: React.FC<{ floors: number; lit: number }> = ({ floors, lit }) => (
  <g>
    {Array.from({ length: floors }).map((_, f) => (
      <g key={f}>
        <rect x={0} y={-(f + 1) * 90} width={340} height={90} fill={f % 2 ? "#E9EEF7" : "#DCE4F2"} stroke="#B6C3DA" strokeWidth={3} />
        {[0, 1, 2, 3].map((w) => (
          <rect
            key={w}
            x={24 + w * 80}
            y={-(f + 1) * 90 + 22}
            width={52}
            height={48}
            rx={4}
            fill={prand(f * 4 + w + 17) < lit ? C.yellow : "#7D93B8"}
          />
        ))}
      </g>
    ))}
  </g>
);

export const Factory: React.FC<{ running: boolean; t: number }> = ({ running, t }) => (
  <g>
    <rect x={-320} y={-260} width={640} height={260} fill="#5A6F99" />
    <path d="M -320 -260 L -320 -380 L -180 -260 L -180 -380 L -40 -260 L -40 -380 L 100 -260 L 320 -260 Z" fill="#6B82B0" />
    <rect x={160} y={-520} width={70} height={260} fill="#4A5D85" />
    <rect x={160} y={-520} width={70} height={24} fill={C.red} />
    {running &&
      [0, 1, 2].map((i) => {
        const p = (t * 0.6 + i / 3) % 1;
        return <circle key={i} cx={195 + p * 80} cy={-540 - p * 220} r={30 + p * 50} fill="#DDE3EE" opacity={0.8 * (1 - p)} />;
      })}
    {[-260, -150, -40].map((x) => (
      <rect key={x} x={x} y={-200} width={80} height={70} rx={6} fill={running ? C.yellow : "#2A3655"} />
    ))}
    <rect x={60} y={-150} width={110} height={150} fill="#34466F" />
  </g>
);

export const SolarRoof: React.FC<{ sun: number }> = ({ sun }) => (
  <g>
    <g transform={`translate(260 -720)`}>
      <circle r={90 + sun * 10} fill={C.yellow} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={-8} y={-160 - sun * 10} width={16} height={46} rx={8} fill={C.yellow} transform={`rotate(${i * 30 + sun * 20})`} />
      ))}
    </g>
    <rect x={-320} y={-300} width={560} height={300} fill="#F3E2C4" />
    <path d="M -380 -300 L -40 -560 L 300 -300 Z" fill="#C2543A" />
    {Array.from({ length: 3 }).map((_, r) =>
      Array.from({ length: 4 - r }).map((__, c) => (
        <g key={`${r}-${c}`} transform={`translate(${-250 + r * 70 + c * 120} ${-340 - r * 70}) skewX(0)`}>
          <rect width={108} height={60} fill="#1B3F8B" stroke="#C9D6F2" strokeWidth={4} />
          <line x1={36} y1={0} x2={36} y2={60} stroke="#6E8CCB" strokeWidth={2} />
          <line x1={72} y1={0} x2={72} y2={60} stroke="#6E8CCB" strokeWidth={2} />
          <line x1={0} y1={30} x2={108} y2={30} stroke="#6E8CCB" strokeWidth={2} />
          <rect width={108} height={60} fill="white" opacity={0.25 * sun} />
        </g>
      )),
    )}
    <rect x={-240} y={-200} width={110} height={200} fill="#8B5A3C" />
    <rect x={20} y={-220} width={130} height={110} fill="#A8D8F0" stroke="#fff" strokeWidth={6} />
  </g>
);

export const Car: React.FC<{ charge: number; color?: string }> = ({ charge, color = C.blue }) => (
  <g>
    <path d="M -230 -60 L -200 -150 Q -180 -190 -120 -195 L 90 -195 Q 140 -190 170 -140 L 230 -110 Q 260 -100 260 -60 L 260 -20 L -230 -20 Z" fill={color} />
    <path d="M -160 -150 L -130 -180 L -10 -180 L -10 -125 L -170 -125 Z" fill="#CFEFFF" />
    <path d="M 10 -180 L 90 -180 Q 120 -170 140 -125 L 10 -125 Z" fill="#CFEFFF" />
    <circle cx={-130} cy={-20} r={48} fill="#222" />
    <circle cx={-130} cy={-20} r={20} fill="#999" />
    <circle cx={160} cy={-20} r={48} fill="#222" />
    <circle cx={160} cy={-20} r={20} fill="#999" />
    {/* battery badge */}
    <g transform="translate(-40 -300)">
      <rect x={0} y={0} width={150} height={70} rx={12} fill="#fff" stroke="#333" strokeWidth={6} />
      <rect x={150} y={20} width={14} height={30} rx={4} fill="#333" />
      <rect x={10} y={10} width={130 * Math.max(0.04, charge)} height={50} rx={6} fill={charge < 0.2 ? C.red : C.green} />
    </g>
  </g>
);

export const Charger: React.FC<{ active: boolean; t: number }> = ({ active, t }) => (
  <g>
    <rect x={-70} y={-420} width={140} height={420} rx={24} fill="#EEF3FA" stroke="#9FB0C9" strokeWidth={6} />
    <rect x={-46} y={-380} width={92} height={110} rx={12} fill={C.navy} />
    <path d="M 6 -362 L -20 -322 L 2 -322 L -10 -288 L 24 -334 L 2 -334 Z" fill={active ? C.green : "#555"} />
    <circle cx={0} cy={-220} r={18} fill={active ? C.green : "#555"} opacity={active ? 0.6 + 0.4 * Math.sin(t * 6) : 1} />
    <path d="M 70 -200 Q 180 -200 190 -100" fill="none" stroke="#222" strokeWidth={14} strokeLinecap="round" />
  </g>
);

export const HeatPump: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={-240} y={-280} width={480} height={280} rx={20} fill="#F2F5FA" stroke="#AAB7CC" strokeWidth={6} />
    <circle cx={-70} cy={-140} r={100} fill="#D7DEE9" stroke="#AAB7CC" strokeWidth={6} />
    <g transform={`translate(-70 -140) rotate(${t * 360})`}>
      {[0, 120, 240].map((a) => (
        <ellipse key={a} cx={0} cy={-45} rx={24} ry={48} fill="#7F93B5" transform={`rotate(${a})`} />
      ))}
      <circle r={16} fill="#444" />
    </g>
    {Array.from({ length: 6 }).map((_, i) => (
      <rect key={i} x={80} y={-230 + i * 34} width={120} height={14} rx={7} fill="#C3CCDA" />
    ))}
    {/* warm waves */}
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M ${-140 + i * 70} -320 q 20 -30 0 -60 q -20 -30 0 -60`}
        fill="none"
        stroke={C.orange}
        strokeWidth={10}
        strokeLinecap="round"
        opacity={0.5 + 0.5 * Math.sin(t * 8 + i)}
      />
    ))}
  </g>
);

// ── Tools & day-of-work objects ──────────────────────────────────

export const Clock: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <circle r={210} fill="#fff" stroke={C.navy} strokeWidth={18} />
    {Array.from({ length: 12 }).map((_, i) => (
      <rect key={i} x={-6} y={-190} width={12} height={i % 3 === 0 ? 40 : 22} fill={C.navy} transform={`rotate(${i * 30})`} />
    ))}
    {/* 6:30 */}
    <rect x={-8} y={-110} width={16} height={130} rx={8} fill={C.navy} transform={`rotate(${195 + t * 4})`} />
    <rect x={-6} y={-160} width={12} height={180} rx={6} fill={C.orange} transform={`rotate(${180 + t * 50})`} />
    <circle r={16} fill={C.navy} />
    <circle cx={-150} cy={-180} r={46} fill={C.red} />
    <circle cx={150} cy={-180} r={46} fill={C.red} />
  </g>
);

export const ToolBag: React.FC = () => (
  <g>
    <path d="M -120 -240 Q -120 -320 0 -320 Q 120 -320 120 -240" fill="none" stroke="#5B3A1E" strokeWidth={22} />
    {/* tools sticking out */}
    <rect x={-150} y={-330} width={26} height={150} rx={8} fill={C.yellow} transform="rotate(-12)" />
    <rect x={-80} y={-380} width={20} height={170} rx={6} fill={C.red} transform="rotate(-4)" />
    <rect x={60} y={-360} width={60} height={110} rx={12} fill={C.orange} transform="rotate(10)" />
    <rect x={-260} y={-240} width={520} height={240} rx={30} fill="#3A6EA5" />
    <rect x={-260} y={-240} width={520} height={50} rx={20} fill="#2D5A8A" />
    <rect x={-40} y={-150} width={80} height={60} rx={10} fill={C.yellow} />
  </g>
);

export const Schematic: React.FC<{ draw: number }> = ({ draw }) => {
  const len = 2600;
  return (
    <g>
      <rect x={-330} y={-260} width={660} height={520} rx={16} fill="#EAF2FF" stroke="#9DB6DE" strokeWidth={6} />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={-330 + i * 60} y1={-260} x2={-330 + i * 60} y2={260} stroke="#CFDDF5" strokeWidth={2} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={-330} y1={-260 + i * 60} x2={330} y2={-260 + i * 60} stroke="#CFDDF5" strokeWidth={2} />
      ))}
      <path
        d="M -240 -150 L 240 -150 L 240 150 L -240 150 Z M -240 0 L -100 0 M 100 0 L 240 0 M 0 -150 L 0 -60"
        fill="none"
        stroke="#1E4FA3"
        strokeWidth={10}
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
        strokeLinejoin="round"
      />
      {/* lamp symbol */}
      <g opacity={draw > 0.6 ? 1 : 0}>
        <circle cx={0} cy={0} r={60} fill="none" stroke="#1E4FA3" strokeWidth={10} />
        <line x1={-42} y1={-42} x2={42} y2={42} stroke="#1E4FA3" strokeWidth={10} />
        <line x1={-42} y1={42} x2={42} y2={-42} stroke="#1E4FA3" strokeWidth={10} />
      </g>
      {/* switch symbol */}
      <g opacity={draw > 0.4 ? 1 : 0}>
        <circle cx={0} cy={-150} r={14} fill="#1E4FA3" />
        <line x1={0} y1={-150} x2={70} y2={-200} stroke="#1E4FA3" strokeWidth={10} />
      </g>
    </g>
  );
};

export const Socket: React.FC = () => (
  <g>
    <rect x={-200} y={-200} width={400} height={400} rx={50} fill="#FAFAFA" stroke="#C4C4C4" strokeWidth={8} />
    <circle r={140} fill="#F0F0F0" stroke="#D0D0D0" strokeWidth={6} />
    <circle cx={-55} cy={0} r={22} fill="#333" />
    <circle cx={55} cy={0} r={22} fill="#333" />
    <rect x={-12} y={-130} width={24} height={34} rx={6} fill="#B8B8B8" />
  </g>
);

export const Screwdriver: React.FC = () => (
  <g>
    <rect x={-10} y={0} width={20} height={200} fill="#BFC7D3" />
    <rect x={-6} y={-10} width={12} height={20} fill="#9AA3B0" />
    <rect x={-34} y={200} width={68} height={220} rx={30} fill={C.red} />
    <rect x={-34} y={260} width={68} height={30} fill={C.yellow} />
  </g>
);

export const Meter: React.FC<{ value: number }> = ({ value }) => (
  <g>
    <rect x={-150} y={-230} width={300} height={460} rx={40} fill={C.yellow} stroke="#C79A12" strokeWidth={8} />
    <rect x={-110} y={-190} width={220} height={120} rx={14} fill="#B9D7A8" />
    <text x={0} y={-108} textAnchor="middle" fontSize={78} fontFamily="monospace" fontWeight={700} fill="#1E3214">
      {value.toFixed(1)}
    </text>
    <circle cx={0} cy={60} r={80} fill="#333" />
    <rect x={-8} y={-10} width={16} height={70} fill="#fff" transform={`translate(0 60) rotate(${-60 + value * 2})`} />
    <circle cx={-70} cy={180} r={22} fill="#222" />
    <circle cx={70} cy={180} r={22} fill={C.red} />
  </g>
);

export const DeskLamp: React.FC<{ on: number }> = ({ on }) => (
  <g>
    {on > 0 && <circle cx={120} cy={-280} r={260} fill="url(#lampGlow)" opacity={on} />}
    <rect x={-160} y={-30} width={260} height={40} rx={20} fill={C.navy2} />
    <rect x={-50} y={-300} width={24} height={280} rx={12} fill={C.navy2} transform="rotate(-12 -38 -30)" />
    <path d="M 0 -330 L 200 -330 L 240 -220 L -40 -220 Z" fill={C.blue} transform="rotate(14 100 -280)" />
    <circle cx={110} cy={-210} r={38} fill={on > 0.5 ? "#FFF6C8" : "#999"} />
  </g>
);

export const Check: React.FC<{ p: number; color?: string }> = ({ p, color = C.green }) => (
  <g>
    <circle r={110} fill={color} />
    <path d="M -55 0 L -15 40 L 60 -45" fill="none" stroke="#fff" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={220} strokeDashoffset={220 * (1 - p)} />
  </g>
);

export const Cross: React.FC = () => (
  <g>
    <circle r={80} fill={C.red} />
    <path d="M -34 -34 L 34 34 M 34 -34 L -34 34" stroke="#fff" strokeWidth={22} strokeLinecap="round" />
  </g>
);

// ── Skill icons ─────────────────────────────────────────────────

export const Target: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {[200, 150, 100, 50].map((r, i) => (
      <circle key={r} r={r} fill={i % 2 ? "#fff" : C.red} />
    ))}
    <g transform={`translate(${Math.sin(t * 3) * 20 * (1 - Math.min(1, t))} 0)`}>
      <line x1={0} y1={-260} x2={0} y2={260} stroke={C.navy} strokeWidth={8} />
      <line x1={-260} y1={0} x2={260} y2={0} stroke={C.navy} strokeWidth={8} />
    </g>
    <g transform="translate(30 -30) rotate(-40)">
      <rect x={-6} y={-220} width={12} height={150} fill="#BFC7D3" />
      <rect x={-22} y={-90} width={44} height={150} rx={20} fill={C.yellow} />
    </g>
  </g>
);

export const Brain: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <path
      d="M -40 -170 C -150 -200 -230 -120 -210 -40 C -270 0 -240 110 -160 120 C -140 190 -50 200 -20 150 L -20 -160 Z"
      fill="#FF9EC0"
      stroke="#D9578A"
      strokeWidth={8}
    />
    <path
      d="M 20 -170 C 130 -200 230 -120 210 -40 C 270 0 240 110 160 120 C 140 190 50 200 20 150 L 20 -160 Z"
      fill="#FF9EC0"
      stroke="#D9578A"
      strokeWidth={8}
    />
    <path d="M -150 -60 q 40 20 80 -10 M -140 50 q 50 -20 90 10 M 150 -60 q -40 20 -80 -10 M 140 50 q -50 -20 -90 10" fill="none" stroke="#D9578A" strokeWidth={8} strokeLinecap="round" />
    <g transform="translate(0 -300)" opacity={0.6 + 0.4 * Math.sin(t * 6)}>
      <circle r={70} fill={C.yellow} />
      <rect x={-30} y={60} width={60} height={50} rx={8} fill="#999" />
    </g>
  </g>
);

export const Helmet: React.FC = () => (
  <g>
    <path d="M -230 40 Q -230 -220 0 -220 Q 230 -220 230 40 Z" fill={C.yellow} />
    <rect x={-280} y={30} width={560} height={50} rx={25} fill="#E8B92E" />
    <rect x={-30} y={-220} width={60} height={250} rx={20} fill="#F7C823" />
    {/* glove */}
    <g transform="translate(150 240)">
      <rect x={-70} y={-60} width={140} height={160} rx={40} fill={C.orange} />
      {[-48, -16, 16, 48].map((x) => (
        <rect key={x} x={x - 14} y={-140} width={28} height={110} rx={14} fill={C.orange} />
      ))}
      <rect x={-75} y={70} width={150} height={50} rx={10} fill="#C25E1C" />
    </g>
    {/* goggles */}
    <g transform="translate(-160 230)">
      <rect x={-110} y={-40} width={220} height={80} rx={40} fill="#5BC0EB" opacity={0.8} stroke="#2A6F97" strokeWidth={10} />
      <line x1={0} y1={-40} x2={0} y2={40} stroke="#2A6F97" strokeWidth={10} />
    </g>
  </g>
);

export const Team: React.FC<{ t: number }> = ({ t }) => {
  const head = (x: number, color: string) => (
    <g transform={`translate(${x} 0)`}>
      <rect x={-110} y={60} width={220} height={260} rx={90} fill={color} />
      <circle cx={0} cy={-20} r={90} fill="#F2C7A5" />
      <path d="M -105 -40 Q -105 -150 0 -150 Q 105 -150 105 -40 Z" fill={C.yellow} />
      <rect x={-125} y={-50} width={250} height={26} rx={13} fill="#E8B92E" />
    </g>
  );
  const pass = Math.sin(t * 2.4) * 60;
  return (
    <g>
      {head(-170, "#3A6EA5")}
      {head(170, C.orange)}
      <g transform={`translate(${pass} 150) rotate(${pass / 2})`}>
        <rect x={-90} y={-14} width={180} height={28} rx={10} fill="#BFC7D3" />
        <rect x={20} y={-22} width={80} height={44} rx={14} fill={C.red} />
      </g>
    </g>
  );
};

// ── Education path ─────────────────────────────────────────────

export const School: React.FC = () => (
  <g>
    <rect x={-150} y={-170} width={300} height={170} fill="#E57A5A" />
    <path d="M -180 -170 L 0 -270 L 180 -170 Z" fill="#B5462B" />
    <rect x={-30} y={-90} width={60} height={90} fill="#5B3A1E" />
    {[-110, 70].map((x) => (
      <rect key={x} x={x} y={-140} width={40} height={40} fill="#BDE3F5" />
    ))}
    <rect x={-4} y={-330} width={8} height={70} fill="#555" />
    <path d="M 4 -330 L 60 -315 L 4 -300 Z" fill={C.red} />
  </g>
);

export const Workshop: React.FC = () => (
  <g>
    <rect x={-170} y={-60} width={340} height={30} fill="#8B5A3C" />
    <rect x={-150} y={-30} width={24} height={110} fill="#6B4430" />
    <rect x={126} y={-30} width={24} height={110} fill="#6B4430" />
    <g transform="translate(-60 -170) scale(0.45)">
      <Socket />
    </g>
    <g transform="translate(80 -250) rotate(30) scale(0.55)">
      <Screwdriver />
    </g>
  </g>
);

export const Certificate: React.FC = () => (
  <g>
    <rect x={-170} y={-210} width={340} height={260} rx={12} fill="#FFFBEA" stroke="#D7B55A" strokeWidth={8} />
    <text x={0} y={-130} textAnchor="middle" fontSize={64} fontWeight={700} fill={C.navy} fontFamily="inherit">
      SEP
    </text>
    {[-80, -50, -20].map((y) => (
      <rect key={y} x={-120} y={y} width={240} height={12} rx={6} fill="#E5D9AF" />
    ))}
    <circle cx={110} cy={30} r={50} fill={C.red} />
    <path d="M 110 30 m -10 -20 l -10 18 l 12 0 l -6 18 l 22 -26 l -12 0 l 8 -10 z" fill={C.yellow} />
  </g>
);

export const Bolt: React.FC<{ size?: number; color?: string }> = ({ size = 1, color = C.yellow }) => (
  <path transform={`scale(${size})`} d="M 20 -100 L -50 10 L 0 10 L -20 100 L 60 -20 L 10 -20 Z" fill={color} />
);
