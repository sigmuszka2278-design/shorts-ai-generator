"""
Generates the Polish voiceover for the "Chmurka" short (remotion/chmurka).

Voice: Microsoft Edge neural TTS, pl-PL-ZofiaNeural (native Polish female), slowed down
for a calm bedtime-story pace. Word timings come from the TTS engine's WordBoundary
events, so the burned-in subtitles are synchronised with the speech.

    pip install edge-tts
    python3 scripts/chmurka-voiceover.py

Writes public/chmurka/vo-<n>.mp3 and remotion/chmurka/voiceover.json.
Set SSL_CERT_FILE if you are behind a TLS-intercepting proxy.
"""
import asyncio
import json
import os
import ssl
import subprocess
from pathlib import Path

import edge_tts
import edge_tts.communicate as communicate

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "chmurka"
JSON_PATH = ROOT / "remotion" / "chmurka" / "voiceover.json"

VOICE = "pl-PL-ZofiaNeural"
RATE = "-10%"
PITCH = "+4Hz"

LINES = [
    "Cześć! Jestem Chmurka. Czy wiesz, dlaczego niebo jest niebieskie?",
    "Słoneczko świeci na biało. Ale w tym świetle ukryły się wszystkie kolory tęczy!",
    "Kiedy światło leci przez powietrze, niebieski kolor odbija się na wszystkie strony. Najbardziej ze wszystkich!",
    "Dlatego, gdy patrzysz w górę, widzisz wszędzie niebieski!",
    "A wieczorem niebo bywa pomarańczowe. Ale to już zagadka na inny raz!",
    "Pa, pa! Spójrz dziś na niebo i powiedz, jaki ma kolor!",
]

if os.environ.get("SSL_CERT_FILE"):
    communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(out.stdout.strip()), 3)


async def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    scenes = []
    for i, text in enumerate(LINES, start=1):
        com = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
        words = []
        path = AUDIO_DIR / f"vo-{i}.mp3"
        with path.open("wb") as f:
            async for chunk in com.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    start = chunk["offset"] / 1e7
                    words.append({
                        "text": chunk["text"],
                        "start": round(start, 3),
                        "end": round(start + chunk["duration"] / 1e7, 3),
                    })
        scenes.append({
            "text": text,
            "file": f"chmurka/vo-{i}.mp3",
            "duration": duration(path),
            "speechEnd": words[-1]["end"],
            "words": words,
        })
        print(f"scene {i}: speech {words[-1]['end']:.2f}s, {len(words)} words")
    JSON_PATH.write_text(json.dumps({"voice": VOICE, "rate": RATE, "pitch": PITCH, "scenes": scenes}, ensure_ascii=False, indent=2) + "\n")


asyncio.run(main())
