# „6 CIEKAWOSTEK, O KTÓRYCH NIGDY NIE SŁYSZAŁEŚ! 😱” – YouTube Short

Gotowy plik: [`output/6-ciekawostek.mp4`](../output/6-ciekawostek.mp4) – MP4 (H.264 + AAC 48 kHz stereo),
1080×1920, 30 kl./s, ok. 49 s, głośność −14 LUFS (standard YouTube).

## Co jest w filmie

| Czas | Scena | Animacja |
| --- | --- | --- |
| 0–7 s | Intro | wielka „6” uderza w ekran z wstrząsem i hukiem, wirujące promienie, 6 emoji ciekawostek krąży wokół, „?” jako zapowiedź ostatniej |
| 7 s | 1. Ośmiornice 🐙 | ośmiornica pod wodą (falujące macki, bąbelki, promienie światła), 3 serca wyskakują i biją, potem zmieniają kolor na niebieski |
| 12 s | 2. Wenus 🪐 | obracająca się Wenus, Słońce i orbita, karty porównania: 1 obrót = 243 dni vs 1 rok = 225 dni |
| 18 s | 3. Rekiny 🦈 | prehistoryczny ocean z amonitami, rekin przepływa przez kadr, oś czasu: ok. 450 mln lat temu → pierwsze drzewa ok. 385 mln lat temu |
| 23 s | 4. Banany 🍌 | banan i truskawka z minami, pieczątki „✅ JAGODA” / „❌ NIE JAGODA”, zdziwione oczy, wstrząs |
| 29 s | 5. Kosmos 🌌 | powierzchnia Księżyca, Ziemia na niebie, kolejne odciski butów (z dźwiękiem kroków), licznik „1 000 000+ lat”, przekreślony wiatr i deszcz |
| 36 s | 6. Meduzy 🪼 | świecąca, pulsująca meduza, efekt „◀◀ REWIND” z zegarem kręcącym się do tyłu, meduza kurczy się do polipa i odradza jako młoda |
| 42 s | Zakończenie | kafelki 1–6, „💬 Napisz numer 1–6! 👇” |

Każde przejście: whoosh + wjazd kamery z rozmyciem, błysk i kolorowe przetarcie. Numer i nazwa ciekawostki
wskakują na środek ekranu, a potem dokują u góry; kropki postępu pokazują, która to ciekawostka.
Napisy (po 1–3 słowa) są zsynchronizowane z lektorem co do słowa – aktualne słowo jest podświetlane.

## Jak to powstało (wszystko offline, bez płatnych API)

1. **Lektor** – `tts.py`: neuronowy polski głos [Piper](https://github.com/rhasspy/piper) (`pl-mls_6892-low`).
   Z modelu odczytywane są wyrównania fonemów, z których powstają czasy każdego słowa (`voice.json`).
2. **Dźwięk** – `build.py`: obróbka głosu (EQ, kompresja), syntezowana muzyka (tajemnicza, energiczna – a-moll /
   harmoniczna, 124 BPM, z pompowaniem od stopy), efekty dźwiękowe, ściszanie muzyki pod lektorem, normalizacja
   do −14 LUFS. Zapisuje też `remotion/facts/timeline.json` (czasy scen, słów i „uderzeń” animacji).
3. **Obraz** – kompozycja Remotion `FactsShort` (`remotion/facts/`), wszystkie grafiki rysowane w SVG.
4. **Render** – `scripts/render-facts.ts` renderuje obraz i łączy go z dźwiękiem.

```bash
pip install piper-tts onnx numpy
curl -L -o voice.tgz https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-pl-mls_6892-low.tar.gz
mkdir -p voice && tar xzf voice.tgz -C voice
python3 facts-short/tts.py voice/pl-mls_6892-low.onnx facts-short/script.json work/raw
python3 facts-short/build.py work/raw work
npx tsx scripts/render-facts.ts work/mix.wav work/out.mp4
ffmpeg -i work/out.mp4 -c:v libx264 -preset slow -crf 22 -c:a copy -movflags +faststart output/6-ciekawostek.mp4
```

Podgląd i edycja animacji: `npm run studio` → kompozycja **FactsShort**.
Tekst lektora i napisy zmienia się w `script.json` (pole `text` – co czyta lektor, `display` – co widać w napisach,
ta sama liczba słów).

## Fakty

- Ośmiornice mają 3 serca, a ich krew jest niebieska (hemocyjanina z miedzią).
- Wenus: obrót wokół osi ≈ 243 dni ziemskich, obieg Słońca ≈ 225 dni.
- Najstarsze ślady rekinów ≈ 450 mln lat; pierwsze drzewa ≈ 385 mln lat temu.
- Botanicznie banan jest jagodą, truskawka – nie (to owoc rzekomy).
- Na Księżycu nie ma wiatru ani deszczu, więc ślady mogą przetrwać miliony lat.
- *Turritopsis dohrnii* potrafi wrócić ze stadium dorosłej meduzy do stadium polipa.

Uwaga: głos Piper „low” ma 16 kHz – brzmi naturalnie, ale nie studyjnie. Można go zamienić na dowolne nagranie
lektora: wystarczy podmienić pliki WAV i czasy słów w `voice.json`.
