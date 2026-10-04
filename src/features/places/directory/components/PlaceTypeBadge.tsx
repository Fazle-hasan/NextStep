import { Badge } from "@/components/ui/badge";

import { isWorshipPlace, PLACE_TYPE_LABELS, type PlaceType } from "../../labels";

// Masjids and imambargahs stand out with the brand tint; everyday places use the quieter style.
// A category, not a status, so it never uses the status colours (D-041).
export function PlaceTypeBadge({ type }: { type: PlaceType }) {
  return <Badge variant="secondary" className={isWorshipPlace(type) ? "bg-brand-soft text-primary" : undefined}>
      {PLACE_TYPE_LABELS[type]}
    </Badge>;
}
