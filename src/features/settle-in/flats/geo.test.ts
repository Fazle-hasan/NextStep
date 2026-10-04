import { describe, expect, it } from "vitest";

import { parsePoint } from "./geo";

describe("parsePoint", () => {
  it("reads a hex EWKB point (Mumbai city centre)", () => {
    const point = parsePoint("0101000020E6100000C0EC9E3C2C385240FA7E6ABC74133340");
    expect(point?.lat).toBeCloseTo(19.076, 3);
    expect(point?.lng).toBeCloseTo(72.8777, 3);
  });

  it("reads GeoJSON", () => {
    expect(parsePoint({ type: "Point", coordinates: [72.8777, 19.076] })).toEqual({ lat: 19.076, lng: 72.8777 });
  });

  it("returns null for anything else", () => {
    expect(parsePoint(null)).toBeNull();
    expect(parsePoint("not hex")).toBeNull();
    expect(parsePoint("0101")).toBeNull();
    expect(parsePoint({ coordinates: ["a", "b"] })).toBeNull();
  });
});
