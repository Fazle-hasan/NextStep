"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { postAreaTip } from "../actions";
import { TIP_MAX, TIP_MIN } from "../schemas";
import { areaStrings as s } from "../strings";

// Shown only to viewers who may post tips (verified Settle-In Buddies and admins).
export function TipForm({ neighbourhoodId }: { neighbourhoodId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const length = body.trim().length;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (length < TIP_MIN || length > TIP_MAX) {
      setError(s.errors.tipLength);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await postAreaTip({ neighbourhoodId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      toast.success(s.tips.form.posted);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border p-3" noValidate>
      <Label htmlFor="area-tip-body">{s.tips.form.label}</Label>
      <Textarea
        id="area-tip-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={s.tips.form.placeholder}
        maxLength={TIP_MAX}
        rows={3}
        aria-describedby="area-tip-hint"
        aria-invalid={error !== null}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span id="area-tip-hint">{s.tips.form.hint}</span>
        <span aria-hidden="true">
          {length}/{TIP_MAX}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? s.tips.form.submitting : s.tips.form.submit}
      </Button>
    </form>
  );
}
