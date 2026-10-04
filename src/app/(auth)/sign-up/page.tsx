import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { AuthModeSwitch } from "@/features/auth/components/AuthModeSwitch";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { getAuthProviders } from "@/features/auth/providers";
import { authStrings } from "@/features/auth/strings";
import { safeNextPath } from "@/lib/utils/redirect";

export const metadata: Metadata = { title: "Sign up" };

// Create an account with email + password (D-044). Google appears here too when it is switched on.
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const providers = await getAuthProviders();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <AuthBrand />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <AuthModeSwitch mode="signup" next={next} />
          <div className="space-y-1">
            <CardTitle className="text-xl">
              <h1>{authStrings.signUpTitle}</h1>
            </CardTitle>
            <CardDescription>{authStrings.signUpSubtitle}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignUpForm next={next} />
          {providers.google && <GoogleButton next={next} />}
        </CardContent>
      </Card>
    </main>
  );
}
