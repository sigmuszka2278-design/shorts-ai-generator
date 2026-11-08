import { describe, expect, it } from "vitest";
import { serverRenderEnabled } from "../lib/config";

describe("tryb renderowania", () => {
  it("lokalnie renderuje na serwerze, na Vercelu w przeglądarce", () => {
    expect(serverRenderEnabled({})).toBe(true);
    expect(serverRenderEnabled({ VERCEL: "1" })).toBe(false);
  });
  it("RENDER_MODE nadpisuje wybór", () => {
    expect(serverRenderEnabled({ VERCEL: "1", RENDER_MODE: "server" })).toBe(true);
    expect(serverRenderEnabled({ RENDER_MODE: "browser" })).toBe(false);
  });
});
