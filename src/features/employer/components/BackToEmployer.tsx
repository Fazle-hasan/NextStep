import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { employerStrings } from "../strings";

export function BackToEmployer() {
  return (
    <Link
      href="/employer"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {employerStrings.company.backToDashboard}
    </Link>
  );
}
