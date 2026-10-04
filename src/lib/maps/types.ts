// Provider-neutral map types. Nothing outside src/lib/maps imports the map provider directly,
// so it can be swapped (CLAUDE.md §2).

export type MapPoint = { lat: number; lng: number };

export type MapBounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };

// What a marker stands for; decides its colour and shape.
export type MapMarkerKind = "flat" | "masjid" | "place" | "workplace" | "job";

export type MapMarker = MapPoint & {
  id: string;
  kind: MapMarkerKind;
  // Read by screen readers and shown as a tooltip.
  label: string;
};

export const MARKER_COLORS: Record<MapMarkerKind, string> = {
  flat: "#2563eb",
  masjid: "#047857",
  place: "#b45309",
  workplace: "#be123c",
  job: "#7c3aed",
};

// Centre of India, used only when nothing better is known.
export const DEFAULT_CENTER: MapPoint = { lat: 21.1458, lng: 79.0882 };
