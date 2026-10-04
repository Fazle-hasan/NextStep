import { describe, expect, it } from "vitest";

import { authCallbackRedirect, isPublicPath, isSignedOutOnlyPath } from "./routes";

describe("isPublicPath", () => {
  it.each(["/", "/sign-in", "/sign-up", "/forgot-password", "/jobs", "/jobs/123", "/companies/acme", "/leap", "/places", "/areas/mumbai/kurla", "/auth/callback"])(
    "allows %s",
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  it.each(["/home", "/onboarding", "/admin", "/flats", "/mentors", "/messages", "/jobsearch", "/sign-in/extra", "/reset-password"])(
    "protects %s",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});

describe("isSignedOutOnlyPath", () => {
  it("matches the log-in, sign-up and forgot-password pages", () => {
    expect(isSignedOutOnlyPath("/sign-in")).toBe(true);
    expect(isSignedOutOnlyPath("/sign-up")).toBe(true);
    expect(isSignedOutOnlyPath("/forgot-password")).toBe(true);
    expect(isSignedOutOnlyPath("/reset-password")).toBe(false);
    expect(isSignedOutOnlyPath("/home")).toBe(false);
    expect(isSignedOutOnlyPath("/auth/callback")).toBe(false);
  });
});

describe("authCallbackRedirect", () => {
  it("forwards a code that landed on the home page to the callback", () => {
    expect(authCallbackRedirect("/", new URLSearchParams("code=abc"))).toBe("/auth/callback?code=abc&next=%2Fhome");
  });

  it("sends a password-recovery link to the reset page", () => {
    expect(authCallbackRedirect("/", new URLSearchParams("token_hash=h&type=recovery"))).toBe(
      "/auth/callback?token_hash=h&type=recovery&next=%2Freset-password",
    );
  });

  it("leaves other pages and plain visits alone", () => {
    expect(authCallbackRedirect("/", new URLSearchParams(""))).toBeNull();
    expect(authCallbackRedirect("/jobs", new URLSearchParams("code=abc"))).toBeNull();
  });
});
