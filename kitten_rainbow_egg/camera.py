import math
import numpy as np


def look_at(eye, target, fov_deg, roll=0.0):
    eye = np.asarray(eye, float)
    f = np.asarray(target, float) - eye
    f /= np.linalg.norm(f)
    r = np.cross(f, [0.0, 1.0, 0.0])
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    if roll:
        c, s = math.cos(roll), math.sin(roll)
        r, u = c * r + s * u, -s * r + c * u
    focal = 1.0 / math.tan(math.radians(fov_deg) / 2.0)
    return np.array([*eye, *f, *r, *u, focal], dtype=np.float64)


def project(cam, p, W, H):
    """world point -> (x_px, y_px, depth, px_per_unit)"""
    eye, f, r, u, focal = cam[0:3], cam[3:6], cam[6:9], cam[9:12], cam[12]
    d = np.asarray(p, float) - eye
    z = d @ f
    if z <= 1e-3:
        return None
    sx = (d @ r) / z * focal  # in units of H/2
    sy = (d @ u) / z * focal
    x = (sx / (W / H) + 1.0) * 0.5 * W
    y = (1.0 - sy) * 0.5 * H
    scale = focal / z * H * 0.5
    return x, y, z, scale
