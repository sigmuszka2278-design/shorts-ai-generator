import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { ElektrykShort, ELEKTRYK_ID } from "./elektryk/ElektrykShort";
import { FPS as ELEKTRYK_FPS, TOTAL_SECONDS as ELEKTRYK_SECONDS } from "./elektryk/timeline";

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
    id={ELEKTRYK_ID}
    component={ElektrykShort}
    width={1080}
    height={1920}
    fps={ELEKTRYK_FPS}
    durationInFrames={ELEKTRYK_SECONDS * ELEKTRYK_FPS}
  />
  </>
);
