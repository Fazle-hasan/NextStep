"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestEmailOtp, requestPhoneOtp } from "../actions";
import { emailOtpRequestSchema, phoneOtpRequestSchema } from "../schemas";
import { authStrings } from "../strings";

export type OtpMethod = "phone" | "email";

type Props = {
  method: OtpMethod;
  next?: string;
  onSent: (sentTo: string) => void;
};

// Step 1: collect a phone number or email and send the code.
export function OtpRequestForm({ method, next, onSent }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPhone = method === "phone";
  const inputId = `${method}-input`;
  const hintId = `${method}-hint`;
  const errorId = `${method}-error`;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Same schema as the server action, for fast feedback. The server validates again.
    const check = isPhone ? phoneOtpRequestSchema.safeParse({ phone: value }) : emailOtpRequestSchema.safeParse({ email: value });
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? authStrings.errors.generic);
      return;
    }

    startTransition(async () => {
      const result = isPhone ? await requestPhoneOtp({ phone: value }) : await requestEmailOtp({ email: value, next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSent("phone" in result.data ? result.data.phone : result.data.email);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor={inputId}>{isPhone ? authStrings.phoneLabel : authStrings.emailLabel}</Label>
        <div className="flex">
          {isPhone && (
            <span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
              +91
            </span>
          )}
          <Input
            id={inputId}
            type={isPhone ? "tel" : "email"}
            inputMode={isPhone ? "numeric" : "email"}
            autoComplete={isPhone ? "tel-national" : "email"}
            placeholder={isPhone ? "98765 43210" : "you@example.com"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}
            className={isPhone ? "h-11 rounded-l-none text-base" : "h-11 text-base"}
            required
          />
        </div>
        <p id={hintId} className="text-sm text-muted-foreground">
          {isPhone ? authStrings.phoneHint : authStrings.emailHint}
        </p>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? authStrings.sending : authStrings.sendCode}
      </Button>
    </form>
  );
}
