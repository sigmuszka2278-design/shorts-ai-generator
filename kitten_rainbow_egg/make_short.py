#!/usr/bin/env python3
"""Render the 20 s vertical (9:16) YouTube Short.

usage: python make_short.py [--width 540] [--fps 30] [--out ../output/kitten_rainbow_egg_short.mp4]

Frames are ray-marched at --width x (16/9 * width), composited, then piped into
ffmpeg, upscaled to 1080x1920 and muxed with the synthesized soundtrack.
"""
import argparse
import os
import subprocess
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import renderer  # noqa: E402
import timeline  # noqa: E402
import post  # noqa: E402
import audio  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=540)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--out", default=os.path.join(HERE, "..", "output", "kitten_rainbow_egg_short.mp4"))
    ap.add_argument("--stills", default=os.path.join(HERE, "..", "output", "stills"))
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=timeline.DURATION)
    args = ap.parse_args()

    W = args.width
    H = W * 16 // 9
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    os.makedirs(args.stills, exist_ok=True)
    wav = os.path.splitext(args.out)[0] + ".wav"
    audio.write_wav(wav, timeline.DURATION)

    nframes = int(round((args.end - args.start) * args.fps))
    still_times = {0.5, 2.0, 4.2, 5.6, 6.5, 10.0, 12.6, 13.5, 15.3, 15.9, 17.3, 18.9, 19.6}
    still_frames = {int(round((t - args.start) * args.fps)): t for t in still_times}

    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(args.fps), "-i", "-",
        "-ss", str(args.start), "-i", wav,
        "-vf", "scale=1080:1920:flags=lanczos,unsharp=5:5:0.4",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-shortest",
        args.out,
    ], stdin=subprocess.PIPE)

    buf = np.zeros((H, W, 3), dtype=np.float64)
    t0 = time.time()
    for f in range(nframes):
        t = args.start + f / args.fps
        P, cam, ov = timeline.frame(t)
        renderer.render(P, cam, W, H, buf)
        img = post.composite(buf.copy(), cam, ov, t)
        rgb = (img * 255 + 0.5).astype(np.uint8)
        ff.stdin.write(rgb.tobytes())
        if f in still_frames:
            from PIL import Image
            Image.fromarray(rgb).resize((1080, 1920), Image.LANCZOS).save(
                os.path.join(args.stills, f"frame_{still_frames[f]:05.2f}s.jpg"), quality=92)
        if f % 15 == 0:
            el = time.time() - t0
            eta = el / (f + 1) * (nframes - f - 1)
            print(f"frame {f + 1}/{nframes}  t={t:5.2f}s  elapsed {el:6.0f}s  eta {eta:6.0f}s", flush=True)
    ff.stdin.close()
    ff.wait()
    print("wrote", os.path.abspath(args.out))


if __name__ == "__main__":
    main()
