// Pure helpers for showing mentor slots. Timestamps are UTC ISO strings; days and times are worked out
// for a given IANA time zone (the viewer's, in the browser).

import type { Slot } from "./types";

export type SlotDay = { day: string; slots: Slot[] };

// "2026-10-06": the calendar day of a timestamp in a time zone.
export function dayKey(iso: string, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

// Slots grouped by local calendar day, days and times in ascending order.
export function groupSlotsByDay(slots: readonly Slot[], timeZone: string): SlotDay[] {
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const days = new Map<string, Slot[]>();
  for (const slot of sorted) {
    const key = dayKey(slot.startsAt, timeZone);
    const list = days.get(key);
    if (list) list.push(slot);
    else days.set(key, [slot]);
  }
  return [...days.entries()].map(([day, daySlots]) => ({ day, slots: daySlots }));
}

// "Tue, 6 Oct" for a day key from dayKey().
export function formatDayLabel(day: string, locale: string = "en-IN"): string {
  // Noon UTC keeps the calendar day stable whatever the formatter's zone.
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

// "9:30 am"
export function formatSlotTime(iso: string, timeZone: string, locale: string = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

// "9:30 am – 10:00 am"
export function formatSlotRange(slot: Slot, timeZone: string, locale: string = "en-IN"): string {
  return `${formatSlotTime(slot.startsAt, timeZone, locale)} – ${formatSlotTime(slot.endsAt, timeZone, locale)}`;
}

// "Tue, 6 Oct, 9:30 am – 10:00 am"
export function formatSlotFull(slot: Slot, timeZone: string, locale: string = "en-IN"): string {
  return `${formatDayLabel(dayKey(slot.startsAt, timeZone), locale)}, ${formatSlotRange(slot, timeZone, locale)}`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The date range to ask the database for on a given page of the picker. Starts a day early so a
// mentor whose local date is behind UTC is not cut off; the database only returns future slots.
export function slotWindow(page: number, windowDays: number, now: Date = new Date()): { from: string; to: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(start);
  from.setUTCDate(from.getUTCDate() + page * windowDays - (page === 0 ? 1 : 0));
  const to = new Date(start);
  to.setUTCDate(to.getUTCDate() + (page + 1) * windowDays - 1);
  return { from: isoDate(from), to: isoDate(to) };
}
