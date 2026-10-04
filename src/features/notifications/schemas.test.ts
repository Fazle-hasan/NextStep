import { describe, expect, it } from "vitest";

import { loadMoreSchema, markReadSchema, notificationIdSchema, preferencesSchema, safeNotificationLink } from "./schemas";

const ID = "3f0e2c1a-5b7d-4c8e-9a1b-2c3d4e5f6a7b";

describe("markReadSchema", () => {
  it("accepts no ids (mark all) or a list of uuids", () => {
    expect(markReadSchema.safeParse({}).success).toBe(true);
    expect(markReadSchema.safeParse({ ids: [ID] }).success).toBe(true);
  });

  it("rejects bad ids, empty lists and oversized lists", () => {
    expect(markReadSchema.safeParse({ ids: ["nope"] }).success).toBe(false);
    expect(markReadSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(markReadSchema.safeParse({ ids: Array.from({ length: 101 }, () => ID) }).success).toBe(false);
  });
});

describe("notificationIdSchema and loadMoreSchema", () => {
  it("validate their inputs", () => {
    expect(notificationIdSchema.safeParse({ id: ID }).success).toBe(true);
    expect(notificationIdSchema.safeParse({ id: "1" }).success).toBe(false);
    expect(loadMoreSchema.safeParse({ before: "2026-10-04T07:00:00.000+00:00" }).success).toBe(true);
    expect(loadMoreSchema.safeParse({ before: "yesterday" }).success).toBe(false);
  });
});

describe("preferencesSchema", () => {
  it("accepts known types and removes duplicates", () => {
    const parsed = preferencesSchema.safeParse({
      emailEnabled: true,
      mutedTypes: ["new_message", "new_message", "job_alert"],
      whatsappOptIn: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.mutedTypes).toEqual(["new_message", "job_alert"]);
  });

  it("rejects unknown types and non-boolean switches", () => {
    expect(preferencesSchema.safeParse({ emailEnabled: true, mutedTypes: ["made_up"], whatsappOptIn: false }).success).toBe(false);
    expect(preferencesSchema.safeParse({ emailEnabled: "yes", mutedTypes: [], whatsappOptIn: false }).success).toBe(false);
  });
});

describe("safeNotificationLink", () => {
  it("keeps in-app paths", () => {
    expect(safeNotificationLink("/applications/1")).toBe("/applications/1");
  });

  it("drops everything else", () => {
    expect(safeNotificationLink(null)).toBeNull();
    expect(safeNotificationLink("")).toBeNull();
    expect(safeNotificationLink("https://evil.example")).toBeNull();
    expect(safeNotificationLink("//evil.example")).toBeNull();
    expect(safeNotificationLink("/\\evil.example")).toBeNull();
    expect(safeNotificationLink("javascript:alert(1)")).toBeNull();
  });
});
