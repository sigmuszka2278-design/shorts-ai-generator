import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY, ensureFonts } from "../fonts";
import {
  Bolt,
  Brain,
  C,
  Car,
  CeilingLamp,
  Certificate,
  Charger,
  Check,
  City,
  Clock,
  Crane,
  Cross,
  DeskLamp,
  Factory,
  HeatPump,
  Helmet,
  LightSwitch,
  Meter,
  NewBlock,
  Schematic,
  School,
  Screwdriver,
  Socket,
  SolarRoof,
  Target,
  Team,
  ToolBag,
  Workshop,
} from "./art";
import captions from "./captions.json";
import { FPS } from "./timeline";

const W = 1080;
const H = 1920;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

const useSpring = (delay: number, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};

// ── shared UI ───────────────────────────────────────────────────

const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, ...style }}>
    <defs>
      <radialGradient id="lampGlow">
        <stop offset="0%" stopColor="#FFF3B0" stopOpacity={0.95} />
        <stop offset="45%" stopColor="#FFD23F" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#FFD23F" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="daySky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3FA9F5" />
        <stop offset="100%" stopColor="#BFE6FF" />
      </linearGradient>
      <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#060B1A" />
        <stop offset="100%" stopColor="#1B2A52" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

const Headline: React.FC<{
  text: string;
  sub?: string;
  delay?: number;
  top?: number;
  bg?: string;
  color?: string;
  size?: number;
  icon?: React.ReactNode;
}> = ({ text, sub, delay = 0, top = 230, bg = C.yellow, color = C.navy, size = 76, icon }) => {
  const s = useSpring(delay);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: s,
      }}
    >
      <div
        style={{
          background: bg,
          color,
          padding: "22px 44px",
          borderRadius: 36,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1.05,
          textAlign: "center",
          maxWidth: 940,
          boxShadow: "0 14px 0 rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        {icon}
        <div>
          {text}
          {sub && <div style={{ fontSize: size * 0.42, fontWeight: 500, marginTop: 8, opacity: 0.85 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
};

const Label: React.FC<{ text: string; top: number; delay?: number; bg?: string; color?: string; size?: number }> = ({
  text,
  top,
  delay = 0,
  bg = C.navy,
  color = C.white,
  size = 64,
}) => {
  const s = useSpring(delay, 14);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
      <div style={{ background: bg, color, padding: "14px 36px", borderRadius: 999, fontSize: size, fontWeight: 700, letterSpacing: 1 }}>{text}</div>
    </div>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cap = (captions as { start: number; end: number; text: string }[]).find((c) => t >= c.start && t < c.end + 0.12);
  if (!cap) return null;
  const local = (t - cap.start) * FPS;
  const s = Math.min(1, local / 4);
  return (
    <div style={{ position: "absolute", top: 1450, left: 50, right: 50, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: "rgba(8,14,32,0.82)",
          color: "#fff",
          fontSize: 56,
          fontWeight: 600,
          lineHeight: 1.15,
          textAlign: "center",
          padding: "18px 30px",
          borderRadius: 26,
          border: `4px solid ${C.yellow}`,
          transform: `scale(${0.92 + 0.08 * s})`,
          opacity: s,
        }}
      >
        {cap.text}
      </div>
    </div>
  );
};

const FadeIn: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 8 }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: ramp(frame, 0, frames) }}>{children}</AbsoluteFill>;
};

// ── scenes ──────────────────────────────────────────────────────

const ROOM_CLICK = 21; // 0.7 s

const Room: React.FC<{ on: number; press: number; swing: number; switchOn: boolean }> = ({ on, press, swing, switchOn }) => (
  <Svg>
    <rect width={W} height={H} fill={C.wall} />
    <rect y={1350} width={W} height={570} fill="#C89B6D" />
    {Array.from({ length: 8 }).map((_, i) => (
      <line key={i} x1={i * 140} y1={1350} x2={i * 140 - 80} y2={H} stroke="#B3875A" strokeWidth={4} />
    ))}
    {/* window with night city */}
    <g transform="translate(90 640)">
      <rect width={380} height={460} fill="url(#nightSky)" />
      <g transform="translate(0 460) scale(0.352 0.5)">
        <City lit={0.5} glow={false} />
      </g>
      <rect width={380} height={460} fill="none" stroke="#fff" strokeWidth={20} />
      <line x1={190} y1={0} x2={190} y2={460} stroke="#fff" strokeWidth={12} />
    </g>
    {/* desk */}
    <rect x={560} y={1150} width={440} height={30} rx={8} fill="#7A5236" />
    <rect x={590} y={1180} width={26} height={190} fill="#6B4430" />
    <rect x={944} y={1180} width={26} height={190} fill="#6B4430" />
    <g transform="translate(860 1700) scale(0.9)">
      <ToolBag />
    </g>
    <g transform="translate(540 0)">
      <CeilingLamp on={on} swing={swing} />
    </g>
    <g transform="translate(860 880)">
      <LightSwitch on={switchOn} press={press} />
    </g>
    <rect width={W} height={H} fill="#02040C" opacity={0.86 * (1 - on)} />
  </Svg>
);

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const press = frame < ROOM_CLICK ? ramp(frame, 4, ROOM_CLICK) : 1 - ramp(frame, ROOM_CLICK + 4, ROOM_CLICK + 14);
  const flicker = frame >= ROOM_CLICK && frame < ROOM_CLICK + 6 ? (frame % 2 ? 0.5 : 0) : 0;
  const on = frame < ROOM_CLICK ? 1 : flicker;
  const swing = frame >= ROOM_CLICK ? Math.sin((frame - ROOM_CLICK) / 6) * 3 * Math.exp(-(frame - ROOM_CLICK) / 40) : 0;
  const shake = frame >= ROOM_CLICK && frame < ROOM_CLICK + 8 ? Math.sin(frame * 3) * 10 : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <Room on={on} press={press} swing={swing} switchOn={frame < ROOM_CLICK} />
      {frame >= ROOM_CLICK + 2 && (
        <Headline
          delay={ROOM_CLICK + 2}
          top={300}
          bg="rgba(255,255,255,0.08)"
          color={C.yellow}
          size={92}
          text="CO BY BYŁO, GDYBY NIKT TEGO NIE NAPRAWIŁ?"
        />
      )}
    </AbsoluteFill>
  );
};

const NoElectriciansScene: React.FC = () => {
  const frame = useCurrentFrame();
  const flick = frame % 23 < 2 ? 0.15 : 0;
  return (
    <FadeIn>
      <AbsoluteFill style={{ filter: "grayscale(1) brightness(0.75)" }}>
        <Svg>
          <rect width={W} height={H} fill="url(#nightSky)" />
          {Array.from({ length: 40 }).map((_, i) => (
            <circle key={i} cx={(i * 263) % W} cy={(i * 131) % 700 + 120} r={2 + (i % 3)} fill="#fff" opacity={0.5} />
          ))}
          <g transform={`translate(0 1120) scale(1 ${1 + frame * 0.0006})`}>
            <City lit={0.03 + flick} />
          </g>
          <g transform="translate(830 1180) scale(0.62)">
            <Factory running={false} t={0} />
          </g>
          <rect y={1180} width={W} height={740} fill="#1B1F2A" />
          <rect y={1360} width={W} height={18} fill="#3A3F4D" />
          <g transform={`translate(${300 + frame * 0.6} 1400) scale(0.95)`}>
            <Car charge={0.02} color="#6D7A92" />
          </g>
        </Svg>
      </AbsoluteFill>
      <Headline text="REGION BEZ ELEKTRYKÓW" bg={C.red} color={C.white} size={70} delay={4} icon={<svg width={90} height={90} viewBox="-90 -90 180 180"><Cross /></svg>} />
    </FadeIn>
  );
};

const REGION_ITEMS: { label: string; render: (t: number) => React.ReactNode }[] = [
  {
    label: "NOWE OSIEDLA",
    render: (t) => (
      <g>
        <g transform="translate(-330 0)">
          <Crane />
        </g>
        <g transform="translate(-140 0)">
          <NewBlock floors={7} lit={Math.min(1, t * 1.3)} />
        </g>
        <g transform="translate(220 0) scale(0.7)">
          <NewBlock floors={8} lit={Math.min(1, t * 1.6)} />
        </g>
      </g>
    ),
  },
  { label: "FABRYKI", render: (t) => <Factory running t={t * 2} /> },
  { label: "FOTOWOLTAIKA", render: (t) => <SolarRoof sun={0.5 + 0.5 * Math.sin(t * 6)} /> },
  {
    label: "ŁADOWARKI AUT",
    render: (t) => (
      <g>
        <g transform="translate(250 0)">
          <Charger active t={t * 3} />
        </g>
        <g transform="translate(-120 0) scale(0.95)">
          <Car charge={Math.min(1, 0.15 + t * 1.1)} />
        </g>
      </g>
    ),
  },
  { label: "POMPY CIEPŁA", render: (t) => <HeatPump t={t * 2} /> },
  {
    label: "POTRZEBNY ELEKTRYK!",
    render: (t) => (
      <g transform={`translate(0 -330) scale(${2.4 + 0.15 * Math.sin(t * 12)})`}>
        <circle r={130} fill={C.navy} />
        <Bolt />
      </g>
    ),
  },
];

/**
 * Start frames (relative to the region scene at 8 s) of each item, aligned with the voice-over:
 * the keyword's position inside the spoken sentence is mapped proportionally onto its duration.
 */
const REGION_STARTS: number[] = (() => {
  const caps = captions as { start: number; end: number; text: string }[];
  const keys = ["osiedla", "fabryki", "fotowoltaika", "ładowarki", "pompy"];
  const first = caps.findIndex((c) => c.text.includes("Nowe osiedla"));
  const last = caps.findIndex((c, i) => i >= first && c.text.includes("pompy ciepła"));
  const finale = caps.findIndex((c) => c.text.startsWith("Bez elektryka"));
  if (first < 0 || last < 0 || finale < 0) return [42, 82, 122, 162, 202, 242];
  const text = caps.slice(first, last + 1).map((c) => c.text).join(" ");
  const t0 = caps[first].start;
  const t1 = caps[last].end;
  const starts = keys.map((k) => Math.round(((t0 + ((t1 - t0) * text.indexOf(k)) / text.length) - 8) * FPS) - 4);
  return [...starts, Math.round((caps[finale].start - 8) * FPS) - 4];
})();

const RegionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const color = ramp(frame, 0, 24);
  const INTRO = REGION_STARTS[0];
  let idx = -1;
  for (let i = 0; i < REGION_STARTS.length; i++) if (frame >= REGION_STARTS[i]) idx = i;
  const per = (REGION_STARTS[idx + 1] ?? 300) - (REGION_STARTS[idx] ?? 0);
  const local = frame - (REGION_STARTS[idx] ?? 0);
  const enter = spring({ frame: local, fps: FPS, config: { damping: 14 } });
  const exit = ramp(local, per - 6, per);
  const growth = useSpring(4);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `grayscale(${1 - color}) brightness(${0.75 + 0.25 * color})` }}>
        <Svg>
          <rect width={W} height={H} fill="url(#daySky)" />
          <circle cx={900} cy={300} r={120} fill={C.yellow} opacity={0.7} />
          <g transform="translate(0 1350) scale(1 0.55)" opacity={0.35}>
            <City lit={0.2} glow={false} />
          </g>
          <rect y={1350} width={W} height={570} fill="#7BC67E" />
          <rect y={1350} width={W} height={20} fill="#5FA862" />
          {frame < INTRO && (
            <g transform={`translate(540 1000) scale(${growth})`}>
              <path d="M -300 200 L -100 0 L 20 100 L 260 -160" fill="none" stroke={C.green} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 160 -200 L 300 -200 L 300 -60 Z" fill={C.green} />
            </g>
          )}
          {idx >= 0 && idx < REGION_ITEMS.length && (
            <g transform={`translate(${540 + (1 - enter) * 700 - exit * 700} 1330) scale(${0.85 + 0.15 * enter})`}>
              {REGION_ITEMS[idx].render(local / per)}
            </g>
          )}
        </Svg>
      </AbsoluteFill>
      <Headline text="ELEKTRYK = ZAWÓD DEFICYTOWY" sub="na Dolnym Śląsku · wg Barometru Zawodów" size={62} delay={6} />
      {frame < INTRO && <Label text="DOLNY ŚLĄSK ROŚNIE!" top={560} delay={2} bg={C.green} size={72} />}
      {idx >= 0 && idx < REGION_ITEMS.length && (
        <Label key={idx} text={REGION_ITEMS[idx].label} top={520} delay={REGION_STARTS[idx] + 2} size={70} />
      )}
    </AbsoluteFill>
  );
};

const StepChips: React.FC<{ steps: string[]; active: number; top: number }> = ({ steps, active, top }) => (
  <div style={{ position: "absolute", top, left: 40, right: 40, display: "flex", justifyContent: "center", gap: 14 }}>
    {steps.map((s, i) => (
      <div
        key={s}
        style={{
          padding: "12px 22px",
          borderRadius: 999,
          fontSize: 38,
          fontWeight: 700,
          background: i === active ? C.yellow : i < active ? C.green : "rgba(255,255,255,0.18)",
          color: i === active ? C.navy : C.white,
          transform: `scale(${i === active ? 1.12 : 1})`,
        }}
      >
        {i < active ? "✓ " : ""}
        {s}
      </div>
    ))}
  </div>
);

const DayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const per = 90;
  const idx = Math.min(3, Math.floor(frame / per));
  const local = frame - idx * per;
  const enter = spring({ frame: local, fps: FPS, config: { damping: 13 } });
  const t = local / FPS;
  const subs: React.ReactNode[] = [
    <g key="0">
      <g transform="translate(-170 -480) scale(0.9)">
        <Clock t={t} />
      </g>
      <g transform="translate(170 0) scale(0.9)">
        <ToolBag />
      </g>
    </g>,
    <g key="1" transform="translate(0 -330)">
      <Schematic draw={ramp(local, 5, 70)} />
    </g>,
    <g key="2">
      <g transform="translate(-170 -340) scale(0.95)">
        <Socket />
      </g>
      <g transform={`translate(-170 -340) rotate(${-25 + Math.sin(t * 6) * 10}) translate(0 20)`}>
        <Screwdriver />
      </g>
      <g transform="translate(250 -300) scale(0.8)">
        <Meter value={Math.min(23, local * 0.6) / 10 + (local > 40 ? 0 : 0)} />
      </g>
    </g>,
    <g key="3">
      <g transform="translate(-150 -60)">
        <DeskLamp on={ramp(local, 18, 24)} />
      </g>
      <g transform={`translate(250 -420) scale(${spring({ frame: local - 30, fps: FPS, config: { damping: 10 } })})`}>
        <Check p={ramp(local, 34, 50)} />
      </g>
    </g>,
  ];
  return (
    <FadeIn>
      <Svg>
        <rect width={W} height={H} fill={C.navy} />
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={i} x1={i * 64} y1={0} x2={i * 64} y2={H} stroke="#13224A" strokeWidth={2} />
        ))}
        <rect y={1300} width={W} height={620} fill="#13224A" />
        <g transform={`translate(540 1300) scale(${0.8 + 0.2 * enter})`} opacity={enter}>
          {subs[idx]}
        </g>
      </Svg>
      <Headline text="DZIEŃ ELEKTRYKA" size={74} delay={2} top={200} />
      <StepChips steps={["6:30", "PLAN", "MONTAŻ I POMIARY", "TEST"]} active={idx} top={370} />
    </FadeIn>
  );
};

const SKILLS: { name: string; sub: string; color: string; icon: (t: number) => React.ReactNode }[] = [
  { name: "PRECYZJA", sub: "dokładność co do milimetra", color: C.red, icon: (t) => <Target t={t} /> },
  { name: "LOGICZNE MYŚLENIE", sub: "każda usterka to zagadka", color: "#B05BD8", icon: (t) => <Brain t={t} /> },
  { name: "BEZPIECZEŃSTWO", sub: "zawsze na 1. miejscu", color: C.orange, icon: () => (
      <g transform="translate(0 -40) scale(0.82)">
        <Helmet />
      </g>
    ) },
  { name: "PRACA W ZESPOLE", sub: "duże budowy robi ekipa", color: C.blue, icon: (t) => <Team t={t} /> },
];

const SkillsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const per = 90;
  const idx = Math.min(3, Math.floor(frame / per));
  const local = frame - idx * per;
  const enter = spring({ frame: local, fps: FPS, config: { damping: 12 } });
  const sk = SKILLS[idx];
  return (
    <FadeIn>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${sk.color} 160%)` }} />
      <Headline text="CO TRZEBA UMIEĆ?" size={74} delay={2} top={200} />
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {SKILLS.map((s, i) => (
          <div
            key={s.name}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: i <= idx ? s.color : "rgba(255,255,255,0.15)",
              border: "5px solid #fff",
              color: "#fff",
              fontSize: 36,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 500,
          left: 90,
          right: 90,
          height: 880,
          background: "#fff",
          borderRadius: 60,
          boxShadow: `0 24px 0 ${sk.color}`,
          transform: `translateY(${(1 - enter) * 600}px) rotate(${(1 - enter) * 8}deg)`,
          overflow: "hidden",
        }}
      >
        <svg width={900} height={600} viewBox="-450 -330 900 660" style={{ position: "absolute", top: 40, left: 0 }}>
          {sk.icon(local / FPS)}
        </svg>
        <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontSize: 80, fontWeight: 700, color: sk.color }}>{sk.name}</div>
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center", fontSize: 46, fontWeight: 500, color: C.navy }}>{sk.sub}</div>
      </div>
    </FadeIn>
  );
};

const PATH_STEPS: { n: number; title: string; lines: string[]; icon: React.ReactNode; color: string }[] = [
  { n: 1, title: "SZKOŁA", lines: ["Technikum → technik elektryk", "Szkoła branżowa → elektryk"], icon: <School />, color: C.blue },
  { n: 2, title: "PRAKTYKI", lines: ["u fachowców, w firmach", "i na budowach"], icon: <Workshop />, color: C.orange },
  { n: 3, title: "UPRAWNIENIA SEP", lines: ["świadectwo kwalifikacyjne", "egzamin przed komisją"], icon: <Certificate />, color: C.green },
];

const StartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const delays = [6, 90, 190];
  return (
    <FadeIn>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #0F1E45 0%, #1D3A7A 100%)" }} />
      <Svg>
        <line x1={190} y1={680} x2={190} y2={1250} stroke="rgba(255,255,255,0.35)" strokeWidth={10} strokeDasharray="24 20" strokeDashoffset={-frame * 2} />
      </Svg>
      <Headline text="JAK ZACZĄĆ?" size={80} delay={2} top={200} />
      {PATH_STEPS.map((s, i) => (
        <StepRow key={s.n} step={s} top={520 + i * 300} delay={delays[i]} />
      ))}
    </FadeIn>
  );
};

const StepRow: React.FC<{ step: (typeof PATH_STEPS)[number]; top: number; delay: number }> = ({ step, top, delay }) => {
  const s = useSpring(delay, 13);
  return (
    <div style={{ position: "absolute", top, left: 50, right: 50, height: 260, display: "flex", alignItems: "center", gap: 30, opacity: s, transform: `translateX(${(1 - s) * -300}px)` }}>
      <div style={{ width: 280, height: 260, borderRadius: 40, background: "#fff", border: `8px solid ${step.color}`, position: "relative", flexShrink: 0 }}>
        <svg width={264} height={244} viewBox="-200 -320 400 380">
          {step.icon}
        </svg>
        <div style={{ position: "absolute", top: -26, left: -26, width: 72, height: 72, borderRadius: 36, background: step.color, color: "#fff", fontSize: 44, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {step.n}
        </div>
      </div>
      <div style={{ color: "#fff" }}>
        <div style={{ fontSize: 60, fontWeight: 700, color: step.color === C.green ? C.green : C.yellow }}>{step.title}</div>
        {step.lines.map((l) => (
          <div key={l} style={{ fontSize: 40, fontWeight: 500, marginTop: 6 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const CLICK = 9; // 52.3 s
  const toCity = ramp(frame, 40, 52);
  const lit = ramp(frame, 46, 110);
  const end = 120;
  const endS = spring({ frame: frame - end, fps: FPS, config: { damping: 12 } });
  const press = frame < CLICK ? ramp(frame, 0, CLICK) : 1 - ramp(frame, CLICK + 4, CLICK + 12);
  const flash = interpolate(frame, [CLICK, CLICK + 3, CLICK + 12], [0, 0.85, 0], clamp);
  return (
    <AbsoluteFill>
      {toCity < 1 && (
        <AbsoluteFill style={{ opacity: 1 - toCity }}>
          <Room on={frame >= CLICK ? 1 : 0} press={press} swing={0} switchOn={frame >= CLICK} />
        </AbsoluteFill>
      )}
      {toCity > 0 && frame < end + 10 && (
        <AbsoluteFill style={{ opacity: toCity }}>
          <Svg>
            <rect width={W} height={H} fill="url(#nightSky)" />
            <rect width={W} height={H} fill="#3FA9F5" opacity={0.25 * lit} />
            <g transform="translate(0 1120)">
              <City lit={lit} />
            </g>
            <g transform="translate(830 1180) scale(0.62)">
              <Factory running t={frame / FPS} />
            </g>
            <rect y={1180} width={W} height={740} fill="#2B3550" />
            <rect y={1360} width={W} height={18} fill={C.yellow} opacity={0.6} />
            <g transform="translate(860 1400) scale(0.8)">
              <Charger active t={frame / FPS} />
            </g>
            <g transform="translate(400 1400) scale(0.95)">
              <Car charge={Math.min(1, lit * 1.1)} />
            </g>
          </Svg>
          <Headline text="REGION Z ELEKTRYKAMI" bg={C.green} color={C.white} size={70} delay={44} icon={<svg width={90} height={90} viewBox="-115 -115 230 230"><Check p={ramp(frame, 50, 64)} color={C.navy} /></svg>} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#FFF6C8", opacity: flash }} />
      {frame >= end && (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #24438F 0%, ${C.navy} 70%)`, opacity: Math.min(1, endS * 1.5) }}>
          <Svg>
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i / 16) * Math.PI * 2 + frame / 60;
              return <line key={i} x1={540} y1={720} x2={540 + Math.cos(a) * 900} y2={720 + Math.sin(a) * 900} stroke={C.yellow} strokeWidth={30} opacity={0.08} />;
            })}
            <g transform={`translate(540 720) scale(${2.6 * endS}) rotate(${(1 - endS) * -40})`}>
              <Bolt />
            </g>
          </Svg>
          <div style={{ position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", color: C.yellow, fontSize: 128, fontWeight: 700, letterSpacing: 4, transform: `scale(${endS})` }}>
            ELEKTRYK
          </div>
          <div style={{ position: "absolute", top: 1160, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 64, fontWeight: 600, opacity: ramp(frame, end + 12, end + 22) }}>
            zawód, który włącza przyszłość
          </div>
          <div style={{ position: "absolute", top: 1700, left: 60, right: 60, textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 30, fontWeight: 500, opacity: ramp(frame, end + 30, end + 40) }}>
            Prace przy instalacji elektrycznej wykonują tylko osoby z uprawnieniami.
            <br />
            Muzyka i grafika: autorskie, wygenerowane w kodzie.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ── composition ─────────────────────────────────────────────────

export const ELEKTRYK_ID = "ElektrykShort";

export const ElektrykShort: React.FC = () => {
  ensureFonts();
  const s = (sec: number) => Math.round(sec * FPS);
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, fontFamily: FONT_FAMILY }}>
      <Sequence from={s(0)} durationInFrames={s(3)}>
        <HookScene />
      </Sequence>
      <Sequence from={s(3)} durationInFrames={s(5)}>
        <NoElectriciansScene />
      </Sequence>
      <Sequence from={s(8)} durationInFrames={s(10)}>
        <RegionScene />
      </Sequence>
      <Sequence from={s(18)} durationInFrames={s(12)}>
        <DayScene />
      </Sequence>
      <Sequence from={s(30)} durationInFrames={s(12)}>
        <SkillsScene />
      </Sequence>
      <Sequence from={s(42)} durationInFrames={s(10)}>
        <StartScene />
      </Sequence>
      <Sequence from={s(52)} durationInFrames={s(8)}>
        <FinalScene />
      </Sequence>
      <Captions />
    </AbsoluteFill>
  );
};

void Easing;
