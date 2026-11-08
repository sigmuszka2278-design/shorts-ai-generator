import React from "react";
import { shade } from "../../lib/scene/color";
import { createPaint, Gloss } from "../paint";

export const Ball: React.FC<{ id: string; color: string; size: number; is3d: boolean; withFace?: boolean; blink?: number }> = ({
  id,
  color,
  size,
  is3d,
}) => {
  const { paint, stroke, renderDefs } = createPaint(`b-${id}`, is3d);
  const body = (
    <g>
      <circle cx={50} cy={50} r={46} fill={paint(color)} {...(is3d ? {} : { ...stroke, strokeWidth: 3.5 })} />
      {is3d && <circle cx={50} cy={50} r={46} fill="none" stroke={shade(color, 0.5)} strokeWidth={1.5} opacity={0.5} />}
      {/* stripe for a toy-ball look */}
      <path
        d="M 8 58 Q 50 76 92 58"
        stroke={shade(color, is3d ? 0.45 : 0.55)}
        strokeWidth={6}
        fill="none"
        opacity={0.55}
        strokeLinecap="round"
      />
      <Gloss cx={34} cy={30} rx={12} ry={7} is3d={is3d} opacity={0.85} />
      {is3d && <circle cx={64} cy={70} r={4} fill="#fff" opacity={0.35} />}
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      {renderDefs()}
      {body}
    </svg>
  );
};
