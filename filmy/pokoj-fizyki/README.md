# „TEN POKÓJ ŁAMIE PRAWA FIZYKI! 😱” – YouTube Short

Gotowy film: **`TEN_POKOJ_LAMIE_PRAWA_FIZYKI.mp4`** – 1080×1920 (9:16), 30 kl./s, 25 s, H.264 + AAC 48 kHz.

| Czas | Scena | Lektor |
|---|---|---|
| 0–3 s | szklanka unosi się, woda płynie do góry | „Ten pokój wygląda normalnie… ale za chwilę wydarzy się coś NIEMOŻLIWEGO!” |
| 3–7 s | krzesło lewituje, zegar cofa się, piłka robi pętlę na ścianie | „Tutaj grawitacja działa zupełnie inaczej!” |
| 7–12 s | drzwi same się otwierają – drugi pokój z meblami na suficie | „Ale to, co znajduje się za tymi drzwiami, jest jeszcze dziwniejsze!” |
| 12–18 s | przelot do odwróconego pokoju, obrót o 180°, za oknem planeta i latające wyspy | „CZEKAJ! Czy my właśnie trafiliśmy do innego wymiaru?!” |
| 18–23 s | lustro: pokój jest w szklanej kuli trzymanej przez kosmicznego robota | „A TERAZ NAJLEPSZE… TO WSZYSTKO JEST W ŚRODKU MAŁEJ KULI!” |
| 23–25 s | robot obraca kulę, kamera wraca do unoszącej się szklanki (pętla) | „Zauważyłeś to wcześniej?!” |

Ostatnia klatka płynnie przechodzi w pierwszą (ta sama pozycja kamery i stan szklanki), więc film zapętla się na Shorts.

## Jak to powstało (wszystko w kodzie, bez zewnętrznych grafik i nagrań)

- **Obraz 3D** – `src/scene.js` (three.js): oświetlenie PBR, miękkie cienie, szkło i woda z transmisją (załamanie światła),
  bloom, winieta i ziarno. Tekstury (parkiet, tapeta, dywan, krajobraz, kosmos, planeta) rysowane proceduralnie w `src/textures.js`.
  Każda klatka jest funkcją czasu, więc render jest deterministyczny.
- **Napisy** – `src/captions.js`: tytuł, hasła z emoji (Twemoji, CC-BY 4.0) i napisy lektora słowo po słowie (Montserrat Black, OFL).
- **Lektor** – `voice.py`: polski syntezator neuronowy Piper (`pl_PL-darkman-medium`).
- **Muzyka i efekty** – `audio.py`: syntezowane w numpy (pad w d-moll, pozytywka, bęben, szum, „whoosh”, skrzypienie drzwi,
  tykanie zegara, toczenie piłki, dźwięki robota); muzyka jest automatycznie ściszana pod głosem.
- **Render** – `render.cjs`: Chromium (Playwright) renderuje klatki, ffmpeg składa je w MP4.

## Odtworzenie

```bash
npm install
pip install piper-tts numpy
# model głosu: pl_PL-darkman-medium.onnx (+ .onnx.json) z repozytorium rhasspy/piper-voices
python3 voice.py /ścieżka/pl_PL-darkman-medium.onnx   # build/voice_*.npy + build/voice.json
python3 audio.py                                       # build/audio.wav
node render.cjs --stills 0,12.5,21.5 --noui            # podgląd pojedynczych klatek
node render.cjs --video build/video.mp4                # ~4 s/klatkę na CPU (SwiftShader)
ffmpeg -i build/video.mp4 -i build/audio.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart TEN_POKOJ_LAMIE_PRAWA_FIZYKI.mp4
```
