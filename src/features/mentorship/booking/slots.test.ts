import { describe, expect, it } from "vitest";

import { dayKey, formatDayLabel, formatSlotFull, formatSlotRange, formatSlotTime, groupSlotsByDay, slotWindow } from "./slots";
import type { Slot } from "./types";

const slot = (startsAt: string, minutes = 30): Slot => ({
  startsAt,
  endsAt: new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString(),
});

describe("dayKey", () => {
  it("gives the calendar day in the requested time zone", () => {
    // 20:00 UTC is already the next day in India (UTC+5:30) and still the same day in New York.
    expect(dayKey("2026-10-05T20:00:00Z", "Asia/Kolkata")).toBe("2026-10-06");
    expect(dayKey("2026-10-05T20:00:00Z", "America/New_York")).toBe("2026-10-05");
    expect(dayKey("2026-10-05T20:00:00Z", "UTC")).toBe("2026-10-05");
  });
});

describe("groupSlotsByDay", () => {
  const slots = [slot("2026-10-06T04:00:00Z"), slot("2026-10-05T19:00:00Z"), slot("2026-10-05T03:30:00Z")];

  it("groups by local day and sorts days and times", () => {
    const days = groupSlotsByDay(slots, "Asia/Kolkata");
    expect(days.map((d) => d.day)).toEqual(["2026-10-05", "2026-10-06"]);
    // 19:00 UTC on the 5th is 00:30 on the 6th in India.
    expect(days[1]!.slots.map((s) => s.startsAt)).toEqual(["2026-10-05T19:00:00Z", "2026-10-06T04:00:00Z"]);
  });

  it("groups differently for a viewer in another time zone", () => {
    const days = groupSlotsByDay(slots, "UTC");
    expect(days.map((d) => [d.day, d.slots.length])).toEqual([
      ["2026-10-05", 2],
      ["2026-10-06", 1],
    ]);
  });

  it("returns nothing for no slots and does not change its input", () => {
    expect(groupSlotsByDay([], "UTC")).toEqual([]);
    const copy = [...slots];
    groupSlotsByDay(slots, "UTC");
    expect(slots).toEqual(copy);
  });
});

describe("formatting", () => {
  it("labels a day", () => {
    expect(formatDayLabel("2026-10-06", "en-GB")).toBe("Tue 6 Oct");
  });

  it("formats times in the given zone", () => {
    expect(formatSlotTime("2026-10-06T04:00:00Z", "Asia/Kolkata", "en-GB")).toBe("9:30");
    expect(formatSlotTime("2026-10-06T04:00:00Z", "UTC", "en-GB")).toBe("4:00");
  });

  it("formats a range and a full label", () => {
    const s = slot("2026-10-06T04:00:00Z", 60);
    expect(formatSlotRange(s, "Asia/Kolkata", "en-GB")).toBe("9:30 – 10:30");
    expect(formatSlotFull(s, "Asia/Kolkata", "en-GB")).toBe("Tue 6 Oct, 9:30 – 10:30");
  });
});

describe("slotWindow", () => {
  const now = new Date("2026-10-04T15:00:00Z");

  it("starts the first page a day early and covers two weeks", () => {
    expect(slotWindow(0, 14, now)).toEqual({ from: "2026-10-03", to: "2026-10-17" });
  });

  it("continues without gaps on later pages", () => {
    expect(slotWindow(1, 14, now)).toEqual({ from: "2026-10-18", to: "2026-10-31" });
    expect(slotWindow(2, 14, now)).toEqual({ from: "2026-11-01", to: "2026-11-14" });
  });
});
