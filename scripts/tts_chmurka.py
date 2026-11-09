"""Generate the Polish voiceover for the "Chmurka i tęcza" short with Microsoft Edge neural TTS
(pl-PL-ZofiaNeural, native Polish female voice) and save per-scene MP3 + word timings (JSON).

    python3 scripts/tts_chmurka.py <out_dir> [rate]
"""
import asyncio, json, os, sys

try:  # make aiohttp trust a custom CA bundle (corporate / sandbox proxies)
    import certifi
    if os.environ.get("SSL_CERT_FILE"):
        certifi.where = lambda: os.environ["SSL_CERT_FILE"]
except ImportError:
    pass

import edge_tts

VOICE = "pl-PL-ZofiaNeural"
SCENES = [
    "Cześć! To znowu ja, Chmurka. Zobacz, jaka piękna tęcza! A wiesz, skąd się bierze?",
    "Najpierw potrzebny jest deszczyk. Kap, kap, kap! W powietrzu lata mnóstwo malutkich kropelek.",
    "Potem wychodzi słoneczko i świeci prosto na kropelki.",
    "Każda kropelka działa jak malutka magiczna lupa. Rozdziela światło na kolory: czerwony, pomarańczowy, żółty, zielony, niebieski i fioletowy!",
    "Mała rada: tęczę zobaczysz, gdy słoneczko jest za tobą, a deszczyk przed tobą.",
    "Pa, pa! Przy następnym deszczu poszukaj tęczy!",
]


async def one(i, text, out, rate, pitch):
    com = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch, boundary="WordBoundary")
    words, audio = [], bytearray()
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append({"text": chunk["text"], "start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    with open(os.path.join(out, f"scene{i + 1}.mp3"), "wb") as f:
        f.write(audio)
    return {"text": text, "words": words}


async def main():
    out = sys.argv[1]
    rate = sys.argv[2] if len(sys.argv) > 2 else "-12%"
    pitch = sys.argv[3] if len(sys.argv) > 3 else "+4Hz"
    os.makedirs(out, exist_ok=True)
    res = [await one(i, t, out, rate, pitch) for i, t in enumerate(SCENES)]
    with open(os.path.join(out, "words.json"), "w", encoding="utf8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


asyncio.run(main())
