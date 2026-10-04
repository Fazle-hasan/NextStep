import Link from "next/link";

import { Button } from "@/components/ui/button";
import { areaStrings as s } from "@/features/places/areas/strings";

export default function AreaNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.guide.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.guide.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/areas">{s.guide.backToAreas}</Link>
      </Button>
    </div>
  );
}
