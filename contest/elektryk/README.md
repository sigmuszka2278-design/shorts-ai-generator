# Elektryk – mój zawód przyszłości (rolka konkursowa WUP Wrocław)

Animacja ludzików w stylu Pivot Animator: 720×1280 (9:16), 10 kl./s, 58 s, 7 scen.

| Plik | Co to jest |
|---|---|
| `out/elektryk_z_napisami.mp4` | gotowy film z napisami ekranowymi i efektami dźwiękowymi |
| `out/elektryk_bez_napisow.mp4` | ta sama animacja bez tekstu (napisy dodajesz sam w CapCut) |
| `out/lektor_napisy.srt` | tekst lektora z czasami – ściągawka do nagrania głosu / autonapisy |
| `out/napisy_ekranowe.srt` | krótkie napisy ekranowe z czasami |
| `render_elektryk.py` | skrypt generujący wszystko od nowa |

Ponowne wygenerowanie: `python3 render_elektryk.py` (wymaga Pillow, numpy i ffmpeg).
Podgląd pojedynczych klatek: `PREVIEW=0,100,300 python3 render_elektryk.py`.
Sekwencja klatek PNG + tła bez ludzików do Pivota: `FRAMES=1 python3 render_elektryk.py`.
Same klatki z ludzikami 1080×1920 (9:16): `HD=1 FRAMES=flat python3 render_elektryk.py`.
Wersja pozioma 1920×1080 (16:9, animacja na środku): `HD=1 WIDE=1 FRAMES=flat python3 render_elektryk.py`.
