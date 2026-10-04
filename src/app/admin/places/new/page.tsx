import type { Metadata } from "next";
import Link from "next/link";

import { PlaceForm } from "@/features/places/admin/components/PlaceForm";
import { getAreaCentres } from "@/features/places/admin/queries";
import type { PlaceFormInput } from "@/features/places/admin/schemas";
import { placesAdminStrings as s } from "@/features/places/admin/strings";

export const metadata: Metadata = { title: s.form.newTitle };

const EMPTY_PLACE: PlaceFormInput = {
  id: "",
  name: "",
  placeType: "imambargah",
  cityId: "",
  neighbourhoodId: "",
  address: "",
  phone: "",
  website: "",
  timings: "",
  notes: "",
  isVerified: true,
  lat: "",
  lng: "",
};

export default async function AdminNewPlacePage() {
  const { cities, areas } = await getAreaCentres();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin/places" className="text-sm text-primary hover:underline">
          ← {s.pages.backToPlaces}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.form.newTitle}</h1>
      </div>
      <PlaceForm initial={EMPTY_PLACE} cities={cities} areas={areas} />
    </div>
  );
}
