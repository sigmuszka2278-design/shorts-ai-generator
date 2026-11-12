import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { PIRATE_FPS, PIRATE_FRAMES, PIRATE_HEIGHT, PIRATE_WIDTH } from "../lib/pirate/timeline";
import { PIRATE_COMPOSITION_ID, PirateTokenShort } from "./pirate/PirateTokenShort";

export const COMPOSITION_ID = "KidsShort";

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
  <Composition
    id={PIRATE_COMPOSITION_ID}
    component={PirateTokenShort as unknown as React.FC<Record<string, unknown>>}
    width={PIRATE_WIDTH}
    height={PIRATE_HEIGHT}
    fps={PIRATE_FPS}
    durationInFrames={PIRATE_FRAMES}
    defaultProps={{ voiceover: null }}
  />
  </>
);
