import type { Team } from "../../lib/edit/timeline";

export interface TeamLook {
  /** rim light on the silhouette */
  rim: string;
  /** main glow color */
  glow: string;
  /** secondary light color (floodlights, particles) */
  accent: string;
  sky: [string, string];
  pitch: string;
}

export const LOOKS: Record<Team | "goat", TeamLook> = {
  real: { rim: "#fff1cc", glow: "#9d6bff", accent: "#e8c766", sky: ["#04020c", "#1e1042"], pitch: "#0a1a12" },
  united: { rim: "#ffd6cc", glow: "#ff1f1f", accent: "#ff4a2a", sky: ["#070000", "#3d0606"], pitch: "#0b140c" },
  portugal: { rim: "#ffe3b0", glow: "#ff2b2b", accent: "#18c26a", sky: ["#020704", "#2c0707"], pitch: "#08180d" },
  ucl: { rim: "#e3ecff", glow: "#3d7bff", accent: "#c4d6ff", sky: ["#00020c", "#071a55"], pitch: "#05101e" },
  neutral: { rim: "#e6f3ff", glow: "#3fa9ff", accent: "#9fd8ff", sky: ["#010204", "#0a1622"], pitch: "#05090c" },
  goat: { rim: "#ffe9a8", glow: "#ffb800", accent: "#ffd45a", sky: ["#030201", "#2a1a03"], pitch: "#0a0703" },
};
