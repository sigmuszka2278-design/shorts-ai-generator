import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { motionAt } from "../lib/scene/motion";
import { climaxFrame, outroStartFrame } from "../lib/scene/timeline";
import type { Actor, SceneSpec } from "../lib/scene/types";
import { Animal } from "./components/Animal";
import { Background } from "./components/Background";
import { Ball } from "./components/Ball";
import { FrontEffect, RainbowEffect } from "./components/Effects";
import { MagicItem } from "./components/MagicItem";
import { Outro, Title } from "./components/Texts";
import { ensureFonts } from "./fonts";

ensureFonts();

const W = 1080;
const H = 1920;

const SFX_LENGTH: Record<string, number> = {
  pop: 8,
  bubble: 9,
  boing: 20,
  sparkle: 28,
  whoosh: 18,
  chime: 48,
  magic: 42,
  tada: 48,
  squeak: 10,
  thump: 8,
};

const ActorView: React.FC<{ actor: Actor; frame: number; fps: number; is3d: boolean; camera: number }> = ({
  actor,
  frame,
  fps,
  is3d,
  camera,
}) => {
  const t = frame - actor.enterFrame;
  if (t < 0) return null;

  const enter = spring({
    frame: t,
    fps,
    config: actor.entrance === "drop" ? { damping: 7, mass: 0.8, stiffness: 120 } : { damping: 10, mass: 0.7, stiffness: 140 },
  });
  const cx = actor.x * W;
  const cy = actor.y * H;
  let ex = 0;
  let ey = 0;
  let es = 1;
  switch (actor.entrance) {
    case "pop":
      es = enter;
      break;
    case "drop":
      ey = (1 - enter) * -(cy + actor.size);
      break;
    case "slide-left":
      ex = (1 - enter) * -(cx + actor.size);
      break;
    case "slide-right":
      ex = (1 - enter) * (W - cx + actor.size);
      break;
    case "rise":
      ey = (1 - enter) * 700;
      es = 0.6 + 0.4 * enter;
      break;
  }

  // looping motion starts after the entrance has settled
  const amount = interpolate(t, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const m = motionAt(actor.motion, t, actor.size, actor.phase);
  const dx = m.dx * amount;
  const dy = m.dy * amount;

  // 3D: closer actors move more with the camera (parallax) and get a little bigger
  const parallax = is3d ? camera * (actor.depth - 0.5) * 60 : 0;
  const depthScale = is3d ? 0.85 + actor.depth * 0.25 : 1;
  const size = actor.size * depthScale;

  const x = cx + ex + dx + parallax;
  const y = cy + ey + dy;

  const groundY = cy + size * (actor.kind === "animal" ? 0.55 : 0.6);
  const lift = Math.max(0, -dy) / (actor.size * 0.9);
  const shadowScale = Math.max(0.35, 1 - lift * 0.6) * Math.min(1, enter);

  const content =
    actor.kind === "ball" ? (
      <Ball id={actor.id} color={actor.color} size={size} is3d={is3d} />
    ) : actor.kind === "animal" ? (
      <Animal id={actor.id} variant={actor.variant} color={actor.color} accent={actor.accent} size={size} is3d={is3d} frame={frame} phase={actor.phase} />
    ) : (
      <MagicItem id={actor.id} variant={actor.variant} color={actor.color} accent={actor.accent} size={size} is3d={is3d} frame={frame} phase={actor.phase} />
    );

  const farTint = is3d && actor.kind === "ball" ? 0.8 + actor.depth * 0.2 : 1;

  return (
    <>
      {actor.kind === "animal" && (
        <div
          style={{
            position: "absolute",
            left: cx + ex + dx + parallax - size * 0.4,
            top: groundY + ey - size * 0.06,
            width: size * 0.8,
            height: size * 0.14,
            borderRadius: "50%",
            background: is3d ? "radial-gradient(closest-side, rgba(0,0,0,0.35), rgba(0,0,0,0))" : "rgba(43,45,66,0.25)",
            transform: `scale(${shadowScale})`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${m.rotate * amount}deg) scale(${es * (1 + (m.scaleX - 1) * amount)}, ${es * (1 + (m.scaleY - 1) * amount)})`,
          transformOrigin: actor.kind === "magic" ? "50% 50%" : "50% 90%",
          filter: is3d ? `drop-shadow(0 ${size * 0.04}px ${size * 0.05}px rgba(0,0,0,0.25)) brightness(${farTint})` : undefined,
        }}
      >
        {content}
      </div>
    </>
  );
};

/** AI clip as background – decoded by Remotion's ffmpeg when rendering, looped if shorter than the film. */
const AiClip: React.FC<{ url: string; clipSeconds?: number; fps: number; total: number }> = ({ url, clipSeconds, fps, total }) => {
  const video = <OffthreadVideo src={url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  const clipFrames = clipSeconds ? Math.floor(clipSeconds * fps) : 0;
  if (!clipFrames || clipFrames >= total) return video;
  return <Loop durationInFrames={clipFrames}>{video}</Loop>;
};

export const KidsShort: React.FC<SceneSpec> = (scene) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const is3d = scene.style === "3d";
  const climax = climaxFrame(durationInFrames);
  const outroStart = outroStartFrame(durationInFrames);

  // Camera: slow push-in + a "punch" at the magic moment (3D style)
  const punch = spring({ frame: frame - climax, fps, config: { damping: 6, mass: 0.5 } });
  const punchScale = frame >= climax ? interpolate(punch, [0, 1], [1.06, 1]) : 1;
  const zoom = is3d ? interpolate(frame, [0, durationInFrames], [1.0, 1.07]) * punchScale : frame >= climax ? interpolate(punch, [0, 1], [1.03, 1]) : 1;
  const camera = Math.sin(frame / 70);
  const tilt = is3d ? Math.sin(frame / 90) * 0.6 : 0;

  const sorted = [...scene.actors].sort((a, b) => a.depth - b.depth);
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [0, 1], { extrapolateLeft: "clamp" });
  const fadeIn = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) rotate(${tilt}deg)`, transformOrigin: "50% 60%" }}>
        {scene.backgroundVideoUrl ? (
          <AbsoluteFill>
            <AiClip url={scene.backgroundVideoUrl} clipSeconds={scene.backgroundVideoDurationInSeconds} fps={fps} total={durationInFrames} />
          </AbsoluteFill>
        ) : (
          <Background theme={scene.theme} frame={frame} is3d={is3d} durationInFrames={durationInFrames} seed={scene.seed} />
        )}

        {scene.effects
          .filter((e) => e.kind === "rainbow")
          .map((e, i) => (
            <RainbowEffect key={`rb${i}`} effect={e} frame={frame} />
          ))}

        <AbsoluteFill>
          {sorted.map((actor) => (
            <ActorView key={actor.id} actor={actor} frame={frame} fps={fps} is3d={is3d} camera={camera} />
          ))}
        </AbsoluteFill>

        {scene.effects
          .filter((e) => e.kind !== "rainbow")
          .map((e, i) => (
            <FrontEffect key={`fx${i}`} effect={e} frame={frame} palette={scene.palette} seed={scene.seed} is3d={is3d} />
          ))}
      </AbsoluteFill>

      <Title text={scene.title} frame={frame} fps={fps} palette={scene.palette} is3d={is3d} />
      <Outro text={scene.outro} frame={frame} startFrame={outroStart} fps={fps} palette={scene.palette} />

      <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: fadeIn, pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: fadeOut * 0.6, pointerEvents: "none" }} />

      {scene.music && (
        <Audio
          src={staticFile(`music/${scene.music.track}.wav`)}
          volume={(f) =>
            scene.music!.volume *
            interpolate(f, [0, 10, durationInFrames - 25, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
      {scene.sounds.map((cue, i) => (
        <Sequence key={`${cue.sfx}-${i}`} from={cue.frame} durationInFrames={SFX_LENGTH[cue.sfx] ?? 30} layout="none">
          <Audio src={staticFile(`sfx/${cue.sfx}.wav`)} volume={cue.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
