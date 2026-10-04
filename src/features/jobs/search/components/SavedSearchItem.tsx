"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { deleteSavedSearch, setSearchAlert } from "../actions";
import { searchStrings as s } from "../strings";

type Props = {
  id: string;
  name: string;
  summary: string;
  href: string;
  daily: boolean;
};

// One saved search: re-run it, switch the daily alert, or delete it.
export function SavedSearchItem({ id, name, summary, href, daily }: Props) {
  const switchId = useId();
  const [alertOn, setAlertOn] = useState(daily);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  function onAlertChange(next: boolean) {
    setAlertOn(next);
    startTransition(async () => {
      const result = await setSearchAlert({ id, daily: next });
      if (!result.ok) {
        setAlertOn(!next);
        toast.error(result.error);
      }
    });
  }

  function onDelete() {
    startDelete(async () => {
      const result = await deleteSavedSearch({ id });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor={switchId}>{s.saved.alert}</Label>
          <Switch id={switchId} checked={alertOn} disabled={pending} onCheckedChange={onAlertChange} />
        </div>
        <div className="flex gap-2">
          <Button asChild className="h-11 flex-1">
            <Link href={href}>{s.saved.run}</Link>
          </Button>
          <Button type="button" variant="destructive" className="h-11" disabled={deleting} onClick={onDelete}>
            {deleting ? s.saved.deleting : s.saved.delete}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
