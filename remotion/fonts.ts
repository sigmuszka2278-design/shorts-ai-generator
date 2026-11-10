import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT_FAMILY = "Fredoka, 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif";

let loaded = false;

/** Loads the rounded "Fredoka" font (latin + latin-ext for Polish letters) bundled in /public/fonts. */
export function ensureFonts() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  loadFont({
    family: "Fredoka",
    url: staticFile("fonts/fredoka-latin.woff2"),
    weight: "300 700",
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  }).catch((err) => console.warn("Font load failed", err));
  loadFont({
    family: "Fredoka",
    url: staticFile("fonts/fredoka-latin-ext.woff2"),
    weight: "300 700",
    unicodeRange:
      "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  }).catch((err) => console.warn("Font load failed", err));
}

/** Heavy condensed display font (Anton, SIL OFL) for the football edit. */
export const EDIT_FONT = "Anton, Impact, 'Arial Narrow', sans-serif";

let editLoaded = false;

export function ensureEditFonts() {
  if (editLoaded || typeof document === "undefined") return;
  editLoaded = true;
  loadFont({ family: "Anton", url: staticFile("fonts/anton-latin.woff2"), weight: "400" }).catch((err) =>
    console.warn("Font load failed", err),
  );
}
