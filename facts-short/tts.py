"""Polish voice-over with word timings (Piper, offline).

usage: python3 tts.py <voice.onnx> <script.json> <out_dir>
Writes <out_dir>/<id>.wav (48 kHz mono) and <out_dir>/voice.json with word timings.
"""
import json, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

model, script_path, out_dir = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
out_dir.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model, include_alignments=True)
sr = voice.config.sample_rate
space_id = voice.config.phoneme_id_map[" "][0]
cfg = SynthesisConfig(length_scale=0.86, noise_scale=0.667, noise_w_scale=0.8)
PAUSE = int(0.12 * sr)  # pause between sentences inside one segment

script = json.loads(script_path.read_text())
result = {}
for seg in script["segments"]:
    words_tts = seg["text"].split()
    words_disp = seg["display"].split()
    assert len(words_tts) == len(words_disp), seg["id"]
    audio_parts, spans = [], []  # spans: (start_s, end_s) per phonemized word group
    pos = 0
    seg_cfg = SynthesisConfig(length_scale=seg.get("length_scale", cfg.length_scale), noise_scale=cfg.noise_scale, noise_w_scale=cfg.noise_w_scale)
    for chunk in voice.synthesize(seg["text"], seg_cfg, include_alignments=True):
        a = chunk.audio_float_array
        # trim leading/trailing silence of each sentence (keeps the pace tight)
        loud = np.flatnonzero(np.abs(a) > 0.04)
        lead = max(0, loud[0] - int(0.03 * sr)) if len(loud) else 0
        tail = min(len(a), loud[-1] + int(0.06 * sr)) if len(loud) else len(a)
        a = a[lead:tail]
        ids = chunk.phoneme_ids
        samples = chunk.phoneme_id_samples
        assert samples is not None and len(samples) == len(ids)
        cum = np.concatenate([[0], np.cumsum(samples)])
        start = None
        for i, pid in enumerate(ids):
            if pid == space_id or i == len(ids) - 1:
                if start is not None:
                    s0 = min(max(cum[start] - lead, 0), len(a))
                    s1 = min(max(cum[i] - lead, 0), len(a))
                    spans.append(((pos + s0) / sr, (pos + s1) / sr))
                start = None
            elif start is None and pid not in (0, 1, 2):
                start = i
        audio_parts.append(a)
        audio_parts.append(np.zeros(PAUSE, dtype=np.float32))
        pos += len(a) + PAUSE
    audio = np.concatenate(audio_parts[:-1])
    # espeak may merge short prepositions with the next word ("z botanicznego")
    # and negations with the verb ("nie ma"); merge only as many as needed.
    groups, need = [], len(words_disp) - len(spans)
    for w in words_disp:
        if need > 0 and groups and len(groups[-1]) == 1 and groups[-1][-1].lower().strip(".,!?") in ("z", "w", "i", "o", "u", "a", "nie"):
            groups[-1].append(w)
            need -= 1
        else:
            groups.append([w])
    if len(groups) != len(spans):
        print(f"[{seg['id']}] {len(spans)} spans vs {len(groups)} groups -> proportional fallback", file=sys.stderr)
        total = audio.shape[0] / sr
        weights = [max(1, sum(c in "aeiouyąęó" for c in w.lower())) for w in words_disp]
        t, spans, groups = 0.0, [], [[w] for w in words_disp]
        for wgt in weights:
            d = total * wgt / sum(weights)
            spans.append((t, t + d)); t += d
    words = []
    for g, (s, e) in zip(groups, spans):
        n = len(g)
        for k, w in enumerate(g):
            words.append({"w": w, "start": round(s + (e - s) * k / n, 3), "end": round(s + (e - s) * (k + 1) / n, 3)})
    with wave.open(str(out_dir / f"{seg['id']}.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr)
        f.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    result[seg["id"]] = {"duration": round(audio.shape[0] / sr, 3), "words": words}
    print(seg["id"], result[seg["id"]]["duration"], len(words_disp), "words", len(spans), "spans")
(out_dir / "voice.json").write_text(json.dumps(result, ensure_ascii=False, indent=1))
