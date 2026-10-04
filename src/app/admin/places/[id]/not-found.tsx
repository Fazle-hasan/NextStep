import Link from "next/link";

import { Button } from "@/components/ui/button";
import { placesAdminStrings as s } from "@/features/places/admin/strings";

export default function AdminPlaceNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.pages.placeNotFoundTitle}</h1>
      <p className="text-muted-foreground">{s.pages.placeNotFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/admin/places">{s.pages.backToPlaces}</Link>
      </Button>
    </div>
  );
}
