import type { Metadata } from "next";

import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { SignInCard } from "@/features/auth/components/SignInCard";
import { getAuthProviders } from "@/features/auth/providers";
import { authStrings } from "@/features/auth/strings";
import { safeNextPath } from "@/lib/utils/redirect";

export const metadata: Metadata = { title: "Log in" };

const ERROR_MESSAGES: Record<string, string> = {
  callback: authStrings.errors.callbackFailed,
  oauth: authStrings.errors.oauthFailed,
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const providers = await getAuthProviders();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <AuthBrand />
      <SignInCard next={next} providers={providers} errorMessage={errorKey ? ERROR_MESSAGES[errorKey] : undefined} />
    </main>
  );
}
