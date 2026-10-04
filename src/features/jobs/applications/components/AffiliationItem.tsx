import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

import type { Affiliation } from "../queries";
import { referralsStrings as s } from "../strings";

type Props = { item: Affiliation; pending: boolean; onRemove: () => void };

// One "Where I work" entry: a company on NextStep, or an organisation that is not on NextStep yet.
export function AffiliationItem({ item, pending, onRemove }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0 space-y-1">
        <p className="font-medium break-words">{item.companyName}</p>
        {item.onNextStep ? (
          <StatusBadge tone={item.confirmed ? "success" : "attention"} label={item.confirmed ? s.confirmed : s.unconfirmed} />
        ) : (
          <>
            <StatusBadge tone="inactive" label={s.notOnNextStep} />
            <p className="text-sm text-muted-foreground">
              {s.inviteEmployer}{" "}
              <Link href="/employer/company/new" className="font-medium text-primary hover:underline">
                {s.inviteEmployerLink}
              </Link>
              .
            </p>
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="h-11"
        disabled={pending}
        aria-label={s.removeLabel(item.companyName)}
        onClick={onRemove}
      >
        {s.remove}
      </Button>
    </li>
  );
}
