// Proceduralne tekstury rysowane na <canvas> – bez zewnętrznych plików graficznych.
import * as THREE from 'three';

// deterministyczny generator liczb losowych
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Parkiet z desek – kolor + mapa chropowatości
export function woodFloor() {
  const R = rng(7);
  const [c, g] = canvas(1024, 1024);
  const [rc, rg] = canvas(1024, 1024);
  const plankW = 1024 / 6;
  for (let i = 0; i < 6; i++) {
    let y = -R() * 400;
    while (y < 1024) {
      const len = 300 + R() * 420;
      const base = [124 + R() * 22, 80 + R() * 14, 46 + R() * 10];
      const grd = g.createLinearGradient(i * plankW, 0, (i + 1) * plankW, 0);
      grd.addColorStop(0, `rgb(${base[0] - 10},${base[1] - 8},${base[2] - 6})`);
      grd.addColorStop(0.5, `rgb(${base[0] + 8},${base[1] + 5},${base[2] + 3})`);
      grd.addColorStop(1, `rgb(${base[0] - 6},${base[1] - 5},${base[2] - 4})`);
      g.fillStyle = grd;
      g.fillRect(i * plankW, y, plankW, len);
      // słoje
      for (let k = 0; k < 26; k++) {
        const x0 = i * plankW + R() * plankW;
        g.strokeStyle = `rgba(${40 + R() * 30},${22 + R() * 15},${10},${0.08 + R() * 0.16})`;
        g.lineWidth = 0.6 + R() * 2.2;
        g.beginPath();
        for (let yy = y; yy < y + len; yy += 8) {
          const xx = x0 + Math.sin(yy * 0.012 + k) * 5 + Math.sin(yy * 0.05 + k * 3) * 1.5;
          yy === y ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        g.stroke();
      }
      // sęk
      if (R() < 0.35) {
        const kx = i * plankW + 30 + R() * (plankW - 60), ky = y + 40 + R() * (len - 80);
        const kg = g.createRadialGradient(kx, ky, 1, kx, ky, 18);
        kg.addColorStop(0, 'rgba(50,28,12,0.75)');
        kg.addColorStop(1, 'rgba(50,28,12,0)');
        g.fillStyle = kg;
        g.beginPath();
        g.ellipse(kx, ky, 10, 22, 0, 0, Math.PI * 2);
        g.fill();
      }
      // szczeliny
      g.fillStyle = 'rgba(25,14,6,0.9)';
      g.fillRect(i * plankW, y, plankW, 2);
      g.fillRect(i * plankW, y, 2, len);
      rg.fillStyle = `rgb(${95 + R() * 50},0,0)`;
      rg.fillRect(i * plankW, y, plankW, len);
      y += len;
    }
  }
  // drobne zarysowania
  for (let k = 0; k < 400; k++) {
    rg.strokeStyle = `rgba(200,0,0,${R() * 0.3})`;
    rg.beginPath();
    const x = R() * 1024, y = R() * 1024;
    rg.moveTo(x, y);
    rg.lineTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 20);
    rg.stroke();
  }
  const rough = tex(rc, { repeat: [4, 4], srgb: false });
  // three używa kanału G jako roughness
  const id = rg.getImageData(0, 0, 1024, 1024);
  for (let p = 0; p < id.data.length; p += 4) id.data[p + 1] = id.data[p];
  rg.putImageData(id, 0, 0);
  rough.needsUpdate = true;
  return { map: tex(c, { repeat: [4, 4] }), roughnessMap: rough };
}

// Ściana: tapeta (góra) + malowana boazeria z panelami (dół 0,9 m). Kafel: 1 m szerokości × 3 m wysokości.
export function wallpaper() {
  const W = 512, H = 1536, ppm = 512; // pikseli na metr
  const [c, g] = canvas(W, H);
  g.fillStyle = '#cfc6ad';
  g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 64) {
    g.fillStyle = 'rgba(255,255,245,0.13)';
    g.fillRect(x, 0, 30, H);
    g.fillStyle = 'rgba(90,80,60,0.07)';
    g.fillRect(x + 30, 0, 3, H);
  }
  g.strokeStyle = 'rgba(120,100,66,0.22)';
  g.lineWidth = 3;
  for (let y = 0; y < H; y += 128) {
    for (let x = 0; x < W; x += 128) {
      const ox = x + ((y / 128) % 2) * 64 + 32;
      g.beginPath();
      g.ellipse(ox, y + 64, 14, 28, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(ox, y + 28);
      g.lineTo(ox, y + 100);
      g.stroke();
    }
  }
  // boazeria (dół)
  const yb = H - 0.9 * ppm;
  g.fillStyle = '#e9e5da';
  g.fillRect(0, yb, W, H - yb);
  const px = 40, pw = W - 80, py = yb + 70, ph = 0.9 * ppm - 150;
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(px, py, pw, 6);
  g.fillRect(px, py, 6, ph);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(px, py + ph - 6, pw, 6);
  g.fillRect(px + pw - 6, py, 6, ph);
  g.fillStyle = 'rgba(0,0,0,0.05)';
  g.fillRect(0, yb, 4, H - yb);
  const R = rng(3);
  const id = g.getImageData(0, 0, W, H);
  for (let p = 0; p < id.data.length; p += 4) {
    const n = (R() - 0.5) * 7;
    id.data[p] += n;
    id.data[p + 1] += n;
    id.data[p + 2] += n;
  }
  g.putImageData(id, 0, 0);
  const t = tex(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function rug() {
  const [c, g] = canvas(1024, 1024);
  const cx = 512;
  const rings = ['#4a2226', '#6b3330', '#a88a62', '#3c4458', '#6b3330', '#c8b590', '#4a2226', '#323a4c', '#83503c'];
  for (let i = 0; i < rings.length; i++) {
    g.fillStyle = rings[i];
    g.beginPath();
    g.arc(cx, cx, 512 - i * 52, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(230,210,170,0.22)';
    g.lineWidth = 3;
    for (let k = 0; k < 24 + i * 2; k++) {
      const a = (k / (24 + i * 2)) * Math.PI * 2, r = 512 - i * 52 - 26;
      g.beginPath();
      g.arc(cx + Math.cos(a) * r, cx + Math.sin(a) * r, 8, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const R = rng(11);
  const id = g.getImageData(0, 0, 1024, 1024);
  for (let p = 0; p < id.data.length; p += 4) {
    const n = (R() - 0.5) * 28;
    id.data[p] += n;
    id.data[p + 1] += n;
    id.data[p + 2] += n;
  }
  g.putImageData(id, 0, 0);
  return tex(c, { repeat: [1, 1] });
}

// Widok za oknem pierwszego pokoju – niebo, chmury, wzgórza, drzewa
export function landscape() {
  const [c, g] = canvas(2048, 1024);
  const sky = g.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#5f97d8');
  sky.addColorStop(0.7, '#a9cdee');
  sky.addColorStop(1, '#e8eef0');
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 1024);
  const R = rng(5);
  for (let k = 0; k < 14; k++) {
    const x = R() * 2048, y = 80 + R() * 330, s = 40 + R() * 90;
    for (let j = 0; j < 9; j++) {
      const gr = g.createRadialGradient(x + j * s * 0.5, y + Math.sin(j) * 12, 2, x + j * s * 0.5, y + Math.sin(j) * 12, s);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x + j * s * 0.5 - s, y - s, s * 2, s * 2);
    }
  }
  const hill = (y0, amp, col, seed) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 1024);
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.003 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.3);
    g.lineTo(2048, 1024);
    g.fill();
  };
  hill(600, 40, '#8aa39a', 1);
  hill(660, 50, '#6f9461', 2);
  hill(740, 30, '#5b8a49', 4);
  for (let k = 0; k < 70; k++) {
    const x = R() * 2048, y = 700 + R() * 260, h = 50 + R() * 90;
    g.fillStyle = `rgb(${40 + R() * 20},${80 + R() * 30},${40 + R() * 15})`;
    g.beginPath();
    g.ellipse(x, y - h * 0.6, h * 0.35, h * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4b3524';
    g.fillRect(x - 3, y - h * 0.1, 6, h * 0.2);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Kosmiczne niebo – mgławica i gwiazdy (equirect)
export function spaceSky() {
  const [c, g] = canvas(4096, 2048);
  g.fillStyle = '#05040d';
  g.fillRect(0, 0, 4096, 2048);
  const R = rng(21);
  const neb = [['#5b2a8c', 0.32], ['#1f4f9a', 0.28], ['#a23c7a', 0.22], ['#2c8a9a', 0.16]];
  for (let k = 0; k < 90; k++) {
    const [col, a] = neb[k % neb.length];
    const x = R() * 4096, y = 500 + Math.sin(x * 0.0015) * 300 + (R() - 0.5) * 700, r = 120 + R() * 480;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col + Math.round(a * 255 * 0.55).toString(16).padStart(2, '0'));
    gr.addColorStop(1, col + '00');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let k = 0; k < 9000; k++) {
    const x = R() * 4096, y = R() * 2048, b = R();
    const s = b > 0.995 ? 3.2 : b > 0.97 ? 2 : 1.1;
    g.fillStyle = `rgba(${220 + R() * 35},${220 + R() * 35},255,${0.35 + b * 0.65})`;
    g.beginPath();
    g.arc(x, y, s * 0.6, 0, Math.PI * 2);
    g.fill();
    if (b > 0.997) {
      const gr = g.createRadialGradient(x, y, 0, x, y, 14);
      gr.addColorStop(0, 'rgba(200,220,255,0.6)');
      gr.addColorStop(1, 'rgba(200,220,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - 14, y - 14, 28, 28);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// Gazowy olbrzym – pasy
export function planet() {
  const [c, g] = canvas(2048, 1024);
  const R = rng(33);
  const cols = ['#e7b98a', '#c97f5a', '#f2d7b0', '#a45f4a', '#e9c7a0', '#8c5a6e', '#d59b74', '#f4e2c4'];
  let y = 0;
  while (y < 1024) {
    const h = 14 + R() * 70;
    g.fillStyle = cols[Math.floor(R() * cols.length)];
    g.fillRect(0, y, 2048, h + 2);
    y += h;
  }
  // zawirowania
  for (let k = 0; k < 2600; k++) {
    const x = R() * 2048, yy = R() * 1024;
    g.strokeStyle = `rgba(${200 + R() * 55},${150 + R() * 70},${110 + R() * 60},0.12)`;
    g.lineWidth = 2 + R() * 6;
    g.beginPath();
    g.moveTo(x, yy);
    g.bezierCurveTo(x + 40, yy + (R() - 0.5) * 18, x + 80, yy + (R() - 0.5) * 18, x + 140, yy);
    g.stroke();
  }
  // wielka plama
  const gr = g.createRadialGradient(1300, 640, 4, 1300, 640, 90);
  gr.addColorStop(0, '#b4553c');
  gr.addColorStop(0.7, '#cf7a55');
  gr.addColorStop(1, 'rgba(207,122,85,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(1300, 640, 150, 60, 0, 0, Math.PI * 2);
  g.fill();
  const t = tex(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function ringTex() {
  const [c, g] = canvas(1024, 8);
  const R = rng(44);
  for (let x = 0; x < 1024; x++) {
    const a = x < 40 ? x / 40 : x > 980 ? (1024 - x) / 44 : 1;
    const v = 0.25 + R() * 0.55 + Math.sin(x * 0.08) * 0.15;
    g.fillStyle = `rgba(${225 + R() * 25},${200 + R() * 30},${170 + R() * 30},${Math.max(0, Math.min(1, v * a))})`;
    g.fillRect(x, 0, 1, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function clockFace() {
  const [c, g] = canvas(512, 512);
  const gr = g.createRadialGradient(256, 230, 20, 256, 256, 256);
  gr.addColorStop(0, '#fbf7ec');
  gr.addColorStop(1, '#e6dfcc');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#2a2622';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 56px "DejaVu Serif", serif';
  const rom = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.translate(256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190);
    g.rotate(a);
    g.font = `bold ${i % 3 === 0 ? 50 : 38}px "DejaVu Serif", serif`;
    g.fillText(rom[i], 0, 0);
    g.restore();
  }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    g.lineWidth = i % 5 === 0 ? 5 : 2;
    g.beginPath();
    g.moveTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236);
    g.lineTo(256 + Math.sin(a) * (i % 5 === 0 ? 216 : 226), 256 - Math.cos(a) * (i % 5 === 0 ? 216 : 226));
    g.stroke();
  }
  return tex(c);
}

export function ballTex() {
  const [c, g] = canvas(512, 256);
  const cols = ['#d8262c', '#f6f1e6', '#1f63c6', '#f6f1e6', '#f2b819', '#f6f1e6'];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i];
    g.fillRect((i * 512) / 6, 0, 512 / 6 + 1, 256);
  }
  g.fillStyle = '#f6f1e6';
  g.fillRect(0, 0, 512, 22);
  g.fillRect(0, 234, 512, 22);
  return tex(c);
}

export function painting() {
  const [c, g] = canvas(512, 384);
  const sky = g.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, '#f0b36b');
  sky.addColorStop(0.55, '#e6806a');
  sky.addColorStop(1, '#3b4a6b');
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 384);
  g.fillStyle = '#ffe2a8';
  g.beginPath();
  g.arc(330, 190, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2e3552';
  g.beginPath();
  g.moveTo(0, 384);
  g.lineTo(0, 250);
  g.lineTo(120, 170);
  g.lineTo(220, 240);
  g.lineTo(330, 150);
  g.lineTo(512, 260);
  g.lineTo(512, 384);
  g.fill();
  const R = rng(9);
  for (let k = 0; k < 3000; k++) {
    g.fillStyle = `rgba(${R() * 255},${R() * 200},${R() * 150},0.05)`;
    g.fillRect(R() * 512, R() * 384, 6, 2);
  }
  return tex(c);
}

export function bookSpines() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,230,160,0.9)';
  g.fillRect(0, 30, 256, 8);
  g.fillRect(0, 210, 256, 8);
  g.fillRect(40, 90, 176, 50);
  return tex(c);
}

// "wpisana" tekstura szumu dla skał wysp
export function rockTex() {
  const [c, g] = canvas(512, 512);
  const R = rng(55);
  g.fillStyle = '#7a6a5c';
  g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 5000; k++) {
    const v = 80 + R() * 70;
    g.fillStyle = `rgba(${v},${v * 0.88},${v * 0.75},0.35)`;
    g.fillRect(R() * 512, R() * 512, 2 + R() * 10, 2 + R() * 6);
  }
  for (let y = 0; y < 512; y += 24 + R() * 30) {
    g.fillStyle = 'rgba(60,45,35,0.35)';
    g.fillRect(0, y, 512, 3 + R() * 4);
  }
  return tex(c);
}
