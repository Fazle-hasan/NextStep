"use server";

import { getViewer } from "@/features/auth/queries";
import type { MapPoint } from "@/lib/maps";
import { fail, ok, type ActionResult } from "@/lib/result";

import { getAreaCentre, placesInView, searchFlatsNear } from "./queries";
import { areaCentreSchema, loadFlatsSchema, loadPlacesSchema } from "./schemas";
import { mapPageStrings } from "./strings";
import type { FlatResults, MapPlace } from "./types";

const { errors } = mapPageStrings;

// Flats for the current filters, optionally limited to the map viewport ("Search this area").
export async function loadMapFlats(input: unknown): Promise<ActionResult<FlatResults>> {
  const parsed = loadFlatsSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  // Flats need sign-in (D-012); the RPC is not executable by signed-out visitors either.
  if (!(await getViewer())) return fail(errors.signedOut);
  try {
    return ok(await searchFlatsNear(parsed.data.filters, parsed.data.bounds));
  } catch {
    return fail(errors.generic);
  }
}

// Verified places inside the map viewport.
export async function loadMapPlaces(input: unknown): Promise<ActionResult<MapPlace[]>> {
  const parsed = loadPlacesSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  try {
    return ok(await placesInView(parsed.data.bounds, parsed.data.types));
  } catch {
    return fail(errors.generic);
  }
}

// Centre of a neighbourhood or city (public reference data), so a pin picker can open in the right place.
export async function loadAreaCentre(input: unknown): Promise<ActionResult<MapPoint | null>> {
  const parsed = areaCentreSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  try {
    return ok(await getAreaCentre(parsed.data.cityId, parsed.data.neighbourhoodId));
  } catch {
    return fail(errors.generic);
  }
}
