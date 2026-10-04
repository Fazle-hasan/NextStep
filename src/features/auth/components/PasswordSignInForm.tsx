"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInWithPassword } from "../actions";
import { passwordSignInSchema } from "../schemas";
import { authStrings } from "../strings";

// Email + password sign-in for members who have set a password in Settings → Password.
export function PasswordSignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const check = passwordSignInSchema.safeParse({ email, password, next });
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? authStrings.errors.generic);
      return;
    }
    startTransition(async () => {
      const result = await signInWithPassword({ email, password, next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password-email">{authStrings.emailLabel}</Label>
        <Input
          id="password-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11 text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error" : undefined}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password-input">{authStrings.passwordLabel}</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            {authStrings.forgotPassword}
          </Link>
        </div>
        <Input
          id="password-input"
          type="password"
          autoComplete="current-password"
          className="h-11 text-base"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error password-hint" : "password-hint"}
        />
        <p id="password-hint" className="text-sm text-muted-foreground">
          {authStrings.noPasswordYet}
        </p>
      </div>
      {error && (
        <p id="password-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? authStrings.signingIn : authStrings.signInWithPassword}
      </Button>
    </form>
  );
}
