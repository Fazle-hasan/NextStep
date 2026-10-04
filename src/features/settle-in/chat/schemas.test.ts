import { describe, expect, it } from "vitest";

import { loadEarlierSchema, sendMessageSchema } from "./schemas";

const conversationId = "3f0c2a52-6d1c-4a8e-9b53-0d5f0c1e2a11";

describe("sendMessageSchema", () => {
  it("accepts a text message and trims it", () => {
    const parsed = sendMessageSchema.parse({ conversationId, body: "  Salaam  " });
    expect(parsed.body).toBe("Salaam");
  });

  it("accepts a photo without text", () => {
    const parsed = sendMessageSchema.safeParse({ conversationId, body: "", attachmentPath: `${conversationId}/a1b2.jpg` });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(sendMessageSchema.safeParse({ conversationId, body: "   " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ conversationId }).success).toBe(false);
  });

  it("rejects text over 2,000 characters", () => {
    expect(sendMessageSchema.safeParse({ conversationId, body: "a".repeat(2001) }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ conversationId, body: "a".repeat(2000) }).success).toBe(true);
  });

  it.each(["other-folder/pic.jpg", `${conversationId}/nested/pic.jpg`, `${conversationId}/`, `${conversationId}/a b.jpg`, "pic.jpg"])(
    "rejects the attachment path %s",
    (attachmentPath) => {
      expect(sendMessageSchema.safeParse({ conversationId, attachmentPath }).success).toBe(false);
    },
  );

  it("rejects a conversation id that is not a uuid", () => {
    expect(sendMessageSchema.safeParse({ conversationId: "abc", body: "Hi" }).success).toBe(false);
  });
});

describe("loadEarlierSchema", () => {
  it("accepts a database timestamp", () => {
    expect(loadEarlierSchema.safeParse({ conversationId, before: "2026-10-04T06:30:42.123456+00:00" }).success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(loadEarlierSchema.safeParse({ conversationId, before: "yesterday" }).success).toBe(false);
  });
});
