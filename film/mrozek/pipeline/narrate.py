"""Narracja filmu: syntezuje mowę (edge-tts, głos pl-PL-MarekNeural) dla każdego segmentu
scenariusza i buduje napisy zsynchronizowane z mową.

Tekst w scenariuszu jest zapisany tak, jak ma się wyświetlać w napisach (daty cyframi).
Przed syntezą liczby są zamieniane na poprawnie odmienione słowa (tablica `spoken`),
a czas każdego napisu wyznacza się z granic słów zwracanych przez syntezator.

Użycie:  python film/mrozek/pipeline/narrate.py
Wynik:   public/mrozek/audio/<id>.mp3, public/mrozek/narration.json
"""
import asyncio
import json
import os
import re
import ssl
import subprocess
import sys

import edge_tts
import edge_tts.communicate as _comm

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SCRIPT = os.path.join(ROOT, "film", "mrozek", "script.json")
OUT = os.path.join(ROOT, "public", "mrozek", "audio")

# W środowisku z proxy TLS użyj jego pakietu certyfikatów.
_ca = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
if _ca:
    _comm._SSL_CTX = ssl.create_default_context(cafile=_ca)


def to_spoken(text: str, table: list[dict]) -> str:
    for row in table:
        text = text.replace(row["display"], row["spoken"])
    if re.search(r"\d", text):
        raise ValueError(f"Niezamieniona liczba w tekście: {text}")
    return text


def count_words(text: str) -> int:
    return len([w for w in re.findall(r"[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+", text)])


def split_cues(text: str, max_len: int = 84) -> list[str]:
    """Dzieli tekst na napisy: najpierw na zdania, długie zdania – po przecinkach/dwukropkach."""
    sentences = re.findall(r"[^.!?…]+[.!?…]+[”\"]?|[^.!?…]+$", text)
    cues: list[str] = []
    for s in (x.strip() for x in sentences):
        if not s:
            continue
        if len(s) <= max_len:
            cues.append(s)
            continue
        parts = re.split(r"(?<=[,:;])\s+", s)
        cur = ""
        for p in parts:
            if cur and len(cur) + 1 + len(p) > max_len:
                cues.append(cur)
                cur = p
            else:
                cur = f"{cur} {p}".strip()
        if cur:
            cues.append(cur)
    # zbyt długi kawałek bez przecinka – dziel po słowach
    out: list[str] = []
    for c in cues:
        while len(c) > max_len + 20:
            cut = c.rfind(" ", 0, max_len)
            out.append(c[:cut])
            c = c[cut + 1:]
        out.append(c)
    return out


async def synth(text: str, path: str, voice: dict) -> list[dict]:
    comm = edge_tts.Communicate(text, voice["name"], rate=voice["rate"], pitch=voice["pitch"], boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"]})
    return words


def duration(path: str) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float(out.strip())


async def main() -> None:
    script = json.load(open(SCRIPT, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    table = sorted(script["spoken"], key=lambda r: -len(r["display"]))
    only = set(sys.argv[1:])
    result = []
    prev = {}
    prev_path = os.path.join(ROOT, "public", "mrozek", "narration.json")
    if only and os.path.exists(prev_path):
        prev = {s["id"]: s for s in json.load(open(prev_path, encoding="utf-8"))["segments"]}

    for seg in script["segments"]:
        if only and seg["id"] not in only:
            result.append(prev[seg["id"]])
            continue
        spoken = to_spoken(seg["text"], table)
        mp3 = os.path.join(OUT, f"{seg['id']}.mp3")
        for attempt in range(4):
            try:
                words = await synth(spoken, mp3, script["voice"])
                break
            except Exception as e:  # sieć bywa kapryśna
                print("  ponawiam:", e)
                await asyncio.sleep(2 ** attempt)
        else:
            raise RuntimeError(f"Synteza nie powiodła się: {seg['id']}")
        dur = duration(mp3)

        # napisy: każdy napis „konsumuje” tyle słów, ile zawiera jego wersja mówiona
        cues = []
        i = 0
        for cue in split_cues(seg["text"]):
            n = count_words(to_spoken(cue, table))
            chunk = words[i:i + n]
            i += n
            if not chunk:
                continue
            cues.append({"text": cue, "start": round(chunk[0]["t"], 3), "end": round(chunk[-1]["t"] + chunk[-1]["d"], 3)})
        if i != len(words):
            print(f"  UWAGA {seg['id']}: słowa napisów {i} ≠ granice {len(words)} – skaluję proporcjonalnie")
            total = sum(len(c["text"]) for c in cues)
            t = words[0]["t"]
            end = words[-1]["t"] + words[-1]["d"]
            for c in cues:
                d = (end - words[0]["t"]) * len(c["text"]) / total
                c["start"], c["end"] = round(t, 3), round(t + d, 3)
                t += d
        # wyrównaj luki: napis trwa do początku następnego
        for a, b in zip(cues, cues[1:]):
            a["end"] = max(a["end"], min(b["start"], a["end"] + 0.6))
        result.append({**seg, "audio": f"mrozek/audio/{seg['id']}.mp3", "duration": round(dur, 3), "cues": cues,
                       "words": [{"t": round(w["t"], 3), "d": round(w["d"], 3)} for w in words]})
        print(f"{seg['id']:7s} {dur:6.2f}s  {len(cues)} napisów")

    total = sum(s["duration"] for s in result)
    print(f"Łącznie mowy: {total:.1f}s")
    json.dump({"voice": script["voice"], "segments": result}, open(prev_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    asyncio.run(main())
