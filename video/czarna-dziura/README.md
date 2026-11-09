# 🕳️ „CO BY SIĘ STAŁO, GDYBYŚ WPADŁ DO CZARNEJ DZIURY?! 😱” – YouTube Shorts

Gotowy plik: **[`czarna-dziura-shorts.mp4`](czarna-dziura-shorts.mp4)** – 30 s, pionowo 9:16, 1080 × 1920, 30 kl./s,
H.264 + AAC 48 kHz, głośność znormalizowana do −14 LUFS (standard YouTube). Wszystko po polsku.

## Scenariusz → realizacja

| Czas | Lektor | Obraz |
|---|---|---|
| 0–4 s | „Co by się stało, gdybyś zbliżył się do czarnej dziury? To bardziej niesamowite, niż myślisz!” | Szybki dolot kamery do czarnej dziury z dyskiem akrecyjnym, tytuł z 😱, kinowe uderzenie |
| 4–9 s | „Jej grawitacja jest tak silna, że nawet światło nie może uciec zza horyzontu zdarzeń!” | Animowane tory fotonów obliczone z równań Schwarzschilda – część omija dziurę, część wpada; zaznaczony horyzont zdarzeń |
| 9–15 s | „Dla odległego obserwatora twój zegar wyglądałby, jakby chodził coraz wolniej!” | Astronauta 3D (wizjer odbija czarną dziurę) i zegar; potem widok z daleka: zegar zwalnia (pasek tempa √(1 − rₛ/r)), astronauta czerwienieje i ciemnieje (przesunięcie grawitacyjne), tykanie coraz rzadsze |
| 15–21 s | „A gdy przekroczysz horyzont zdarzeń, nie ma już drogi powrotnej!” | Lot w stronę cienia, świecący pierścień fotonowy rozszerza się poza kadr, błysk, „PUNKT BEZ POWROTU”, gwiazdy gasną |
| 21–26 s | „Co dzieje się dalej? Nasza fizyka nie potrafi jeszcze opisać wszystkiego, co kryje wnętrze czarnej dziury!” | Tajemnicza ciemność, delikatne świetliste spirale i drobiny, podpisy „osobliwość?”, „kwantowa grawitacja?” |
| 26–30 s | „A ty? Odważyłbyś się zobaczyć czarną dziurę z bliska?” | Kamera odjeżdża – ogromna czarna dziura na tle galaktyki spiralnej, „Napisz w komentarzu! 👇” |

Przejścia (zoom-blur, błysk, wstrząs, aberracja chromatyczna + whoosh) w 4, 9, 12, 15, 18, 21, 23,5 i 26 s – co 2,5–5 s.

## Fizyka (poprawność naukowa)

`bh.py` to prawdziwy ray-tracer czarnej dziury Schwarzschilda (G = c = M = 1). Dla każdej klatki całkowane jest
równanie toru fotonu `d²u/dφ² = −u + 3u²` (u = 1/r), więc obraz pokazuje rzeczywiste efekty:

- **cień** czarnej dziury (krytyczny parametr zderzenia b = 3√3 M ≈ 2,6 rₛ – cień jest większy niż sam horyzont),
- **pierścień fotonowy** i **soczewkowanie** – tylna część dysku widoczna nad i pod cieniem, zniekształcone gwiazdy i galaktyka,
- **dysk akrecyjny** od ISCO (r = 6M) z profilem temperatury cienkiego dysku,
- **efekt Dopplera i przesunięcie grawitacyjne** – strona dysku zbliżająca się do nas jest jaśniejsza i bardziej niebieska.

Tory promieni w scenie 4–9 s to dokładne geodezyjne zerowe (`d²x/dλ² = −3/2·rₛ·h²·x/r⁵`). Spowolnienie zegara pokazuje
wzór na grawitacyjną dylatację czasu `√(1 − rₛ/r)` – z perspektywy **odległego obserwatora**, zgodnie z tekstem lektora.
Wnętrze czarnej dziury przedstawiono jako zagadkę – zgodnie z obecnym stanem wiedzy.

## Dźwięk

- **Lektor:** neuronowy polski TTS [Piper](https://github.com/rhasspy/piper) (głos `pl_PL-mc_speech-medium`, działa offline),
  obróbka: EQ, kompresja, delikatny pogłos. Napisy pojawiają się fraza po frazie zsynchronizowane z głosem.
- **Muzyka i efekty:** w całości syntezowane w `audio.py` (bez licencjonowanych plików, brak problemów z prawami autorskimi):
  ambientowy dron w a-moll, pady, puls „serca” przyspieszający przed horyzontem, riser, uderzenia, whooshe,
  tykanie zwalniającego zegara, dudnienie, migotliwe dzwonki tajemnicy. Muzyka jest ściszana pod lektora (ducking).

## Jak wygenerować ponownie

```bash
pip install numpy scipy soundfile pillow piper-tts "opencv-python-headless==4.10.0.84"
./make.sh            # ok. 20–30 min na 4 rdzeniach CPU; model głosu pobierany automatycznie z GitHuba
```

Podgląd pojedynczych klatek: `python3 render.py --stills 2.5,6.5,13.5` → `build/stills/`.
Inny głos: `VOICE=gosia ./make.sh` (głos żeński) lub `VOICE=darkman ./make.sh`.

| Plik | Rola |
|---|---|
| `script.py` | scenariusz: kwestie lektora, fragmenty napisów, wyróżnione słowa, momenty przejść |
| `voice.py` | synteza lektora i dopasowanie kwestii do okien czasowych → `build/voice.wav`, `build/timing.json` |
| `audio.py` | muzyka, efekty, miks → `build/mix.wav` |
| `bh.py` | ray-tracer czarnej dziury, mapa nieba, bloom, tone mapping |
| `astronaut.py` | astronauta renderowany metodą SDF ray-marchingu |
| `render.py` | sceny, ruch kamery, napisy, nakładki, przejścia → `build/video.mp4` |
| `make.sh` | cały proces + złożenie i normalizacja głośności → `czarna-dziura-shorts.mp4` |
