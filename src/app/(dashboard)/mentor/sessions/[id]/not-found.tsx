import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function MentorSessionNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Session not found</h1>
      <p className="text-muted-foreground">This session doesn&apos;t exist, or you are not its mentor.</p>
      <Button asChild className="h-11">
        <Link href="/mentor">Back to the mentor dashboard</Link>
      </Button>
    </div>
  );
}
