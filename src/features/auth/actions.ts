"use server";

import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/redirect";

import { authErrorMessage, passwordSignInErrorMessage } from "./errors";
import { postSignInPath } from "./queries";
import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  oauthSchema,
  forgotPasswordSchema,
  passwordSignInSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  setPasswordSchema,
  signUpSchema,
} from "./schemas";
import { authStrings, passwordStrings } from "./strings";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

function callbackUrl(next: string | undefined): string {
  return `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
}

export async function requestPhoneOtp(input: unknown): Promise<ActionResult<{ phone: string }>> {
  const parsed = phoneOtpRequestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone });
  if (error) return fail(authErrorMessage(error));
  return ok({ phone: parsed.data.phone });
}

export async function verifyPhoneOtp(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = phoneOtpVerifySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });
  if (error || !data.user) return fail(authErrorMessage(error));
  return ok({ redirectTo: await postSignInPath(data.user.id, safeNextPath(next)) });
}

export async function requestEmailOtp(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = emailOtpRequestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(parsed.data.next), shouldCreateUser: true },
  });
  if (error) return fail(authErrorMessage(error));
  return ok({ email: parsed.data.email });
}

export async function verifyEmailOtp(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = emailOtpVerifySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });
  if (error || !data.user) return fail(authErrorMessage(error));
  return ok({ redirectTo: await postSignInPath(data.user.id, safeNextPath(next)) });
}

export async function signInWithPassword(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = passwordSignInSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return fail(passwordSignInErrorMessage(error));
  return ok({ redirectTo: await postSignInPath(data.user.id, safeNextPath(parsed.data.next)) });
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const parsed = oauthSchema.safeParse({ next: formData.get("next") ?? undefined });
  const next = parsed.success ? parsed.data.next : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });
  if (error || !data.url) {
    redirect("/sign-in?error=oauth");
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Settings → Password: the signed-in user sets or changes the password used for email sign-in.
export async function setPassword(input: unknown): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail(passwordStrings.errors.signedOut);
  if (!userData.user.email) return fail(passwordStrings.needsEmail);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const code = error.code ?? "";
    if (code === "weak_password") return fail(passwordStrings.errors.weak);
    if (code === "same_password") return fail(passwordStrings.errors.same);
    if (code === "reauthentication_needed") return fail(passwordStrings.errors.reauth);
    return fail(passwordStrings.errors.generic);
  }
  return ok();
}

// Sign up with email + password. Supabase emails a confirmation link (to /auth/callback, then onboarding).
// An address that already has an account gets the same answer, so sign-up cannot be used to find members.
export async function signUpWithPassword(
  input: unknown,
): Promise<ActionResult<{ status: "check_email"; email: string } | { status: "signed_in"; redirectTo: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // New accounts land on onboarding anyway (postSignInPath); `next` is where they go after it.
    options: { emailRedirectTo: callbackUrl(parsed.data.next) },
  });
  if (error) {
    if (error.code === "weak_password") return fail(passwordStrings.errors.weak);
    if (error.code === "user_already_exists") return ok({ status: "check_email", email: parsed.data.email });
    return fail(authErrorMessage(error));
  }
  // Email confirmation switched off: the user is signed in straight away.
  if (data.session && data.user) {
    return ok({ status: "signed_in", redirectTo: await postSignInPath(data.user.id, safeNextPath(parsed.data.next)) });
  }
  return ok({ status: "check_email", email: parsed.data.email });
}

// Forgot password: emails a link that signs the user in and opens /reset-password.
// Always answers the same way, whether or not the address has an account.
export async function requestPasswordReset(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return fail(authStrings.errors.rateLimited);
  return ok({ email: parsed.data.email });
}
