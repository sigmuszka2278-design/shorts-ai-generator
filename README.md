# 🎈 Shorts AI Studio

Aplikacja, która z jednego zdania tworzy **kolorowy, animowany film dla dzieci** gotowy na **YouTube Shorts**.

- pionowe wideo **9:16, 1080×1920, 30 kl./s**, plik **MP4 (H.264 + AAC)**
- długość **5–20 sekund**
- styl **3D** (błyszczące, przestrzenne obiekty, cienie, paralaksa, ruch kamery) lub **2D** (płaski, rysunkowy z konturem)
- **12 zwierzątek** (kotek, piesek, króliczek, miś, żabka, kaczuszka, jednorożec, smoczek, panda, lisek, pingwinek, świnka),
  **kolorowe kulki**, **10 magicznych przedmiotów** (różdżka, gwiazdka, korona, prezent, kryształ, balonik, serduszko, księżyc, grzybek, lizak),
  **8 scenerii** i **6 efektów** (tęcza, konfetti, iskierki, bańki, deszcz gwiazd, serduszka)
- **efekty dźwiękowe** (pop, boing, magia, fanfary…) i **muzyka w tle** – syntezowane w kodzie, bez licencjonowanych plików
- **podgląd na żywo** w przeglądarce (Remotion Player) + **renderowanie MP4 na serwerze** i **pobieranie**
- interfejs **po polsku**, działa na **telefonie i komputerze**
- działa **bez płatnego API** – a **prawdziwy generator wideo AI** można podłączyć jedną zmienną środowiskową

Technologie: **Next.js 16** (App Router), **Tailwind CSS 4**, **Remotion 4**, TypeScript, Vitest.

---

## Szybki start

Wymagania: **Node.js ≥ 20**.

```bash
npm install
npm run dev          # http://localhost:3000
```

Produkcyjnie:

```bash
npm run build
npm start
```

Pierwsze renderowanie MP4 trwa kilka sekund dłużej (Remotion przygotowuje paczkę kompozycji). Renderowanie potrzebuje
przeglądarki Chrome Headless Shell – Remotion pobierze ją automatycznie przy pierwszym renderze. Jeśli serwer nie ma dostępu
do internetu, wskaż własną przeglądarkę w `REMOTION_BROWSER_EXECUTABLE` (aplikacja sama wykrywa też przeglądarki Playwrighta).

## Wdrożenie na Vercel (link do otwierania na iPhonie)

Vercel uruchamia API jako funkcje serverless, które **nie mogą renderować wideo** (brak Chrome i ffmpeg, limit rozmiaru
i czasu). Dlatego na Vercelu aplikacja automatycznie przełącza się na **renderowanie w przeglądarce**: plik MP4
(H.264 + AAC, 1080×1920) tworzy telefon lub komputer użytkownika przez WebCodecs (`@remotion/web-renderer`).
**Nie jest potrzebny osobny serwer renderujący** ani żadna płatna usługa – wystarcza darmowy plan Hobby na Vercelu.

1. Zaloguj się na [vercel.com](https://vercel.com) kontem GitHub (plan **Hobby – darmowy**).
2. **Add New… → Project → Import** repozytorium `shorts-ai-generator`.
3. Framework zostanie wykryty jako **Next.js** – nic nie zmieniaj, nie dodawaj zmiennych środowiskowych.
   Vercel wdraża domyślną gałąź repozytorium; każdy kolejny `git push` na nią aktualizuje stronę.
4. **Deploy**. Po ok. 1–2 minutach dostaniesz link w stylu `https://shorts-ai-generator.vercel.app`.
5. Otwórz link w Safari na iPhonie.

Na iPhonie:
- **Podgląd** odtwarza się od razu (dotknij ▶, żeby usłyszeć dźwięk – iOS blokuje automatyczne odtwarzanie z dźwiękiem).
- **Renderuj MP4** – film powstaje na telefonie. Nie blokuj ekranu i nie przełączaj aplikacji (iOS wstrzymuje karty w tle).
- **Zapisz w Zdjęciach / Udostępnij** – otwiera arkusz udostępniania; wybierz **Zapisz wideo**, a film trafi do Zdjęć
  (stamtąd wrzucisz go do aplikacji YouTube). **Pobierz MP4** zapisuje plik w aplikacji **Pliki → Pobrane**.
- Wymagany iOS 16.4 lub nowszy (WebCodecs). Najlepiej działa na aktualnym iOS.
- **Dodaj do ekranu początkowego** (Safari → Udostępnij → „Do ekranu początk.”) – aplikacja otwiera się jak zwykła apka.

Ograniczenia na Vercelu: galeria „Twoje filmy” jest pusta (pliki nie są zapisywane na serwerze – zostają na urządzeniu),
a dostawcy AI wymagają trwałej kolejki zadań (np. Vercel KV / Redis), bo pamięć funkcji nie jest współdzielona.

### Opcjonalnie: renderowanie na serwerze

Gdyby renderowanie na telefonie było za wolne, ten sam kod działa jako serwer renderujący na dowolnej maszynie z Node.js
(Twój komputer, VPS, Docker): `npm run build && npm start` – tam tryb `server` jest domyślny. Telefon w tej samej sieci
Wi-Fi otworzy go pod adresem `http://<IP-komputera>:3000`. Usługi typu Remotion Lambda (AWS) są płatne i nie są
skonfigurowane.

## Jak to działa

```
pomysł (PL) ──► /api/generate ──► dostawca (provider)
                                    ├─ "procedural": analiza słów kluczowych → SceneSpec (JSON)   ← darmowy, offline
                                    └─ AI (Replicate / własny serwer): klip AI → SceneSpec z tłem wideo
SceneSpec ──► Remotion Player (podgląd w przeglądarce)
SceneSpec ──► /api/render ──► @remotion/renderer ──► renders/<id>.mp4 ──► /api/videos/<id>   (tryb "server")
SceneSpec ──► @remotion/web-renderer w przeglądarce ──► Blob MP4 ──► pobierz / udostępnij       (tryb "browser", Vercel)
```

1. **Analiza pomysłu** (`lib/scene/generator.ts`, `lib/scene/dictionary.ts`) – rozpoznaje polskie słowa (z odmianą, bez
   względu na ogonki): zwierzątka, liczby („pięć kulek”, „7 kulek”, „pięcioma kulkami”), kolory, ruch (skakanie, taniec,
   latanie, wirowanie, turlanie), magię, efekty i miejsce. Brakujące elementy są losowane – zawsze powstaje pełna historia.
2. **Scenariusz** (`SceneSpec`, `lib/scene/types.ts`) – oś czasu proporcjonalna do długości: tytuł → kulki → bohaterowie →
   magiczny przedmiot → „magiczny moment” (efekt + błysk + ruch kamery) → napis końcowy. Dźwięki są zsynchronizowane
   z wejściami postaci i lądowaniem przy skokach. Generator jest deterministyczny (ziarno `seed`) – „Inna wersja” losuje nowe ziarno.
3. **Animacja** (`remotion/`) – wszystkie grafiki są rysowane w SVG kodem (postacie, przedmioty, tła), więc nie ma żadnych
   zewnętrznych assetów. Styl 3D używa gradientów sferycznych, połysku, cieni, paralaksy i zbliżenia kamery.
4. **Dźwięk** (`lib/audio/synth.ts`) – mały syntezator generuje pliki WAV do `public/sfx` i `public/music`
   (`npm run sfx` odtwarza je od zera).
5. **Render** (`lib/render/renderer.ts`) – kolejka (jeden render naraz), postęp w `/api/jobs/:id`, wynik zapisywany w `renders/`.

## Podłączenie prawdziwego generatora wideo AI

Skopiuj `.env.example` do `.env.local` i ustaw jedną z opcji. Po restarcie w sekcji **Generator** pojawi się aktywna karta.
Klip z modelu AI staje się tłem filmu, a studio dodaje animowany tytuł, efekty magii, muzykę i efekty dźwiękowe,
po czym renderuje gotowy MP4 1080×1920 (klip krótszy niż film jest zapętlany).

### Opcja 1: Replicate (dowolny model text-to-video)

```env
REPLICATE_API_TOKEN=r8_...
REPLICATE_MODEL=minimax/video-01          # lub "owner/model:wersja"
# opcjonalnie – dopasowanie wejścia do konkretnego modelu:
REPLICATE_INPUT_TEMPLATE={"prompt":"{{prompt}}","aspect_ratio":"{{aspect_ratio}}","duration":{{duration}}}
```

Aplikacja buduje angielski prompt (styl 3D/2D, bohaterowie, sceneria, magia, „vertical 9:16, safe for kids”) i dołącza
oryginalny polski pomysł. Zmienne w szablonie: `{{prompt}}`, `{{duration}}`, `{{aspect_ratio}}`.

### Opcja 2: własny serwer HTTP

```env
AI_VIDEO_HTTP_URL=https://moj-serwer.pl/api/generate-video
AI_VIDEO_HTTP_TOKEN=sekret                 # opcjonalnie, wysyłany jako Bearer
```

Kontrakt:

```http
POST {AI_VIDEO_HTTP_URL}
{ "prompt": "...", "promptPl": "...", "duration": 10, "aspectRatio": "9:16", "width": 1080, "height": 1920, "style": "3d" }
```

Odpowiedź (od razu lub po odpytywaniu `statusUrl` metodą GET co 3 s):

```json
{ "videoUrl": "https://.../clip.mp4" }                      // gotowe
{ "statusUrl": "https://.../status/123", "progress": 0.4 }  // w trakcie
{ "status": "failed", "error": "..." }                      // błąd
```

Klip musi być dostępny przez HTTPS (lub z tego samego hosta co `AI_VIDEO_HTTP_URL`) i obsługiwać nagłówek `Range`.

### Własny dostawca w kodzie

Zaimplementuj interfejs `VideoProvider` z `lib/providers/types.ts` i dodaj go w `lib/providers/index.ts`.
Do opakowania gotowego klipu w scenę użyj `sceneFromAiClip()` z `lib/providers/ai-common.ts`.

## API

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| `GET` | `/api/providers` | lista generatorów i ich dostępność |
| `POST` | `/api/generate` | `{ prompt, duration, style: "2d"\|"3d", theme, sfx, music, provider, seed? }` → `{ scene }` lub `{ jobId }` (AI) |
| `POST` | `/api/render` | `{ scene }` → `{ jobId }` |
| `GET` | `/api/jobs/:id` | status zadania (`queued`/`running`/`done`/`error`, `progress`, `stage`, `result`) |
| `GET` | `/api/videos` | ostatnie filmy |
| `GET` | `/api/videos/:id` | strumień MP4 (z obsługą `Range`); `?download=1` – pobieranie |

## Skrypty

| Polecenie | Opis |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | testy jednostkowe (Vitest): analiza języka, generator, dostawcy AI (zamockowane API), Range, syntezator |
| `npm run test:render` | test end-to-end: renderuje 2 filmy (3D i 2D) i sprawdza ffprobe – 1080×1920, H.264, AAC, długość (`-- --stills` zapisuje klatki PNG) |
| `npm run lint` | sprawdzenie typów TypeScript |
| `npm run sfx` | ponowne wygenerowanie efektów dźwiękowych i muzyki |
| `npm run studio` | Remotion Studio – edycja kompozycji `KidsShort` |

## Konfiguracja

| Zmienna | Domyślnie | Opis |
| --- | --- | --- |
| `RENDER_MODE` | `server` lokalnie, `browser` na Vercelu | gdzie powstaje MP4 |
| `NEXT_PUBLIC_REMOTION_LICENSE_KEY` | `free-license` | licencja Remotion dla renderowania w przeglądarce |
| `RENDERS_DIR` | `./renders` | folder na filmy MP4 |
| `REMOTION_BROWSER_EXECUTABLE` | auto | ścieżka do Chrome Headless Shell |
| `RENDER_CONCURRENCY` | połowa rdzeni | wątki renderowania |
| `REPLICATE_*`, `AI_VIDEO_HTTP_*` | – | generatory AI (patrz wyżej) |

## Struktura

```
app/                 strona + API (Next.js App Router)
components/          interfejs (Studio, podgląd, kontrolki)
remotion/            kompozycja wideo: tła, postacie, kulki, magia, efekty, napisy, dźwięk
lib/scene/           słownik PL, generator scen, ruch, oś czasu, kolory
lib/providers/       generatory: programowy, Replicate, własny HTTP
lib/render/          renderowanie MP4 (Remotion), wykrywanie przeglądarki
lib/audio/           syntezator efektów i muzyki
public/              czcionka Fredoka (OFL), wygenerowane dźwięki
tests/               testy Vitest
```

## Serial: „Przygody Tosi z Kolorowego Lasu”

Odcinek 1 „Tosia i największa malina w lesie” to pełna animacja 16:9 (1920×1080, 4:00) zrobiona w Remotion,
bez zewnętrznych grafik i nagrań. Scenariusz: `scenariusze/tosia-01-najwieksza-malina.md`.

```bash
npm run episode:audio                 # muzyka + efekty (public/episode/*.wav) i napisy do dubbingu (scenariusze/tosia-01-dialogi.srt)
npm run episode                       # renders/episode/tosia-odc01-najwieksza-malina.mp4
npm run episode -- --shorts           # renders/episode/tosia-odc01-shorts.mp4 (9:16, ok. 44 s)
npm run episode -- --stills=3,82,141  # podgląd wybranych sekund jako PNG
```

- Kod: `remotion/episode/` – postacie (`characters.tsx`), plany (`world.tsx`), ujęcia i ruch kamery (`shots.tsx`),
  oś czasu dialogów, efektów i piosenki (`cues.ts`), kompozycje `TosiaOdcinek1` i `TosiaOdcinek1Shorts` (`Episode.tsx`).
- **Głosy:** film ma muzykę, efekty i napisy, ale nie ma lektora – w środowisku nie było polskiego syntezatora mowy.
  Dialogi z dokładnymi czasami są w pliku SRT, a muzyka jest ściszana pod kwestiami, więc nagrany głos wystarczy
  podłożyć w dowolnym edytorze (np. CapCut). Postacie poruszają ustami dokładnie w czasie swoich kwestii.

## Licencje

- Remotion ma własną licencję: darmową dla osób prywatnych i firm do 3 osób, większe firmy potrzebują licencji firmowej –
  zobacz [remotion.dev/license](https://remotion.dev/license).
- Czcionka Fredoka – SIL Open Font License.
- Wszystkie grafiki, efekty dźwiękowe i muzyka są generowane przez kod tego projektu.
