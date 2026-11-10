import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import credits from "../../public/mrozek/credits.json";
import landmarks from "../../public/mrozek/portrait_landmarks.json";
import { ensureFilmFonts, SANS, SERIF, TITLE } from "./fonts";
import { buildTimeline, FPS, HEIGHT, WIDTH, type PlacedSegment } from "./timeline";
import { VISUALS, type KenBurns, type Plate, type VisualSpec } from "./visuals";

type Credit = { file: string; label: string; author: string; license: string; page: string; title: string };
const CREDITS = credits as Record<string, Credit>;

const INK = "#f3ede1";
const GOLD = "#c8b07a";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ───────────────────────── portret: geometria twarzy ─────────────────────────
const PORTRAIT_W = 1320;
const PORTRAIT_H = 1984;
const face = (() => {
  const pts = (landmarks as number[][]).slice(0, 468);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2 / PORTRAIT_W, cy: ((y0 + y1) / 2 - (y1 - y0) * 0.06) / PORTRAIT_H, h: (y1 - y0) / PORTRAIT_H };
})();

/** Kadr portretu: z=0 cały portret, z=1 zbliżenie twarzy. Zwraca pozycję i rozmiar obrazu. */
function portraitFrame(z: number, boxW: number, boxH: number) {
  const aspect = PORTRAIT_W / PORTRAIT_H;
  const h0 = boxH * 1.04;
  const h1 = (boxH * 0.66) / face.h;
  const h = interpolate(z, [0, 1], [h0, h1]);
  const w = h * aspect;
  const p0x = boxW / 2 + (face.cx - 0.5) * h0 * aspect;
  const p0y = boxH / 2 + (face.cy - 0.5) * h0;
  const px = interpolate(z, [0, 1], [p0x, boxW / 2]);
  const py = interpolate(z, [0, 1], [p0y, boxH * 0.47]);
  return { left: px - face.cx * w, top: py - face.cy * h, width: w, height: h };
}

// ───────────────────────── grupy ujęć ─────────────────────────
interface Shot {
  key: string;
  spec: VisualSpec;
  segments: PlacedSegment[];
  from: number;
  to: number;
  zoom: [number, number];
}

const TALK_ZOOM: Record<string, [number, number]> = {
  intro1: [0.0, 0.62],
  c1b: [0.42, 0.6],
  c2b: [0.68, 0.86],
  c3b: [0.3, 0.46],
  c4f: [0.78, 1.0],
  c6a: [0.38, 0.72],
  end1: [0.15, 0.8],
};

function buildShots(segments: PlacedSegment[]): Shot[] {
  const shots: Shot[] = [];
  for (const s of segments) {
    const spec = VISUALS[s.visual];
    if (!spec) throw new Error(`Brak wizualizacji: ${s.visual}`);
    const last = shots[shots.length - 1];
    if (last && last.spec.kind === "talk" && spec.kind === "talk" && last.key === s.visual) {
      last.segments.push(s);
      last.to = s.visualTo;
      continue;
    }
    shots.push({ key: s.visual, spec, segments: [s], from: s.visualFrom, to: s.visualTo, zoom: TALK_ZOOM[s.id] ?? [0.35, 0.55] });
  }
  return shots;
}

// ───────────────────────── komponenty ─────────────────────────
const TalkingPortrait: React.FC<{
  shot: Shot;
  boxW: number;
  boxH: number;
  zoom: [number, number];
  bw?: boolean;
}> = ({ shot, boxW, boxH, zoom, bw }) => {
  const frame = useCurrentFrame(); // względem początku ujęcia
  const len = shot.to - shot.from;
  const z = interpolate(frame, [0, len], zoom, { ...clamp, easing: Easing.inOut(Easing.sin) });
  const r = portraitFrame(z, boxW, boxH);
  const t = frame / FPS;
  // „oddech” i delikatne kołysanie głowy
  const sway = Math.sin(t * 0.45) * 0.35 + Math.sin(t * 1.3 + 1) * 0.12;
  const breathe = 1 + Math.sin(t * 1.55) * 0.0035;
  const dy = Math.sin(t * 1.55 + 0.6) * 2.2;
  const filter = bw ? "grayscale(1) contrast(1.18) brightness(0.98)" : "grayscale(1) sepia(0.28) contrast(1.06) brightness(1.02)";
  // miękka winieta wtapia brzegi odbitki w tło
  const mask = "radial-gradient(ellipse 54% 52% at 50% 44%, #000 62%, transparent 100%)";
  const style: React.CSSProperties = {
    position: "absolute",
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    maskImage: mask,
    WebkitMaskImage: mask,
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", filter }}>
      <Img src={staticFile("mrozek/portrait_hd.png")} style={{ position: "absolute", inset: -60, width: boxW + 120, height: boxH + 120, objectFit: "cover", filter: "blur(36px) brightness(0.32)" }} />
      <AbsoluteFill style={{ transform: `translateY(${dy}px) rotate(${sway}deg) scale(${breathe})`, transformOrigin: `${(r.left + face.cx * r.width).toFixed(0)}px ${(r.top + r.height * 0.8).toFixed(0)}px` }}>
        <Img src={staticFile("mrozek/portrait_hd.png")} style={style} />
        {shot.segments.map((s) => (
          <Sequence key={s.id} from={s.from - shot.from} durationInFrames={s.frames + 2} layout="none">
            <OffthreadVideo src={staticFile(`mrozek/talk/${s.id}.mp4`)} muted style={style} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 70% at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

function kbTransform(kb: KenBurns, p: number): string {
  const e = Easing.inOut(Easing.sin)(p);
  switch (kb) {
    case "in":
      return `scale(${1.04 + 0.1 * e})`;
    case "out":
      return `scale(${1.14 - 0.1 * e})`;
    case "left":
      return `scale(1.12) translateX(${3.5 - 7 * e}%)`;
    case "right":
      return `scale(1.12) translateX(${-3.5 + 7 * e}%)`;
    case "up":
      return `scale(1.1) translateY(${3 - 6 * e}%)`;
    case "down":
      return `scale(1.1) translateY(${-3 + 6 * e}%)`;
  }
}

const PhotoLayer: React.FC<{ img: string; kb: KenBurns; focus?: [number, number]; fit?: "cover" | "contain"; len: number }> = ({ img, kb, focus = [0.5, 0.5], fit = "cover", len }) => {
  const frame = useCurrentFrame();
  const c = CREDITS[img];
  const src = staticFile(`mrozek/img/${c?.file ?? img + ".jpg"}`);
  const p = interpolate(frame, [0, len], [0, 1], clamp);
  const origin = `${focus[0] * 100}% ${focus[1] * 100}%`;
  const tone = "grayscale(0.55) sepia(0.35) contrast(1.06) brightness(0.92)";
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0b0a09" }}>
      {fit === "contain" && (
        <Img src={src} style={{ position: "absolute", inset: -80, width: WIDTH + 160, height: HEIGHT + 160, objectFit: "cover", filter: `blur(40px) brightness(0.3) ${tone}` }} />
      )}
      <AbsoluteFill style={{ transform: kbTransform(kb, p), transformOrigin: origin }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: fit, objectPosition: origin, filter: tone }} />
      </AbsoluteFill>
      <PhotoCredit c={c} />
    </AbsoluteFill>
  );
};

const PhotoCredit: React.FC<{ c?: Credit }> = ({ c }) =>
  c ? (
    <div style={{ position: "absolute", right: 34, top: 28, fontFamily: SANS, fontSize: 17, color: "rgba(243,237,225,0.62)", textShadow: "0 1px 3px #000", letterSpacing: 0.3 }}>
      fot. {c.author} · {c.license} · Wikimedia Commons
    </div>
  ) : null;

const PlaceLabel: React.FC<{ place: string; date?: string }> = ({ place, date }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [12, 34], [0, 1], clamp);
  const line = interpolate(frame, [8, 40], [0, 120], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 80, top: 70, color: INK, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
      {date && (
        <div style={{ fontFamily: TITLE, fontStyle: "italic", fontSize: 92, lineHeight: 1, opacity: a, transform: `translateY(${(1 - a) * 14}px)`, letterSpacing: 2 }}>
          {date}
        </div>
      )}
      <div style={{ width: line, height: 2, background: GOLD, margin: "18px 0 14px" }} />
      <div style={{ fontFamily: SANS, fontSize: 25, letterSpacing: 5, textTransform: "uppercase", opacity: a }}>{place}</div>
    </div>
  );
};

const PhotosShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const spec = shot.spec as Extract<VisualSpec, { kind: "photos" }>;
  const len = shot.to - shot.from;
  const total = spec.shots.reduce((a, s) => a + (s.share ?? 1), 0);
  let acc = 0;
  return (
    <AbsoluteFill>
      {spec.shots.map((s, i) => {
        const from = Math.round((acc / total) * len);
        acc += s.share ?? 1;
        const dur = len - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Fade frames={i === 0 ? 0 : 18}>
              <PhotoLayer img={s.img} kb={s.kb} focus={s.focus} fit={s.fit} len={Math.round((len * (s.share ?? 1)) / total) + 30} />
            </Fade>
          </Sequence>
        );
      })}
      <PlaceLabel place={spec.place} date={spec.date} />
    </AbsoluteFill>
  );
};

const StripShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const spec = shot.spec as Extract<VisualSpec, { kind: "strip" }>;
  const frame = useCurrentFrame();
  const len = shot.to - shot.from;
  const c = CREDITS[spec.img];
  const h = 620;
  const w = (h * 3840) / 628;
  const x = interpolate(frame, [0, len], [80, WIDTH - w - 80], { ...clamp, easing: Easing.inOut(Easing.sin) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#070707" }}>
      <Img src={staticFile(`mrozek/img/${c.file}`)} style={{ position: "absolute", top: (HEIGHT - h) / 2 + 30, left: x, height: h, width: w, filter: "contrast(1.08) sepia(0.15)" }} />
      <PhotoCredit c={c} />
      <PlaceLabel place={spec.place} date={spec.date} />
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const o = frames ? interpolate(frame, [0, frames], [0, 1], clamp) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

// ───────────────────────── plansze ─────────────────────────
const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at 40% 35%, #efe4cc 0%, #e2d3b2 55%, #c9b68f 100%)",
      color: "#2b2318",
      boxShadow: "inset 0 0 120px rgba(80,55,20,0.45)",
    }}
  >
    <Img src={staticFile("mrozek/fx/grain3.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply", opacity: 0.22 }} />
    {children}
  </AbsoluteFill>
);

const Reveal: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [delay, delay + 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ opacity: a, transform: `translateY(${(1 - a) * 16}px)`, ...style }}>{children}</div>;
};

const PlateView: React.FC<{ plate: Plate }> = ({ plate }) => {
  const pad: React.CSSProperties = { position: "absolute", inset: "90px 90px 150px 90px", display: "flex", flexDirection: "column", justifyContent: "center" };
  switch (plate.type) {
    case "press":
      return (
        <Paper>
          <div style={pad}>
            <Reveal delay={6}>
              <div style={{ fontFamily: SANS, letterSpacing: 6, fontSize: 22, textTransform: "uppercase", borderBottom: "3px double #2b2318", paddingBottom: 12 }}>
                Kraków · 1950 · początki w prasie
              </div>
            </Reveal>
            {[
              ["„Dziennik Polski”", "praca w redakcji krakowskiego dziennika (1950–1954)"],
              ["„Przekrój”", "reportaż „Młode miasto” o budowie Nowej Huty"],
              ["„Szpilki”", "nagroda tygodnika satyrycznego za rysunek"],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={22 + i * 22} style={{ marginTop: 34, borderBottom: "1px solid rgba(43,35,24,0.35)", paddingBottom: 22 }}>
                <div style={{ fontFamily: TITLE, fontSize: 58, fontWeight: 700 }}>{t}</div>
                <div style={{ fontFamily: SERIF, fontSize: 34, fontStyle: "italic", marginTop: 6 }}>{d}</div>
              </Reveal>
            ))}
          </div>
        </Paper>
      );
    case "books":
      return (
        <Paper>
          <div style={{ ...pad, alignItems: "center" }}>
            <Reveal delay={4}>
              <div style={{ fontFamily: SANS, letterSpacing: 6, fontSize: 22, textTransform: "uppercase", marginBottom: 40 }}>{plate.note}</div>
            </Reveal>
            <div style={{ display: "flex", gap: 48 }}>
              {plate.books.map((b, i) => (
                <Reveal key={b.title} delay={18 + i * 20}>
                  <BookCard title={b.title} meta={b.meta} />
                </Reveal>
              ))}
            </div>
          </div>
        </Paper>
      );
    case "book":
      return (
        <Paper>
          <div style={{ ...pad, alignItems: "center", flexDirection: "row", gap: 70 }}>
            <Reveal delay={6}>
              <BookCard title={plate.title} meta={plate.meta} big />
            </Reveal>
            {plate.lines && (
              <div>
                {plate.lines.map((l, i) => (
                  <Reveal key={l} delay={30 + i * 18} style={{ fontFamily: SERIF, fontSize: 40, fontStyle: "italic", marginBottom: 18, borderLeft: `3px solid ${GOLD}`, paddingLeft: 20 }}>
                    {l}
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Paper>
      );
    case "baltazar":
      return (
        <Paper>
          <div style={{ ...pad, alignItems: "center" }}>
            <Reveal delay={6}>
              <BookCard title="Baltazar" sub="Autobiografia" meta="2006" big />
            </Reveal>
            <Reveal delay={40} style={{ marginTop: 40, fontFamily: SERIF, fontSize: 34, fontStyle: "italic", textAlign: "center" }}>
              wspomnienia spisywane w czasie terapii afazji
            </Reveal>
            <Reveal delay={60} style={{ marginTop: 26 }}>
              <Img src={staticFile("mrozek/img/signature.png")} style={{ width: 380, opacity: 0.85 }} />
            </Reveal>
          </div>
        </Paper>
      );
    case "awards":
      return (
        <Paper>
          <div style={pad}>
            <Reveal delay={4}>
              <div style={{ fontFamily: SANS, letterSpacing: 6, fontSize: 22, textTransform: "uppercase", borderBottom: "3px double #2b2318", paddingBottom: 12, marginBottom: 14 }}>
                Wybrane wyróżnienia
              </div>
            </Reveal>
            {[
              ["1972", "Austriacka Nagroda Państwowa w dziedzinie Literatury Europejskiej"],
              ["2003", "Legia Honorowa (Francja)"],
              ["", "Doktorat honoris causa Uniwersytetu Jagiellońskiego"],
              ["", "Honorowe obywatelstwo Krakowa"],
              ["2013", "Krzyż Wielki Orderu Odrodzenia Polski (pośmiertnie)"],
            ].map(([y, t], i) => (
              <Reveal key={t} delay={16 + i * 26} style={{ display: "flex", alignItems: "baseline", gap: 28, marginTop: 24 }}>
                <div style={{ fontFamily: TITLE, fontStyle: "italic", fontSize: 44, width: 130, color: "#7a5a24" }}>{y || "·"}</div>
                <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 600, lineHeight: 1.15 }}>{t}</div>
              </Reveal>
            ))}
          </div>
        </Paper>
      );
  }
};

const BookCard: React.FC<{ title: string; meta: string; sub?: string; big?: boolean }> = ({ title, meta, sub, big }) => (
  <div
    style={{
      width: big ? 430 : 360,
      height: big ? 600 : 500,
      background: "linear-gradient(135deg, #3a2f22, #241c13)",
      color: "#efe4cc",
      boxShadow: "18px 22px 40px rgba(0,0,0,0.45), inset 0 0 0 10px #2b2318, inset 0 0 0 12px " + GOLD,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: 40,
      boxSizing: "border-box",
    }}
  >
    <div style={{ fontFamily: SANS, letterSpacing: 5, fontSize: 18, textTransform: "uppercase", color: GOLD }}>Sławomir Mrożek</div>
    <div style={{ width: 60, height: 1, background: GOLD, margin: "26px 0" }} />
    <div style={{ fontFamily: TITLE, fontSize: big ? 60 : 44, lineHeight: 1.12, fontWeight: 700 }}>{title}</div>
    {sub && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 34, marginTop: 10 }}>{sub}</div>}
    <div style={{ width: 60, height: 1, background: GOLD, margin: "26px 0" }} />
    <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 28 }}>{meta}</div>
  </div>
);

const SplitShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const spec = shot.spec as Extract<VisualSpec, { kind: "split" }>;
  const leftW = 740;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0a09" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: leftW, height: HEIGHT, overflow: "hidden" }}>
        <TalkingPortrait shot={shot} boxW={leftW} boxH={HEIGHT} zoom={[0.42, 0.5]} />
      </div>
      <div style={{ position: "absolute", left: leftW, top: 0, width: WIDTH - leftW, height: HEIGHT, overflow: "hidden" }}>
        <PlateView plate={spec.plate} />
      </div>
      <div style={{ position: "absolute", left: leftW - 2, top: 0, width: 4, height: HEIGHT, background: `linear-gradient(${GOLD}00, ${GOLD}, ${GOLD}00)`, opacity: 0.6 }} />
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const fadeIn = shot.from === 0 ? interpolate(frame, [0, 75], [0, 1], clamp) : interpolate(frame, [0, 18], [0, 1], clamp);
  let content: React.ReactNode;
  switch (shot.spec.kind) {
    case "talk":
      content = <TalkingPortrait shot={shot} boxW={WIDTH} boxH={HEIGHT} zoom={shot.zoom} bw={shot.spec.bw} />;
      break;
    case "photos":
      content = <PhotosShot shot={shot} />;
      break;
    case "strip":
      content = <StripShot shot={shot} />;
      break;
    case "split":
      content = <SplitShot shot={shot} />;
      break;
  }
  return <AbsoluteFill style={{ opacity: fadeIn }}>{content}</AbsoluteFill>;
};

// ───────────────────────── plansza rozdziału ─────────────────────────
const ChapterCard: React.FC<{ n: number; title: string; years: string; frames: number }> = ({ n, title, years, frames }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14, frames - 22, frames], [0, 1, 1, 0], clamp);
  const a = interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const line = interpolate(frame, [4, 46], [0, 260], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ opacity: o, backgroundColor: "#090807", justifyContent: "center", alignItems: "center", color: INK }}>
      <div style={{ fontFamily: SANS, letterSpacing: 10, fontSize: 24, color: GOLD, textTransform: "uppercase", opacity: a }}>Rozdział {n}</div>
      <div style={{ width: line, height: 1, background: GOLD, margin: "26px 0 30px" }} />
      <div style={{ fontFamily: TITLE, fontSize: 86, transform: `translateY(${(1 - a) * 18}px)`, opacity: a, textAlign: "center" }}>{title}</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40, marginTop: 18, opacity: a * 0.85 }}>{years}</div>
    </AbsoluteFill>
  );
};

// ───────────────────────── napisy ─────────────────────────
const Subtitles: React.FC<{ segments: PlacedSegment[] }> = ({ segments }) => {
  const frame = useCurrentFrame();
  for (const s of segments) {
    if (frame < s.from - 5 || frame > s.from + s.frames + 15) continue;
    const t = (frame - s.from) / FPS;
    const cue = s.cues.find((c) => t >= c.start - 0.12 && t <= c.end + 0.25);
    if (!cue) return null;
    const o = Math.min(interpolate(t, [cue.start - 0.12, cue.start], [0, 1], clamp), interpolate(t, [cue.end + 0.1, cue.end + 0.25], [1, 0], clamp));
    return (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 54, display: "flex", justifyContent: "center", opacity: o }}>
        <div
          style={{
            maxWidth: 1480,
            padding: "10px 28px 12px",
            background: "rgba(8,7,6,0.58)",
            borderRadius: 6,
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: 46,
            lineHeight: 1.22,
            color: "#f7f2e8",
            textAlign: "center",
            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
          }}
        >
          {cue.text}
        </div>
      </div>
    );
  }
  return null;
};

// ───────────────────────── efekt starego filmu ─────────────────────────
const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const g = Math.floor(frame / 2) % 6;
  const ox = Math.floor(random(`gx${frame}`) * 200);
  const oy = Math.floor(random(`gy${frame}`) * 120);
  const flicker = 0.035 + random(`fl${Math.floor(frame / 2)}`) * 0.045;
  const block = Math.floor(frame / 3);
  const scratches = random(`sc${Math.floor(frame / 40)}`) < 0.35 ? [0, 1].filter((i) => random(`sn${block}${i}`) < 0.6) : [];
  const dust = random(`du${frame}`) < 0.25 ? [0, 1, 2] : [];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img src={staticFile(`mrozek/fx/grain${g}.png`)} style={{ position: "absolute", left: -ox, top: -oy, width: WIDTH + 200, height: HEIGHT + 120, mixBlendMode: "overlay", opacity: 0.2 }} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: flicker }} />
      {scratches.map((i) => (
        <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${(random(`sx${Math.floor(frame / 40)}${i}`) * 90 + 5).toFixed(2)}%`, width: 1.5, background: "rgba(235,228,210,0.18)" }} />
      ))}
      {dust.map((i) => (
        <div key={i} style={{ position: "absolute", left: `${random(`dx${frame}${i}`) * 100}%`, top: `${random(`dy${frame}${i}`) * 100}%`, width: 2 + random(`ds${frame}${i}`) * 4, height: 2 + random(`dt${frame}${i}`) * 3, borderRadius: "50%", background: random(`dc${frame}${i}`) < 0.5 ? "rgba(0,0,0,0.5)" : "rgba(240,235,220,0.45)" }} />
      ))}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)" }} />
    </AbsoluteFill>
  );
};

// ───────────────────────── tytuł otwierający, zakończenie, źródła ─────────────────────────
const OpeningTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [40, 70, 150, 185], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", opacity: o, color: INK, textShadow: "0 2px 18px #000" }}>
      <div style={{ fontFamily: TITLE, fontSize: 64, letterSpacing: 10 }}>SŁAWOMIR MROŻEK</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 36, marginTop: 8, color: GOLD }}>moja historia</div>
    </div>
  );
};

const EndTitle: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 30, frames - 20, frames], [0, 1, 1, 0], clamp);
  const a = (d: number) => interpolate(frame, [d, d + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", opacity: o, justifyContent: "center", alignItems: "center", color: INK, textAlign: "center" }}>
      <div style={{ fontFamily: TITLE, fontSize: 104, letterSpacing: 14, opacity: a(10) }}>SŁAWOMIR MROŻEK</div>
      <div style={{ width: interpolate(frame, [20, 70], [0, 420], clamp), height: 1, background: GOLD, margin: "30px 0" }} />
      <div style={{ fontFamily: TITLE, fontStyle: "italic", fontSize: 64, opacity: a(30) }}>1930–2013</div>
      <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: 9, textTransform: "uppercase", marginTop: 26, color: GOLD, opacity: a(50) }}>
        Pisarz · dramaturg · satyryk
      </div>
      <Img src={staticFile("mrozek/img/signature.png")} style={{ width: 360, marginTop: 50, opacity: a(75) * 0.9, filter: "invert(1) brightness(0.95)" }} />
    </AbsoluteFill>
  );
};

const SOURCES = [
  "Encyclopaedia Britannica, hasło „Sławomir Mrożek”",
  "Culture.pl (Instytut Adama Mickiewicza), „Sławomir Mrożek”",
  "Wikipedia (pol. i ang.), hasło „Sławomir Mrożek”",
  "Dzieje.pl / PAP – serwis o Sławomirze Mrożku",
  "Uniwersytet Jagielloński – komunikat o śmierci doktora h.c. S. Mrożka (2013)",
  "Urząd Miasta Krakowa – komunikaty z sierpnia i września 2013",
  "Zintegrowana Platforma Edukacyjna (zpe.gov.pl) – twórczość S. Mrożka",
  "S. Mrożek, „Baltazar. Autobiografia” (2006)",
];

const Credits: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], clamp);
  const disclaimerAt = frames - 150;
  const scrollEnd = disclaimerAt - 10;
  const listH = 1700;
  const y = interpolate(frame, [10, scrollEnd], [HEIGHT, -listH], clamp);
  const d = interpolate(frame, [disclaimerAt, disclaimerAt + 25, frames - 15, frames], [0, 1, 1, 0], clamp);
  const photos = Object.values(CREDITS);
  const h = (t: string) => <div style={{ fontFamily: SANS, letterSpacing: 7, fontSize: 24, color: GOLD, textTransform: "uppercase", margin: "46px 0 16px" }}>{t}</div>;
  const row: React.CSSProperties = { fontFamily: SERIF, fontSize: 28, lineHeight: 1.35, color: INK };
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", opacity: o }}>
      <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center" }}>
        {h("Źródła informacji")}
        {SOURCES.map((s) => (
          <div key={s} style={row}>{s}</div>
        ))}
        {h("Fotografie – Wikimedia Commons")}
        {photos.map((c) => (
          <div key={c.file} style={{ ...row, fontSize: 24 }}>
            {c.label} – {c.author}, {c.license}
          </div>
        ))}
        {h("Dźwięk")}
        <div style={row}>Głos narratora: syntezator mowy (głos neuronowy pl-PL), nie naśladuje głosu pisarza</div>
        <div style={row}>Muzyka fortepianowa: kompozycja wygenerowana algorytmicznie na potrzeby filmu</div>
        {h("Kroje pisma")}
        <div style={row}>Playfair Display, Cormorant Garamond – SIL Open Font License</div>
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: d, backgroundColor: "#050505", padding: 160, textAlign: "center" }}>
        <div style={{ width: 120, height: 1, background: GOLD, marginBottom: 40 }} />
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 50, lineHeight: 1.3, color: INK }}>
          Film jest artystyczną rekonstrukcją biografii.
          <br />
          Narracja i animacja zostały stworzone przy użyciu AI.
        </div>
        <div style={{ width: 120, height: 1, background: GOLD, marginTop: 40 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ───────────────────────── film ─────────────────────────
export const TIMELINE = buildTimeline();

export const MrozekFilm: React.FC = () => {
  ensureFilmFonts();
  const tl = TIMELINE;
  const shots = useMemo(() => buildShots(tl.segments), [tl]);

  // muzyka ściszana pod głos (płynnie)
  const musicVolume = useMemo(() => {
    const target = new Float32Array(tl.total).fill(0.3);
    for (const s of tl.segments) for (let f = s.from - 8; f < s.from + s.frames + 6; f++) if (f >= 0 && f < tl.total) target[f] = 0.075;
    for (let f = tl.creditsFrom; f < tl.total; f++) target[f] = 0.34;
    // średnia krocząca (prefiks sum), okno ~0,8 s
    const k = 24;
    const prefix = new Float64Array(tl.total + 1);
    for (let f = 0; f < tl.total; f++) prefix[f + 1] = prefix[f] + target[f];
    const out = new Float32Array(tl.total);
    for (let f = 0; f < tl.total; f++) {
      const a = Math.max(0, f - k + 1);
      out[f] = (prefix[f + 1] - prefix[a]) / (f + 1 - a);
    }
    return out;
  }, [tl]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {shots.map((shot) => (
        <Sequence key={`${shot.key}-${shot.from}`} from={shot.from} durationInFrames={shot.to - shot.from}>
          <ShotView shot={shot} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={200}>
        <OpeningTitle />
      </Sequence>
      {tl.cards.map((c) => (
        <Sequence key={c.chapter.n} from={c.from} durationInFrames={c.frames}>
          <ChapterCard n={c.chapter.n} title={c.chapter.title} years={c.chapter.years} frames={c.frames} />
        </Sequence>
      ))}
      <Sequence from={tl.endTitleFrom} durationInFrames={tl.creditsFrom - tl.endTitleFrom}>
        <EndTitle frames={tl.creditsFrom - tl.endTitleFrom} />
      </Sequence>
      <Sequence from={tl.creditsFrom} durationInFrames={tl.total - tl.creditsFrom}>
        <Credits frames={tl.total - tl.creditsFrom} />
      </Sequence>
      <FilmLook />
      <Subtitles segments={tl.segments} />

      {tl.segments.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames + 3} layout="none">
          <Audio src={staticFile(s.audio)} volume={1} />
        </Sequence>
      ))}
      <Audio src={staticFile("mrozek/music/piano.m4a")} volume={(f) => musicVolume[Math.min(f, musicVolume.length - 1)] ?? 0.3} />
    </AbsoluteFill>
  );
};
