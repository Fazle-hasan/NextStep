import { CircleCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { searchStrings as s } from "../strings";

import { SaveJobButton } from "./SaveJobButton";

type Props = {
  jobId: string;
  isOpen: boolean;
  signedIn: boolean;
  applied: boolean;
  saved: boolean;
  // Referral code from a shared link, passed on to the apply page.
  referral: string | null;
};

// Apply / save / refer controls on the job page.
export function JobActions({ jobId, isOpen, signedIn, applied, saved, referral }: Props) {
  const applyPath = `/jobs/${jobId}/apply${referral ? `?ref=${referral}` : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {applied ? (
          <>
            <p className="inline-flex min-h-11 items-center gap-2 font-medium text-primary">
              <CircleCheck className="size-5" aria-hidden="true" />
              {s.detail.applied}
            </p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/applications">{s.detail.viewApplication}</Link>
            </Button>
          </>
        ) : isOpen ? (
          <Button asChild className="h-11 px-6 text-base">
            <Link href={signedIn ? applyPath : `/sign-in?next=${encodeURIComponent(applyPath)}`}>
              {signedIn ? s.detail.apply : s.detail.signInToApply}
            </Link>
          </Button>
        ) : null}
        {signedIn && isOpen && <SaveJobButton jobId={jobId} initialSaved={saved} variant="full" />}
      </div>
      {isOpen && (
        <p className="text-sm text-muted-foreground">
          {s.detail.referHint}{" "}
          <Link href="/referrals" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            {s.detail.refer}
          </Link>
        </p>
      )}
    </div>
  );
}
