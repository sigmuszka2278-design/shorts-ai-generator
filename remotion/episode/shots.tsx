import type { BrunoPose, TosiaPose } from "./characters";
import { songTimeline, talking } from "./cues";
import { easeOut, hop, hopSquash, kf, lerp, seg } from "./math";
import { EGG_POS, GROUND as G, SPOT, type SetId } from "./world";

export interface Cam {
  x: number;
  y: number;
  z: number;
}

export interface FreeBerry {
  x: number;
  y: number;
  r: number;
  split?: number;
  gap?: number;
  sparkle?: number;
}

export interface State {
  set: SetId;
  cam: Cam;
  shake?: number;
  tosia?: TosiaPose;
  bruno?: BrunoPose;
  berryOnBush?: boolean;
  berrySparkle?: number;
  berryFree?: FreeBerry;
  berryInPaw?: boolean;
  piece?: { x: number; y: number };
  bird?: { x: number; y: number; flap: boolean; facing: number; talk?: number };
  egg?: { wobble: number };
  backpack?: { x: number; y: number } | null;
  bursts?: { x: number; y: number; t: number; power?: number; count?: number; seed?: number }[];
  bushShake?: number;
  smallBushShake?: number;
  leafSquash?: number;
  pileFront?: "full" | "low";
  brunoNose?: { x: number; y: number };
  hearts?: { x: number; y: number; t: number };
}

interface Shot {
  s: number;
  e: number;
  f: (t: number, g: number) => State;
}

const B = SPOT.berry;
const BP = SPOT.backpack;
const STONE = SPOT.stone;
const JX = SPOT.jumpX;
const PILE = SPOT.leafPile.x;
const REACH_L = { l: 138, r: 25, lLen: 1.45 };
const REACH_R = { l: 25, r: 138, rLen: 1.45 };

const tos = (g: number, p: Partial<TosiaPose> & { x: number }): TosiaPose => ({
  y: G,
  talk: talking(g, "T"),
  scarfWave: g,
  ...p,
});
const bru = (g: number, p: Partial<BrunoPose> & { x: number }): BrunoPose => ({
  y: G,
  talk: talking(g, "B"),
  ...p,
});

const SYLS = songTimeline();
const singing = (g: number) => {
  const s = SYLS.find((x) => g >= x.s && g < x.e && x.text);
  if (!s) return 0;
  const k = (g - s.s) / (s.e - s.s);
  return 0.35 + 0.65 * Math.sin(Math.min(1, k * 1.4) * Math.PI);
};

const krzak = (p: Omit<State, "set">): State => ({ set: "krzak", berryOnBush: true, berrySparkle: 0.7, ...p });

// Tosia on the stone, Bruno near the backpack spot – used by several shots
const BRUNO_X = 2450;

const SHOTS: Shot[] = [
  // ── 0:00 HAK ───────────────────────────────────────────────
  { s: 0, e: 3, f: (t) => krzak({ cam: { x: B.x, y: B.y - 10, z: kf(t, [[0, 4.0], [3, 4.6]]) }, berrySparkle: 1 }) },
  {
    s: 3,
    e: 6,
    f: (t, g) => {
      const x = kf(t, [[0, 1420], [0.75, 1980]], easeOut);
      return krzak({
        cam: { x: 2030, y: 1470, z: 2.0 },
        tosia: tos(g, {
          x,
          rot: t > 0.45 && t < 1.2 ? -10 * Math.sin(((t - 0.45) / 0.75) * Math.PI) : 0,
          arms: { l: 40, r: 40 },
          eyes: "wide",
          mouth: "o",
          look: [0.4, -1],
          scarfWind: kf(t, [[0, 0.9], [1.6, 0]]),
        }),
      });
    },
  },
  {
    s: 6,
    e: 10,
    f: (t, g) =>
      krzak({
        cam: { x: 1985, y: 1495, z: kf(t, [[0, 3.6], [4, 4.3]]) },
        tosia: tos(g, { x: 1980, eyes: "wide", berryEyes: true, eyeScale: kf(t, [[0, 1], [1.2, 1.12]]), look: [0.3, -1], mouth: "o" }),
      }),
  },
  {
    s: 10,
    e: 15,
    f: (t, g) =>
      krzak({
        cam: { x: 1990, y: 1520, z: 2.3 },
        tosia: tos(g, {
          x: 1980,
          mouth: t < 0.5 ? "lick" : "grin",
          spin: kf(t, [[1.8, 0], [3.2, 1]]),
          lift: hop(t, 1.8, 1.4, 45),
          arms: { l: 70, r: 70 },
          eyes: t > 3.2 ? "happy" : "open",
          scarfWind: t > 1.8 && t < 3.4 ? 0.6 : 0,
          tailWag: Math.sin(t * 10) * 25,
        }),
      }),
  },
  {
    s: 15,
    e: 20,
    f: (t, g) =>
      krzak({
        cam: { x: 2030, y: kf(t, [[0, 1525], [2.4, 1330]]), z: 1.35 },
        tosia: tos(g, {
          x: 1980,
          look: [0.45, -1],
          headTilt: -8,
          ears: kf(t, [[2.4, 0], [3.4, 0.8]]),
          mouth: t > 3 ? "sad" : "o",
        }),
      }),
  },
  {
    s: 20,
    e: 25,
    f: (t, g) => {
      const sad = t < 2.5;
      return krzak({
        cam: { x: 1985, y: 1510, z: 2.6 },
        tosia: tos(g, {
          x: 1980,
          ears: kf(t, [[0, 0.85], [2.3, 0.85], [2.6, 0]]),
          eyes: sad ? "sad" : "open",
          nose: sad,
          mouth: sad ? "sad" : "smile",
          wrapped: false,
          lift: hop(t, 2.5, 0.45, 30),
          squash: hopSquash(t, 2.5, 0.45),
          arms: sad ? { l: 8, r: 8 } : { l: 50, r: 50 },
          look: sad ? [0, 0.6] : [0.4, -0.8],
        }),
      });
    },
  },
  {
    s: 25,
    e: 30,
    f: (t, g) =>
      krzak({
        cam: { x: 1985, y: 1500, z: kf(t, [[0, 2.6], [5, 3.1]]) },
        tosia: tos(g, { x: 1980, headTilt: kf(t, [[0, 0], [0.6, 12]]), look: [0, 0.15], arms: { l: 20, r: 20 } }),
      }),
  },
  {
    s: 30,
    e: 35,
    f: (t, g) => {
      const w = Math.sin(t * 4.2);
      return krzak({
        cam: { x: 1990, y: 1520, z: 2.3 },
        tosia: tos(g, {
          x: 1980,
          arms: { l: 95 + 75 * w, r: 95 - 75 * w },
          squash: 1 + 0.05 * Math.sin(t * 8.4),
          tailWag: Math.sin(t * 16) * 35,
          eyes: t > 2.4 && t < 3.6 ? "happy" : "open",
          mouth: "grin",
        }),
      });
    },
  },
  {
    s: 35,
    e: 40,
    f: (t, g) =>
      krzak({
        cam: { x: kf(t, [[0, 2040], [1.2, 2130]]), y: 1520, z: kf(t, [[1.4, 2.2], [5, 2.75]]) },
        tosia: tos(g, {
          x: kf(t, [[0, 1980], [1.2, JX]]),
          lift: hop(t, 0, 0.6, 30) + hop(t, 0.6, 0.6, 30),
          squash: kf(t, [[1.5, 1], [2.4, 0.84]]),
          arms: { l: 40, r: 40 },
          eyes: t > 1.4 ? "squint" : "open",
          mouth: t > 1.4 ? "flat" : "smile",
          tailWag: -25 + Math.sin(t * 20) * 4,
          look: [-0.2, -0.6],
        }),
      }),
  },
  // ── 0:40 PRÓBA 1 ───────────────────────────────────────────
  {
    s: 40,
    e: 45,
    f: (t, g) => {
      const lift = hop(t, 0.3, 0.65, 60);
      const air = lift > 0;
      return krzak({
        cam: { x: 2110, y: 1430, z: 1.55 },
        tosia: tos(g, {
          x: JX,
          lift,
          squash: hopSquash(t, 0.3, 0.65),
          arms: air ? REACH_L : { l: 20, r: 20 },
          look: [-0.4, -1],
          eyes: "open",
          mouth: t > 1.2 ? "o" : "grin",
          ears: t > 1.4 ? 0.3 : 0,
          scarfWind: lift / 120,
        }),
      });
    },
  },
  {
    s: 45,
    e: 50,
    f: (t, g) => {
      const lift = hop(t, 0.4, 0.75, 85) + hop(t, 1.3, 0.8, 110);
      return krzak({
        cam: { x: 2130, y: 1440, z: 1.6 },
        tosia: tos(g, {
          x: JX,
          lift,
          squash: hopSquash(t, 0.4, 0.75) * hopSquash(t, 1.3, 0.8),
          arms: lift > 0 ? REACH_L : { l: 45, r: 45 },
          look: [-0.4, -1],
          mouth: "grin",
          scarfWind: Math.min(1, lift / 110),
        }),
      });
    },
  },
  {
    s: 50,
    e: 55,
    f: (t, g) => {
      const x = kf(t, [[2.2, JX], [3.0, 1960]]);
      return krzak({
        cam: { x: lerp(2140, 2060, seg(t, 2.2, 3.2)), y: 1510, z: kf(t, [[0, 2.6], [2.2, 2.6], [3.2, 2.0]]) },
        tosia: tos(g, {
          x,
          arms: { l: 60, r: 60 },
          eyes: "squint",
          mouth: "grin",
          lift: t > 2.2 && t < 3.0 ? Math.abs(Math.sin((t - 2.2) * 15)) * 10 : 0,
          tailWag: Math.sin(t * 12) * 20,
        }),
      });
    },
  },
  {
    s: 55,
    e: 60,
    f: (t, g) => {
      const x = kf(t, [[0, 1960], [0.85, JX]], (u) => u);
      const lift = 150 * easeOut(seg(t, 0.85, 3.4));
      return krzak({
        cam: { x: 2110, y: 1400, z: 1.5 },
        tosia: tos(g, {
          x,
          lift,
          arms: t > 0.85 ? { ...REACH_L, lLen: 1.5 } : { l: 30, r: 30 },
          eyes: "wide",
          look: [-0.4, -1],
          mouth: "o",
          scarfWind: Math.min(1, lift / 100),
          squash: t > 0.85 ? 1.08 : 1,
        }),
        berrySparkle: 1,
      });
    },
  },
  {
    s: 60,
    e: 65.1,
    f: (t, g) => {
      const x = lerp(JX, PILE, t / 5.1);
      const lift = Math.max(0, 150 * (1 - t / 5.1) + 170 * Math.sin((Math.PI * t) / 5.1));
      return krzak({
        cam: { x: lerp(2080, 1700, seg(t, 0, 5)), y: 1450 - lift * 0.4, z: 1.6 },
        tosia: tos(g, {
          x,
          lift,
          rot: -t * 250,
          facing: -1,
          wrapped: true,
          eyes: Math.floor(t * 3) % 2 ? "wide" : "closed",
          mouth: "o",
          arms: { l: 100, r: 100 },
          scarfWind: 1,
        }),
      });
    },
  },
  // ── 1:05 UPADEK ────────────────────────────────────────────
  {
    s: 65.1,
    e: 70,
    f: (t, g) =>
      krzak({
        cam: { x: PILE, y: 1560, z: 2.0 },
        shake: t < 0.5 ? 1 - t / 0.5 : 0,
        tosia: tos(g, { x: PILE, sink: 120, ears: 0.15, tailWag: Math.sin(t * 9) * 30 }),
        pileFront: "full",
        leafSquash: 0.3,
        bursts: [{ x: PILE, y: G - 120, t, power: 1, count: 30 }],
      }),
  },
  {
    s: 70,
    e: 75,
    f: (t, g) =>
      krzak({
        cam: { x: PILE, y: 1580, z: 2.6 },
        tosia: tos(g, { x: PILE, sink: 120, ears: 0.2 + 0.2 * Math.sin(t * 6), tailWag: Math.sin(t * 7) * 30 }),
        pileFront: "full",
        leafSquash: 0.3,
      }),
  },
  {
    s: 75,
    e: 80,
    f: (t, g) =>
      krzak({
        cam: { x: PILE, y: 1555, z: 3.4 },
        tosia: tos(g, {
          x: PILE,
          sink: kf(t, [[0.2, 120], [0.5, 60]]),
          leafOnNose: kf(t, [[1.0, 0.001], [3.4, 1]], (u) => u),
          eyes: t > 3.3 ? "cross" : "open",
          look: t > 1 ? [0, -0.8] : [0, 0],
          mouth: t > 3.3 ? "o" : "smile",
        }),
        pileFront: t < 0.3 ? "full" : "low",
        leafSquash: 0.3,
      }),
  },
  {
    s: 80,
    e: 85,
    f: (t, g) => {
      const sneeze = t > 2.0;
      return krzak({
        cam: { x: PILE, y: 1545, z: kf(t, [[0, 3.4], [1.8, 3.6], [2.3, 2.2]]) },
        shake: t > 2 && t < 2.6 ? 1 : 0,
        tosia: tos(g, {
          x: PILE,
          sink: sneeze ? kf(t, [[2.0, 60], [2.3, 0]]) : 60,
          lift: hop(t, 2.0, 0.6, 90),
          headTilt: t < 2 ? kf(t, [[0.3, 0], [0.6, -12], [1.0, -12], [1.3, -20]]) : kf(t, [[2.0, 14], [2.6, 0]]),
          leafOnNose: sneeze ? 0 : 1,
          eyes: sneeze ? (t < 2.7 ? "closed" : "happy") : "cross",
          mouth: sneeze ? (t < 2.6 ? "sneeze" : "grin") : "o",
          nose: !sneeze,
          talk: t > 1.9 && t < 2.6 ? 0 : talking(g, "T"),
        }),
        pileFront: !sneeze || t < 2.15 ? "low" : undefined,
        leafSquash: 0.3,
        bursts: [{ x: PILE, y: G - 100, t: t - 2.0, power: 1.4, count: 40, seed: 5 }],
      });
    },
  },
  {
    s: 85,
    e: 90,
    f: (t, g) =>
      krzak({
        cam: { x: 1610, y: 1520, z: 2.3 },
        tosia: tos(g, {
          x: PILE,
          eyes: t < 1.4 ? "happy" : "open",
          mouth: "grin",
          rot: t < 1.4 ? Math.sin(t * 14) * 4 : 0,
          arms: t > 1.5 && t < 3.6 ? { l: 50 + 30 * Math.sin(t * 12), r: 50 - 30 * Math.sin(t * 12) } : { l: 20, r: 20 },
          leafOnEar: true,
        }),
        leafSquash: 0.45,
      }),
  },
  // ── 1:30 PRÓBA 2 – KAMIEŃ ──────────────────────────────────
  {
    s: 90,
    e: 95,
    f: (t, g) => {
      const x = kf(t, [[3.3, PILE], [5, 1880]], (u) => u);
      return krzak({
        cam: { x: kf(t, [[0, 1650], [2.6, 1650], [4.4, 1880]]), y: 1500, z: 1.8 },
        tosia: tos(g, {
          x,
          arms: t < 3.2 ? { l: 20, r: 95, rLen: 1.1 } : { l: 40, r: 40 },
          look: [1, -0.2],
          lift: t > 3.3 ? Math.abs(Math.sin((t - 3.3) * 10)) * 12 : 0,
          eyes: "open",
          mouth: "grin",
          leafOnEar: true,
          scarfWind: t > 3.3 ? 0.3 : 0,
        }),
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 95,
    e: 100,
    f: (t, g) => {
      const u = seg(t, 0.4, 0.95);
      const onStone = t >= 0.95;
      const lift = onStone ? STONE.top + 12 * seg(t, 1.5, 2.0) : 90 * u + hop(t, 0.4, 0.55, 80);
      return krzak({
        cam: { x: 2040, y: 1420, z: 1.55 },
        tosia: tos(g, {
          x: lerp(1880, STONE.x, u),
          lift,
          arms: t > 1.5 ? REACH_R : { l: 40, r: 40 },
          look: [0.4, -1],
          mouth: "o",
          leafOnEar: true,
          squash: hopSquash(t, 0.4, 0.55),
        }),
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 100,
    e: 105,
    f: (t, g) =>
      krzak({
        cam: { x: 2010, y: 1435, z: 2.6 },
        tosia: tos(g, {
          x: STONE.x,
          lift: STONE.top,
          ears: t < 3.8 ? kf(t, [[0, 0.2], [0.8, 0.85]]) : 0.25,
          wrapped: t > 0.9 && t < 4.0,
          eyes: t < 3.8 ? "sad" : "open",
          nose: t < 3.8,
          mouth: t < 3.8 ? "sad" : "o",
          arms: { l: 10, r: 10 },
          look: t < 3.8 ? [0, 0.6] : [1, 0],
          leafOnEar: true,
        }),
        smallBushShake: t > 4.4 ? 1 : 0,
        leafSquash: 0.45,
      }),
  },
  {
    s: 105,
    e: 110,
    f: (t, g) =>
      krzak({
        cam: { x: 2400, y: 1560, z: 2.2 },
        tosia: tos(g, { x: STONE.x, lift: STONE.top, look: [1, 0], ears: 0.2, mouth: "o", leafOnEar: true }),
        smallBushShake: t < 3 ? 1 : 0.3,
        brunoNose: t > 2.4 ? { x: SPOT.brunoBush.x - 150 + kf(t, [[2.4, 30], [3.0, 0]]), y: G - 90 } : undefined,
        leafSquash: 0.45,
      }),
  },
  // ── 1:50 BRUNO ─────────────────────────────────────────────
  {
    s: 110,
    e: 115,
    f: (t, g) => {
      const walking = t < 2.6;
      return krzak({
        cam: { x: 2230, y: 1530, z: 1.75 },
        tosia: tos(g, { x: STONE.x, lift: STONE.top, look: [1, 0], mouth: "smile", leafOnEar: true }),
        bruno: bru(g, {
          x: kf(t, [[0, 2640], [2.6, BRUNO_X]], (u) => u),
          sway: walking ? Math.sin(t * 7) * 5 : 0,
          lift: walking ? Math.abs(Math.sin(t * 7)) * 6 : 0,
          cleaning: kf(t, [[2.8, 0], [3.2, 0.75], [4.2, 0.75], [4.6, 0]]),
          look: [-1, 0],
        }),
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 115,
    e: 120,
    f: (t, g) =>
      krzak({
        cam: { x: 2200, y: 1470, z: 1.65 },
        tosia: tos(g, { x: STONE.x, lift: STONE.top, arms: { l: 160, r: 160, lLen: 1.1, rLen: 1.1 }, look: [0.3, -1], mouth: "grin", leafOnEar: true }),
        bruno: bru(g, {
          x: BRUNO_X,
          look: [kf(t, [[0.5, -1], [2.5, -0.6]]), kf(t, [[0.5, 0], [2.5, -1]])],
          eyes: (t > 1.3 && t < 1.45) || (t > 2.0 && t < 2.15) ? "closed" : "open",
          mouth: "o",
        }),
        leafSquash: 0.45,
      }),
  },
  {
    s: 120,
    e: 125,
    f: (t, g) =>
      krzak({
        cam: { x: 2380, y: 1500, z: 2.6 },
        tosia: tos(g, { x: STONE.x, lift: STONE.top, look: [1, 0], leafOnEar: true }),
        bruno: bru(g, {
          x: BRUNO_X,
          arms: { l: 18, r: kf(t, [[0, 18], [0.4, 150]]) },
          bulb: kf(t, [[0.3, 0], [0.7, 1], [4.2, 1], [4.8, 0]]),
          eyes: t > 3.5 ? "happy" : "open",
          look: [0, -0.5],
        }),
        leafSquash: 0.45,
      }),
  },
  {
    s: 125,
    e: 130,
    f: (t, g) => {
      const carrying = t > 0.6 && t < 2.9;
      const bx = kf(t, [[0.8, BRUNO_X], [2.4, 2300], [3.4, 2300], [4.4, BRUNO_X]]);
      const packX = kf(t, [[0.6, bx - 80], [2.4, 2215], [2.9, BP.x]]);
      return krzak({
        cam: { x: 2200, y: 1500, z: 1.7 },
        tosia: tos(g, { x: STONE.x, lift: STONE.top, look: [1, 0.3], mouth: "smile", leafOnEar: true }),
        bruno: bru(g, {
          x: bx,
          backpack: t < 0.6,
          arms: carrying ? { l: 70, r: 70 } : t > 2.9 ? { l: 80, r: 18 } : { l: 18, r: 18 },
          look: [-1, 0.3],
          sway: bx !== BRUNO_X && t < 4.4 ? Math.sin(t * 7) * 4 : 0,
        }),
        backpack: t > 0.6 ? { x: t < 2.9 ? packX : BP.x, y: t < 2.9 ? G - 60 + seg(t, 2.4, 2.9) * 60 : G } : null,
        leafSquash: 0.45,
      });
    },
  },
  // ── 2:10 LICZENIE ──────────────────────────────────────────
  {
    s: 130,
    e: 138,
    f: (t, g) => {
      const n = g >= 136 ? 3 : g >= 134.2 ? 2 : g >= 132.5 ? 1 : 0;
      return krzak({
        cam: { x: 2190, y: 1480, z: 1.6 },
        tosia: tos(g, {
          x: STONE.x,
          lift: STONE.top,
          squash: 1 - n * 0.05,
          arms: { l: 40, r: 40 },
          eyes: n > 0 ? "squint" : "open",
          mouth: "grin",
          look: [0.3, -0.6],
          leafOnEar: true,
        }),
        bruno: bru(g, { x: BRUNO_X, backpack: false, arms: { l: 80, r: 18 }, look: [-1, 0], mouth: "grin" }),
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 138,
    e: 140,
    f: (t, g) => {
      const u = seg(t, 0.1, 0.75);
      const on = t >= 0.75;
      return krzak({
        cam: { x: 2170, y: 1440, z: 1.8 },
        tosia: tos(g, {
          x: lerp(STONE.x, BP.x, u),
          lift: on ? BP.top : lerp(STONE.top, BP.top, u) + hop(t, 0.1, 0.65, 80),
          squash: hopSquash(t, 0.1, 0.65),
          arms: on ? { l: 138, r: 75, lLen: 1.45, rLen: 0.9 } : { l: 60, r: 60 },
          look: [-0.4, -1],
          mouth: "grin",
          leafOnEar: true,
          scarfWind: on ? 0 : 0.6,
        }),
        bruno: bru(g, { x: BRUNO_X, backpack: false, arms: { l: 80, r: 18 }, look: [-1, -0.3], mouth: "grin" }),
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  // ── 2:20 KULMINACJA ────────────────────────────────────────
  {
    s: 140,
    e: 145,
    f: (t, g) => {
      const picked = t >= 1.0;
      return krzak({
        cam: { x: 2120, y: 1340, z: 2.1 },
        tosia: tos(g, {
          x: BP.x,
          lift: BP.top + hop(t, 0.6, 0.8, 45),
          squash: hopSquash(t, 0.6, 0.8),
          arms: { l: 138, r: 75, lLen: 1.45, rLen: 0.9 },
          look: [-0.4, -1],
          eyes: picked ? "happy" : "wide",
          mouth: picked ? "grin" : "o",
          leafOnEar: true,
        }),
        bruno: bru(g, { x: BRUNO_X, backpack: false, arms: { l: 80, r: 18 }, eyes: picked ? "happy" : "open", mouth: "grin" }),
        berryOnBush: !picked,
        berryInPaw: picked,
        berrySparkle: 1,
        bursts: picked ? [] : [],
        hearts: picked ? { x: B.x, y: B.y, t: t - 1.0 } : undefined,
        backpack: { x: BP.x, y: G },
        bushShake: t > 1 && t < 1.6 ? 1 : 0,
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 145,
    e: 150,
    f: (t, g) =>
      krzak({
        cam: { x: 2081, y: 1315, z: kf(t, [[0, 3.3], [5, 3.8]]) },
        tosia: tos(g, { x: BP.x, lift: BP.top, arms: { l: 138, r: 75, lLen: 1.45, rLen: 0.9 }, look: [-0.4, -1], leafOnEar: true }),
        bruno: bru(g, { x: BRUNO_X, backpack: false, arms: { l: 80, r: 18 } }),
        berryOnBush: false,
        berryInPaw: true,
        berrySparkle: 1,
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      }),
  },
  {
    s: 150,
    e: 155,
    f: (t, g) =>
      krzak({
        cam: { x: 2120, y: 1350, z: 2.8 },
        tosia: tos(g, { x: BP.x, lift: BP.top, arms: { l: 138, r: 75, lLen: 1.45, rLen: 0.9 }, look: [-0.4, -1], eyes: "happy", mouth: "grin", leafOnEar: true }),
        bruno: bru(g, { x: BRUNO_X, backpack: false, arms: { l: 80, r: 18 }, eyes: "happy" }),
        berryOnBush: false,
        berryInPaw: true,
        berrySparkle: 1,
        hearts: { x: 2081, y: 1312, t },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      }),
  },
  {
    s: 155,
    e: 160,
    f: (t, g) => {
      const u = seg(t, 0.1, 0.6);
      const x = lerp(BP.x, 2340, u);
      const lift = lerp(BP.top, 0, u) + hop(t, 0.1, 0.5, 50);
      return krzak({
        cam: { x: 2400, y: 1500, z: 2.2 },
        tosia: tos(g, { x, lift, arms: { l: 120, r: 120, lLen: 0.8, rLen: 0.8 }, eyes: "happy", mouth: "grin", headTilt: -6, leafOnEar: true }),
        bruno: bru(g, { x: kf(t, [[0, BRUNO_X], [0.6, 2550]]), backpack: false, look: [-1, 0] }),
        berryOnBush: false,
        berryFree: { x: x - 5, y: G - lift - 95, r: 52, sparkle: 0.4 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  // ── 2:40 WAHANIE ───────────────────────────────────────────
  {
    s: 160,
    e: 165,
    f: (t, g) => {
      const atBruno = t > 1.5 && t < 3.0;
      return krzak({
        cam: { x: 2360, y: 1490, z: 3.0 },
        tosia: tos(g, {
          x: 2340,
          arms: { l: 120, r: 120, lLen: 0.8, rLen: 0.8 },
          look: atBruno ? [1, 0] : [-0.6, 0.6],
          mouth: "flat",
          ears: 0.15,
          headTilt: atBruno ? 6 : -6,
          leafOnEar: true,
        }),
        bruno: bru(g, { x: 2550, backpack: false }),
        berryOnBush: false,
        berryFree: { x: 2335, y: G - 95, r: 52 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 165,
    e: 170,
    f: (t, g) =>
      krzak({
        cam: { x: 2530, y: 1500, z: 2.8 },
        tosia: tos(g, { x: 2340, arms: { l: 120, r: 120, lLen: 0.8, rLen: 0.8 }, look: [1, 0], mouth: "flat", leafOnEar: true }),
        bruno: bru(g, {
          x: 2550,
          backpack: false,
          cleaning: t < 4 ? 0.6 + 0.15 * Math.sin(t * 10) : 0,
          belly: t > 0.5 && t < 1.8 ? 1 : 0,
          eyes: "happy",
          mouth: t > 0.5 && t < 2 ? "o" : "smile",
        }),
        berryOnBush: false,
        berryFree: { x: 2335, y: G - 95, r: 52 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      }),
  },
  {
    s: 170,
    e: 175,
    f: (t, g) => {
      const offer = seg(t, 3.0, 4.2);
      return krzak({
        cam: { x: kf(t, [[0, 2350], [3.5, 2410]]), y: 1490, z: kf(t, [[0, 3.0], [3.5, 2.4]]) },
        tosia: tos(g, {
          x: 2340,
          arms: { l: lerp(120, 70, offer), r: lerp(120, 70, offer), lLen: 0.8, rLen: 0.8 },
          look: [1, 0],
          ears: 0,
          eyes: t < 0.6 ? "wide" : "happy",
          mouth: "grin",
          tailWag: Math.sin(t * 14) * 30,
          leafOnEar: true,
        }),
        bruno: bru(g, { x: 2550, backpack: false, eyes: t > 2 ? "happy" : "open", look: [-1, 0] }),
        berryOnBush: false,
        berryFree: { x: lerp(2335, 2420, offer), y: G - 95 - offer * 60, r: 52, sparkle: 0.5 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 175,
    e: 180,
    f: (t, g) => {
      const split = kf(t, [[0.3, 0], [1.0, 1]]);
      const gap = kf(t, [[1.0, 64], [2.2, 105]]);
      return krzak({
        cam: { x: 2440, y: 1480, z: 2.0 },
        tosia: tos(g, { x: 2340, arms: { l: 60, r: 70, rLen: 0.9 }, eyes: t > 0.4 ? "happy" : "open", mouth: "grin", leafOnEar: true }),
        bruno: bru(g, { x: 2550, backpack: false, arms: { l: 75, r: 18 }, eyes: t > 0.4 ? "happy" : "open", mouth: "grin" }),
        berryOnBush: false,
        berryFree: { x: 2440, y: G - 175 + seg(t, 1, 2.2) * 30, r: 58, split: Math.max(0.0001, split), gap: t > 1 ? gap : undefined },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  {
    s: 180,
    e: 185,
    f: (t, g) =>
      krzak({
        cam: { x: 2445, y: 1480, z: 2.2 },
        tosia: tos(g, { x: 2340, arms: { l: 60, r: 70, rLen: 0.9 }, eyes: "happy", mouth: "grin", leafOnEar: true, rot: Math.sin(t * 5) * 3 }),
        bruno: bru(g, { x: 2550, backpack: false, arms: { l: 75, r: 18 }, eyes: "happy", mouth: "grin", sway: Math.sin(t * 5) * 6 }),
        berryOnBush: false,
        berryFree: { x: 2440, y: G - 145, r: 50, split: 1, gap: 105 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      }),
  },
  {
    s: 185,
    e: 190,
    f: (t, g) => {
      const landed = t >= 1.2;
      const bx = kf(t, [[0, 2900], [1.2, BP.x]], easeOut);
      const by = kf(t, [[0, 1150], [1.2, G - BP.top - 28]], easeOut);
      const give = seg(t, 2.3, 3.3);
      return krzak({
        cam: { x: 2370, y: 1480, z: 1.9 },
        tosia: tos(g, { x: 2340, arms: { l: lerp(60, 80, give), r: 70, rLen: 0.9 }, eyes: "happy", mouth: "grin", look: [-1, -0.2], leafOnEar: true }),
        bruno: bru(g, { x: 2550, backpack: false, arms: { l: 75, r: 18 }, eyes: "happy", look: [-1, -0.2] }),
        berryOnBush: false,
        berryFree: { x: 2440, y: G - 145, r: 44, split: 1, gap: 105 },
        piece: give > 0 && give < 1 ? { x: lerp(2320, BP.x + 30, give), y: lerp(G - 150, G - BP.top - 30, give) - Math.sin(give * Math.PI) * 50 } : undefined,
        bird: { x: bx, y: by, flap: !landed || t > 3.5, facing: -1, talk: (t > 1.2 && t < 1.6) || (t > 3.6 && t < 4.0) ? 1 : 0 },
        backpack: { x: BP.x, y: G },
        leafSquash: 0.45,
      });
    },
  },
  // ── 3:10 ŚWIĘTOWANIE (polana) ──────────────────────────────
  {
    s: 190,
    e: 195,
    f: (t, g) => ({
      set: "polana",
      cam: { x: 2450, y: 1450, z: 1.5 },
      tosia: tos(g, { x: 2300, spin: kf(t, [[1.5, 0], [2.5, 1]]), lift: hop(t, 1.5, 1.0, 80), arms: { l: 120, r: 120 }, eyes: "happy", mouth: "grin", scarfWind: t > 1.5 && t < 2.6 ? 0.7 : 0 }),
      bruno: bru(g, { x: 2620, backpack: true, sway: Math.sin(t * 5) * 6, eyes: "happy", mouth: "grin" }),
      bird: { x: 2460 + Math.cos(t * 2) * 120, y: 1250 + Math.sin(t * 4) * 30, flap: true, facing: Math.sin(t * 2) > 0 ? -1 : 1 },
    }),
  },
  {
    s: 195,
    e: 200,
    f: (t, g) => {
      const beat = 60 / 96;
      const ph = (t % (beat * 2)) / (beat * 2);
      return {
        set: "polana",
        cam: { x: kf(t, [[0, 2300], [5, 2420]]), y: 1490, z: 2.1 },
        tosia: tos(g, {
          x: 2300,
          spin: seg(ph, 0, 0.35),
          lift: hop(ph, 0, 1, 50),
          arms: { l: 140, r: 140 },
          eyes: "happy",
          mouth: "grin",
          talk: singing(g),
          scarfWind: 0.6,
        }),
        bruno: bru(g, { x: 2620, sway: Math.sin(t * Math.PI * 1.6) * 8, eyes: "happy", talk: singing(g) }),
      };
    },
  },
  {
    s: 200,
    e: 205,
    f: (t, g) => ({
      set: "polana",
      cam: { x: 2600, y: 1500, z: 2.4 },
      tosia: tos(g, { x: 2300, arms: { l: 140, r: 140 }, eyes: "happy", talk: singing(g), lift: Math.abs(Math.sin(t * Math.PI * 1.6)) * 30 }),
      bruno: bru(g, {
        x: 2620,
        sway: Math.sin(t * Math.PI * 1.6) * 9,
        eyes: "happy",
        arms: { l: 120 + Math.sin(t * 10) * 20, r: 120 - Math.sin(t * 10) * 20 },
        talk: singing(g),
      }),
    }),
  },
  {
    s: 205,
    e: 210,
    f: (t, g) => ({
      set: "polana",
      cam: { x: 2460, y: kf(t, [[0, 1500], [5, 1300]]), z: 1.45 },
      tosia: tos(g, { x: 2300, spin: seg((t * 0.8) % 1, 0, 0.35), arms: { l: 140, r: 140 }, eyes: "happy", talk: singing(g), scarfWind: 0.5, lift: Math.abs(Math.sin(t * Math.PI * 1.6)) * 40 }),
      bruno: bru(g, { x: 2620, sway: Math.sin(t * Math.PI * 1.6) * 9, eyes: "happy", talk: singing(g) }),
      bird: { x: 2460 + Math.cos(t * 2.2) * 260, y: 1180 + Math.sin(t * 2.2) * 70, flap: true, facing: Math.sin(t * 2.2) > 0 ? -1 : 1 },
      bursts: [{ x: 2460, y: 1250, t: t * 0.6, power: 0.5, count: 24, seed: 9 }],
    }),
  },
  {
    s: 210,
    e: 215,
    f: (t, g) => ({
      set: "polana",
      cam: { x: 2500, y: 1420, z: 1.2 },
      tosia: tos(g, { x: 2300, spin: seg((t * 0.8) % 1, 0, 0.35), arms: { l: 150, r: 150 }, eyes: "happy", talk: singing(g), scarfWind: 0.5, lift: Math.abs(Math.sin(t * Math.PI * 1.6)) * 50 }),
      bruno: bru(g, { x: 2620, sway: Math.sin(t * Math.PI * 1.6) * 10, eyes: "happy", arms: { l: 130, r: 130 }, talk: singing(g), lift: Math.abs(Math.sin(t * Math.PI * 1.6)) * 20 }),
      bird: { x: 2460 + Math.cos(t * 2.2) * 300, y: 1150 + Math.sin(t * 2.2) * 70, flap: true, facing: Math.sin(t * 2.2) > 0 ? -1 : 1 },
      bursts: [{ x: 2460, y: 1100, t: t * 0.7, power: 0.7, count: 34, seed: 11 }],
    }),
  },
  {
    s: 215,
    e: 220,
    f: (t, g) => ({
      set: "polana",
      cam: { x: 2480, y: 1440, z: kf(t, [[0, 1.6], [5, 1.3]]) },
      tosia: tos(g, { x: 2330, arms: { l: 150, r: 150 }, eyes: "happy", mouth: "grin" }),
      bruno: bru(g, { x: 2620, arms: { l: 140, r: 140 }, eyes: "happy", mouth: "grin" }),
      bird: { x: 2475, y: 1220 + Math.sin(t * 3) * 15, flap: true, facing: 1 },
      hearts: { x: 2475, y: 1400, t },
    }),
  },
  // ── 3:40 ZAPOWIEDŹ (dąb) ───────────────────────────────────
  {
    s: 220,
    e: 225,
    f: (t, g) => {
      const x = kf(t, [[0, 1100], [2.0, 1880]], (u) => u);
      return {
        set: "dab",
        cam: { x: kf(t, [[0, 1350], [2.4, 2030]]), y: kf(t, [[0, 1440], [2.4, 1500]]), z: kf(t, [[0, 1.4], [3, 1.8]]) },
        tosia: tos(g, {
          x,
          lift: t < 2 ? Math.abs(Math.sin(t * 10)) * 14 : 0,
          arms: { l: 40, r: 40 },
          eyes: t > 3 ? "wide" : "open",
          mouth: t > 3 ? "o" : "grin",
          look: t > 2.5 ? [1, 0.6] : [1, 0],
          scarfWind: t < 2 ? 0.4 : 0,
        }),
        egg: { wobble: 0 },
      };
    },
  },
  {
    s: 225,
    e: 230,
    f: (t, g) => {
      const knocks = [0.2, 1.7, 3.2];
      const w = knocks.some((k) => t > k && t < k + 0.6) ? 1 : 0;
      return {
        set: "dab",
        cam: { x: EGG_POS.x, y: 1620, z: kf(t, [[0, 3.2], [5, 3.8]]) },
        egg: { wobble: w },
      };
    },
  },
  {
    s: 230,
    e: 235,
    f: (t, g) => ({
      set: "dab",
      cam: { x: 2120, y: 1510, z: 2.0 },
      tosia: tos(g, { x: 1880, headTilt: 10, look: [1, 0.6], eyes: "wide", mouth: "o", ears: 0 }),
      bruno: bru(g, { x: 2340, backpack: true, look: [-1, 0.6], mouth: "o", sway: -4 }),
      egg: { wobble: t > 1 && t < 1.6 ? 1 : 0 },
    }),
  },
  {
    s: 235,
    e: 240,
    f: (t, g) => ({
      set: "dab",
      cam: { x: 2120, y: 1480, z: kf(t, [[0, 2.0], [5, 1.7]]) },
      tosia: tos(g, { x: 1880, arms: { l: 20, r: 150 + 25 * Math.sin(t * 10) }, eyes: "happy", mouth: "grin", tailWag: Math.sin(t * 12) * 35 }),
      bruno: bru(g, { x: 2340, backpack: true, arms: { l: 18, r: 140 + 20 * Math.sin(t * 9) }, eyes: "happy", mouth: "grin" }),
      egg: { wobble: 0.3 },
    }),
  },
];

export function stateAt(g: number): State {
  const shot = SHOTS.find((s) => g >= s.s && g < s.e) ?? SHOTS[SHOTS.length - 1];
  return shot.f(g - shot.s, g);
}

export const SHOT_STARTS = SHOTS.map((s) => s.s);
