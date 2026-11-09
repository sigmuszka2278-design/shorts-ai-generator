#!/usr/bin/env bash
# Pełna produkcja filmu „Co by się stało, gdybyś wpadł do czarnej dziury?!”
#   ./make.sh            -> czarna-dziura-shorts.mp4 (1080×1920, 30 kl./s, 30 s, H.264 + AAC)
# Wymagania: python3, ffmpeg, pip install numpy scipy soundfile opencv-python-headless pillow piper-tts
set -euo pipefail
cd "$(dirname "$0")"
WORKERS="${WORKERS:-4}"

python3 voice.py                      # 1. polski lektor (Piper TTS, offline) + napisy zsynchronizowane z głosem
python3 audio.py                      # 2. muzyka + efekty dźwiękowe + miks z lektorem
python3 render.py --workers "$WORKERS" # 3. obraz: ray-tracing czarnej dziury, astronauta, napisy, przejścia

# 4. złożenie: normalizacja głośności do -14 LUFS (standard YouTube), H.264 High + AAC 48 kHz
ffmpeg -y -loglevel error -i build/video.mp4 -i build/mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart \
  -metadata title="CO BY SIĘ STAŁO, GDYBYŚ WPADŁ DO CZARNEJ DZIURY?! 😱" -metadata language=pol \
  czarna-dziura-shorts.mp4

ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate:format=duration,size -of compact czarna-dziura-shorts.mp4
