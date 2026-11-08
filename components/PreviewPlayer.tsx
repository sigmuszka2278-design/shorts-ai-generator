"use client";

import { Player, type PlayerRef } from "@remotion/player";
import React, { useEffect, useRef } from "react";
import type { SceneSpec } from "@/lib/scene/types";
import { KidsShort } from "@/remotion/KidsShort";

export function PreviewPlayer({ scene, autoPlay = true }: { scene: SceneSpec; autoPlay?: boolean }) {
  const ref = useRef<PlayerRef>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    player.seekTo(0);
    if (autoPlay) {
      // Browsers may block autoplay with sound – fall back to muted.
      try {
        player.play();
      } catch {
        /* user will press play */
      }
    }
  }, [scene, autoPlay]);

  return (
    <Player
      ref={ref}
      component={KidsShort as unknown as React.FC<Record<string, unknown>>}
      inputProps={scene as unknown as Record<string, unknown>}
      durationInFrames={Math.round(scene.durationInSeconds * scene.fps)}
      fps={scene.fps}
      compositionWidth={scene.width}
      compositionHeight={scene.height}
      style={{ width: "100%", height: "100%" }}
      controls
      loop
      clickToPlay
      doubleClickToFullscreen
      allowFullscreen
      numberOfSharedAudioTags={16}
      acknowledgeRemotionLicense
    />
  );
}
