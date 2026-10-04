import Link from "next/link";

import { Button } from "@/components/ui/button";
import { bookingStrings as s } from "@/features/mentorship/booking/strings";

export default function SessionNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.detail.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.detail.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/sessions">{s.backToSessions}</Link>
      </Button>
    </div>
  );
}
