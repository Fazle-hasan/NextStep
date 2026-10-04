"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { addAffiliation, removeAffiliation } from "../actions";
import type { Affiliation, CompanyOption } from "../queries";
import { referralsStrings as s } from "../strings";

type Props = { affiliations: Affiliation[]; companies: CompanyOption[] };

// "Where I work": the companies the user says they work at.
export function AffiliationManager({ affiliations, companies }: Props) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
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
      setCompanyId("");
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
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium break-words">{item.companyName}</p>
                <Badge variant={item.confirmed ? "default" : "outline"}>{item.confirmed ? s.confirmed : s.unconfirmed}</Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={pending}
                aria-label={s.removeLabel(item.companyName)}
                onClick={() => run(() => removeAffiliation({ affiliationId: item.id }))}
              >
                {s.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {companies.length === 0 ? (
        affiliations.length === 0 && <p className="text-sm text-muted-foreground">{s.noCompanies}</p>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (companyId) run(() => addAffiliation({ companyId }));
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="affiliation-company">{s.companyLabel}</Label>
            <Select value={companyId || undefined} onValueChange={setCompanyId}>
              <SelectTrigger id="affiliation-company" className="h-11 w-full text-base">
                <SelectValue placeholder={s.companyPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="h-11" disabled={!companyId || pending}>
            {pending ? s.adding : s.add}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
