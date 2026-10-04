import { describe, expect, it } from "vitest";

import { isPublicPath, isSignedOutOnlyPath } from "./routes";

describe("isPublicPath", () => {
  it.each(["/", "/sign-in", "/jobs", "/jobs/123", "/companies/acme", "/leap", "/places", "/areas/mumbai/kurla", "/auth/callback"])(
    "allows %s",
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  it.each(["/home", "/onboarding", "/admin", "/flats", "/mentors", "/messages", "/jobsearch", "/sign-in/extra"])(
    "protects %s",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});

describe("isSignedOutOnlyPath", () => {
  it("only matches the sign-in page", () => {
    expect(isSignedOutOnlyPath("/sign-in")).toBe(true);
    expect(isSignedOutOnlyPath("/home")).toBe(false);
    expect(isSignedOutOnlyPath("/auth/callback")).toBe(false);
  });
});
