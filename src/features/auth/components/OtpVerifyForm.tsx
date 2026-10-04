"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

import { verifyEmailOtp, verifyPhoneOtp } from "../actions";
import { authStrings } from "../strings";

import type { OtpMethod } from "./OtpRequestForm";

type Props = {
  method: OtpMethod;
  sentTo: string;
  next?: string;
  onChangeContact: () => void;
};

// Step 2: enter the 6-digit code.
export function OtpVerifyForm({ method, sentTo, next, onChangeContact }: Props) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(code: string) {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError(authStrings.errors.invalidCode);
      return;
    }
    startTransition(async () => {
      const result =
        method === "phone"
          ? await verifyPhoneOtp({ phone: sentTo, token: code }, next)
          : await verifyEmailOtp({ email: sentTo, token: code }, next);
      if (!result.ok) {
        setError(result.error);
        setToken("");
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(token);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">{authStrings.codeSentTo(sentTo)}</p>
      <div className="space-y-2">
        <Label htmlFor="otp-code">{authStrings.codeLabel}</Label>
        <InputOTP
          id="otp-code"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={token}
          onChange={setToken}
          onComplete={submit}
          aria-invalid={Boolean(error)}
          disabled={pending}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {method === "email" && <p className="text-sm text-muted-foreground">{authStrings.emailLinkHint}</p>}
      </div>
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? authStrings.verifying : authStrings.verify}
      </Button>
      <Button type="button" variant="link" className="w-full" onClick={onChangeContact}>
        {authStrings.changeContact}
      </Button>
    </form>
  );
}
