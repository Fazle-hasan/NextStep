"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { setPassword } from "../actions";
import { setPasswordSchema } from "../schemas";
import { passwordStrings as s } from "../strings";

// Settings → Password. The new password is never shown back or stored outside Supabase Auth.
export function SetPasswordForm() {
  const [password, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ field: "password" | "confirm" | "form"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const check = setPasswordSchema.safeParse({ password, confirm });
    if (!check.success) {
      const issue = check.error.issues[0];
      setError({ field: issue?.path[0] === "confirm" ? "confirm" : "password", message: issue?.message ?? s.errors.generic });
      return;
    }
    startTransition(async () => {
      const result = await setPassword({ password, confirm });
      if (!result.ok) {
        setError({ field: "form", message: result.error });
        return;
      }
      setValue("");
      setConfirm("");
      toast.success(s.saved);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="new-password">{s.newLabel}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="h-11 text-base"
          value={password}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error?.field === "password" ? true : undefined}
          aria-describedby={error?.field === "password" ? "new-password-error new-password-hint" : "new-password-hint"}
        />
        <p id="new-password-hint" className="text-sm text-muted-foreground">
          {s.newHint}
        </p>
        {error?.field === "password" && (
          <p id="new-password-error" role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">{s.confirmLabel}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="h-11 text-base"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={error?.field === "confirm" ? true : undefined}
          aria-describedby={error?.field === "confirm" ? "confirm-password-error" : undefined}
        />
        {error?.field === "confirm" && (
          <p id="confirm-password-error" role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
      {error?.field === "form" && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? s.saving : s.save}
      </Button>
    </form>
  );
}
