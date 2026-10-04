import { MARKER_COLORS, type MapMarkerKind } from "@/lib/maps";

import { mapPageStrings } from "../strings";

const s = mapPageStrings.legend;

const ITEMS: { kind: MapMarkerKind; label: string }[] = [
  { kind: "flat", label: s.flat },
  { kind: "masjid", label: s.masjid },
  { kind: "place", label: s.place },
  { kind: "workplace", label: s.workplace },
];

// What each marker colour and shape on the map means.
export function MapLegend() {
  return (
    <ul aria-label={s.title} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {ITEMS.map((item) => (
        <li key={item.kind} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-3 border border-white shadow"
            style={{ background: MARKER_COLORS[item.kind], borderRadius: item.kind === "flat" ? 3 : 9999 }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
