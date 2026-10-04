import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site relative paths", () => {
    expect(safeNextPath("/jobs?city=mumbai")).toBe("/jobs?city=mumbai");
    expect(safeNextPath("/")).toBe("/");
  });

  it.each([null, undefined, "", "jobs", "//evil.com", "/\\evil.com", "http://evil.com", "https://evil.com/home"])(
    "falls back for %s",
    (input) => {
      expect(safeNextPath(input)).toBe("/home");
    },
  );

  it("uses a custom fallback", () => {
    expect(safeNextPath("//evil.com", "/onboarding")).toBe("/onboarding");
  });
});
