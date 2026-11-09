"""Music + sound effects + voice-over mix for the "gravity" Short.

    python3 scripts/gravity/voiceover.py   # first: narration
    python3 scripts/gravity/soundtrack.py  # then: full mix → public/gravity/soundtrack.wav

Everything is synthesised with numpy (no licensed samples). The cue points come from
remotion/gravity/timeline.json so sound and picture stay in sync.
"""
import json, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 44100
TL = json.loads((ROOT / "remotion" / "gravity" / "timeline.json").read_text())
FPS = TL["fps"]
DUR = TL["durationInFrames"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(42)


def f2s(frame):
    return frame / FPS


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.2):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na)
    e[na:na + nd] = np.linspace(1, s, nd)
    if nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cutoff, state=0.0):
    """One-pole low-pass (cutoff may be an array)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = state
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


LP = lowpass


def highpass(x, cutoff):
    return x - LP(x, cutoff)


def saw(freq, t):
    return 2 * ((t * freq) % 1) - 1


def noise(sec):
    return rng.uniform(-1, 1, int(sec * SR))


class Bus:
    def __init__(self):
        self.l = np.zeros(N)
        self.r = np.zeros(N)

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N:
            return
        sig = sig[: N - i] * gain
        self.l[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.414
        self.r[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.414


# ───────────────────────── sound design ─────────────────────────

def kick(gain=1.0):
    t = t_axis(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * gain + LP(noise(0.45), 3000) * np.exp(-t * 80) * 0.3


def snare():
    t = t_axis(0.3)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5
    nz = highpass(noise(0.3), 1500) * np.exp(-t * 14)
    return body + nz * 0.8


def hat(open_=False):
    t = t_axis(0.25 if open_ else 0.06)
    return highpass(noise(len(t) / SR), 7000) * np.exp(-t * (12 if open_ else 70)) * 0.35


def boom(sec=3.0):
    """Cinematic impact: sub drop + noise burst + metallic ring."""
    t = t_axis(sec)
    f = 30 + 70 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crack = LP(noise(sec), 2500) * np.exp(-t * 9) * 0.9
    ring = sum(np.sin(2 * np.pi * fr * t) / (k + 1) for k, fr in enumerate([523, 787, 1243])) * np.exp(-t * 3) * 0.12
    return np.tanh((sub * 1.2 + crack + ring) * 1.5) * 0.8


def whoosh(sec=0.6, up=True):
    t = t_axis(sec)
    n = noise(sec)
    sweep = np.linspace(300, 4000, len(t)) if up else np.linspace(4000, 250, len(t))
    shaped = lowpass_sweep(n, sweep)
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 2
    return shaped * e * 1.4


def lowpass_sweep(x, sweep):
    # chunked time-varying low-pass (smooth enough at 512-sample steps)
    out = np.empty_like(x)
    step = 512
    state = 0.0
    for s in range(0, len(x), step):
        out[s:s + step] = lowpass(x[s:s + step], float(sweep[min(s, len(sweep) - 1)]), state)
        state = out[min(s + step, len(x)) - 1]
    return out


def riser(sec):
    t = t_axis(sec)
    f = 80 * (2 ** (t / sec * 3.5))
    tone = sum(saw(f * m, t) for m in (1, 1.005, 2.01)) / 3
    nz = lowpass_sweep(noise(sec), np.linspace(400, 9000, len(t)))
    e = (t / sec) ** 2
    return (LP(tone, 2500) * 0.35 + nz * 0.6) * e


def tape_stop(sec=0.7):
    t = t_axis(sec)
    f = 220 * (1 - t / sec) ** 2 + 20
    sig = saw(1, np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 0.5) / SR) * 0.6
    return LP(sig, 1200) * (1 - t / sec)


def shimmer(sec=2.5, base=880):
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for k, ratio in enumerate([1, 1.5, 2, 2.5, 3, 4]):
        sig += np.sin(2 * np.pi * base * ratio * t + k) * np.exp(-t * (1.2 + k * 0.3)) * (0.6 ** k)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)
    return sig * trem * env_adsr(len(t), 0.02, 0.2, 0.8, 0.8) * 0.5


def bubbles(sec=2.5, count=14):
    out = np.zeros(int(sec * SR))
    for _ in range(count):
        at = rng.uniform(0, sec - 0.15)
        d = rng.uniform(0.05, 0.12)
        t = t_axis(d)
        f0 = rng.uniform(400, 1100)
        f = f0 * (1 + 2.5 * t / d)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d)
        i = int(at * SR)
        out[i:i + len(b)] += b * rng.uniform(0.3, 0.7)
    return out


def splash(sec=2.2):
    t = t_axis(sec)
    nz = noise(sec)
    body = LP(nz, 1400) * np.exp(-t * 2.8)
    hiss = highpass(nz, 3500) * np.exp(-t * 4) * 0.5
    thump = np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 10)) * t) * np.exp(-t * 6)
    return (body * 1.4 + hiss + thump) * 0.8 + bubbles(sec, 10) * 0.25


def clank():
    t = t_axis(0.8)
    metal = sum(np.sin(2 * np.pi * f * t) for f in (310, 437, 692, 1180)) / 4 * np.exp(-t * 6)
    hit = LP(noise(0.8), 1800) * np.exp(-t * 18)
    thud = np.sin(2 * np.pi * (55 + 60 * np.exp(-t * 20)) * t) * np.exp(-t * 9)
    return (metal * 0.5 + hit + thud * 1.2) * 0.8


def ball_bounce():
    t = t_axis(0.25)
    return np.sin(2 * np.pi * (180 + 120 * np.exp(-t * 30)) * t) * np.exp(-t * 22) * 0.8


def rewind(sec=2.8):
    t = t_axis(sec)
    # fast chirps = tape scrubbing backwards
    rate = 14 + 10 * np.sin(np.pi * t / sec)
    chirp_ph = (np.cumsum(rate) / SR) % 1
    chirp_f = 600 + 2400 * chirp_ph[::-1]
    chirps = np.sin(2 * np.pi * np.cumsum(chirp_f) / SR) * (1 - chirp_ph) * 0.35
    warble = lowpass_sweep(noise(sec), np.full(len(t), 2500)) * 0.35
    e = env_adsr(len(t), 0.05, 0.1, 1.0, 0.25)
    return (chirps + warble) * e


def chime_chord(freqs, sec=3.0):
    t = t_axis(sec)
    sig = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 1.3) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 3) for f in freqs)
    return sig / len(freqs)


def pad(freqs, sec, cutoff=1400, attack=0.6, release=0.8):
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            sig += saw(f * (1 + det / 100 * 1.0) + det, t)
    sig = LP(sig / (len(freqs) * 3), cutoff)
    return sig * env_adsr(len(t), attack, 0.3, 1.0, release)


def heartbeat():
    return kick(0.9) + np.concatenate([np.zeros(int(0.22 * SR)), kick(0.6)])[: int(0.45 * SR)]


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ───────────────────────── arrangement ─────────────────────────

def build():
    music, sfx = Bus(), Bus()
    bpm = 120
    beat = 60 / bpm
    flash, freeze = f2s(TL["flashFrame"]), f2s(TL["freezeFrame"])
    off, back = f2s(TL["gravityOffFrame"]), f2s(TL["gravityBackFrame"])
    shots = {s["id"]: (f2s(s["from"]), f2s(s["to"])) for s in TL["shots"]}

    # Intro: sub hit, ticking clock, riser into the flash
    music.add(boom(2.5) * 0.7, 0.0, 0.8)
    for k in range(int(flash / (beat / 2))):
        music.add(hat(), k * beat / 2, 0.5 if k % 2 else 0.8, pan=0.3 if k % 2 else -0.3)
    music.add(pad([midi(45), midi(52)], flash + 0.2, cutoff=500, attack=0.5, release=0.2), 0.0, 0.5)
    sfx.add(riser(flash), 0.0, 0.55)
    # Flash + freeze
    sfx.add(boom(3.2), flash, 1.0)
    sfx.add(shimmer(2.0, 1320), flash, 0.35, pan=0.2)
    sfx.add(tape_stop(0.6), freeze, 0.6)
    for k in range(3):  # suspense heartbeat during the freeze
        music.add(heartbeat(), freeze + 0.55 + k * 0.62, 0.55)

    # Weightless section: ethereal A-minor arpeggio + pulsing bass
    weightless = [(midi(57), midi(60), midi(64)), (midi(53), midi(57), midi(60)),
                  (midi(48), midi(55), midi(64)), (midi(55), midi(59), midi(62))]
    t = off
    bar = 4 * beat
    k = 0
    while t < back - 0.01:
        chord = weightless[k % 4]
        length = min(bar, back - t)
        music.add(pad(chord, length + 0.6, cutoff=1800, attack=0.4, release=0.6), t, 0.38)
        for s in range(8):
            st = t + s * beat / 2
            if st >= back:
                break
            note = chord[s % 3] * (2 if s % 4 >= 2 else 1)
            tt = t_axis(0.35)
            pluck = np.sin(2 * np.pi * note * 2 * tt) * np.exp(-tt * 9) + 0.4 * np.sin(2 * np.pi * note * 4 * tt) * np.exp(-tt * 14)
            music.add(pluck, st, 0.16 + 0.05 * (k / 6), pan=-0.5 + (s % 4) / 3)
            bass_t = t_axis(beat / 2 * 0.9)
            bass = LP(saw(chord[0] / 2, bass_t), 400) * env_adsr(len(bass_t), 0.005, 0.1, 0.7, 0.05)
            music.add(bass, st, 0.32 + 0.04 * k / 3)
        if k >= 2:  # tension builds: add kick on the beat
            for b in range(4):
                if t + b * beat < back:
                    music.add(kick(0.8), t + b * beat, 0.55)
        t += bar
        k += 1
    sfx.add(riser(2.2), back - 2.2, 0.5)

    # Gravity returns: drop + heavy drums
    sfx.add(boom(3.0), back, 1.0)
    sfx.add(whoosh(0.8, up=False), back + 0.05, 0.9)
    s0, s1 = shots["streetFall"]
    for i, dt in enumerate([0.55, 0.75, 0.9, 1.15, 1.4]):
        sfx.add(clank() if i % 2 == 0 else ball_bounce(), s0 + dt, 0.75, pan=(-0.6 + 0.3 * i))
    for i, dt in enumerate([1.6, 1.85, 2.05]):
        sfx.add(ball_bounce(), s0 + dt, 0.45 * (0.8 ** i), pan=0.4)
    p0, _ = shots["poolCrash"]
    sfx.add(splash(2.4), p0 + 0.45, 1.0)
    f0, f1 = shots["faces"]
    sfx.add(shimmer(1.2, 660) * 0.6, f0 + 0.1, 0.5)

    action = [(midi(45), midi(48), midi(52)), (midi(41), midi(45), midi(48)),
              (midi(43), midi(47), midi(50)), (midi(40), midi(44), midi(47))]
    t = back
    k = 0
    end_action = shots["rewind"][0]
    while t < end_action - 0.01:
        chord = action[k % 4]
        length = min(bar, end_action - t)
        music.add(np.tanh(pad(chord, length + 0.3, cutoff=2600, attack=0.02, release=0.3) * 2.5) * 0.5, t, 0.45)
        for b in range(8):
            st = t + b * beat / 2
            if st >= end_action:
                break
            if b % 2 == 0:
                music.add(kick(), st, 0.8)
            if b in (2, 6):
                music.add(snare(), st, 0.5)
            music.add(hat(b % 2 == 1), st, 0.35)
            bass_t = t_axis(beat / 2 * 0.85)
            music.add(np.tanh(LP(saw(chord[0] / 2, bass_t), 600) * 2) * env_adsr(len(bass_t), 0.003, 0.08, 0.8, 0.04), st, 0.4)
        t += bar
        k += 1

    # Rewind
    r0, r1 = shots["rewind"]
    sfx.add(tape_stop(0.4), r0 - 0.2, 0.5)
    sfx.add(rewind(r1 - r0), r0, 0.6)
    music.add(pad([midi(57), midi(61), midi(64)], r1 - r0, cutoff=900, attack=0.8), r0, 0.25)

    # Calm Earth: uplifting major resolution
    c0, c1 = shots["earthCalm"]
    music.add(chime_chord([midi(69), midi(73), midi(76)], 3.0), c0, 0.4)
    music.add(pad([midi(57), midi(61), midi(64), midi(69)], c1 - c0 + 0.8, cutoff=2200, attack=0.3, release=0.8), c0, 0.4)
    for b in range(int((c1 - c0) / beat)):
        music.add(kick(0.6), c0 + b * beat, 0.35)
        music.add(hat(True), c0 + b * beat + beat / 2, 0.25)

    # Outro: question sting
    o0, _ = shots["outro"]
    sfx.add(whoosh(0.5, up=True), o0 - 0.4, 0.6)
    music.add(chime_chord([midi(62), midi(66), midi(69), midi(74)], DUR - o0), o0, 0.45)
    music.add(pad([midi(50), midi(57), midi(62), midi(66)], DUR - o0, cutoff=1600, attack=0.2, release=1.2), o0, 0.35)

    # Whooshes on every cut
    for s in TL["shots"][1:]:
        at = f2s(s["from"]) - 0.25
        if s["id"] not in ("streetFall", "outro"):
            sfx.add(whoosh(0.5, up=s["from"] < TL["gravityBackFrame"]), at, 0.45, pan=rng.uniform(-0.5, 0.5))
    pl0, _ = shots["pool"]
    sfx.add(bubbles(2.6, 16), pl0 + 0.2, 0.35)
    oc0, _ = shots["ocean"]
    sfx.add(bubbles(2.6, 10), oc0 + 0.2, 0.25)
    sfx.add(shimmer(2.6, 990), off, 0.25)
    return music, sfx


def read_wav(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    if sr != SR:  # linear resample
        idx = np.arange(int(len(x) * SR / sr)) * sr / SR
        x = np.interp(idx, np.arange(len(x)), x)
    return x


def main():
    music, sfx = build()
    vo_meta = json.loads((ROOT / "remotion" / "gravity" / "voiceover.json").read_text())
    vo = np.zeros(N)
    for line in vo_meta:
        x = read_wav(ROOT / "public" / line["file"])
        # presence: slight high-shelf + gentle saturation for an energetic narrator
        x = x + 0.35 * highpass(x, 2500)
        x = np.tanh(x * 1.6) / np.tanh(1.6)
        i = int(line["start"] * SR)
        x = x[: N - i]
        vo[i:i + len(x)] += x
    # side-chain ducking of music & sfx under the narration
    env = np.convolve(np.abs(vo), np.ones(2205) / 2205, mode="same")
    env = np.clip(env * 12, 0, 1)
    env = LP(env, 4)
    duck_music = 1 - 0.55 * env
    duck_sfx = 1 - 0.3 * env
    L = music.l * duck_music * 0.8 + sfx.l * duck_sfx * 0.75 + vo * 0.95
    R = music.r * duck_music * 0.8 + sfx.r * duck_sfx * 0.75 + vo * 0.95
    # fade-out tail, master limiter
    fade = np.ones(N)
    fade[-int(0.35 * SR):] = np.linspace(1, 0, int(0.35 * SR))
    st = np.stack([L, R], axis=1) * fade[:, None]
    st = np.tanh(st * 1.1) * 0.95
    st /= max(1e-6, np.max(np.abs(st))) / 0.95
    out = ROOT / "public" / "gravity" / "soundtrack.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    print("✓", out, f"{N / SR:.2f}s")


if __name__ == "__main__":
    main()
