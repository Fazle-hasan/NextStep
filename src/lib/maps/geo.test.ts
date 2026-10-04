import { describe, expect, it } from "vitest";

import { formatDistance, parseEwkbPoint, toEwktPoint } from "./geo";

// Little-endian EWKB for SRID=4326;POINT(lng lat), as PostGIS prints it.
function ewkbHex(lng: number, lat: number, geometryType = 1): string {
  const buffer = new ArrayBuffer(25);
  const view = new DataView(buffer);
  view.setUint8(0, 1);
  view.setUint32(1, (0x20000000 | geometryType) >>> 0, true);
  view.setUint32(5, 4326, true);
  view.setFloat64(9, lng, true);
  view.setFloat64(17, lat, true);
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

describe("parseEwkbPoint", () => {
  it("reads a point with SRID 4326", () => {
    expect(ewkbHex(72.8777, 19.076).startsWith("0101000020E6100000")).toBe(true);
    expect(parseEwkbPoint(ewkbHex(72.8777, 19.076))).toEqual({ lat: 19.076, lng: 72.8777 });
  });

  it("returns null for anything that is not a valid point", () => {
    expect(parseEwkbPoint(null)).toBeNull();
    expect(parseEwkbPoint("")).toBeNull();
    expect(parseEwkbPoint("not-hex")).toBeNull();
    expect(parseEwkbPoint(ewkbHex(72.8777, 19.076, 2))).toBeNull();
    expect(parseEwkbPoint(ewkbHex(72.8777, 190))).toBeNull();
  });
});

describe("toEwktPoint", () => {
  it("writes longitude first", () => {
    expect(toEwktPoint({ lat: 19.076, lng: 72.8777 })).toBe("SRID=4326;POINT(72.8777 19.076)");
  });
});

describe("formatDistance", () => {
  it("rounds short distances to 50 m and long ones to km", () => {
    expect(formatDistance(20)).toBe("50 m");
    expect(formatDistance(430)).toBe("450 m");
    expect(formatDistance(2440)).toBe("2.4 km");
    expect(formatDistance(12600)).toBe("13 km");
  });
});
