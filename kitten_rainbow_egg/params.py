"""Index layout of the per-frame parameter vector shared by the
timeline (Python) and the ray-marching renderer (Numba).

Module-level ints are treated as compile-time constants by Numba.
"""

_names = """
TIME
K_X K_Y K_Z K_YAW K_ROLL K_PITCH K_SQ
K_HTURN K_HNOD K_HTILT
K_EYE K_LOOKX K_LOOKY K_EARS K_PUFF K_TAIL K_LEGS K_MOUTH K_SMILE
E_X E_Y E_Z E_TX E_TZ E_SQ E_HUE E_GLOW E_CRACK E_SPLIT
E_CX E_CY E_CZ E_CROT E_VIS
D_X D_Y D_Z D_YAW D_SCALE D_WING D_HNOD D_EYE D_LOOKX D_LOOKY D_MOUTH D_VIS D_SQ
G_X G_Y G_Z G_R G_G G_B G_INT
SUN_INT
FL_SQ0
"""

_list = _names.split()
for _i, _n in enumerate(_list):
    globals()[_n] = _i

N_FLOWERS = 18
# flower squash values occupy FL_SQ0 .. FL_SQ0 + N_FLOWERS - 1
NPARAMS = len(_list) + N_FLOWERS
