import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { authStrings } from "@/features/auth/strings";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <AuthBrand />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{authStrings.forgotTitle}</h1>
          </CardTitle>
          <CardDescription>{authStrings.forgotSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
