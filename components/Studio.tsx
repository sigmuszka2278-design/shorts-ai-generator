"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderId, ProviderInfo } from "@/lib/providers/types";
import type { RenderResult, VideoMeta } from "@/lib/render/renderer";
import { MAX_DURATION, MIN_DURATION, type AnimationStyle, type SceneSpec, type ThemeId } from "@/lib/scene/types";
import { formatBytes, ProgressBar, Section, Segmented, Spinner, Toggle } from "./ui";

const PreviewPlayer = dynamic(() => import("./PreviewPlayer").then((m) => m.PreviewPlayer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/80">
      <Spinner className="h-8 w-8" />
    </div>
  ),
});

const EXAMPLES = [
  "Kotek i piesek skaczą z kolorowymi kulkami pod tęczą",
  "Jednorożec z magiczną różdżką w kosmosie",
  "Tańcząca panda i pięć baloników na urodzinach",
  "Żabka i kaczuszka w podwodnym świecie pełnym baniek",
  "Miś szuka skarbu w zaczarowanym lesie",
  "Smoczek i złota korona w bajkowym zamku",
  "Pingwinek i księżyc na dobranoc",
  "Króliczek w krainie słodyczy z lizakami",
  "Lisek i dziesięć czerwonych kulek na łące",
  "Świnka kręci się z serduszkami i konfetti",
];

const THEMES: { id: ThemeId | "auto"; label: string; emoji: string }[] = [
  { id: "auto", label: "Auto", emoji: "✨" },
  { id: "laka", label: "Łąka", emoji: "🌼" },
  { id: "niebo", label: "Niebo", emoji: "☁️" },
  { id: "kosmos", label: "Kosmos", emoji: "🚀" },
  { id: "ocean", label: "Ocean", emoji: "🐠" },
  { id: "las", label: "Las", emoji: "🌳" },
  { id: "zamek", label: "Zamek", emoji: "🏰" },
  { id: "cukierkowo", label: "Słodycze", emoji: "🍭" },
  { id: "noc", label: "Noc", emoji: "🌙" },
];

type JobState<T> = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  stage: string;
  result?: T;
  error?: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Błąd serwera (${res.status})`);
  return data as T;
}

async function pollJob<T>(id: string, onUpdate: (job: JobState<T>) => void, signal: AbortSignal): Promise<T> {
  for (;;) {
    if (signal.aborted) throw new Error("Przerwano");
    const { job } = await api<{ job: JobState<T> }>(`/api/jobs/${id}`, { signal });
    onUpdate(job);
    if (job.status === "done" && job.result) return job.result;
    if (job.status === "error") throw new Error(job.error || "Coś poszło nie tak");
    await new Promise((r) => setTimeout(r, 800));
  }
}

export function Studio() {
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [duration, setDuration] = useState(10);
  const [style, setStyle] = useState<AnimationStyle>("3d");
  const [theme, setTheme] = useState<ThemeId | "auto">("auto");
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState<ProviderId>("procedural");

  const [scene, setScene] = useState<SceneSpec | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiJob, setAiJob] = useState<JobState<SceneSpec> | null>(null);
  const [renderJob, setRenderJob] = useState<JobState<RenderResult> | null>(null);
  const [rendered, setRendered] = useState<RenderResult | null>(null);
  const [showMp4, setShowMp4] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoMeta[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadVideos = useCallback(() => {
    api<{ videos: VideoMeta[] }>("/api/videos")
      .then((d) => setVideos(d.videos))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api<{ providers: ProviderInfo[] }>("/api/providers")
      .then((d) => setProviders(d.providers))
      .catch(() => undefined);
    loadVideos();
  }, [loadVideos]);

  const generate = useCallback(
    async (opts: { seed?: number; scroll?: boolean } = {}) => {
      if (prompt.trim().length < 3) {
        setError("Wpisz pomysł na film – np. „Kotek bawi się kolorowymi kulkami”.");
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setGenerating(true);
      setError(null);
      setAiJob(null);
      try {
        const data = await api<{ scene?: SceneSpec; jobId?: string }>("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, duration, style, theme, sfx, music, provider, seed: opts.seed }),
          signal: controller.signal,
        });
        let next = data.scene ?? null;
        if (!next && data.jobId) next = await pollJob<SceneSpec>(data.jobId, setAiJob, controller.signal);
        if (next && !controller.signal.aborted) {
          setScene(next);
          setRendered(null);
          setRenderJob(null);
          setShowMp4(false);
          if (opts.scroll !== false && window.innerWidth < 1024) {
            setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (abortRef.current === controller) {
          setGenerating(false);
          setAiJob(null);
        }
      }
    },
    [prompt, duration, style, theme, sfx, music, provider],
  );

  // Live update of the preview when settings change (programmatic generator only – it's instant & free).
  const settingsKey = `${duration}|${style}|${theme}|${sfx}|${music}`;
  const lastKey = useRef(settingsKey);
  useEffect(() => {
    if (lastKey.current === settingsKey) return;
    lastKey.current = settingsKey;
    if (!scene || scene.provider !== "procedural" || provider !== "procedural") return;
    const t = setTimeout(() => generate({ seed: scene.seed, scroll: false }), 300);
    return () => clearTimeout(t);
  }, [settingsKey, scene, provider, generate]);

  const render = useCallback(async () => {
    if (!scene) return;
    setError(null);
    setRendered(null);
    const controller = new AbortController();
    try {
      setRenderJob({ id: "", status: "queued", progress: 0, stage: "Wysyłam do renderowania…" });
      const { jobId } = await api<{ jobId: string }>("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      });
      const result = await pollJob<RenderResult>(jobId, setRenderJob, controller.signal);
      setRendered(result);
      setShowMp4(true);
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRenderJob(null);
    }
  }, [scene, loadVideos]);

  const randomIdea = () => {
    const pool = EXAMPLES.filter((e) => e !== prompt);
    setPrompt(pool[Math.floor(Math.random() * pool.length)]);
  };

  const rendering = Boolean(renderJob);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 lg:pt-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-lg shadow-purple-300/60">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold leading-none sm:text-2xl">
              Shorts <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">AI Studio</span>
            </h1>
            <p className="mt-1 text-xs text-ink/55 sm:text-sm">Kolorowe animacje dla dzieci na YouTube Shorts</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {["9:16", "1080p", "5–20 s", "MP4"].map((b) => (
            <span key={b} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-purple-600 shadow-sm">
              {b}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* ───────────── Form ───────────── */}
        <form
          className="glass space-y-6 rounded-[28px] p-5 sm:p-7"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <div className="space-y-3">
            <label htmlFor="prompt" className="font-display text-2xl font-semibold leading-tight sm:text-[28px]">
              Jaki film dziś tworzymy? <span aria-hidden>🎈</span>
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 300))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                }}
                rows={3}
                placeholder="np. Kotek i piesek bawią się kolorowymi kulkami pod tęczą"
                className="w-full resize-none rounded-2xl border-2 border-purple-100 bg-white/90 px-4 py-3.5 pb-8 text-base leading-relaxed shadow-inner outline-none transition placeholder:text-ink/35 focus:border-purple-400 focus:ring-4 focus:ring-purple-200/60 sm:text-lg"
              />
              <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-ink/40">{prompt.length}/300</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={randomIdea}
                className="rounded-full bg-gradient-to-r from-amber-300 to-pink-300 px-3.5 py-1.5 text-sm font-semibold text-ink shadow-sm transition hover:scale-105"
              >
                🎲 Losuj pomysł
              </button>
              {EXAMPLES.slice(0, 4).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="max-w-full truncate rounded-full border border-purple-100 bg-white/80 px-3.5 py-1.5 text-sm text-ink/75 transition hover:border-purple-300 hover:text-purple-700"
                >
                  {ex}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink/50">
              Wskazówka: wymień zwierzątka (kotek, piesek, jednorożec, smoczek…), liczbę kulek, magiczne przedmioty (różdżka, korona,
              tęcza…) i miejsce (kosmos, ocean, las, zamek…).
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Styl animacji">
              <Segmented<AnimationStyle>
                value={style}
                onChange={setStyle}
                options={[
                  {
                    value: "3d",
                    label: "3D",
                    sub: "Błyszczący, przestrzenny",
                    icon: <span className="h-8 w-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#ff70a6_35%,#9b2c5c_100%)] shadow-md" />,
                  },
                  {
                    value: "2d",
                    label: "2D",
                    sub: "Płaski, rysunkowy",
                    icon: <span className="h-8 w-8 shrink-0 rounded-full border-[3px] border-ink bg-sky-400" />,
                  },
                ]}
              />
            </Section>

            <Section title="Długość filmu" hint={`${MIN_DURATION}–${MAX_DURATION} s`}>
              <div className="rounded-2xl bg-ink/5 px-4 pb-3 pt-3.5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-purple-600">
                    {duration}
                    <span className="ml-1 text-base font-semibold text-ink/50">sekund</span>
                  </span>
                  <span className="text-xs text-ink/50">{duration * 30} klatek</span>
                </div>
                <input
                  type="range"
                  className="range w-full"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  aria-label="Długość filmu w sekundach"
                />
              </div>
            </Section>
          </div>

          <Section title="Sceneria">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-xs font-semibold transition ${
                    theme === t.id ? "border-purple-400 bg-purple-50 text-purple-700" : "border-transparent bg-white/70 text-ink/70 hover:bg-white"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {t.emoji}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Dźwięk">
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle checked={sfx} onChange={setSfx} icon="🔔" label="Efekty dźwiękowe" sub="Pop, boing, magia, fanfary" />
              <Toggle checked={music} onChange={setMusic} icon="🎵" label="Muzyka w tle" sub="Wesoła melodia dopasowana do scenerii" />
            </div>
          </Section>

          <Section title="Generator">
            <div className="grid gap-2 sm:grid-cols-3">
              {(providers.length ? providers : [{ id: "procedural", name: "Animacja programowa", description: "", kind: "procedural", available: true } as ProviderInfo]).map(
                (p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.available}
                    onClick={() => setProvider(p.id)}
                    aria-pressed={provider === p.id}
                    title={p.hint}
                    className={`rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed ${
                      provider === p.id
                        ? "border-purple-400 bg-purple-50"
                        : p.available
                          ? "border-transparent bg-white/70 hover:bg-white"
                          : "border-dashed border-ink/15 bg-white/40 opacity-70"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {p.kind === "ai" ? "🤖" : "🎨"} {p.name}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-ink/55">{p.available ? p.description : p.hint}</span>
                    {p.kind === "procedural" && (
                      <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Darmowy
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </Section>

          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {aiJob && <ProgressBar value={aiJob.progress} label={aiJob.stage} />}

          <button
            type="submit"
            disabled={generating}
            className="btn-magic flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-display text-lg font-semibold text-white shadow-xl shadow-purple-300/60 transition active:scale-[0.98] disabled:opacity-70"
          >
            {generating ? <Spinner /> : <span aria-hidden>✨</span>}
            {generating ? "Tworzę animację…" : scene ? "Stwórz nową animację" : "Stwórz animację"}
          </button>
        </form>

        {/* ───────────── Preview ───────────── */}
        <div ref={previewRef} className="scroll-mt-4 space-y-4 lg:sticky lg:top-6">
          <div className="glass rounded-[28px] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Podgląd</h2>
              {rendered && (
                <div className="flex rounded-full bg-ink/5 p-1 text-xs font-semibold">
                  <button type="button" onClick={() => setShowMp4(false)} className={`rounded-full px-3 py-1 ${!showMp4 ? "bg-white shadow" : "text-ink/60"}`}>
                    Na żywo
                  </button>
                  <button type="button" onClick={() => setShowMp4(true)} className={`rounded-full px-3 py-1 ${showMp4 ? "bg-white shadow" : "text-ink/60"}`}>
                    Plik MP4
                  </button>
                </div>
              )}
            </div>

            {/* Phone frame 9:16 */}
            <div className="mx-auto w-full max-w-[340px] rounded-[38px] bg-ink p-2.5 shadow-2xl shadow-purple-400/30">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[30px] bg-gradient-to-b from-sky-300 via-purple-300 to-pink-300">
                {scene ? (
                  showMp4 && rendered ? (
                    <video key={rendered.url} src={rendered.url} controls playsInline autoPlay loop className="h-full w-full bg-black object-cover" />
                  ) : (
                    <PreviewPlayer scene={scene} />
                  )
                ) : (
                  <EmptyPreview generating={generating} />
                )}
              </div>
            </div>

            {scene && (
              <div className="mt-4 space-y-4">
                <ul className="flex flex-wrap gap-1.5">
                  {scene.detected.map((d) => (
                    <li key={d} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-ink/70">
                      {d}
                    </li>
                  ))}
                </ul>

                {renderJob ? (
                  <ProgressBar value={renderJob.progress} label={renderJob.stage} />
                ) : rendered ? (
                  <div className="space-y-3 rounded-2xl bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      🎉 Film gotowy! 1080×1920 · {rendered.durationInSeconds} s · {formatBytes(rendered.sizeBytes)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={rendered.downloadUrl}
                        download
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
                      >
                        ⬇️ Pobierz MP4
                      </a>
                      <a
                        href={rendered.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        ▶️ Otwórz
                      </a>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <button
                    type="button"
                    onClick={() => generate({ seed: Math.floor(Math.random() * 2 ** 31), scroll: false })}
                    disabled={generating || rendering}
                    className="rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold shadow-sm transition hover:bg-purple-50 disabled:opacity-50"
                    title="Wylosuj inny układ tej samej historii"
                  >
                    🎲 Inna wersja
                  </button>
                  <button
                    type="button"
                    onClick={render}
                    disabled={rendering || generating}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-ink/90 disabled:opacity-60"
                  >
                    {rendering ? <Spinner className="h-4 w-4" /> : "🎬"} {rendered ? "Renderuj ponownie" : "Renderuj MP4 (1080p)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ───────────── Gallery ───────────── */}
      {videos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold">Twoje filmy</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {videos.map((v) => (
              <article key={v.videoId} className="glass overflow-hidden rounded-2xl">
                <video
                  src={`/api/videos/${v.videoId}#t=1`}
                  preload="metadata"
                  muted
                  playsInline
                  controls
                  className="aspect-[9/16] w-full bg-ink object-cover"
                />
                <div className="space-y-1.5 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug">{v.title}</p>
                  <p className="text-[11px] text-ink/50">
                    {v.style.toUpperCase()} · {v.durationInSeconds} s · {formatBytes(v.sizeBytes)}
                  </p>
                  <a href={`/api/videos/${v.videoId}?download=1`} download className="block rounded-lg bg-purple-100 py-1.5 text-center text-xs font-semibold text-purple-700 hover:bg-purple-200">
                    Pobierz MP4
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 grid gap-4 text-sm text-ink/60 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="font-display font-semibold text-ink">1. Wpisz pomysł</p>
          <p className="mt-1">Studio rozpoznaje zwierzątka, kolory, liczby, magię i miejsca w języku polskim.</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="font-display font-semibold text-ink">2. Obejrzyj podgląd</p>
          <p className="mt-1">Animacja odtwarza się od razu w przeglądarce – razem z muzyką i efektami.</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="font-display font-semibold text-ink">3. Pobierz MP4</p>
          <p className="mt-1">Serwer renderuje film 1080×1920 (H.264 + AAC) gotowy do wrzucenia na YouTube Shorts.</p>
        </div>
      </footer>
    </div>
  );
}

function EmptyPreview({ generating }: { generating: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <div className="relative h-28 w-28 animate-float">
        <span className="absolute left-2 top-6 h-14 w-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#ffd60a_40%,#c79100_100%)] shadow-lg" />
        <span className="absolute right-1 top-0 h-10 w-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#ff70a6_40%,#a3134f_100%)] shadow-lg" />
        <span className="absolute bottom-0 right-5 h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#4cc9f0_40%,#0b6c8c_100%)] shadow-lg" />
      </div>
      <p className="font-display text-xl font-semibold drop-shadow">{generating ? "Czaruję…" : "Tu pojawi się Twój film"}</p>
      <p className="text-sm text-white/85 drop-shadow">Wpisz pomysł i kliknij „Stwórz animację”.</p>
    </div>
  );
}
