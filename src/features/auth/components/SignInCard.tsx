"use client";

import { Mail, Phone } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { AuthProviders } from "../providers";
import { authStrings } from "../strings";

import { AuthModeSwitch } from "./AuthModeSwitch";
import { EmailLinkForm } from "./EmailLinkForm";
import { GoogleButton } from "./GoogleButton";
import { OtpRequestForm } from "./OtpRequestForm";
import { OtpVerifyForm } from "./OtpVerifyForm";
import { PasswordSignInForm } from "./PasswordSignInForm";

type Props = {
  next?: string;
  errorMessage?: string;
  // Methods switched on in Supabase Auth; disabled ones are not shown (D-043).
  providers: AuthProviders;
};

type View = "password" | "email-link" | "phone";

// Log in (D-044): email + password first, then a sign-in link by email, phone (if enabled) and Google (if enabled).
export function SignInCard({ next, errorMessage, providers }: Props) {
  const [view, setView] = useState<View>("password");
  const [phoneSentTo, setPhoneSentTo] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <AuthModeSwitch mode="login" next={next} />
        <div className="space-y-1">
          <CardTitle className="text-xl">
            <h1>{authStrings.title}</h1>
          </CardTitle>
          <CardDescription>{authStrings.subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {view === "password" && <PasswordSignInForm next={next} />}
        {view === "email-link" && <EmailLinkForm next={next} />}
        {view === "phone" &&
          (phoneSentTo ? (
            <OtpVerifyForm method="phone" sentTo={phoneSentTo} next={next} onChangeContact={() => setPhoneSentTo(null)} />
          ) : (
            <OtpRequestForm method="phone" next={next} onSent={setPhoneSentTo} />
          ))}

        <div className="space-y-2">
          {view !== "password" && (
            <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => setView("password")}>
              {authStrings.backToPassword}
            </Button>
          )}
          {view !== "email-link" && (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setView("email-link")}>
              <Mail aria-hidden="true" />
              {authStrings.emailLinkInstead}
            </Button>
          )}
          {providers.phone && view !== "phone" && (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setView("phone")}>
              <Phone aria-hidden="true" />
              {authStrings.phoneTab}
            </Button>
          )}
        </div>

        {providers.google && <GoogleButton next={next} />}
      </CardContent>
    </Card>
  );
}
