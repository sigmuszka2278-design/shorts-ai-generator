/** Frame at which the ending text ("Pa, pa!") appears. */
export function outroStartFrame(totalFrames: number): number {
  const climax = Math.round(totalFrames * 0.6);
  return Math.max(climax + 15, totalFrames - Math.min(45, Math.round(totalFrames * 0.22)));
}

/** Frame of the "magic moment" (camera punch + flash). */
export function climaxFrame(totalFrames: number): number {
  return Math.round(totalFrames * 0.6);
}
