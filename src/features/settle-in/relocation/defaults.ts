import { paiseToRupees } from "@/lib/utils/money";

import type { RequestFormValues } from "./schemas";
import type { RequestDetail } from "./types";

export function emptyRequestForm(): RequestFormValues {
  return {
    cityId: "",
    neighbourhoodIds: [],
    moveFrom: "",
    moveTo: "",
    workplaceAddress: "",
    pinAction: "clear",
    workplaceLat: null,
    workplaceLng: null,
    budgetMin: "",
    budgetMax: "",
    household: "",
    needs: [],
    note: "",
    sameGenderOnly: false,
  };
}

export function requestToForm(request: RequestDetail): RequestFormValues {
  return {
    cityId: request.cityId,
    neighbourhoodIds: request.neighbourhoodIds,
    moveFrom: request.moveFrom,
    moveTo: request.moveTo ?? "",
    workplaceAddress: request.workplaceAddress ?? "",
    pinAction: request.hasWorkplacePin ? "keep" : "clear",
    workplaceLat: null,
    workplaceLng: null,
    budgetMin: request.budgetMin !== null ? String(paiseToRupees(request.budgetMin)) : "",
    budgetMax: request.budgetMax !== null ? String(paiseToRupees(request.budgetMax)) : "",
    household: request.household,
    needs: request.needs,
    note: request.note ?? "",
    sameGenderOnly: request.sameGenderOnly,
  };
}
