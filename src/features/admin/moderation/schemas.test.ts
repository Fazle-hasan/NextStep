import { describe, expect, it } from "vitest";

import { moderationTabSchema, resolveReportSchema } from "./schemas";

const reportId = "00000000-0000-4000-8000-000000000001";

describe("resolveReportSchema", () => {
  it("lets a report be dismissed or its content hidden without a note", () => {
    expect(resolveReportSchema.safeParse({ reportId, action: "dismiss" }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ reportId, action: "hide", note: "" }).success).toBe(true);
  });

  it("requires a note to warn or suspend", () => {
    expect(resolveReportSchema.safeParse({ reportId, action: "warn" }).success).toBe(false);
    expect(resolveReportSchema.safeParse({ reportId, action: "suspend", note: "no" }).success).toBe(false);
    expect(resolveReportSchema.safeParse({ reportId, action: "warn", note: "Please keep chats respectful." }).success).toBe(true);
  });

  it("rejects unknown actions, bad ids and very long notes", () => {
    expect(resolveReportSchema.safeParse({ reportId, action: "delete" }).success).toBe(false);
    expect(resolveReportSchema.safeParse({ reportId: "x", action: "dismiss" }).success).toBe(false);
    expect(resolveReportSchema.safeParse({ reportId, action: "hide", note: "a".repeat(1001) }).success).toBe(false);
  });
});

describe("moderationTabSchema", () => {
  it("falls back to the open tab", () => {
    expect(moderationTabSchema.parse("resolved")).toBe("resolved");
    expect(moderationTabSchema.parse("anything")).toBe("open");
    expect(moderationTabSchema.parse(undefined)).toBe("open");
  });
});
