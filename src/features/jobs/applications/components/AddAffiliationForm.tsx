"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CompanyOption } from "../queries";
import { referralsStrings as s } from "../strings";

type Value = { companyId: string } | { organisationName: string };

type Props = { companies: CompanyOption[]; pending: boolean; onAdd: (value: Value) => void };

// Add "Where I work": pick a verified company, or type an organisation that is not on NextStep yet (D-046).
export function AddAffiliationForm({ companies, pending, onAdd }: Props) {
  const [typing, setTyping] = useState(companies.length === 0);
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const canSubmit = typing ? name.trim().length >= 2 : Boolean(companyId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onAdd(typing ? { organisationName: name.trim() } : { companyId });
    setCompanyId("");
    setName("");
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {typing ? (
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="affiliation-organisation">{s.organisationLabel}</Label>
            <Input
              id="affiliation-organisation"
              className="h-11 text-base"
              maxLength={120}
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby="affiliation-organisation-hint"
            />
          </div>
        ) : (
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
        )}
        <Button type="submit" className="h-11" disabled={!canSubmit || pending}>
          {pending ? s.adding : s.add}
        </Button>
      </div>

      {typing && (
        <p id="affiliation-organisation-hint" className="text-sm text-muted-foreground">
          {companies.length === 0 ? s.noCompanies : s.organisationHint}
        </p>
      )}
      {companies.length > 0 && (
        <Button type="button" variant="link" className="h-auto px-0" onClick={() => setTyping((v) => !v)}>
          {typing ? s.pickFromList : s.notListed}
        </Button>
      )}
    </form>
  );
}
