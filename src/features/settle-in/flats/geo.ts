// The REST API returns PostGIS points as hex EWKB (e.g. "0101000020E6100000…"). This reads the
// longitude and latitude out of one. GeoJSON ({ type: "Point", coordinates: [lng, lat] }) is accepted too.

export type LatLng = { lat: number; lng: number };

const POINT_TYPE = 1;
const SRID_FLAG = 0x20000000;

function validLatLng(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function parsePoint(value: unknown): LatLng | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = (value as { coordinates: unknown }).coordinates;
    if (Array.isArray(coordinates) && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
      return validLatLng(coordinates[1], coordinates[0]);
    }
    return null;
  }
  if (typeof value !== "string" || !/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) return null;

  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);
  if (bytes.length < 21) return null;

  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  const hasSrid = (type & SRID_FLAG) !== 0;
  if ((type & 0xff) !== POINT_TYPE) return null;
  const offset = hasSrid ? 9 : 5;
  if (bytes.length < offset + 16) return null;

  return validLatLng(view.getFloat64(offset + 8, littleEndian), view.getFloat64(offset, littleEndian));
}
