import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm";
import { getViewer } from "@/features/auth/queries";
import { authStrings } from "@/features/auth/strings";

export const metadata: Metadata = { title: "Set a new password" };

// Opened from the password-reset email: the link has already signed the user in (recovery session).
export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/forgot-password");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <AuthBrand />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{authStrings.resetTitle}</h1>
          </CardTitle>
          <CardDescription>{authStrings.resetSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm doneHref="/home" doneMessage={authStrings.resetDone} />
        </CardContent>
      </Card>
    </main>
  );
}
