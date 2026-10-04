"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// The viewer's IANA time zone, or null while rendering on the server (so the server's zone never shows).
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
