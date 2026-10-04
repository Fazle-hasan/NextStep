"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { signInWithGoogle } from "../actions";
import { authStrings } from "../strings";

import { OtpRequestForm, type OtpMethod } from "./OtpRequestForm";
import { OtpVerifyForm } from "./OtpVerifyForm";

type Props = {
  next?: string;
  errorMessage?: string;
};

export function SignInCard({ next, errorMessage }: Props) {
  const [method, setMethod] = useState<OtpMethod>("phone");
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>{authStrings.title}</h1>
        </CardTitle>
        <CardDescription>{authStrings.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {sentTo ? (
          <OtpVerifyForm method={method} sentTo={sentTo} next={next} onChangeContact={() => setSentTo(null)} />
        ) : (
          <Tabs value={method} onValueChange={(v) => setMethod(v as OtpMethod)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">{authStrings.phoneTab}</TabsTrigger>
              <TabsTrigger value="email">{authStrings.emailTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="phone" className="pt-4">
              <OtpRequestForm method="phone" next={next} onSent={setSentTo} />
            </TabsContent>
            <TabsContent value="email" className="pt-4">
              <OtpRequestForm method="email" next={next} onSent={setSentTo} />
            </TabsContent>
          </Tabs>
        )}

        {!sentTo && (
          <>
            <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {authStrings.orContinueWith}
              <span className="h-px flex-1 bg-border" />
            </div>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next ?? ""} />
              <Button type="submit" variant="outline" className="h-11 w-full text-base">
                <GoogleIcon />
                {authStrings.google}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
