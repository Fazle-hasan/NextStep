import Link from "next/link";

import { Button } from "@/components/ui/button";
import { placesAdminStrings as s } from "@/features/places/admin/strings";

export default function AdminAreaNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.pages.areaNotFoundTitle}</h1>
      <p className="text-muted-foreground">{s.pages.areaNotFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/admin/areas">{s.pages.backToAreas}</Link>
      </Button>
    </div>
  );
}
