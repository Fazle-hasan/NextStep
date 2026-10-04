"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addAffiliation, removeAffiliation } from "../actions";
import type { Affiliation, CompanyOption } from "../queries";
import { referralsStrings as s } from "../strings";

import { AddAffiliationForm } from "./AddAffiliationForm";
import { AffiliationItem } from "./AffiliationItem";

type Props = { affiliations: Affiliation[]; companies: CompanyOption[] };

// "Where I work": companies on NextStep and organisations the member typed in.
export function AffiliationManager({ affiliations, companies }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {affiliations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.workEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {affiliations.map((item) => (
            <AffiliationItem
              key={item.id}
              item={item}
              pending={pending}
              onRemove={() => run(() => removeAffiliation({ affiliationId: item.id }))}
            />
          ))}
        </ul>
      )}

      <AddAffiliationForm companies={companies} pending={pending} onAdd={(value) => run(() => addAffiliation(value))} />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
