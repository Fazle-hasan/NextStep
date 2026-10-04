import Link from "next/link";

import { Button } from "@/components/ui/button";
import { flatsStrings } from "@/features/settle-in/flats/strings";

const s = flatsStrings.detail;

export default function FlatNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/flats">{s.back}</Link>
      </Button>
    </div>
  );
}
