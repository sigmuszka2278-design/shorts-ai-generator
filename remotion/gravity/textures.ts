import * as THREE from "three";

/** Deterministic procedural textures (no external assets). Cached per browser tab. */

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number, wrapX: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = (n: number) => ((n % wrapX) + wrapX) % wrapX;
  const a = hash(w(xi), yi, seed);
  const b = hash(w(xi + 1), yi, seed);
  const c = hash(w(xi), yi + 1, seed);
  const d = hash(w(xi + 1), yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves: number, wrapX: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 17, wrapX * f);
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, img: ImageData) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  draw(ctx, img);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** Earth day map: oceans, continents with biomes, polar ice. */
export function earthTexture() {
  return canvasTexture("earth", 1024, 512, (ctx, img) => {
    const { width: W, height: H, data } = img;
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(y / H - 0.5) * 2; // 0 equator → 1 pole
      for (let x = 0; x < W; x++) {
        const n = fbm((x / W) * 6, (y / H) * 3, 7, 6, 6);
        const detail = fbm((x / W) * 24, (y / H) * 12, 31, 3, 24);
        const land = n + (detail - 0.5) * 0.12 - 0.02 * lat;
        let c: number[];
        if (land < 0.5) {
          const depth = Math.min(1, (0.5 - land) * 5);
          c = mix([38, 110, 170], [8, 32, 92], depth);
        } else {
          const h = Math.min(1, (land - 0.5) * 4);
          const dry = fbm((x / W) * 10, (y / H) * 5, 91, 3, 10);
          const green = mix([52, 120, 50], [28, 86, 36], h);
          const desert = mix([200, 170, 110], [160, 120, 80], h);
          c = lat < 0.45 && dry > 0.55 ? mix(green, desert, Math.min(1, (dry - 0.55) * 6)) : green;
          if (h > 0.7) c = mix(c, [120, 110, 100], (h - 0.7) * 2);
        }
        if (lat > 0.82) c = mix(c, [240, 245, 250], Math.min(1, (lat - 0.82) * 8));
        const i = (y * W + x) * 4;
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Cloud layer alpha map. */
export function cloudTexture() {
  return canvasTexture("clouds", 1024, 512, (ctx, img) => {
    const { width: W, height: H, data } = img;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = fbm((x / W) * 8, (y / H) * 4, 113, 6, 8);
        const a = Math.max(0, Math.min(1, (n - 0.5) * 3.2));
        const i = (y * W + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Building facade with lit / dark windows. */
export function facadeTexture(seed: number, base: string) {
  return canvasTexture(`facade-${seed}-${base}`, 256, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 6; x++) {
        const lit = hash(x, y, seed) > 0.72;
        ctx.fillStyle = lit ? "#f6dfa0" : hash(x, y, seed + 3) > 0.5 ? "#2a3b52" : "#3a5170";
        ctx.fillRect(14 + x * 40, 12 + y * 31, 26, 20);
      }
    }
  });
}

/** Asphalt with subtle grain. */
export function asphaltTexture() {
  const tex = canvasTexture("asphalt", 256, 256, (ctx, img) => {
    const { data } = img;
    for (let i = 0; i < 256 * 256; i++) {
      const v = 52 + hash(i % 256, Math.floor(i / 256), 5) * 22;
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v + 3;
      data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

/** Pool tiles. */
export function tileTexture() {
  const tex = canvasTexture("tiles", 256, 256, (ctx) => {
    ctx.fillStyle = "#e8f6fb";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#3fb6e0" : "#56c7ec";
        ctx.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/** Vertical sky gradient used as scene background. */
export function skyTexture(top: string, bottom: string) {
  return canvasTexture(`sky-${top}-${bottom}`, 8, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 512);
  });
}
