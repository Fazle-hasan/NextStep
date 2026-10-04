"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function format(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const day = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(start)
    .find((part) => part.type === "timeZoneName")?.value;
  return `${day}, ${time.format(start)} – ${time.format(new Date(endsAt))}${zone ? ` (${zone})` : ""}`;
}

// A session's date and time range in the viewer's own time zone. Rendered only in the browser,
// so the server's time zone never shows up.
export function SessionTime({ startsAt, endsAt, className }: { startsAt: string; endsAt: string; className?: string }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={startsAt} className={className}>
      {isClient ? format(startsAt, endsAt) : " "}
    </time>
  );
}
