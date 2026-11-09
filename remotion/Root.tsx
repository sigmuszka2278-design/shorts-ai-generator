import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { CostShort } from "./cost-short/CostShort";
import type { CostTimeline } from "./cost-short/types";
import costTimeline from "../public/cost-short/auto-na-rok/timeline.json";

export const COMPOSITION_ID = "KidsShort";
export const COST_COMPOSITION_ID = "CostShort";

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
    id={COST_COMPOSITION_ID}
    component={CostShort as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={Math.ceil((costTimeline as CostTimeline).durationInSeconds * 30)}
    defaultProps={costTimeline as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const t = props as unknown as CostTimeline;
      return { durationInFrames: Math.ceil(t.durationInSeconds * t.fps), fps: t.fps, width: 1080, height: 1920 };
    }}
  />
  </>
);
