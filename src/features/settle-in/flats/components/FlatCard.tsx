import { Home, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listingPhotoUrl } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils/dates";
import { formatMonthlyRent } from "@/lib/utils/money";

import { FURNISHING_LABELS, LISTING_TYPE_LABELS, TENANT_GENDER_LABELS } from "../labels";
import { flatsStrings } from "../strings";
import type { FlatCardData } from "../types";

const s = flatsStrings.card;

type Props = { flat: FlatCardData; place: string | null };

// Summary card used in flat search results.
export function FlatCard({ flat, place }: Props) {
  const photo = listingPhotoUrl(flat.cover_photo_path);

  return (
    <Card className="overflow-hidden pt-0">
      <div className="flex aspect-[16/10] items-center justify-center bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing photo served from Supabase Storage
          <img src={photo} alt={s.photoAlt(flat.title)} loading="lazy" className="size-full object-cover" />
        ) : (
          <Home className="size-10 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <CardContent className="space-y-2">
        <p className="text-lg font-semibold">{formatMonthlyRent(flat.rent)}</p>
        <h3 className="text-base leading-snug font-medium">
          <Link href={`/flats/${flat.id}`} className="hover:underline focus-visible:underline">
            {flat.title}
          </Link>
        </h3>
        {place && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {place}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{LISTING_TYPE_LABELS[flat.listing_type]}</Badge>
          <Badge variant="outline">{FURNISHING_LABELS[flat.furnishing]}</Badge>
          {flat.tenant_gender_pref !== "any" && (
            <Badge variant="outline">{TENANT_GENDER_LABELS[flat.tenant_gender_pref]}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            flat.bedrooms != null && flat.bedrooms > 0 ? s.beds(flat.bedrooms) : null,
            s.availableFrom(formatDate(flat.available_from)),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </CardContent>
    </Card>
  );
}
