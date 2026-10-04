"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function format(value: string): string {
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, {
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// A timestamp in the viewer's own time zone. Rendered only in the browser, so the server's
// time zone never shows up.
export function LocalTime({ value, className }: { value: string; className?: string }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={value} className={className}>
      {isClient ? format(value) : ""}
    </time>
  );
}
