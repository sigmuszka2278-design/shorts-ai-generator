"""Builds the timeline and the full audio mix for the "6 ciekawostek" Short.

usage: python3 build.py <raw_voice_dir> <work_dir>

Inputs : script.json (next to this file), <raw_voice_dir>/{id}.wav + voice.json (from tts.py)
Outputs: ../remotion/facts/timeline.json   – scene/word/beat timings for Remotion
         <work_dir>/mix.wav                – voice + music + sound effects (48 kHz stereo)

Music and sound effects are synthesized here (numpy), no external assets.
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
raw_dir, work = Path(sys.argv[1]), Path(sys.argv[2])
work.mkdir(parents=True, exist_ok=True)
SR = 48000
FPS = 30
rng = np.random.default_rng(7)

script = json.loads((HERE / "script.json").read_text())
voice_meta = json.loads((raw_dir / "voice.json").read_text())


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as f:
        assert f.getframerate() == SR and f.getnchannels() == 1
        return np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768


def write_wav(path: Path, data: np.ndarray):
    data = np.clip(data, -1, 1)
    if data.ndim == 1:
        data = data[:, None]
    with wave.open(str(path), "wb") as f:
        f.setnchannels(data.shape[1]); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((data * 32767).astype(np.int16).tobytes())


# ── 1. Voice: clean up + make it punchier ────────────────────────────
VOICE_FX = ",".join([
    "highpass=f=85",
    "equalizer=f=180:t=q:w=1.2:g=2",
    "equalizer=f=2800:t=q:w=1.4:g=4",
    "equalizer=f=5200:t=q:w=1.5:g=2",
    "acompressor=threshold=-20dB:ratio=3.5:attack=4:release=80:makeup=3",
    f"aresample={SR}:resampler=soxr",
])
voices = {}
for seg in script["segments"]:
    out = work / f"voice_{seg['id']}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw_dir / f"{seg['id']}.wav"), "-af", VOICE_FX,
                    "-ac", "1", str(out)], check=True)
    v = read_wav(out)
    voices[seg["id"]] = v / (np.max(np.abs(v)) + 1e-9) * 0.95

# ── 2. Timeline ──────────────────────────────────────────────────────
LEAD = {"intro": 0.12, "outro": 0.55}  # facts: 0.8 s number reveal before the voice
TAIL = {"intro": 0.3, "outro": 1.7}
t = 0.0
segments = []
for seg in script["segments"]:
    sid = seg["id"]
    meta = voice_meta[sid]
    lead = LEAD.get(sid, 0.8)
    tail = TAIL.get(sid, 0.45)
    start_f = round(t * FPS)
    voice_at = start_f / FPS + lead
    end_f = round((voice_at + meta["duration"] + tail) * FPS)
    words = [{"w": w["w"], "start": round(voice_at + w["start"], 3), "end": round(voice_at + w["end"], 3)}
             for w in meta["words"]]
    beats = {}
    for name, word in seg.get("beats", {}).items():
        norm = lambda x: x.lower().strip(".,!?")
        match = [w for w in words if norm(w["w"]) == norm(word)]
        assert match, (sid, word)
        beats[name] = match[0]["start"]
    segments.append({
        "id": sid, "number": seg.get("number"), "label": seg.get("label"), "emoji": seg.get("emoji"),
        "from": start_f, "duration": end_f - start_f, "voiceAt": round(voice_at, 3),
        "voiceEnd": round(voice_at + meta["duration"], 3), "words": words, "beats": beats,
    })
    t = end_f / FPS
total_frames = round(t * FPS)
total = total_frames / FPS
timeline = {"fps": FPS, "width": 1080, "height": 1920, "durationInFrames": total_frames,
            "title": script["title"], "segments": segments}
(HERE.parent / "remotion" / "facts").mkdir(parents=True, exist_ok=True)
(HERE.parent / "remotion" / "facts" / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
print(f"total {total:.2f}s ({total_frames} frames)")
for s in segments:
    print(f"  {s['id']:8s} {s['from']/FPS:6.2f}s  +{s['duration']/FPS:5.2f}s  beats={s['beats']}")

# ── 3. Synth helpers ─────────────────────────────────────────────────
def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, decay=None):
    x = tt(d)
    e = np.minimum(1, x / max(a, 1e-4))
    if decay:
        e *= np.exp(-x / decay)
    return e


def lowpass(x, cutoff):
    # one-pole low-pass, cutoff may be an array
    c = np.broadcast_to(np.asarray(cutoff, dtype=np.float64), x.shape)
    k = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc)
        y[i] = acc
    return y


def sweep(f0, f1, d, curve="exp"):
    x = tt(d) / d
    f = f0 * (f1 / f0) ** x if curve == "exp" else f0 + (f1 - f0) * x
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR)).astype(np.float64)


def bell(freq, d, decay=0.6):
    x = tt(d)
    s = sum(a * np.sin(2 * np.pi * freq * m * x) * np.exp(-x / (decay / m ** 0.5))
            for m, a in [(1, 1), (2.01, 0.45), (3.0, 0.25), (4.17, 0.15)])
    return s * np.minimum(1, x / 0.002)


def fit(*parts):
    n = max(len(p) for p in parts)
    return sum(np.pad(p, (0, n - len(p))) for p in parts)


def sfx_boom():
    d = 1.6
    body = sweep(140, 32, d) * env(d, 0.002, 0.45)
    crack = lowpass(noise(d), 2500) * env(d, 0.001, 0.08) * 1.4
    return np.tanh(1.6 * (body + crack))


def sfx_whoosh(d=0.55):
    x = tt(d) / d
    shape = np.sin(np.pi * x) ** 2
    return lowpass(noise(d), 300 + 5500 * x ** 1.5) * shape * 2.2


def sfx_riser(d=0.7):
    x = tt(d) / d
    tone = sweep(220, 1200, d) * 0.25
    return (lowpass(noise(d), 800 + 7000 * x ** 2) * 1.5 + tone) * x ** 2


def sfx_pop():
    d = 0.18
    return sweep(900, 260, d) * env(d, 0.001, 0.05)


def sfx_click():
    d = 0.06
    return lowpass(noise(d), 4000) * env(d, 0.0005, 0.01) * 1.5


def sfx_heartbeat():
    d = 0.24
    beat = sweep(90, 45, d) * env(d, 0.003, 0.07)
    out = np.zeros(int(0.5 * SR))
    out[:len(beat)] += beat
    out[int(0.2 * SR):int(0.2 * SR) + len(beat)] += beat * 0.8
    return np.tanh(2 * out)


def sfx_magic():
    out = np.zeros(int(1.4 * SR))
    for i, f in enumerate([1046, 1318, 1568, 2093, 2637]):
        b = bell(f, 0.9, 0.35) * 0.35
        o = int(i * 0.07 * SR)
        out[o:o + len(b)] += b
    return out + lowpass(noise(1.4), 6000) * np.exp(-tt(1.4) / 0.4) * 0.08


def sfx_correct():
    return fit(bell(1318, 0.9, 0.4), np.pad(bell(1760, 0.9, 0.5), (int(0.1 * SR), 0))) * 0.6


def sfx_wrong():
    d = 0.45
    x = tt(d)
    sq = np.sign(np.sin(2 * np.pi * 150 * x)) + np.sign(np.sin(2 * np.pi * 157 * x))
    return lowpass(sq, 1500) * env(d, 0.005) * np.where(x < 0.4, 1, 0) * 0.35


def sfx_boing():
    d = 0.6
    x = tt(d)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * x) * np.exp(-x / 0.25) + 120 * x
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.003, 0.25)


def sfx_step():
    d = 0.22
    return lowpass(noise(d), 600) * env(d, 0.002, 0.04) * 2.2 + sweep(120, 60, d) * env(d, 0.002, 0.05) * 0.6


def sfx_rewind():
    d = 1.1
    x = tt(d)
    f = 300 + 1900 * (x / d) ** 1.3
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    chop = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * x))
    return lowpass(saw, 3500) * chop * np.sin(np.pi * x / d) ** 0.5 * 0.45


def sfx_sparkle():
    out = np.zeros(int(1.2 * SR))
    for i in range(9):
        f = rng.uniform(2000, 4200)
        b = bell(f, 0.4, 0.12) * 0.22
        o = int(rng.uniform(0, 0.7) * SR)
        out[o:o + len(b)] += b
    return out


def sfx_glitch():
    d = 0.3
    x = tt(d)
    return np.sign(np.sin(2 * np.pi * 70 * x)) * (rng.uniform(size=len(x)) > 0.5) * env(d, 0.001, 0.08) * 0.4


SFX = {k[4:]: v for k, v in globals().items() if k.startswith("sfx_")}
SFX = {k: f() for k, f in SFX.items()}

# ── 4. Music: mysterious, energetic loop (A minor, 124 BPM) ──────────
BPM = 124
beat = 60 / BPM
n = int(total * SR) + SR
music = np.zeros(n)
pump = np.ones(n)  # side-chain style pumping from the kick
chords = [  # root (bass), arpeggio notes – Am, F, Dm, E (harmonic minor = mystery)
    (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (38, [57, 62, 65, 69]), (40, [56, 59, 64, 68]),
]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
kick = sweep(150, 42, 0.32) * env(0.32, 0.001, 0.09)
hat = lowpass(noise(0.05), 9000) - lowpass(noise(0.05), 3000)
hat *= env(0.05, 0.0005, 0.012)
snare = (lowpass(noise(0.2), 5000) * env(0.2, 0.001, 0.05) + sweep(240, 180, 0.2) * env(0.2, 0.001, 0.04)) * 0.6
pluck_cache = {}


def pluck(m, d=0.22):
    if m not in pluck_cache:
        x = tt(d)
        f = hz(m)
        saw = 2 * ((f * x) % 1) - 1 + 0.5 * (2 * ((f * 1.005 * x) % 1) - 1)
        pluck_cache[m] = lowpass(saw, 600 + 3500 * np.exp(-x / 0.05)) * env(d, 0.002, 0.09)
    return pluck_cache[m]


def place(buf, s, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    s = s[: len(buf) - i]
    buf[i:i + len(s)] += s


bars = int(total / (4 * beat)) + 2
intro_drop = segments[0]["voiceAt"]
for b in range(bars):
    root, arp = chords[b % 4]
    t0 = b * 4 * beat
    # pad
    d = 4 * beat
    x = tt(d)
    pad = sum(np.sin(2 * np.pi * hz(m) * x + i) + 0.6 * np.sin(2 * np.pi * hz(m) * 1.004 * x)
              for i, m in enumerate(arp[:3]))
    place(music, pad * np.minimum(1, x / 0.4) * np.minimum(1, (d - x) / 0.3) * 0.035, t0)
    for k in range(4):
        tb = t0 + k * beat
        place(music, kick * 0.9, tb)
        i = int(tb * SR)
        L = min(int(0.25 * SR), n - i)
        if L > 0:
            pump[i:i + L] = np.minimum(pump[i:i + L], 0.45 + 0.55 * (np.arange(L) / L) ** 0.6)
        if k in (1, 3):
            place(music, snare * 0.5, tb)
        for e in range(2):
            place(music, hat * (0.35 if e else 0.18), tb + e * beat / 2)
        # bass: eighth notes with octave jump
        for e in range(2):
            d = beat / 2 * 0.9
            x = tt(d)
            f = hz(root + (12 if e else 0))
            bass = (np.sin(2 * np.pi * f * x) + 0.3 * np.sign(np.sin(2 * np.pi * f * x))) * env(d, 0.004, 0.15)
            place(music, lowpass(bass, 700) * 0.32, tb + e * beat / 2)
        # 16th-note arpeggio
        for s in range(4):
            idx = (k * 4 + s) % 8
            m = (arp + [a + 12 for a in arp])[[0, 1, 2, 3, 7, 6, 5, 4][idx]]
            place(music, pluck(m) * 0.16, tb + s * beat / 4)
    # mysterious celesta motif every 2 bars
    if b % 2 == 1:
        for j, m in enumerate([arp[3] + 12, arp[2] + 12, arp[1] + 12, arp[2] + 12]):
            place(music, bell(hz(m), 1.0, 0.5) * 0.05, t0 + j * beat)
music = music * pump
music = music / (np.max(np.abs(music)) + 1e-9)

# ── 5. Sound-effect cues (from scene timings + beats) ─────────────────
cues = [("boom", 0.0, 0.85), ("glitch", 0.05, 0.4)]
seg_by = {s["id"]: s for s in segments}
for s in segments:
    st = s["from"] / FPS
    if s["id"] != "intro":
        cues += [("riser", st - 0.62, 0.35), ("whoosh", st - 0.2, 0.55)]
    if s["number"]:
        cues += [("boom", st + 0.02, 0.45), ("click", st + 0.35, 0.5)]
bt = lambda sid, k: seg_by[sid]["beats"][k]
cues += [
    ("pop", bt("octopus", "hearts"), 0.5), ("pop", bt("octopus", "hearts") + 0.18, 0.5),
    ("pop", bt("octopus", "hearts") + 0.36, 0.5), ("heartbeat", bt("octopus", "hearts") + 0.6, 0.6),
    ("magic", bt("octopus", "blood"), 0.45),
    ("whoosh", bt("venus", "day"), 0.35), ("correct", bt("venus", "year"), 0.4),
    ("whoosh", bt("shark", "shark") - 0.1, 0.5), ("pop", bt("shark", "trees"), 0.5),
    ("boing", bt("banana", "banana"), 0.45), ("correct", bt("banana", "berry"), 0.5),
    ("wrong", bt("banana", "no"), 0.5), ("boing", bt("banana", "strawberry"), 0.35),
    ("pop", bt("moon", "wind"), 0.45), ("pop", bt("moon", "rain"), 0.45), ("sparkle", bt("moon", "years"), 0.4),
    ("rewind", bt("jelly", "rewind"), 0.5), ("magic", bt("jelly", "young"), 0.5), ("sparkle", bt("jelly", "young") + 0.2, 0.45),
    ("pop", bt("outro", "numbers"), 0.4), ("magic", seg_by["outro"]["voiceEnd"] + 0.1, 0.35),
]
# footsteps on the Moon (must match MoonScene: 5 steps every 0.38 s from the "ślady" beat)
for k in range(5):
    cues.append(("step", bt("moon", "steps") + k * 0.38, 0.55))
fx = np.zeros(n)
for name, at, gain in cues:
    place(fx, SFX[name] * gain, max(0.0, at))

# ── 6. Mix ───────────────────────────────────────────────────────────
voice = np.zeros(n)
for s in segments:
    place(voice, voices[s["id"]], s["voiceAt"])
# duck music under the voice (smoothed envelope)
act = np.convolve(np.abs(voice), np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same") > 0.02
act = np.convolve(act.astype(float), np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
duck = 1 - 0.55 * np.clip(act * 1.5, 0, 1)
music_gain = 0.42 * duck
# music starts with a hit at 0 and fades out at the end
fade = np.clip((total - np.arange(n) / SR) / 1.5, 0, 1)
mix_mono_music = music * music_gain * fade
L = voice * 1.0 + fx * 0.6 + mix_mono_music
# subtle stereo: music slightly wide via short delay
delay = int(0.012 * SR)
R = voice * 1.0 + fx * 0.6 + np.concatenate([np.zeros(delay), mix_mono_music[:-delay]])
stereo = np.stack([L, R], axis=1)[: int(total * SR)]
stereo = np.tanh(stereo * 1.1) / np.tanh(1.1)
write_wav(work / "premix.wav", stereo * 0.8)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(work / "premix.wav"),
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(SR), str(work / "mix.wav")], check=True)
print("audio:", work / "mix.wav")
