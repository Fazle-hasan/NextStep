import { paiseToRupees } from "@/lib/utils/money";

import { AMENITY_KEYS, type AmenityKey } from "./labels";
import type { ListingFormInput } from "./schemas";
import type { Listing } from "./types";

const numberText = (value: number | null) => (value == null ? "" : String(value));

// Form defaults: an empty form for a new listing, or the saved values when editing.
export function listingDefaults(listing?: Listing, cityId?: string | null): ListingFormInput {
  if (!listing) {
    return {
      listingType: "private_room",
      cityId: cityId ?? "",
      neighbourhoodId: "",
      title: "",
      description: "",
      rent: "",
      deposit: "",
      furnishing: "unfurnished",
      availableFrom: "",
      minStayMonths: "",
      bedrooms: "",
      bathrooms: "",
      amenities: [],
      foodPref: "",
      tenantGenderPref: "any",
    };
  }
  return {
    listingType: listing.listing_type,
    cityId: listing.city_id,
    neighbourhoodId: listing.neighbourhood_id ?? "",
    title: listing.title,
    description: listing.description ?? "",
    rent: String(Math.round(paiseToRupees(listing.rent))),
    deposit: listing.deposit == null ? "" : String(Math.round(paiseToRupees(listing.deposit))),
    furnishing: listing.furnishing,
    availableFrom: listing.available_from,
    minStayMonths: numberText(listing.min_stay_months),
    bedrooms: numberText(listing.bedrooms),
    bathrooms: numberText(listing.bathrooms),
    amenities: listing.amenities.filter((a): a is AmenityKey => (AMENITY_KEYS as readonly string[]).includes(a)),
    foodPref: listing.food_pref ?? "",
    tenantGenderPref: listing.tenant_gender_pref,
  };
}
