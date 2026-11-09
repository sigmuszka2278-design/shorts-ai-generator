/** Timeline produced by scripts/cost-short/build_assets.py (public/cost-short/<slug>/timeline.json). */
export interface CostWord {
  text: string;
  start: number;
  end: number;
  highlight: boolean;
}

export interface CostChunk {
  start: number;
  end: number;
  words: CostWord[];
}

export interface CostSegment {
  index: number;
  text: string;
  start: number;
  end: number;
  cost: number | null;
  total: boolean;
}

export interface CostStep {
  /** Second at which the narrator starts saying the amount. */
  at: number;
  add: number;
  /** Counter value after this step. */
  value: number;
}

export interface CostShot {
  src: string;
  start: number;
  end: number;
}

export interface CostTimeline {
  slug: string;
  title: string;
  fps: number;
  durationInSeconds: number;
  voice: string;
  music: string;
  cash: string;
  grain: string;
  segments: CostSegment[];
  chunks: CostChunk[];
  counter: { steps: CostStep[]; totalAt: number | null };
  shots: CostShot[];
}
