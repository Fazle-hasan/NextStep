import Link from "next/link";

import { Button } from "@/components/ui/button";
import { searchStrings as s } from "@/features/jobs/search/strings";

export default function JobNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.detail.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.detail.notFoundBody}</p>
      <Button asChild className="h-11">
        <Link href="/jobs">{s.detail.backToSearch}</Link>
      </Button>
    </div>
  );
}
