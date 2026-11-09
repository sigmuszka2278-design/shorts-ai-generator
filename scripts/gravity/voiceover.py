"""Polish voice-over for the "gravity" Short (offline, Piper TTS).

    pip install piper-tts numpy
    python3 scripts/gravity/voiceover.py [--voice darkman-medium]

Downloads the Piper Polish voice (from the sherpa-onnx GitHub release mirror) into
.cache/piper, synthesises each narration line, fits it into its time slot and writes
public/gravity/vo/vo<N>.wav plus remotion/gravity/voiceover.json (start + duration + text).
"""
import argparse, json, os, subprocess, tarfile, urllib.request, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[2]
FPS = 30

# (start s, slot end s, spoken text, caption text)
LINES = [
    (0.05, 4.2, "Wyobraź sobie, że grawitacja na Ziemi znika na pięć sekund! Co by się stało?!",
     "Wyobraź sobie, że grawitacja na Ziemi znika na 5 sekund! Co by się stało?!"),
    (4.2, 8.35, "Wszystko, czego nic nie trzyma, mogłoby zacząć unosić się w powietrzu!", None),
    (8.4, 14.0, "Woda w basenach i oceanach również przestałaby być przyciągana do powierzchni!", None),
    (14.1, 21.0, "A gdyby grawitacja nagle wróciła, unoszące się przedmioty zaczęłyby spadać!", None),
    (21.1, 27.0, "Na szczęście to tylko eksperyment myślowy. Ale wyglądałoby niesamowicie!", None),
    (27.05, 30.0, "A ty? Co zrobiłbyś przez te pięć sekund?", "A ty? Co zrobiłbyś przez te 5 sekund?"),
]


def ensure_voice(name: str) -> Path:
    cache = ROOT / ".cache" / "piper"
    model = cache / f"vits-piper-pl_PL-{name}" / f"pl_PL-{name}.onnx"
    if model.exists():
        return model
    cache.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-pl_PL-{name}.tar.bz2"
    archive = cache / f"{name}.tar.bz2"
    print("Pobieram głos:", url)
    urllib.request.urlretrieve(url, archive)
    with tarfile.open(archive) as tar:
        tar.extractall(cache, filter="data")
    archive.unlink()
    return model


def synth(voice: PiperVoice, text: str, length_scale: float) -> tuple[np.ndarray, int]:
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.7, noise_w_scale=0.85)
    chunks = list(voice.synthesize(text, syn_config=cfg))
    audio = np.concatenate([c.audio_float_array for c in chunks])
    sr = chunks[0].sample_rate
    # trim leading/trailing silence
    idx = np.where(np.abs(audio) > 0.01)[0]
    audio = audio[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.08 * sr)]
    return audio, sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="darkman-medium")
    args = ap.parse_args()
    voice = PiperVoice.load(str(ensure_voice(args.voice)))
    out_dir = ROOT / "public" / "gravity" / "vo"
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = []
    for i, (start, end, text, caption) in enumerate(LINES):
        slot = end - start - 0.1
        # energetic delivery: a bit faster than neutral, faster still if the slot is tight
        ls = 0.86
        audio, sr = synth(voice, text, ls)
        while len(audio) / sr > slot and ls > 0.6:
            ls -= 0.03
            audio, sr = synth(voice, text, ls)
        # gentle "radio" presence: normalise to -1 dBFS
        audio = audio / max(1e-6, np.max(np.abs(audio))) * 0.89
        pcm = (audio * 32767).astype(np.int16)
        path = out_dir / f"vo{i}.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
        dur = len(audio) / sr
        print(f"vo{i}: {dur:.2f}s (slot {slot:.2f}s, length_scale {ls:.2f})")
        meta.append({"file": f"gravity/vo/vo{i}.wav", "start": start, "duration": round(dur, 3), "text": caption or text})
    (ROOT / "remotion" / "gravity" / "voiceover.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
