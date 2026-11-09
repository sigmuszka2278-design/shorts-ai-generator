import React from "react";
import { Composition } from "remotion";
import { generateScene } from "../lib/scene/generator";
import type { SceneSpec } from "../lib/scene/types";
import { KidsShort } from "./KidsShort";
import { PortalShort } from "./portal/PortalShort";
import { DURATION_FRAMES, FPS, HEIGHT, PORTAL_SHORT_ID, WIDTH } from "./portal/timeline";

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
    {/* Hand-made 25 s Short: "TYLKO JEDEN PORTAL PROWADZI DO SKARBU!" (npm run portal:render) */}
    <Composition id={PORTAL_SHORT_ID} component={PortalShort} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION_FRAMES} />
  </>
);
