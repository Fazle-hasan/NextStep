import { authStrings } from "./strings";

type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

// Password sign-in: a wrong email/password pair must not reveal which part was wrong.
export function passwordSignInErrorMessage(error: AuthErrorLike): string {
  const code = error?.code ?? "";
  if (code === "invalid_credentials") return authStrings.errors.wrongPassword;
  if (code === "email_not_confirmed") return authStrings.errors.emailNotConfirmed;
  return authErrorMessage(error);
}

// Maps Supabase Auth errors to safe user-facing messages.
export function authErrorMessage(error: AuthErrorLike): string {
  if (!error) return authStrings.errors.generic;
  const code = error.code ?? "";
  // Supabase's email sender has an hourly limit for the whole project (D-044); this is not the user's fault.
  if (code === "over_email_send_rate_limit") {
    return authStrings.errors.emailLimit;
  }
  if (error.status === 429 || code.startsWith("over_") || code === "too_many_requests") {
    return authStrings.errors.rateLimited;
  }
  if (code === "otp_expired" || code === "invalid_credentials" || code === "otp_disabled") {
    return authStrings.errors.wrongCode;
  }
  if (code.endsWith("provider_disabled") || code === "sms_send_failed" || code === "signup_disabled") {
    return authStrings.errors.providerDisabled;
  }
  return authStrings.errors.generic;
}
