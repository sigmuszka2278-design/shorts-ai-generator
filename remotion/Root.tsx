import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { MRUCZEK_TIMELINE, MruczekShort } from "./stories/mruczek/MruczekShort";

export const COMPOSITION_ID = "KidsShort";
export const MRUCZEK_ID = "MruczekWasy";

const defaultScene = generateScene({
  prompt: "Kotek i piesek skaczą z kolorowymi kulkami pod tęczą",
  durationInSeconds: 10,
  style: "3d",
});

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id={COMPOSITION_ID}
    component={KidsShort as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={defaultScene.durationInSeconds * 30}
    defaultProps={defaultScene as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const scene = props as unknown as SceneSpec;
      return {
        durationInFrames: Math.round(scene.durationInSeconds * scene.fps),
        fps: scene.fps,
        width: scene.width,
        height: scene.height,
      };
    }}
  />
  {/* Scripted story: "Mruczek i jego wąsy" (≈42 s, Polish voiceover + captions) */}
  <Composition
    id={MRUCZEK_ID}
    component={MruczekShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={MRUCZEK_TIMELINE.durationInFrames}
  />
  </>
);
