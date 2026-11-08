import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Finds a Chrome Headless Shell / Chromium for Remotion.
 * Order: REMOTION_BROWSER_EXECUTABLE → Playwright browsers → null (Remotion downloads its own).
 */
export function findBrowserExecutable(): string | null {
  const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    "/opt/pw-browsers",
    path.join(process.env.HOME ?? "", ".cache", "ms-playwright"),
  ].filter((p): p is string => Boolean(p));

  for (const root of roots) {
    if (!existsSync(/*turbopackIgnore: true*/ root)) continue;
    const dirs = readdirSync(/*turbopackIgnore: true*/ root)
      .filter((d) => d.startsWith("chromium_headless_shell"))
      .sort()
      .reverse();
    for (const dir of dirs) {
      for (const sub of ["chrome-headless-shell-linux64", "chrome-linux", "chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64"]) {
        for (const bin of ["chrome-headless-shell", "headless_shell"]) {
          const candidate = path.join(/*turbopackIgnore: true*/ root, dir, sub, bin);
          if (existsSync(candidate)) return candidate;
        }
      }
    }
  }
  return null;
}
