// Vertical Shorts cut of episode 1: the funniest part (jumps, tumble, "apsik!") + a call to action.
export const SHORTS_CUTS: { from: number; to: number }[] = [
  { from: 0, to: 6 },
  { from: 15.3, to: 19.6 },
  { from: 40.2, to: 66 },
  { from: 79.5, to: 83.6 },
];
export const SHORTS_CTA = 4;
export const SHORTS_SECONDS = SHORTS_CUTS.reduce((a, c) => a + c.to - c.from, 0) + SHORTS_CTA;

/** Maps Shorts time → episode time (null during the final call to action). */
export function shortsToEpisode(t: number): number | null {
  let at = 0;
  for (const c of SHORTS_CUTS) {
    const d = c.to - c.from;
    if (t < at + d) return c.from + (t - at);
    at += d;
  }
  return null;
}
