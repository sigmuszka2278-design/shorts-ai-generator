// Dynamiczne napisy: tytuł, „naklejki” z hasłami i napisy lektora słowo po słowie.
const EMOJI = { '😱': '1f631', '❌': '274c', '👀': '1f440', '🪐': '1fa90', '🤯': '1f92f', '🔁': '1f501', '😳': '1f633', '🤩': '1f929' };
const emo = (s) => s.replace(/😱|❌|👀|🪐|🤯|🔁|😳|🤩/gu, (e) => `<img class="emo" src="node_modules/@twemoji/svg/${EMOJI[e]}.svg">`);

const STICKERS = [
  [0.0, 3.0, 'CO TU SIĘ DZIEJE?! 😱'],
  [3.9, 6.95, 'GRAWITACJA<br>WYŁĄCZONA ❌'],
  [9.2, 12.0, 'CO JEST ZA<br>DRZWIAMI? 👀'],
  [12.45, 15.15, 'CZEKAJ…?! 😳'],
  [15.35, 17.95, 'INNY WYMIAR?! 🪐'],
  [18.3, 20.65, 'A TERAZ<br>NAJLEPSZE… 🤩'],
  [21.0, 22.95, 'POKÓJ W KULI?! 🤯'],
  [23.0, 25.01, 'ZAUWAŻYŁEŚ? 🔁'],
];

const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function setupCaptions(voice) {
  const $ = (id) => document.getElementById(id);
  $('title').innerHTML = emo('TEN POKÓJ ŁAMIE PRAWA FIZYKI! 😱');
  const sticker = $('sticker'), subs = $('subs'), title = $('title'), tag = $('tag');

  // grupy słów (maks. 3 słowa / ~17 znaków)
  const groups = [];
  for (const line of voice) {
    let cur = [];
    const flush = () => { if (cur.length) groups.push({ words: cur, end: line.start + line.dur }); cur = []; };
    for (const w of line.words) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (cur.length >= 3 || (cur.length && len > 17)) flush();
      cur.push(w);
      if (/[,…!?]$/.test(w.w) && cur.length >= 2) flush();
    }
    flush();
  }
  groups.forEach((g, i) => {
    g.t0 = g.words[0].t0 - 0.04;
    const next = groups[i + 1];
    g.t1 = next && next.t0 < g.end + 0.35 ? next.words[0].t0 - 0.04 : g.end + 0.3;
  });
  let lastSticker = -1, lastGroup = -1;

  return (t) => {
    // tytuł + oznaczenie „animacja”
    const ta = t < 2.4 ? 1 : clamp(1 - (t - 2.4) / 0.3);
    title.style.opacity = ta;
    tag.style.opacity = ta;
    title.style.transform = `translateX(-50%) scale(${0.96 + 0.04 * Math.sin(t * 6)})`;

    // naklejka
    const si = STICKERS.findIndex(([a, b]) => t >= a && t < b);
    if (si !== lastSticker) {
      sticker.innerHTML = si >= 0 ? emo(STICKERS[si][2]) : '';
      lastSticker = si;
    }
    if (si >= 0) {
      const [a, b] = STICKERS[si];
      const u = clamp((t - a) / 0.28);
      const out = clamp((b - t) / 0.16);
      const s = (a === 0 ? 1 : easeOutBack(u)) * (0.6 + 0.4 * out);
      const rot = Math.sin(t * 3.1 + si) * 2.2 + (si % 2 ? -2 : 2);
      sticker.style.opacity = out;
      sticker.style.transform = `translateX(-50%) rotate(${rot}deg) scale(${s})`;
    } else sticker.style.opacity = 0;

    // napisy lektora
    const gi = groups.findIndex((g) => t >= g.t0 && t < g.t1);
    if (gi !== lastGroup) {
      subs.innerHTML = gi >= 0 ? groups[gi].words.map((w) => `<span>${w.w.toUpperCase()}</span>`).join('') : '';
      lastGroup = gi;
    }
    if (gi >= 0) {
      const g = groups[gi];
      const spans = subs.children;
      const gu = clamp((t - g.t0) / 0.18);
      subs.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * easeOutBack(gu)})`;
      g.words.forEach((w, k) => {
        const on = t >= w.t0 - 0.02;
        const pop = clamp((t - w.t0) / 0.14);
        spans[k].className = on && (k === g.words.length - 1 || t < g.words[k + 1].t0 - 0.02) ? 'on' : '';
        spans[k].style.transform = `scale(${on ? 1 + 0.16 * (1 - pop) : 1})`;
        spans[k].style.opacity = on ? 1 : 0.55;
      });
    }
  };
}
