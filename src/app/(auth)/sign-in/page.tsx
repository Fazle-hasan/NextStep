import type { Metadata } from "next";
import Link from "next/link";

import { SignInCard } from "@/features/auth/components/SignInCard";
import { authStrings } from "@/features/auth/strings";
import { safeNextPath } from "@/lib/utils/redirect";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  callback: authStrings.errors.callbackFailed,
  oauth: authStrings.errors.oauthFailed,
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
        NextStep
      </Link>
      <SignInCard next={next} errorMessage={errorKey ? ERROR_MESSAGES[errorKey] : undefined} />
    </main>
  );
}
