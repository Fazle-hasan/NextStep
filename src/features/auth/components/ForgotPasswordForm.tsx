"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordReset } from "../actions";
import { forgotPasswordSchema } from "../schemas";
import { authStrings } from "../strings";

import { EmailSentPanel } from "./EmailSentPanel";

// Forgot password: emails a link that opens "Set a new password".
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sentTo) {
    return (
      <EmailSentPanel title={authStrings.checkEmailTitle} body={authStrings.resetSent(sentTo)}>
        <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
          {authStrings.backToLogIn}
        </Link>
      </EmailSentPanel>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const check = forgotPasswordSchema.safeParse({ email });
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? authStrings.errors.generic);
      return;
    }
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentTo(result.data.email);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">{authStrings.emailLabel}</Label>
        <Input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11 text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "forgot-error" : undefined}
        />
        {error && (
          <p id="forgot-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? authStrings.sending : authStrings.sendResetLink}
      </Button>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          {authStrings.backToLogIn}
        </Link>
      </p>
    </form>
  );
}
