"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signUpWithPassword } from "../actions";
import { signUpSchema } from "../schemas";
import { authStrings } from "../strings";

import { EmailSentPanel } from "./EmailSentPanel";

type FieldError = { field: "email" | "password" | "confirm" | "form"; message: string };

// Sign up with email + password. Supabase sends a confirmation link; the account opens after it is clicked.
export function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<FieldError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sentTo) return <EmailSentPanel title={authStrings.checkEmailTitle} body={authStrings.checkEmailSignUp(sentTo)} />;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const check = signUpSchema.safeParse({ email, password, confirm, next });
    if (!check.success) {
      const issue = check.error.issues[0];
      const field = issue?.path[0];
      setError({
        field: field === "email" || field === "password" || field === "confirm" ? field : "form",
        message: issue?.message ?? authStrings.errors.generic,
      });
      return;
    }
    startTransition(async () => {
      const result = await signUpWithPassword({ email, password, confirm, next });
      if (!result.ok) {
        setError({ field: "form", message: result.error });
        return;
      }
      if (result.data.status === "signed_in") {
        router.replace(result.data.redirectTo);
        router.refresh();
        return;
      }
      setSentTo(result.data.email);
    });
  }

  const describe = (field: FieldError["field"], hint?: string) =>
    [hint, error?.field === field ? `signup-${field}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="signup-email">{authStrings.emailLabel}</Label>
        <Input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11 text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error?.field === "email" ? true : undefined}
          aria-describedby={describe("email")}
        />
        <FieldMessage id="signup-email-error" error={error} field="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">{authStrings.passwordLabel}</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          className="h-11 text-base"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error?.field === "password" ? true : undefined}
          aria-describedby={describe("password", "signup-password-hint")}
        />
        <p id="signup-password-hint" className="text-sm text-muted-foreground">
          {authStrings.newPasswordHint}
        </p>
        <FieldMessage id="signup-password-error" error={error} field="password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">{authStrings.confirmPasswordLabel}</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          className="h-11 text-base"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={error?.field === "confirm" ? true : undefined}
          aria-describedby={describe("confirm")}
        />
        <FieldMessage id="signup-confirm-error" error={error} field="confirm" />
      </div>
      <FieldMessage id="signup-form-error" error={error} field="form" />
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? authStrings.creating : authStrings.createAccount}
      </Button>
    </form>
  );
}

function FieldMessage({ id, error, field }: { id: string; error: FieldError | null; field: FieldError["field"] }) {
  if (error?.field !== field) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  );
}
