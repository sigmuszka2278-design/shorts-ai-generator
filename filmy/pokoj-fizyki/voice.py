"""Polski lektor (Piper TTS, głos pl_PL-darkman-medium) + znaczniki czasu słów do napisów."""
import json, subprocess, sys, wave, re
import numpy as np
from pathlib import Path

MODEL = sys.argv[1]  # ścieżka do pl_PL-darkman-medium.onnx
OUT = Path(__file__).parent / "build"
OUT.mkdir(exist_ok=True)
SR = 22050

# (start [s], maks. długość [s], tekst do napisów, tekst dla syntezatora)
LINES = [
    (0.10, 3.25, "Ten pokój wygląda normalnie… ale za chwilę wydarzy się coś NIEMOŻLIWEGO!",
     "Ten pokój wygląda normalnie, ale za chwilę wydarzy się coś niemożliwego!"),
    (3.55, 3.20, "Tutaj grawitacja działa zupełnie inaczej!",
     "Tutaj grawitacja działa zupełnie inaczej!"),
    (7.15, 4.40, "Ale to, co znajduje się za tymi drzwiami, jest jeszcze dziwniejsze!",
     "Ale to, co znajduje się za tymi drzwiami, jest jeszcze dziwniejsze!"),
    (12.45, 4.60, "CZEKAJ! Czy my właśnie trafiliśmy do innego wymiaru?!",
     "Czekaj! Czy my właśnie trafiliśmy do innego wymiaru?!"),
    (18.15, 4.60, "A TERAZ NAJLEPSZE… TO WSZYSTKO JEST W ŚRODKU MAŁEJ KULI!",
     "A teraz najlepsze! To wszystko jest w środku małej kuli!"),
    (23.05, 1.80, "Zauważyłeś to wcześniej?!",
     "Zauważyłeś to wcześniej?!"),
]

def synth(text, ls):
    p = OUT / "tmp.wav"
    subprocess.run([sys.executable, "-m", "piper", "-m", MODEL, "-f", str(p), "--length-scale", str(ls),
                    "--noise-scale", "0.75", "--noise-w-scale", "0.9", "--sentence-silence", "0.08"],
                   input=text.encode(), check=True, capture_output=True)
    with wave.open(str(p)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    env = np.abs(a) > 0.02
    idx = np.nonzero(env)[0]
    a = a[max(idx[0] - 200, 0): idx[-1] + 600]
    return a

def vowels(word):
    return max(1, len(re.findall(r"[aąeęioóuy]", word.lower())))

meta = []
for i, (start, maxlen, shown, spoken) in enumerate(LINES):
    ls = 0.86
    while True:
        a = synth(spoken, ls)
        if len(a) / SR <= maxlen or ls <= 0.62:
            break
        ls -= 0.03
    dur = len(a) / SR
    np.save(OUT / f"voice_{i}.npy", a)
    words = shown.split()
    weights = np.array([vowels(w) + 0.6 for w in words], dtype=float)
    # pauzy po przecinkach / wielokropkach
    edges = np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * dur
    meta.append({"start": start, "dur": round(dur, 3), "ls": round(ls, 2),
                 "words": [{"w": w, "t0": round(start + edges[k], 3), "t1": round(start + edges[k + 1], 3)}
                           for k, w in enumerate(words)]})
    print(f"linia {i}: {dur:.2f}s (limit {maxlen}) length_scale={ls:.2f}")

(OUT / "voice.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
