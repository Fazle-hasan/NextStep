import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { postSignInPath } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/redirect";

const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

// Handles Google OAuth (?code=) and email magic links (?code= with PKCE, or ?token_hash=&type= from a custom template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let userId: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  } else if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id;
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in?error=callback", origin));
  }
  return NextResponse.redirect(new URL(await postSignInPath(userId, next), origin));
}
