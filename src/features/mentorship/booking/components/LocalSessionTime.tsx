"use client";

import { formatSlotFull } from "../slots";
import { useBrowserTimeZone } from "../useBrowserTimeZone";

type Props = { startsAt: string; endsAt: string; showZone?: boolean; className?: string };

// A session's date and time range in the viewer's own time zone. Rendered only in the browser.
export function LocalSessionTime({ startsAt, endsAt, showZone = false, className }: Props) {
  const timeZone = useBrowserTimeZone();

  return (
    <time dateTime={startsAt} className={className}>
      {timeZone ? formatSlotFull({ startsAt, endsAt }, timeZone) : ""}
      {timeZone && showZone ? ` (${timeZone})` : ""}
    </time>
  );
}
