import Link from "next/link";

import { Button } from "@/components/ui/button";
import { placesStrings } from "@/features/places/directory/strings";

const s = placesStrings.detail;

export default function PlaceNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/places">{s.back}</Link>
      </Button>
    </div>
  );
}
