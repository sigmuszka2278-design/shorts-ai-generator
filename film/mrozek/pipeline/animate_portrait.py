"""Delikatna animacja archiwalnego portretu: ruch ust zsynchronizowany z narracją + mruganie.

1. Portret jest powiększany 4× siecią EDSR (OpenCV dnn_superres) i lekko odszumiany.
2. MediaPipe Face Landmarker wyznacza 478 punktów twarzy.
3. Z punktów budowane są gęste pola przemieszczeń (otwarcie żuchwy, zwężenie ust,
   mrugnięcie lewego/prawego oka) – interpolacja liniowa po triangulacji siatki.
4. Dla każdej klatki: obwiednia głośności mowy (pasmo 200–4000 Hz) → stopień otwarcia ust,
   pole = suma pól bazowych × współczynniki, cv2.remap, wnętrze ust domalowane cieniem.

Użycie:  python film/mrozek/pipeline/animate_portrait.py [id_segmentu ...]
Wymaga:  /tmp/…/models (EDSR_x4.pb, face_landmarker.task) – patrz README_FILM.md
Wynik:   public/mrozek/talk/<id>.mp4 (bez dźwięku, 30 kl./s) – dla każdego segmentu narracji
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np
from scipy.interpolate import LinearNDInterpolator
from scipy.signal import butter, sosfiltfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PUB = os.path.join(ROOT, "public", "mrozek")
MODELS = os.environ.get("MROZEK_MODELS", "/tmp/claude-0/models")
FPS = 30
OUT_H = 1620  # wysokość wyjściowego wideo (portret 2:3)

# indeksy MediaPipe Face Mesh
INNER_UP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
INNER_LO = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78]
L_UP = [246, 161, 160, 159, 158, 157, 173]
L_LO = [7, 163, 144, 145, 153, 154, 155]
R_UP = [466, 388, 387, 386, 385, 384, 398]
R_LO = [249, 390, 373, 374, 380, 381, 382]
CORNERS = (61, 291)
JAW_AMP = 0.0  # ustawiane w build_fields


def prepare_portrait() -> tuple[np.ndarray, np.ndarray]:
    cache = os.path.join(PUB, "portrait_hd.png")
    lm_cache = os.path.join(PUB, "portrait_landmarks.json")
    if os.path.exists(cache) and os.path.exists(lm_cache):
        return cv2.imread(cache), np.array(json.load(open(lm_cache)))
    src = cv2.imread(os.path.join(PUB, "img", "portrait1960.jpg"))
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(os.path.join(MODELS, "EDSR_x4.pb"))
    sr.setModel("edsr", 4)
    up = sr.upsample(src)
    gray = cv2.cvtColor(up, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (0, 0), 2.2)  # wygładza raster druku, zostawia miękką fakturę odbitki
    up = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    cv2.imwrite(cache, up)

    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision

    opts = vision.FaceLandmarkerOptions(
        base_options=mpt.BaseOptions(model_asset_path=os.path.join(MODELS, "face_landmarker.task")), num_faces=1)
    det = vision.FaceLandmarker.create_from_options(opts)
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(up, cv2.COLOR_BGR2RGB)))
    lm = np.array([(p.x * up.shape[1], p.y * up.shape[0]) for p in res.face_landmarks[0]])
    json.dump(lm.tolist(), open(lm_cache, "w"))
    return up, lm


def build_fields(img: np.ndarray, lm: np.ndarray) -> dict[str, np.ndarray]:
    """Gęste pola przemieszczeń (H×W×2) dla jednostkowych wartości sterowania."""
    h, w = img.shape[:2]
    pts = lm[:468]
    xs, ys = pts[:, 0], pts[:, 1]
    face_w = xs.max() - xs.min()
    face_h = ys.max() - ys.min()
    cx = (lm[CORNERS[0], 0] + lm[CORNERS[1], 0]) / 2
    lip_y = lm[[13, 14], 1].mean()
    chin = lm[152]

    # kotwice: ramka obrazu + pierścień wokół twarzy (pole = 0)
    anchors = [(x, y) for x in np.linspace(0, w - 1, 9) for y in (0, h - 1)] + \
              [(x, y) for y in np.linspace(0, h - 1, 13) for x in (0, w - 1)]
    oval = pts[[10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
                148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]]
    center = pts.mean(axis=0)
    ring = center + (oval - center) * 1.35
    neck = [(chin[0] + dx, chin[1] + face_h * 0.33) for dx in np.linspace(-face_w * 0.5, face_w * 0.5, 7)]
    fixed = np.vstack([anchors, ring, neck])

    global JAW_AMP
    jaw_amp = face_h * 0.058
    JAW_AMP = jaw_amp
    fields = {}

    # --- otwarcie żuchwy -------------------------------------------------
    disp = np.zeros_like(pts)
    for i, (x, y) in enumerate(pts):
        if y > lip_y - 1:
            fall = np.clip(1 - abs(x - cx) / (0.62 * face_w), 0, 1) ** 0.8
            below = np.clip((y - lip_y) / (chin[1] - lip_y + 1e-6), 0, 1)
            disp[i, 1] = jaw_amp * fall * (0.85 + 0.15 * below)
    for i in INNER_LO:
        disp[i, 1] = jaw_amp
    # górna warga lekko w górę
    for i, (x, y) in enumerate(pts):
        if lm[2, 1] < y < lip_y - 1 and abs(x - cx) < 0.3 * face_w:
            disp[i, 1] = -jaw_amp * 0.12 * np.clip((y - lm[2, 1]) / (lip_y - lm[2, 1]), 0, 1)
    for i in INNER_UP:
        disp[i, 1] = -jaw_amp * 0.15
    for i in CORNERS + (78, 308):
        disp[i, 1] = jaw_amp * 0.2
    fields["jaw"] = dense(np.vstack([pts, fixed]), np.vstack([disp, np.zeros_like(fixed)]), w, h)

    # --- zwężenie ust (głoski o/u) -----------------------------------------
    disp = np.zeros_like(pts)
    for i, (x, y) in enumerate(pts):
        if abs(y - lip_y) < face_h * 0.08 and abs(x - cx) < 0.32 * face_w:
            disp[i, 0] = -(x - cx) * 0.055 * np.clip(1 - abs(y - lip_y) / (face_h * 0.08), 0, 1)
    fields["narrow"] = dense(np.vstack([pts, fixed]), np.vstack([disp, np.zeros_like(fixed)]), w, h)

    # --- mrugnięcia ------------------------------------------------------
    for name, up, lo in (("blinkL", L_UP, L_LO), ("blinkR", R_UP, R_LO)):
        disp = np.zeros_like(pts)
        lo_y = np.interp(pts[up, 0], np.sort(pts[lo, 0]), pts[lo, 1][np.argsort(pts[lo, 0])])
        for k, i in enumerate(up):
            disp[i, 1] = (lo_y[k] - pts[i, 1]) * 0.92
        # brew/powieka nad okiem przesuwa się odrobinę
        eye_c = pts[up + lo].mean(axis=0)
        eye_w = np.ptp(pts[up + lo, 0])
        for i, (x, y) in enumerate(pts):
            if i in up or i in lo:
                continue
            d = np.hypot(x - eye_c[0], (y - eye_c[1]) * 1.4)
            if y < eye_c[1] and d < eye_w * 0.9:
                disp[i, 1] = np.mean(disp[up, 1]) * 0.25 * (1 - d / (eye_w * 0.9))
        fields[name] = dense(np.vstack([pts, fixed]), np.vstack([disp, np.zeros_like(fixed)]), w, h)
    return fields


def dense(src: np.ndarray, disp: np.ndarray, w: int, h: int) -> np.ndarray:
    """Interpolacja przemieszczeń na całą siatkę pikseli (wsp. docelowe ≈ źródłowe)."""
    interp = LinearNDInterpolator(src, disp, fill_value=0.0)
    step = 4
    gx, gy = np.meshgrid(np.arange(0, w + step, step), np.arange(0, h + step, step))
    small = interp(gx, gy).astype(np.float32)
    small = cv2.GaussianBlur(small, (0, 0), 2.6)
    full = cv2.resize(small, (gx.shape[1] * step, gx.shape[0] * step), interpolation=cv2.INTER_LINEAR)[:h, :w]
    return full


def mouth_envelope(mp3: str, n_frames: int) -> np.ndarray:
    pcm = subprocess.check_output(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"])
    a = np.frombuffer(pcm, dtype=np.float32)
    a = sosfiltfilt(butter(4, [200, 4000], btype="band", fs=16000, output="sos"), a)
    hop = 16000 // FPS
    env = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(a) else 0 for i in range(n_frames)])
    ref = np.percentile(env[env > 0], 92) if np.any(env > 0) else 1
    x = np.clip(env / (ref + 1e-9), 0, 1.2)
    x = np.where(x < 0.12, 0, x)
    # wygładzanie: szybkie otwarcie, wolniejsze zamknięcie
    out = np.zeros_like(x)
    v = 0.0
    for i, t in enumerate(x):
        v = v + (t - v) * (0.65 if t > v else 0.38)
        out[i] = v
    return np.clip(out ** 0.85, 0, 1)


def blink_track(n: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    track = np.zeros(n)
    t = int(rng.uniform(0.8, 2.0) * FPS)
    shape = np.array([0.35, 0.8, 1.0, 0.85, 0.5, 0.2])
    while t < n - len(shape):
        track[t:t + len(shape)] = shape
        t += int(rng.uniform(2.6, 5.5) * FPS)
    return track


def render_segment(seg: dict, img: np.ndarray, lm: np.ndarray, fields: dict, seed: int) -> None:
    h, w = img.shape[:2]
    n = int(np.ceil(seg["duration"] * FPS)) + 2
    openv = mouth_envelope(os.path.join(ROOT, "public", seg["audio"]), n)
    # zwężenie ust: powolna zmienność tylko podczas mowy
    rng = np.random.default_rng(seed)
    narrow = np.convolve(rng.uniform(-0.6, 1.0, n), np.ones(5) / 5, mode="same") * (openv > 0.15)
    blink = blink_track(n, seed + 7)

    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    out_w = int(round(OUT_H * w / h / 2) * 2)
    out = os.path.join(PUB, "talk", f"{seg['id']}.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                            "-s", f"{out_w}x{OUT_H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                            "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
                           stdin=subprocess.PIPE)

    # obszar, w którym cokolwiek się rusza (oszczędność czasu)
    mag = sum(np.abs(f).sum(axis=2) for f in fields.values())
    ys, xs = np.where(mag > 0.05)
    y0, y1, x0, x1 = max(ys.min() - 8, 0), min(ys.max() + 8, h), max(xs.min() - 8, 0), min(xs.max() + 8, w)
    sub = {k: f[y0:y1, x0:x1] for k, f in fields.items()}
    sgx, sgy = gx[y0:y1, x0:x1], gy[y0:y1, x0:x1]

    dark = np.percentile(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)[int(lm[14, 1]) - 30:int(lm[14, 1]) + 30,
                                                             int(lm[78, 0]):int(lm[308, 0])], 5)
    for f in range(n):
        o = float(openv[f])
        d = sub["jaw"] * o + sub["narrow"] * (narrow[f] * o) + sub["blinkL"] * blink[f] + sub["blinkR"] * blink[f]
        frame = img.copy()
        d = d.astype(np.float32)
        frame[y0:y1, x0:x1] = cv2.remap(img, sgx - d[..., 0], sgy - d[..., 1], cv2.INTER_LINEAR,
                                        borderMode=cv2.BORDER_REFLECT)
        if o > 0.04:
            # wnętrze ust: kontur wewnętrzny warg po deformacji
            # wewnętrzny kontur warg po deformacji – liczony wprost z amplitudy (w spoczynku wargi się stykają)
            poly = []
            mx = (lm[78, 0] + lm[308, 0]) / 2
            hw = abs(lm[308, 0] - lm[78, 0]) / 2
            for k, i in enumerate(INNER_UP + INNER_LO):
                x, y = lm[i]
                taper = max(0.0, 1 - ((x - mx) / hw) ** 2) ** 0.6  # kształt soczewki
                if k < len(INNER_UP):
                    dy = -JAW_AMP * 0.15 * o * taper
                else:
                    dy = JAW_AMP * 0.8 * o * taper
                poly.append((x, y + dy))
            poly = np.array(poly, dtype=np.float32)
            mask = np.zeros((h, w), np.float32)
            cv2.fillPoly(mask, [np.round(poly * 4).astype(np.int32)], 1.0, lineType=cv2.LINE_AA, shift=2)
            mask = cv2.GaussianBlur(mask, (0, 0), 3.0)
            # ciemne wnętrze ust (na archiwalnej odbitce zęby nie byłyby czytelne)
            shade = np.full((h, w), dark * 0.45, np.float32)
            m3 = mask[..., None]
            frame = (frame.astype(np.float32) * (1 - m3) + shade[..., None] * m3).astype(np.uint8)
        enc.stdin.write(cv2.resize(frame, (out_w, OUT_H), interpolation=cv2.INTER_AREA).tobytes())
    enc.stdin.close()
    enc.wait()
    print(f"{seg['id']:7s} {n} klatek → {os.path.relpath(out, ROOT)}")


def main() -> None:
    img, lm = prepare_portrait()
    fields = build_fields(img, lm)
    narration = json.load(open(os.path.join(PUB, "narration.json"), encoding="utf-8"))
    only = set(sys.argv[1:])
    for k, seg in enumerate(narration["segments"]):
        if only and seg["id"] not in only:
            continue
        render_segment(seg, img, lm, fields, seed=1000 + k)


if __name__ == "__main__":
    main()
