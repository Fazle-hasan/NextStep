import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dates";
import { formatRupees } from "@/lib/utils/money";

import { amenityLabel, FOOD_PREF_LABELS, FURNISHING_LABELS, TENANT_GENDER_LABELS } from "../labels";
import { flatsStrings } from "../strings";
import type { Listing } from "../types";

const s = flatsStrings.detail;

// The listing's facts as a definition list, plus amenities.
export function ListingFacts({ listing }: { listing: Listing }) {
  const facts: [string, string][] = [
    [s.availableFrom, formatDate(listing.available_from)],
    [s.furnishing, FURNISHING_LABELS[listing.furnishing]],
    [s.tenants, TENANT_GENDER_LABELS[listing.tenant_gender_pref]],
  ];
  if (listing.deposit != null) facts.push([s.deposit, formatRupees(listing.deposit)]);
  if (listing.min_stay_months != null) {
    facts.push([s.minStay, listing.min_stay_months === 0 ? s.noMinStay : s.months(listing.min_stay_months)]);
  }
  if (listing.bedrooms != null) facts.push([s.bedrooms, String(listing.bedrooms)]);
  if (listing.bathrooms != null) facts.push([s.bathrooms, String(listing.bathrooms)]);
  if (listing.food_pref) facts.push([s.food, FOOD_PREF_LABELS[listing.food_pref]]);

  return (
    <section aria-labelledby="details-heading" className="space-y-4">
      <h2 id="details-heading" className="text-lg font-semibold">
        {s.details}
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {facts.map(([term, value]) => (
          <div key={term}>
            <dt className="text-sm text-muted-foreground">{term}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {listing.amenities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{s.amenities}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {listing.amenities.map((amenity) => (
              <li key={amenity}>
                <Badge variant="secondary">{amenityLabel(amenity)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
