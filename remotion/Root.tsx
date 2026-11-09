import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { EPISODE_FPS, EPISODE_SECONDS } from "./episode/cues";
import { EPISODE_H, EPISODE_W, TosiaEpisode } from "./episode/Episode";

export const COMPOSITION_ID = "KidsShort";

const defaultScene = generateScene({
  prompt: "Kotek i piesek skaczą z kolorowymi kulkami pod tęczą",
  durationInSeconds: 10,
  style: "3d",
});

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="TosiaOdcinek1"
    component={TosiaEpisode as unknown as React.FC<Record<string, unknown>>}
    width={EPISODE_W}
    height={EPISODE_H}
    fps={EPISODE_FPS}
    durationInFrames={EPISODE_SECONDS * EPISODE_FPS}
    defaultProps={{ withAudio: true }}
  />
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
  </>
);
