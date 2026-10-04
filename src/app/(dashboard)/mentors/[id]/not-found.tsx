import Link from "next/link";

import { Button } from "@/components/ui/button";
import { bookingStrings as s } from "@/features/mentorship/booking/strings";

export default function MentorNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.mentor.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.mentor.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/mentors">{s.back}</Link>
      </Button>
    </div>
  );
}
