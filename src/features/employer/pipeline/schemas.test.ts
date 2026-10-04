import { describe, expect, it } from "vitest";

import { addNoteSchema, cvRequestSchema, moveApplicantSchema, proposeSlotSchema } from "./schemas";

const uuid = "3f0e1c52-7a5c-4c1e-9a43-2b1d6f0a9c11";
const future = () => new Date(Date.now() + 86_400_000).toISOString();

describe("moveApplicantSchema", () => {
  it("accepts employer stages and trims the note", () => {
    const result = moveApplicantSchema.parse({ applicationId: uuid, status: "shortlisted", note: "  good  " });
    expect(result).toEqual({ applicationId: uuid, status: "shortlisted", note: "good" });
  });

  it("turns an empty note into undefined", () => {
    expect(moveApplicantSchema.parse({ applicationId: uuid, status: "hired", note: "   " }).note).toBeUndefined();
  });

  it.each(["applied", "withdrawn", "banana"])("rejects the stage %s", (status) => {
    expect(moveApplicantSchema.safeParse({ applicationId: uuid, status }).success).toBe(false);
  });

  it("rejects a bad id and an over-long note", () => {
    expect(moveApplicantSchema.safeParse({ applicationId: "nope", status: "offer" }).success).toBe(false);
    expect(moveApplicantSchema.safeParse({ applicationId: uuid, status: "offer", note: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("addNoteSchema", () => {
  it("requires 1 to 2000 characters", () => {
    expect(addNoteSchema.safeParse({ applicationId: uuid, body: "  " }).success).toBe(false);
    expect(addNoteSchema.safeParse({ applicationId: uuid, body: "x".repeat(2001) }).success).toBe(false);
    expect(addNoteSchema.parse({ applicationId: uuid, body: " ok " }).body).toBe("ok");
  });
});

describe("proposeSlotSchema", () => {
  it("accepts a future time with an allowed length", () => {
    const result = proposeSlotSchema.safeParse({ applicationId: uuid, startsAt: future(), durationMinutes: 45, locationOrLink: "" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.locationOrLink).toBeUndefined();
  });

  it("rejects past times, bad dates and other lengths", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(proposeSlotSchema.safeParse({ applicationId: uuid, startsAt: past, durationMinutes: 30 }).success).toBe(false);
    expect(proposeSlotSchema.safeParse({ applicationId: uuid, startsAt: "not a date", durationMinutes: 30 }).success).toBe(false);
    expect(proposeSlotSchema.safeParse({ applicationId: uuid, startsAt: future(), durationMinutes: 20 }).success).toBe(false);
  });

  it("limits the location to 300 characters", () => {
    expect(
      proposeSlotSchema.safeParse({ applicationId: uuid, startsAt: future(), durationMinutes: 60, locationOrLink: "x".repeat(301) }).success,
    ).toBe(false);
  });
});

describe("cvRequestSchema", () => {
  it("needs a uuid", () => {
    expect(cvRequestSchema.safeParse({ applicationId: uuid }).success).toBe(true);
    expect(cvRequestSchema.safeParse({ applicationId: "1" }).success).toBe(false);
  });
});
