import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import timeline from "./timeline.json";
import { Captions, type Caption } from "./Captions";
import { CutFlash, FilmGrade } from "./fx";
import { BacteriaScene } from "./scenes/BacteriaScene";
import { BeesScene } from "./scenes/BeesScene";
import { PhScene } from "./scenes/PhScene";
import { SpoonScene } from "./scenes/SpoonScene";
import { TombScene } from "./scenes/TombScene";

export const HONEY_COMPOSITION_ID = "HoneyShort";

export type HoneySceneId = "spoon-intro" | "tomb" | "bacteria" | "ph-strip" | "bees" | "spoon-outro";

export interface HoneyShortProps {
  /**
   * Optional real footage per scene (e.g. clips generated with a text-to-video
   * model from `remotion/honey/prompts.ts`). A scene with a clip shows the clip
   * instead of the code-drawn shot; captions, grade and audio stay the same.
   */
  clips?: Partial<Record<HoneySceneId, string>>;
  showCaptions?: boolean;
}

let fontsLoaded = false;
function ensureFonts() {
  if (fontsLoaded || typeof document === "undefined") return;
  fontsLoaded = true;
  loadFont({
    family: "Montserrat",
    url: staticFile("fonts/montserrat-900-latin.woff2"),
    weight: "900",
    unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  }).catch((e) => console.warn(e));
  loadFont({
    family: "Montserrat",
    url: staticFile("fonts/montserrat-900-latin-ext.woff2"),
    weight: "900",
    unicodeRange: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  }).catch((e) => console.warn(e));
}

export const HONEY_DURATION = timeline.durationInSeconds;
export const HONEY_FPS = timeline.fps;

const SCENES = timeline.scenes as { id: HoneySceneId; start: number; end: number }[];

function renderScene(id: HoneySceneId, t: number, T: number) {
  switch (id) {
    case "spoon-intro":
      return <SpoonScene variant="intro" t={t} T={T} />;
    case "tomb":
      return <TombScene t={t} />;
    case "bacteria":
      return <BacteriaScene t={t} />;
    case "ph-strip":
      return <PhScene t={t} />;
    case "bees":
      return <BeesScene t={t} />;
    case "spoon-outro":
      return <SpoonScene variant="outro" t={t} T={T} />;
  }
}

export const HoneyShort: React.FC<HoneyShortProps> = ({ clips = {}, showCaptions = true }) => {
  ensureFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#140800", overflow: "hidden" }}>
      {SCENES.map((s) => {
        const from = Math.round(s.start * fps);
        const len = Math.round(s.end * fps) - from;
        const clip = clips[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={len} name={s.id}>
            {clip ? (
              <OffthreadVideo src={clip} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              renderScene(s.id, T - s.start, T)
            )}
          </Sequence>
        );
      })}
      <FilmGrade frame={frame} />
      <CutFlash frame={frame} fps={fps} cuts={SCENES.slice(1).map((s) => s.start)} />
      {showCaptions ? <Captions captions={timeline.captions as Caption[]} time={T} /> : null}
      <Audio src={staticFile("honey/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
