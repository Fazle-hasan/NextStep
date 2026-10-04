"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SLOT_MAX_PAGE } from "../schemas";
import { formatDayLabel, formatSlotTime, groupSlotsByDay } from "../slots";
import { bookingStrings as s } from "../strings";
import type { Slot } from "../types";

type Props = {
  slots: Slot[];
  // The viewer's time zone; null until the browser has mounted.
  timeZone: string | null;
  selected: string;
  onSelect: (startsAt: string) => void;
  page: number;
  onPage: (page: number) => void;
  loading: boolean;
};

// Free times grouped by the viewer's local day, two weeks a page.
export function SlotPicker({ slots, timeZone, selected, onSelect, page, onPage, loading }: Props) {
  const days = timeZone ? groupSlotsByDay(slots, timeZone) : [];
  const b = s.booking;

  return (
    <div className="space-y-4" aria-busy={loading}>
      {!timeZone || loading ? (
        <p role="status" className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {b.loadingSlots}
        </p>
      ) : days.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {b.noSlots}
        </p>
      ) : (
        <ul className="space-y-4">
          {days.map(({ day, slots: daySlots }) => {
            const label = formatDayLabel(day);
            return (
              <li key={day} className="space-y-2">
                <h4 className="text-sm font-medium">{label}</h4>
                <div role="group" aria-label={b.slotGroupLabel(label)} className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => {
                    const active = slot.startsAt === selected;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onSelect(slot.startsAt)}
                        className={cn(
                          "min-h-11 min-w-20 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        {formatSlotTime(slot.startsAt, timeZone)}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        {page > 0 && (
          <Button type="button" variant="outline" className="h-11" disabled={loading} onClick={() => onPage(page - 1)}>
            ← {b.earlier}
          </Button>
        )}
        {page < SLOT_MAX_PAGE && (
          <Button type="button" variant="outline" className="h-11" disabled={loading} onClick={() => onPage(page + 1)}>
            {b.later} →
          </Button>
        )}
      </div>
    </div>
  );
}
