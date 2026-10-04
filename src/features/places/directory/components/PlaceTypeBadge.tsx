import { Badge } from "@/components/ui/badge";

import { isWorshipPlace, PLACE_TYPE_LABELS, type PlaceType } from "../../labels";

// Masjids and imambargahs stand out; everyday places use the quieter style.
export function PlaceTypeBadge({ type }: { type: PlaceType }) {
  return <Badge variant={isWorshipPlace(type) ? "default" : "secondary"}>{PLACE_TYPE_LABELS[type]}</Badge>;
}
