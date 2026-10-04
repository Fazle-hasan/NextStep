import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function RelocationRequestNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that request</h1>
      <p className="text-muted-foreground">It may have been removed, or it belongs to someone else.</p>
      <Button asChild className="h-11">
        <Link href="/settle-in">Back to Settle In</Link>
      </Button>
    </div>
  );
}
