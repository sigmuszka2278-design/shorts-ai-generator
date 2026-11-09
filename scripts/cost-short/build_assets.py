#!/usr/bin/env python3
"""
Builds every asset for a "cost counter" YouTube Short from a script file:

  cost-short/<slug>.json  ──►  public/cost-short/<slug>/
                                 voice.wav        Polish voiceover (Microsoft neural voice via edge-tts)
                                 shot-XX.jpg      AI photo stills, 1080×1920 (image.pollinations.ai)
                                 music.wav        warm cinematic pulse bed (synthesised here)
                                 cash.wav         "ka-ching" for the price counter (synthesised here)
                                 grain.png        film-grain texture
                                 timeline.json    word timings, subtitle chunks, shots, counter steps

Usage:
  python3 scripts/cost-short/build_assets.py cost-short/auto-na-rok.json [--skip-images] [--skip-voice]

Network: speech.platform.bing.com (voice) and image.pollinations.ai (images), via $HTTPS_PROXY if set.
"""
from __future__ import annotations

import asyncio
import io
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SR = 24000  # edge-tts native sample rate
FPS = 30


# ───────────────────────────── voice ─────────────────────────────

async def _tts(text: str, voice: str, rate: str, pitch: str, out_mp3: Path) -> list[dict]:
    import edge_tts

    kwargs = {"rate": rate, "pitch": pitch, "boundary": "WordBoundary"}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        kwargs["proxy"] = proxy
    events: list[dict] = []
    com = edge_tts.Communicate(text, voice, **kwargs)
    with open(out_mp3, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                events.append(
                    {"text": chunk["text"], "start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7}
                )
    return events


def decode_mono(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path: Path, samples: np.ndarray, sr: int = SR, channels: int = 1) -> None:
    data = np.clip(samples, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def norm(s: str) -> str:
    return re.sub(r"[^0-9a-ząćęłńóśźż]", "", s.lower())


def align(tokens: list[str], events: list[dict]) -> list[dict]:
    """Assigns TTS word-boundary times to the whitespace tokens of the script text."""
    words: list[dict] = []
    ti = 0
    for ev in events:
        target = norm(ev["text"])
        if not target:
            continue
        group: list[str] = []
        acc = ""
        while ti < len(tokens) and len(acc) < len(target):
            acc += norm(tokens[ti])
            group.append(tokens[ti])
            ti += 1
        if acc != target:
            raise RuntimeError(f"Alignment mismatch: script {group!r} vs voice {ev['text']!r}")
        # split the event's time span across its tokens proportionally to their length
        total = sum(max(1, len(norm(g))) for g in group)
        t = ev["start"]
        span = ev["end"] - ev["start"]
        for g in group:
            d = span * max(1, len(norm(g))) / total
            words.append({"text": g, "start": t, "end": t + d})
            t += d
    if ti != len(tokens):
        raise RuntimeError(f"Voice did not cover the tokens: {tokens[ti:]!r}")
    return words


# ───────────────────────────── subtitles ─────────────────────────────

HAS_DIGIT = re.compile(r"\d")
UNIT_WORDS = {"zł", "tysiącach", "tysięcy", "tysiące", "tysiąc"}
PUNCT_END = re.compile(r"[.,!?;:…]$")


def mark_highlights(words: list[dict]) -> None:
    for i, w in enumerate(words):
        prev_digit = i > 0 and bool(HAS_DIGIT.search(words[i - 1]["text"]))
        w["highlight"] = bool(HAS_DIGIT.search(w["text"])) or (prev_digit and norm(w["text"]) in {norm(u) for u in UNIT_WORDS})


def glued_to_next(words: list[dict], i: int) -> bool:
    """True when words[i] and words[i+1] must stay on screen together (e.g. "19 000 zł")."""
    if i + 1 >= len(words):
        return False
    nxt = words[i + 1]["text"]
    cur = words[i]["text"]
    if PUNCT_END.search(cur):
        return False
    return bool(HAS_DIGIT.search(cur)) and (bool(HAS_DIGIT.match(nxt)) or norm(nxt) in {norm(u) for u in UNIT_WORDS})


def chunk_words(words: list[dict]) -> list[list[int]]:
    """Groups a segment's words into on-screen chunks of 2–4 words, breaking at punctuation."""
    chunks: list[list[int]] = []
    cur: list[int] = []
    n = len(words)
    for i in range(n):
        if cur and not glued_to_next(words, i - 1):
            run = 1  # length of the unbreakable group starting at i, e.g. "19 000 zł"
            while glued_to_next(words, i + run - 1):
                run += 1
            if len(cur) + run > 4:
                chunks.append(cur)
                cur = []
        cur.append(i)
        if glued_to_next(words, i):
            continue
        # words left in the current sentence after i
        rest = 0
        for j in range(i + 1, n):
            rest += 1
            if PUNCT_END.search(words[j]["text"]):
                break
        ends_sentence = bool(PUNCT_END.search(words[i]["text"]))
        if i == n - 1:
            brk = True
        elif ends_sentence and len(cur) >= 2:
            brk = True
        elif ends_sentence and len(cur) == 1 and chunks and len(chunks[-1]) <= 2:
            # glue a lone sentence-final word back to a short previous chunk
            chunks[-1].extend(cur)
            cur = []
            continue
        elif len(cur) >= 4:
            brk = True
        elif len(cur) >= 3 and rest != 1:
            brk = True
        else:
            brk = False
        if brk:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


# ───────────────────────────── images ─────────────────────────────

def fetch_image(prompt: str, seed: int, out: Path) -> None:
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width=1080&height=1920&nologo=true&model=flux&seed={seed}"
    )
    last_err: Exception | None = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                data = r.read()
            img = Image.open(io.BytesIO(data)).convert("RGB")
            break
        except Exception as e:  # rate limits / timeouts
            last_err = e
            time.sleep(4 * (attempt + 1))
    else:
        raise RuntimeError(f"Image failed after retries: {prompt[:60]}… ({last_err})")

    # The service returns ~576×1024 with a small logo in the bottom-right corner:
    # take an exact 9:16 crop that leaves out the bottom strip, then upscale to 1080×1920.
    w, h = img.size
    crop_h = int(h * 0.94)
    crop_w = int(round(crop_h * 9 / 16))
    if crop_w > w:
        crop_w = w
        crop_h = int(round(w * 16 / 9))
    left = (w - crop_w) // 2
    img = img.crop((left, 0, left + crop_w, crop_h))
    img = img.resize((1080, 1920), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    img.save(out, "JPEG", quality=90)


# ───────────────────────────── sound design ─────────────────────────────

def env_exp(n: int, decay: float, sr: int) -> np.ndarray:
    return np.exp(-np.arange(n) / (decay * sr))


def lowpass(x: np.ndarray, cutoff: float, sr: int) -> np.ndarray:
    a = math.exp(-2 * math.pi * cutoff / sr)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # small one-pole filter; fine for these short buffers
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def synth_music(duration: float, sr: int = 44100, bpm: float = 104) -> np.ndarray:
    """Warm, driving cinematic bed: sub pulse, soft kick, airy pad, ticking hats. Stereo."""
    rng = np.random.default_rng(7)
    n = int(duration * sr)
    t = np.arange(n) / sr
    beat = 60 / bpm
    L = np.zeros(n, dtype=np.float32)
    R = np.zeros(n, dtype=np.float32)

    # chord progression (A minor → F → C → G), each 2 bars
    roots = [110.0, 87.31, 130.81, 98.0]
    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 261.63, 329.63], [196.0, 246.94, 293.66]]
    bar = beat * 4
    seg = bar * 2

    pad = np.zeros(n, dtype=np.float32)
    for k in range(int(math.ceil(duration / seg)) + 1):
        s0 = int(k * seg * sr)
        s1 = min(n, int((k + 1) * seg * sr))
        if s0 >= n:
            break
        tt = t[s0:s1] - t[s0]
        ch = chords[k % 4]
        sig = np.zeros(s1 - s0, dtype=np.float32)
        for f in ch:
            for det in (-0.6, 0.6):
                sig += np.sin(2 * np.pi * (f + det) * tt) * 0.5 + 0.18 * np.sin(2 * np.pi * 2 * (f + det) * tt)
        fade = np.minimum(1, np.minimum(tt / 0.4, (seg - tt) / 0.4)).clip(0, 1)
        pad[s0:s1] += sig * fade * 0.05
        # sub-bass pulse on every 8th, sidechain-ish
        root = roots[k % 4]
        for e in range(16):
            p0 = s0 + int(e * beat / 2 * sr)
            if p0 >= s1:
                break
            ln = min(int(beat / 2 * sr), s1 - p0)
            tp = np.arange(ln) / sr
            pad[p0 : p0 + ln] += (np.sin(2 * np.pi * root / 2 * tp) * env_exp(ln, 0.12, sr) * 0.22).astype(np.float32)

    # kick on beats 1 and 3 (and every beat in the second half for drive), hats on 8ths
    nbeats = int(duration / beat) + 1
    kick_len = int(0.35 * sr)
    tk = np.arange(kick_len) / sr
    kick = (np.sin(2 * np.pi * (48 + 90 * np.exp(-tk * 30)) * tk) * env_exp(kick_len, 0.09, sr)).astype(np.float32)
    hat_len = int(0.05 * sr)
    hat = (rng.standard_normal(hat_len) * env_exp(hat_len, 0.012, sr)).astype(np.float32)
    hat = hat - lowpass(hat, 6000, sr)
    for b in range(nbeats):
        p = int(b * beat * sr)
        if p >= n:
            break
        drive = b * beat > duration * 0.45
        if b % 2 == 0 or drive:
            ln = min(kick_len, n - p)
            L[p : p + ln] += kick[:ln] * 0.55
            R[p : p + ln] += kick[:ln] * 0.55
        for off, pan in ((0.0, 0.35), (0.5, 0.65)):
            q = p + int(off * beat * sr)
            if q >= n:
                continue
            ln = min(hat_len, n - q)
            amp = 0.10 if off else 0.06
            L[q : q + ln] += hat[:ln] * amp * (1 - pan)
            R[q : q + ln] += hat[:ln] * amp * pan

    L += pad
    R += pad
    # intro swell + outro fade
    fade_in = np.clip(t / 1.2, 0, 1)
    fade_out = np.clip((duration - t) / 1.8, 0, 1)
    g = (fade_in * fade_out).astype(np.float32)
    st = np.stack([L * g, R * g], axis=1)
    peak = np.max(np.abs(st)) or 1
    return (st / peak * 0.85).astype(np.float32)


def synth_cash(sr: int = 44100) -> np.ndarray:
    """Short register "ka-ching": a mechanical click followed by two bright bell hits."""
    rng = np.random.default_rng(3)
    n = int(0.9 * sr)
    out = np.zeros(n, dtype=np.float32)
    cl = int(0.03 * sr)
    click = rng.standard_normal(cl) * env_exp(cl, 0.006, sr)
    out[:cl] += click * 0.5
    for start, base in ((0.06, 2093.0), (0.12, 2637.0)):
        s = int(start * sr)
        ln = n - s
        tt = np.arange(ln) / sr
        bell = sum(a * np.sin(2 * np.pi * base * m * tt) for m, a in ((1, 1.0), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)))
        out[s:] += (bell * env_exp(ln, 0.18, sr) * 0.35).astype(np.float32)
    return out / (np.max(np.abs(out)) or 1) * 0.9


def make_grain(path: Path) -> None:
    rng = np.random.default_rng(11)
    g = rng.normal(128, 38, (720, 720)).clip(0, 255).astype(np.uint8)
    Image.fromarray(g, "L").filter(ImageFilter.GaussianBlur(0.6)).save(path)


# ───────────────────────────── main ─────────────────────────────

def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    script_path = Path(args[0] if args else ROOT / "cost-short" / "auto-na-rok.json")
    spec = json.loads(script_path.read_text(encoding="utf-8"))
    slug = spec["slug"]
    out_dir = ROOT / "public" / "cost-short" / slug
    tmp = out_dir / "_tmp"
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp.mkdir(exist_ok=True)

    gap = float(spec.get("gapSeconds", 0.12))
    tail = float(spec.get("tailSeconds", 1.0))

    # 1) voice, segment by segment (exact segment boundaries, natural prosody inside each)
    voice_parts: list[np.ndarray] = []
    segments: list[dict] = []
    all_words: list[dict] = []
    cursor = 0.35  # short breath before the first word
    voice_parts.append(np.zeros(int(cursor * SR), dtype=np.float32))
    cache_file = tmp / "voice-cache.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    for idx, seg in enumerate(spec["segments"]):
        mp3 = tmp / f"seg-{idx:02d}.mp3"
        key = f"{spec['voice']}|{spec['rate']}|{spec.get('pitch', '+0Hz')}|{seg['text']}"
        if "--skip-voice" in flags and mp3.exists() and cache.get(str(idx), {}).get("key") == key:
            events = cache[str(idx)]["events"]
        else:
            print(f"🎙  [{idx + 1}/{len(spec['segments'])}] {seg['text']}")
            events = asyncio.run(_tts(seg["text"], spec["voice"], spec["rate"], spec.get("pitch", "+0Hz"), mp3))
            cache[str(idx)] = {"key": key, "events": events}
        audio = decode_mono(mp3)
        # trim trailing silence after the last word so the edit stays tight
        last_end = max(e["end"] for e in events)
        keep = min(len(audio), int((last_end + 0.08) * SR))
        audio = audio[:keep]
        tokens = seg["text"].split()
        words = align(tokens, events)
        for w in words:
            w["start"] = round(w["start"] + cursor, 3)
            w["end"] = round(w["end"] + cursor, 3)
            w["segment"] = idx
        seg_start = cursor
        seg_end = cursor + len(audio) / SR
        segments.append(
            {
                "index": idx,
                "text": seg["text"],
                "start": round(seg_start, 3),
                "end": round(seg_end, 3),
                "cost": seg.get("cost"),
                "total": bool(seg.get("total")),
            }
        )
        all_words.extend(words)
        voice_parts.append(audio)
        voice_parts.append(np.zeros(int(gap * SR), dtype=np.float32))
        cursor = seg_end + gap
    cache_file.write_text(json.dumps(cache, ensure_ascii=False))
    voice_parts.append(np.zeros(int(tail * SR), dtype=np.float32))
    voice = np.concatenate(voice_parts)
    peak = np.max(np.abs(voice)) or 1
    write_wav(out_dir / "voice.wav", voice / peak * 0.95)
    duration = len(voice) / SR
    duration = math.ceil(duration * FPS) / FPS
    print(f"⏱  voice: {duration:.2f} s")

    # 2) subtitles
    mark_highlights(all_words)
    chunks: list[dict] = []
    for idx in range(len(segments)):
        seg_words = [w for w in all_words if w["segment"] == idx]
        for group in chunk_words(seg_words):
            ws = [seg_words[i] for i in group]
            chunks.append(
                {
                    "start": ws[0]["start"],
                    "end": ws[-1]["end"],
                    "words": [{"text": w["text"], "start": w["start"], "end": w["end"], "highlight": w["highlight"]} for w in ws],
                }
            )
    for i, c in enumerate(chunks):  # keep each chunk until the next one appears (max +0.5 s)
        nxt = chunks[i + 1]["start"] if i + 1 < len(chunks) else duration
        c["end"] = round(min(nxt, c["end"] + 0.5), 3)
    bad = [c for c in chunks if not 1 <= len(c["words"]) <= 4]
    if bad:
        raise RuntimeError(f"Chunk sizes out of range: {bad}")

    # 3) counter steps – the amount appears the moment the narrator starts saying it
    steps: list[dict] = []
    running = 0
    for seg in segments:
        if seg["cost"]:
            nums = [w for w in all_words if w["segment"] == seg["index"] and HAS_DIGIT.search(w["text"])]
            amount = str(int(seg["cost"]))
            first_num = next((w for w in nums if re.sub(r"\D", "", w["text"]) == amount), nums[-1])
            running += int(seg["cost"])
            steps.append({"at": first_num["start"], "add": int(seg["cost"]), "value": running})
    total_at = next((s["start"] for s in segments if s["total"]), None)

    # 4) shots – split each segment's screen time evenly between its shots
    shots: list[dict] = []
    shot_no = 0
    for i, seg in enumerate(segments):
        s0 = 0.0 if i == 0 else seg["start"] - gap / 2
        s1 = duration if i == len(segments) - 1 else segments[i + 1]["start"] - gap / 2
        prompts = spec["segments"][i]["shots"]
        step = (s1 - s0) / len(prompts)
        for k, prompt in enumerate(prompts):
            shot_no += 1
            fname = f"shot-{shot_no:02d}.jpg"
            shots.append({"src": f"cost-short/{slug}/{fname}", "start": round(s0 + k * step, 3), "end": round(s0 + (k + 1) * step, 3)})
            target = out_dir / fname
            if "--skip-images" in flags and target.exists():
                continue
            print(f"🖼  {fname}: {prompt[:70]}")
            fetch_image(f"{prompt}, {spec['imageSuffix']}", 1000 + shot_no * 17, target)

    # 5) sound design
    write_wav(out_dir / "cash.wav", synth_cash(), sr=44100)
    music = synth_music(duration + 0.5)
    write_wav(out_dir / "music.wav", music.reshape(-1), sr=44100, channels=2)
    make_grain(out_dir / "grain.png")

    timeline = {
        "slug": slug,
        "title": spec["title"],
        "fps": FPS,
        "durationInSeconds": round(duration, 3),
        "voice": f"cost-short/{slug}/voice.wav",
        "music": f"cost-short/{slug}/music.wav",
        "cash": f"cost-short/{slug}/cash.wav",
        "grain": f"cost-short/{slug}/grain.png",
        "segments": segments,
        "chunks": chunks,
        "counter": {"steps": steps, "totalAt": total_at},
        "shots": shots,
    }
    (out_dir / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✔ {out_dir.relative_to(ROOT)}/timeline.json – {len(chunks)} subtitle chunks, {len(shots)} shots, total {running} zł")


if __name__ == "__main__":
    main()
