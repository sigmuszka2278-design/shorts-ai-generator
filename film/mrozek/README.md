# Sławomir Mrożek. Moja historia – film biograficzny

Dokument biograficzny (ok. 7 min, 1920×1080, 30 kl./s, H.264 + AAC) na lekcję języka polskiego.
Pisarz „opowiada” swoje życie w pierwszej osobie: archiwalny portret z 1960 roku jest delikatnie
animowany (ruch ust zsynchronizowany z narracją, mruganie, oddech, ruch kamery).

Gotowy plik: `film/mrozek/output/mrozek-film.mp4`.

## Struktura filmu

| Część | Treść | Obraz |
| --- | --- | --- |
| Wstęp | „Witam Was. Nazywam się Sławomir Mrożek…” | portret z 1960 r., powolny najazd na twarz, fortepian |
| 1. Moje dzieciństwo (1930–1939) | Borzęcin, rodzice, rodzeństwo, przeprowadzka do Krakowa (1933) | Borzęcin, Kraków 1933 |
| 2. Wojna i młodość | powrót do Borzęcina w 1939, okupacja, matura 1949, studia | Borzęcin, I LO im. Nowodworskiego |
| 3. Jak zostałem pisarzem | „Dziennik Polski”, „Przekrój”, „Szpilki”, pierwsze książki (1953) | plansze prasowe i książkowe |
| 4. Najsłynniejsze dzieła | „Słoń”, „Wesele w Atomicach”, „Policja”, „Tango”, „Emigranci”, groteska i absurd | ilustracja D. Mroza, stykówka z „Tanga” (Paryż 1967) |
| 5. Emigracja | Chiavari 1963, Paryż 1968, list w „Le Monde”, azyl, obywatelstwo 1978, Meksyk 1989, powrót 1996 | Chiavari, Paryż, Praga 1968, Meksyk |
| 6. Życie prywatne | Maria Obremba, Susana Osorio, udar 2002, afazja, „Baltazar” (2006) | portret, plansza z podpisem |
| 7. Osiągnięcia | sceny świata, lektura szkolna, nagrody i odznaczenia | „Tango” w Klużu, spotkanie autorskie 2006 |
| 8. Ostatni rozdział | Nicea 2008–2013, śmierć 15 VIII 2013, Panteon Narodowy 17 IX 2013 | Nicea, kościół św. Piotra i Pawła, sarkofag |
| Zakończenie | tekst końcowy, czarno-biały portret, napis „SŁAWOMIR MROŻEK 1930–2013”, źródła, informacja o AI | |

## Weryfikacja faktów

Każde zdanie narracji opiera się na sprawdzonych informacjach (Britannica, Culture.pl, Wikipedia,
Dzieje.pl/PAP, komunikaty UJ i Urzędu Miasta Krakowa, ZPE). Narracja nie zawiera wymyślonych
cytatów ani wspomnień – sformułowania w 1. osobie streszczają fakty. Ocena interpretacyjna
(wpływ wojny i totalitaryzmu) jest wprost przypisana badaczom.

Uwagi do faktów:
- pogrzeb (złożenie urny w Panteonie Narodowym) odbył się **17 września 2013** (komunikat Urzędu Miasta Krakowa);
- przedział lat w Meksyku podawany bywa jako 1989–1996 lub 1989–1997 – w filmie: powrót do Krakowa w 1996 (Britannica);
- świadomie pominięto szczegóły niepotwierdzone w źródłach (np. studia na ASP, nazwa hacjendy).

## Jak powstaje (pipeline)

Wymagania: Node ≥ 20, Python ≥ 3.11, ffmpeg. Pakiety Pythona: `edge-tts mediapipe opencv-contrib-python-headless numpy scipy`
(do `cv2.dnn_superres` wystarcza `opencv-python-headless` ≥ 5). Modele (do katalogu z `MROZEK_MODELS`):
- `face_landmarker.task` – https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- `EDSR_x4.pb` – https://github.com/Saafke/EDSR_Tensorflow/raw/master/models/EDSR_x4.pb

```bash
python film/mrozek/pipeline/fetch_images.py      # fotografie z Wikimedia Commons + credits.json
python film/mrozek/pipeline/narrate.py           # narracja (pl-PL-MarekNeural) + napisy z czasem słów
python film/mrozek/pipeline/animate_portrait.py  # mówiący portret → public/mrozek/talk/*.mp4
python film/mrozek/pipeline/music.py 427         # muzyka fortepianowa (synteza w kodzie)
npx tsx scripts/render-mrozek.ts                 # render → renders/mrozek/mrozek-film.mp4
npx tsx scripts/render-mrozek.ts --stills=6,106  # kadry kontrolne
```

Podgląd i edycja w Remotion Studio: `npm run studio` → kompozycja **MrozekFilm**.

- `film/mrozek/script.json` – scenariusz (tekst = napisy; daty cyframi). Tablica `spoken` zamienia daty na
  poprawnie odmienione słowa dla syntezatora, a napisy są wyrównywane do granic słów.
- `remotion/mrozek/` – montaż: oś czasu, plansze rozdziałów, efekt Kena Burnsa, plansze typograficzne,
  efekt starego filmu (ziarno, migotanie, rysy, kurz, winieta), napisy, ściszanie muzyki pod głos, napisy końcowe.

### Animacja twarzy

Portret (330×496 px, domena publiczna) jest powiększany 4× siecią EDSR i łagodnie wygładzany. MediaPipe
wyznacza 478 punktów twarzy; z nich powstają gęste pola przemieszczeń (żuchwa i dolna warga, zwężenie ust,
powieki). Stopień otwarcia ust w każdej klatce wynika z obwiedni głośności narracji (pasmo 200–4000 Hz), a
wnętrze ust jest domalowywane cieniem. To deformacja geometryczna, nie model generatywny – dlatego ruch jest
celowo subtelny i nie zmienia rysów twarzy pisarza.

## Licencje

- Fotografie: Wikimedia Commons – autorzy i licencje w `public/mrozek/credits.json` i w napisach końcowych
  (domena publiczna, CC0, CC BY, CC BY-SA). Na zdjęciach z licencją CC widnieje podpis autora.
- Głos: syntezator mowy (neuronowy głos pl-PL); nie naśladuje głosu Sławomira Mrożka.
- Muzyka: skomponowana algorytmicznie w `music.py`.
- Kroje: Playfair Display, Cormorant Garamond (SIL OFL 1.1).

Film jest artystyczną rekonstrukcją biografii. Narracja i animacja zostały stworzone przy użyciu AI.
