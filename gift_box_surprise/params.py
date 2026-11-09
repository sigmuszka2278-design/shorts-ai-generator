"""Index layout of the per-frame parameter vector (timeline -> Numba renderer)."""

_names = """
TIME
K_X K_Y K_Z K_YAW K_ROLL K_PITCH K_SQ
K_HTURN K_HNOD K_HTILT
K_EYE K_LOOKX K_LOOKY K_EARS K_PUFF K_TAIL K_LEGS K_MOUTH K_SMILE
K_SCALE K_VIS
D_X D_Y D_Z D_YAW D_SCALE D_WING D_HNOD D_EYE D_LOOKX D_LOOKY D_MOUTH D_VIS D_SQ
U_X U_Y U_Z U_YAW U_SCALE U_SQ U_TILT U_EYE U_MOUTH U_VIS U_LOOKX U_LOOKY
G_X G_Y G_Z G_R G_G G_B G_INT
SUN_INT
"""
_list = _names.split()

# three gift boxes (0 = red, 1 = blue, 2 = gold), each with this block of params
BOX_FIELDS = ["X", "Z", "H", "TX", "TZ", "SQ", "HOP", "LIDY", "LIDX", "LIDZ", "LIDROT", "GLOW", "OPEN"]
B_STRIDE = len(BOX_FIELDS)

for _i, _n in enumerate(_list):
    globals()[_n] = _i
B0 = len(_list)
for _j, _f in enumerate(BOX_FIELDS):
    globals()["BX_" + _f] = _j          # offset inside a box block
NPARAMS = B0 + 3 * B_STRIDE
