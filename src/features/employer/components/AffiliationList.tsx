"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

import { confirmAffiliation } from "../actions";
import { employerStrings } from "../strings";
import type { CompanyAffiliation } from "../types";

const s = employerStrings.affiliations;

// People who declared "I work at this company". Confirming them marks their referrals as trusted.
export function AffiliationList({ affiliations }: { affiliations: CompanyAffiliation[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setConfirmed(affiliationId: string, confirm: boolean) {
    startTransition(async () => {
      const result = await confirmAffiliation({ affiliationId, confirm });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.saved);
      router.refresh();
    });
  }

  if (affiliations.length === 0) {
    return <p className="text-sm text-muted-foreground">{s.empty}</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {affiliations.map((person) => {
        const confirmed = Boolean(person.confirmedAt);
        return (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <span className="font-medium break-words">{person.name ?? s.unknownPerson}</span>
              <StatusBadge tone={confirmed ? "success" : "attention"} label={confirmed ? s.confirmed : s.unconfirmed} />
            </span>
            <Button
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setConfirmed(person.id, !confirmed)}
            >
              {confirmed ? s.unconfirm : s.confirm}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
