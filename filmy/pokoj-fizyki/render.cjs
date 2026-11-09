// Renderuje klatki sceny (three.js w Chromium/Playwright) i składa je w wideo przez ffmpeg.
//   node render.cjs --stills 0,5,12.5          -> build/stills/t_XX.png
//   node render.cjs --video build/video.mp4    -> całe 25 s (bez dźwięku)
//   node render.cjs --video part.mp4 --from 0 --to 375
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FPS = 30, TOTAL = 25 * FPS;
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 600000 });

  if (args.includes('--noui')) await page.addStyleTag({ content: '#ui{display:none}' });
  if (arg('--stills')) {
    const dir = path.join(ROOT, 'build', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of arg('--stills').split(',').map(Number)) {
      const t0 = Date.now();
      await page.evaluate((tt) => window.renderFrame(tt), t);
      await page.screenshot({ path: path.join(dir, `t_${t.toFixed(2)}.png`) });
      console.log(`t=${t} ${(Date.now() - t0) / 1000}s`);
    }
  } else {
    const out = arg('--video', path.join(ROOT, 'build', 'video.mp4'));
    const from = +arg('--from', 0), to = +arg('--to', TOTAL);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      await page.evaluate((tt) => window.renderFrame(tt), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - from) % 15 === 0) {
        const el = (Date.now() - t0) / 1000, done = f - from + 1;
        console.log(`klatka ${f}/${to} · ${(el / done).toFixed(2)} s/kl. · pozostało ~${Math.round((el / done) * (to - f))} s`);
      }
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  await browser.close();
  srv.close();
})();
