import { describe, expect, it } from "vitest";

import { formatDate, timeAgo } from "./dates";

const now = new Date("2026-10-04T12:00:00Z");

describe("dates", () => {
  it("formats dates in Indian time", () => {
    // 20:00 UTC on the 3rd is already the 4th in Asia/Kolkata.
    expect(formatDate("2026-10-03T20:00:00Z")).toBe("4 Oct 2026");
  });

  it("describes recent dates relatively", () => {
    expect(timeAgo("2026-10-04T08:00:00Z", now)).toBe("today");
    expect(timeAgo("2026-10-03T08:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-09-29T08:00:00Z", now)).toBe("5 days ago");
    expect(timeAgo("2026-09-10T08:00:00Z", now)).toBe("3 weeks ago");
  });

  it("falls back to a date for old items", () => {
    expect(timeAgo("2026-01-15T08:00:00Z", now)).toBe("15 Jan 2026");
  });
});
