import { describe, expect, it } from "vitest";

import { actionLabel } from "./strings";
import { auditFiltersSchema, auditHref } from "./schemas";

describe("auditFiltersSchema", () => {
  const actor = "00000000-0000-4000-8000-000000000001";

  it("keeps valid filters", () => {
    expect(auditFiltersSchema.parse({ action: "report_hide", actor, page: "3" })).toEqual({ action: "report_hide", actor, page: 3 });
  });

  it("drops invalid filters and defaults the page", () => {
    expect(auditFiltersSchema.parse({ action: "drop table;", actor: "nobody", page: "-2" })).toEqual({
      action: undefined,
      actor: undefined,
      page: 1,
    });
    expect(auditFiltersSchema.parse({}).page).toBe(1);
  });
});

describe("auditHref", () => {
  it("builds short links", () => {
    expect(auditHref({ page: 1 }, 1)).toBe("/admin/audit");
    expect(auditHref({ action: "user_suspended", page: 1 }, 2)).toBe("/admin/audit?action=user_suspended&page=2");
  });
});

describe("actionLabel", () => {
  it("uses known labels and falls back to readable text", () => {
    expect(actionLabel("report_warn")).toBe("User warned");
    expect(actionLabel("something_new")).toBe("Something new");
  });
});
