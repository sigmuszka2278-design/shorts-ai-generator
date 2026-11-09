/**
 * English prompts for generating photoreal footage of each scene with a
 * text-to-video model (e.g. via Replicate). Pass the resulting clips to the
 * HoneyShort composition through the `clips` prop / `--clips=clips.json`.
 */
import type { HoneySceneId } from "./HoneyShort";

const STYLE =
  "vertical 9:16, photorealistic, cinematic, shallow depth of field, warm golden color grade, soft film grain, no text";

export const HONEY_PROMPTS: Record<HoneySceneId, string> = {
  "spoon-intro": `Extreme close-up of a spoon slowly lifting thick golden honey from a glass jar, honey dripping in slow motion, glowing in warm backlight, bokeh, ${STYLE}, 3 seconds`,
  tomb: `Dimly lit ancient Egyptian tomb interior, flickering torchlight, archaeologists in 1920s clothing (pith helmets, vests) discovering sealed clay jars, dust in the air, slow push-in, ${STYLE}, 7 seconds`,
  bacteria: `Macro shot inside golden honey, a tiny bacterium shrinking and drying out as water leaves it, scientific animation blended with realistic footage, ${STYLE}, 8 seconds`,
  "ph-strip": `A single drop of honey falling onto a pH test strip, the test pad changing color to orange-red, clean bright laboratory background, macro, ${STYLE}, 7 seconds`,
  bees: `Close-up of honeybees working on a honeycomb, sunlight shining through the wax cells, pollen particles in the air, ${STYLE}, 8 seconds`,
  "spoon-outro": `The same spoon with honey dripping back into a glass jar, camera slowly returning to an extreme close-up identical to the opening shot, ${STYLE}, 7 seconds`,
};
