import { describe, expect, it } from "vitest";

import { SECTIONS, accountNavForRoles, sectionsForRoles } from "./sections";

const hrefs = (roles: Parameters<typeof sectionsForRoles>[0]) =>
  sectionsForRoles(roles).flatMap((s) => s.items.map((i) => i.href));

describe("sectionsForRoles", () => {
  it("always returns the three sections in order", () => {
    expect(sectionsForRoles([]).map((s) => s.name)).toEqual([
      "Community Portal",
      "Career Development",
      "Location Gathering",
    ]);
    expect(SECTIONS).toHaveLength(3);
  });

  it("hides role-specific entries from users without the role", () => {
    const items = hrefs([]);
    expect(items).toContain("/jobs");
    expect(items).not.toContain("/employer");
    expect(items).not.toContain("/applications");
    expect(items).not.toContain("/mentor");
    expect(items).not.toContain("/buddy");
    expect(items).not.toContain("/flats/mine");
  });

  it("shows entries unlocked by the user's roles", () => {
    const items = hrefs(["employer", "buddy"]);
    expect(items).toContain("/employer");
    expect(items).toContain("/buddy");
    expect(items).not.toContain("/mentor");
  });

  it("lists role-specific entries first within a section", () => {
    const portal = sectionsForRoles(["job_seeker"])[0];
    expect(portal?.items[0]?.roles).toBeDefined();
    expect(portal?.items.at(-1)?.roles).toBeUndefined();
  });
});

describe("accountNavForRoles", () => {
  it("shows the admin entry only to admins", () => {
    expect(accountNavForRoles(["job_seeker"]).map((i) => i.href)).not.toContain("/admin");
    expect(accountNavForRoles(["admin"]).map((i) => i.href)).toContain("/admin");
  });
});
