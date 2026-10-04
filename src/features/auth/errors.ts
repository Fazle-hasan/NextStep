import { authStrings } from "./strings";

type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

// Maps Supabase Auth errors to safe user-facing messages.
export function authErrorMessage(error: AuthErrorLike): string {
  if (!error) return authStrings.errors.generic;
  const code = error.code ?? "";
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
