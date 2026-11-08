# Shorts AI Generator

Procedurally generated, fully code-rendered YouTube Shorts.

## 🐱🥚🐉 "Kitten & the Rainbow Egg" (20 s, 1080×1920, 30 fps)

**Output:** [`output/kitten_rainbow_egg_short.mp4`](output/kitten_rainbow_egg_short.mp4) · stills in [`output/stills/`](output/stills)

A fluffy orange baby kitten finds a glowing rainbow egg in a magical garden. A
baby dragon with rainbow wings hatches, sneezes a cloud of bubbles, and blows a
giant heart bubble that pops on the kitten's nose. The kitten puffs into a fluffball,
and that frame matches the first frame, so the Short loops.

| Time | Beat |
|------|------|
| 0–3 s | **Hook:** rainbow flash, close-up of the puffed-up, wide-eyed kitten lit by a pulsing magic glow. Whip pan to the glowing egg shaking in the grass. |
| 3–7 s | The egg bounces and changes colour. The kitten crouches, wiggles and pounces, but the egg leaps over it. The kitten somersaults into the flowers (petal burst), sits up dizzy and shakes its head. |
| 7–13 s | Suspense: slow dolly-in. The egg wobbles in bursts, cracks spread with light leaking through, light rays grow, a heartbeat and riser build, then a flash. |
| 13–17 s | The shell pops off and a tiny mint baby dragon with rainbow wings springs out. It inhales... **ACHOO!** A cloud of iridescent bubbles drifts over the kitten. |
| 17–20 s | Friends: they nuzzle, the dragon blows a giant heart bubble and both look up amazed. The heart drifts down onto the kitten's nose and **POPS**. The kitten turns into a fluffball and the shot matches frame 1. |

The film has no dialogue and no on-screen text. All sound effects and music are synthesized.

### How it's made

There are no AI video models and no external assets. Everything is code in
[`kitten_rainbow_egg/`](kitten_rainbow_egg):

| File | What it does |
|------|--------------|
| `renderer.py` | A Numba-JIT signed-distance-field **ray marcher**. It models the kitten, dragon, egg, flowers, grass, mushrooms and trees from SDF primitives. Shading is a soft "3D cartoon" look: wrap diffuse, soft shadows, AO, rim light, emissive magic and glossy cartoon eyes. |
| `timeline.py` | The storyboard. It maps time to character rigs (squash/stretch, head turn/tilt/nod, blinks, ears, eye gaze, fur puff, wing flaps), cameras (push-ins, whip pan, shakes) and particle systems. |
| `post.py` | 2D compositing: egg halo, god rays, bloom, iridescent bubbles, the heart bubble, sparkles, petals, flashes, tonemapping and vignette. |
| `audio.py` | Procedural soundtrack. It has a 120 BPM, 10-bar looping music bed and cartoon SFX: boings, whooshes, rattles, cracks, a sneeze, bubble blips and pops. The mix is circular, so the audio loops seamlessly too. |
| `make_short.py` | Renders each frame and pipes it to ffmpeg. It upscales to 1080×1920, encodes H.264 + AAC and saves stills. |

### Render it yourself

```bash
pip install numpy numba scipy pillow   # plus ffmpeg on PATH
cd kitten_rainbow_egg
python make_short.py                    # ~35 min on 4 cores at --width 540
python make_short.py --width 360        # faster preview
python make_short.py --start 13 --end 17 --out /tmp/hatch.mp4   # render a segment
```
