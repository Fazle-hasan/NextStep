import Link from "next/link";

import { shellStrings } from "@/components/shared/strings";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{shellStrings.errors.notFoundTitle}</h1>
      <p className="text-muted-foreground">{shellStrings.errors.notFoundBody}</p>
      <Button asChild size="lg" className="h-11">
        <Link href="/">{shellStrings.errors.backHome}</Link>
      </Button>
    </main>
  );
}
