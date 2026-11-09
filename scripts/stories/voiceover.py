"""Generate the Polish voiceover + word timings for a scripted story.

Usage: python3 scripts/stories/voiceover.py <story.json> <out_dir> [--rate=-12%] [--voice=pl-PL-ZofiaNeural]

story.json: {"scenes": [{"id": "s1", "voiceover": "..."}, ...]}
Writes <out_dir>/<id>.mp3 for every scene and <out_dir>/timings.json with
per-word offsets (seconds, relative to the start of that scene's clip) and the
clip duration. Uses Microsoft neural TTS through edge-tts (native Polish
female voice "Zofia").
"""
import asyncio
import json
import os
import subprocess
import sys

import certifi

# Respect a custom CA bundle (e.g. a corporate / sandbox HTTPS proxy).
_ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
if _ca:
    certifi.where = lambda: _ca

import edge_tts  # noqa: E402


def duration_of(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]
    )
    return float(out.strip())


async def synth(text: str, voice: str, rate: str, pitch: str, path: str):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append(
                    {
                        "text": chunk["text"],
                        "start": round(chunk["offset"] / 1e7, 3),
                        "end": round((chunk["offset"] + chunk["duration"]) / 1e7, 3),
                    }
                )
    return words


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
    story_path, out_dir = args
    voice = opts.get("voice", "pl-PL-ZofiaNeural")
    rate = opts.get("rate", "-12%")
    pitch = opts.get("pitch", "+0Hz")
    with open(story_path, encoding="utf-8") as f:
        story = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    result = {"voice": voice, "rate": rate, "pitch": pitch, "scenes": {}}
    for scene in story["scenes"]:
        path = os.path.join(out_dir, f"{scene['id']}.mp3")
        words = await synth(scene["voiceover"], voice, rate, pitch, path)
        result["scenes"][scene["id"]] = {
            "text": scene["voiceover"],
            "duration": round(duration_of(path), 3),
            "words": words,
        }
        print(scene["id"], result["scenes"][scene["id"]]["duration"], "s", len(words), "words")
    with open(os.path.join(out_dir, "timings.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


asyncio.run(main())
