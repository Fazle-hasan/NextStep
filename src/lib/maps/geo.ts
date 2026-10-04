import type { MapPoint } from "./types";

// PostgREST returns PostGIS points as hex EWKB (e.g. cities.center). Reads a 2D point, or null.
export function parseEwkbPoint(hex: string | null | undefined): MapPoint | null {
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex) || hex.length < 42 || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);
  const little = view.getUint8(0) === 1;
  const type = view.getUint32(1, little);
  const hasSrid = (type & 0x20000000) !== 0;
  if ((type & 0xff) !== 1) return null;
  const offset = hasSrid ? 9 : 5;
  if (bytes.length < offset + 16) return null;
  const lng = view.getFloat64(offset, little);
  const lat = view.getFloat64(offset + 8, little);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// EWKT for writing a geography(Point, 4326) column through PostgREST.
export function toEwktPoint(point: MapPoint): string {
  return `SRID=4326;POINT(${point.lng} ${point.lat})`;
}

// "350 m" or "2.4 km".
export function formatDistance(metres: number): string {
  if (metres < 950) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(metres / 1000).toFixed(metres < 9950 ? 1 : 0)} km`;
}
