import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { GoatEdit } from "./GoatEdit";
import { EDIT_DURATION_FRAMES, EDIT_FPS, EDIT_HEIGHT, EDIT_WIDTH } from "../lib/edit/timeline";

export const COMPOSITION_ID = "KidsShort";
export const GOAT_EDIT_ID = "GoatEdit";

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
  {/* "CR7 – THE GOAT" football edit: 9:16, 60 fps, rendered at scale 2 → 2160×3840 (4K) */}
  <Composition
    id={GOAT_EDIT_ID}
    component={GoatEdit as unknown as React.FC<Record<string, unknown>>}
    width={EDIT_WIDTH}
    height={EDIT_HEIGHT}
    fps={EDIT_FPS}
    durationInFrames={EDIT_DURATION_FRAMES}
    defaultProps={{ clips: {}, musicVolume: 1 }}
  />
  </>
);
