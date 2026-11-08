import React from "react";
import { shade } from "../../lib/scene/color";
import type { AnimalId } from "../../lib/scene/types";
import { blinkAt, createPaint, Face, Gloss, OUTLINE } from "../paint";

interface Props {
  id: string;
  variant: AnimalId;
  color: string;
  accent: string;
  size: number;
  is3d: boolean;
  frame: number;
  phase: number;
}

/** Cute chubby animal built from simple shapes (viewBox 200×220). */
export const Animal: React.FC<Props> = ({ id, variant, color, accent, size, is3d, frame, phase }) => {
  const { paint, stroke, renderDefs } = createPaint(`a-${id}`, is3d);
  const blink = blinkAt(frame, phase);
  const wave = Math.sin((frame + phase) / 6) * 18;
  const dark = shade(color, -0.35);
  const isPenguin = variant === "pingwin";
  const bodyColor = isPenguin ? color : color;
  const headColor = color;

  const ears: React.ReactNode = (() => {
    switch (variant) {
      case "kot":
        return (
          <>
            <path d="M 52 60 L 58 8 L 96 40 Z" fill={paint(color)} {...stroke} />
            <path d="M 148 60 L 142 8 L 104 40 Z" fill={paint(color)} {...stroke} />
            <path d="M 62 50 L 65 24 L 84 40 Z" fill="#ffb3c6" />
            <path d="M 138 50 L 135 24 L 116 40 Z" fill="#ffb3c6" />
          </>
        );
      case "lis":
        return (
          <>
            <path d="M 48 64 L 50 0 L 98 38 Z" fill={paint(color)} {...stroke} />
            <path d="M 152 64 L 150 0 L 102 38 Z" fill={paint(color)} {...stroke} />
            <path d="M 50 18 L 50 0 L 64 12 Z" fill={OUTLINE} />
            <path d="M 150 18 L 150 0 L 136 12 Z" fill={OUTLINE} />
          </>
        );
      case "pies":
        return (
          <>
            <ellipse cx={42} cy={88} rx={20} ry={44} fill={paint(dark)} {...stroke} transform={`rotate(${18 + wave * 0.2} 42 60)`} />
            <ellipse cx={158} cy={88} rx={20} ry={44} fill={paint(dark)} {...stroke} transform={`rotate(${-18 - wave * 0.2} 158 60)`} />
          </>
        );
      case "krolik":
        return (
          <>
            <ellipse cx={74} cy={-10} rx={17} ry={52} fill={paint(color)} {...stroke} transform={`rotate(${-10 + wave * 0.15} 74 40)`} />
            <ellipse cx={126} cy={-10} rx={17} ry={52} fill={paint(color)} {...stroke} transform={`rotate(${10 - wave * 0.15} 126 40)`} />
            <ellipse cx={74} cy={-6} rx={8} ry={38} fill={accent} transform={`rotate(${-10 + wave * 0.15} 74 40)`} />
            <ellipse cx={126} cy={-6} rx={8} ry={38} fill={accent} transform={`rotate(${10 - wave * 0.15} 126 40)`} />
          </>
        );
      case "mis":
      case "panda":
        return (
          <>
            <circle cx={50} cy={38} r={22} fill={paint(variant === "panda" ? accent : color)} {...stroke} />
            <circle cx={150} cy={38} r={22} fill={paint(variant === "panda" ? accent : color)} {...stroke} />
            {variant === "mis" && (
              <>
                <circle cx={50} cy={38} r={11} fill={accent} />
                <circle cx={150} cy={38} r={11} fill={accent} />
              </>
            )}
          </>
        );
      case "swinka":
        return (
          <>
            <path d="M 50 50 L 48 14 L 86 34 Z" fill={paint(shade(color, -0.1))} {...stroke} />
            <path d="M 150 50 L 152 14 L 114 34 Z" fill={paint(shade(color, -0.1))} {...stroke} />
          </>
        );
      case "jednorozec":
        return (
          <>
            <path d="M 56 52 L 60 18 L 88 38 Z" fill={paint(color)} {...stroke} />
            <path d="M 144 52 L 140 18 L 112 38 Z" fill={paint(color)} {...stroke} />
            {/* mane */}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={i}
                cx={52 - i * 3}
                cy={50 + i * 20}
                r={17}
                fill={paint(["#ff70a6", "#c77dff", "#70d6ff", "#ffd670", "#ff9770"][i])}
                {...stroke}
              />
            ))}
            {/* horn */}
            <path d="M 88 30 L 100 -28 L 112 30 Z" fill={paint("#ffd60a")} {...stroke} />
            <path d="M 92 16 L 108 10 M 95 0 L 105 -4" stroke="#f9a826" strokeWidth={4} />
          </>
        );
      case "smok":
        return (
          <>
            <path d="M 66 34 L 60 -4 L 86 26 Z" fill={paint(accent)} {...stroke} />
            <path d="M 134 34 L 140 -4 L 114 26 Z" fill={paint(accent)} {...stroke} />
            <path d="M 88 26 L 100 4 L 112 26 Z" fill={paint("#ffd60a")} {...stroke} />
          </>
        );
      case "zaba":
        return (
          <>
            <circle cx={66} cy={34} r={27} fill={paint(color)} {...stroke} />
            <circle cx={134} cy={34} r={27} fill={paint(color)} {...stroke} />
          </>
        );
      case "kaczka":
        return <path d="M 96 26 Q 92 2 110 4 Q 100 12 106 26 Z" fill={paint(color)} {...stroke} />;
      default:
        return null;
    }
  })();

  const wings =
    variant === "smok" ? (
      <>
        <path d={`M 56 140 Q ${0} ${100 - wave} ${10} ${170} Q 30 150 56 165 Z`} fill={paint(accent)} {...stroke} />
        <path d={`M 144 140 Q ${200} ${100 - wave} ${190} ${170} Q 170 150 144 165 Z`} fill={paint(accent)} {...stroke} />
      </>
    ) : null;

  const face: React.ReactNode = (() => {
    switch (variant) {
      case "zaba":
        return (
          <g>
            {[-1, 1].map((side) => (
              <g key={side} transform={`translate(${100 + side * 34} 32) scale(1 ${Math.max(0.1, 1 - blink)})`}>
                <circle r={17} fill="#fff" />
                <circle r={9} cx={2} cy={2} fill={OUTLINE} />
                <circle r={3.5} cx={-1} cy={-2} fill="#fff" />
              </g>
            ))}
            <path d="M 66 100 Q 100 128 134 100" stroke={OUTLINE} strokeWidth={5} fill="none" strokeLinecap="round" />
            <ellipse cx={60} cy={95} rx={10} ry={6} fill="#ff6b9a" opacity={0.5} />
            <ellipse cx={140} cy={95} rx={10} ry={6} fill="#ff6b9a" opacity={0.5} />
          </g>
        );
      case "kaczka":
        return (
          <g>
            <Face cx={100} cy={78} blink={blink} />
            <ellipse cx={100} cy={104} rx={26} ry={12} fill={paint(accent)} {...stroke} />
          </g>
        );
      case "pingwin":
        return (
          <g>
            <path d="M 100 52 C 60 20, 44 96, 70 122 L 130 122 C 156 96, 140 20, 100 52 Z" fill={paint(accent, "soft")} />
            <Face cx={100} cy={82} blink={blink} />
            <path d="M 88 100 L 112 100 L 100 114 Z" fill={paint("#ff9f1c")} {...stroke} />
          </g>
        );
      case "panda":
        return (
          <g>
            <ellipse cx={77} cy={84} rx={17} ry={21} fill={accent} transform="rotate(-25 77 84)" />
            <ellipse cx={123} cy={84} rx={17} ry={21} fill={accent} transform="rotate(25 123 84)" />
            {[-1, 1].map((side) => (
              <g key={side} transform={`translate(${100 + side * 22} 84) scale(1 ${Math.max(0.1, 1 - blink)})`}>
                <circle r={7} fill="#fff" />
                <circle r={3.5} cx={1} cy={1} fill={OUTLINE} />
              </g>
            ))}
            <ellipse cx={100} cy={104} rx={9} ry={6} fill={OUTLINE} />
            <path d="M 92 113 Q 100 120 108 113" stroke={OUTLINE} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </g>
        );
      default: {
        const muzzle =
          variant === "pies" || variant === "mis" || variant === "lis" || variant === "kot" || variant === "smok";
        return (
          <g>
            {muzzle && <ellipse cx={100} cy={106} rx={30} ry={20} fill={paint(accent, "soft")} />}
            <Face cx={100} cy={82} blink={blink} />
            {variant === "swinka" ? (
              <g>
                <ellipse cx={100} cy={108} rx={22} ry={15} fill={paint(shade(color, -0.12))} {...stroke} />
                <ellipse cx={93} cy={108} rx={4} ry={6} fill={shade(color, -0.5)} />
                <ellipse cx={107} cy={108} rx={4} ry={6} fill={shade(color, -0.5)} />
              </g>
            ) : variant === "krolik" ? (
              <g>
                <ellipse cx={100} cy={96} rx={6} ry={4.5} fill="#ff8fab" />
                <rect x={93} y={106} width={14} height={12} rx={3} fill="#fff" stroke={OUTLINE} strokeWidth={2} />
              </g>
            ) : variant === "jednorozec" ? (
              <ellipse cx={100} cy={100} rx={5} ry={3.5} fill="#ff8fab" />
            ) : (
              <ellipse cx={100} cy={97} rx={variant === "pies" ? 10 : 7} ry={variant === "pies" ? 7 : 5} fill={variant === "kot" ? "#ff8fab" : OUTLINE} />
            )}
            {variant === "kot" && (
              <g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round">
                <path d="M 62 100 L 34 94 M 62 106 L 34 110" />
                <path d="M 138 100 L 166 94 M 138 106 L 166 110" />
              </g>
            )}
          </g>
        );
      }
    }
  })();

  const shapes = (
    <g>
      {wings}
      {/* tail */}
      {variant === "lis" && (
        <path d="M 140 175 Q 205 170 190 110 Q 175 150 140 160 Z" fill={paint(color)} {...stroke} />
      )}
      {variant === "kot" && (
        <path d={`M 145 180 Q 190 ${170 - wave} 180 ${120 + wave * 0.5}`} stroke={dark} strokeWidth={12} fill="none" strokeLinecap="round" />
      )}
      {/* feet */}
      <ellipse cx={74} cy={204} rx={22} ry={13} fill={paint(isPenguin ? "#ff9f1c" : dark)} {...stroke} />
      <ellipse cx={126} cy={204} rx={22} ry={13} fill={paint(isPenguin ? "#ff9f1c" : dark)} {...stroke} />
      {/* body */}
      <ellipse cx={100} cy={160} rx={56} ry={48} fill={paint(bodyColor)} {...stroke} />
      <ellipse cx={100} cy={168} rx={34} ry={32} fill={paint(accent, "soft")} opacity={variant === "panda" ? 0 : 0.9} />
      {/* arms */}
      <ellipse cx={46} cy={150} rx={14} ry={24} fill={paint(isPenguin || variant === "panda" ? (variant === "panda" ? accent : color) : color)} {...stroke} transform={`rotate(${30 + wave} 50 135)`} />
      <ellipse cx={154} cy={150} rx={14} ry={24} fill={paint(isPenguin || variant === "panda" ? (variant === "panda" ? accent : color) : color)} {...stroke} transform={`rotate(${-30 - wave} 150 135)`} />
      {ears}
      {/* head */}
      {variant === "zaba" ? (
        <ellipse cx={100} cy={86} rx={70} ry={52} fill={paint(headColor)} {...stroke} />
      ) : (
        <circle cx={100} cy={82} r={62} fill={paint(headColor)} {...stroke} />
      )}
      {face}
      <Gloss cx={68} cy={46} rx={14} ry={8} is3d={is3d} opacity={0.5} />
    </g>
  );

  return (
    <svg width={size} height={(size * 260) / 230} viewBox="-15 -35 230 260" style={{ overflow: "visible" }}>
      {renderDefs()}
      {shapes}
    </svg>
  );
};
