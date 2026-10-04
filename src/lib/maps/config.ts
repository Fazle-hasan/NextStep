// The map token is public by design (restrict it by URL in the Mapbox dashboard).
// Referenced literally so Next.js can inline it in the browser bundle.
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function getMapToken(): string | null {
  return token && token !== "your-mapbox-public-token" ? token : null;
}

export function isMapConfigured(): boolean {
  return getMapToken() !== null;
}

export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export const mapStrings = {
  unavailable: "The map is not available right now. You can still use the list.",
  loading: "Loading map…",
  pickerHint: "Tap the map or drag the pin to set the location.",
  pickerUnavailable: "The map is not available, so the location cannot be picked on it right now.",
} as const;
