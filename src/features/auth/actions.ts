"use server";

import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/redirect";

import { authErrorMessage } from "./errors";
import { postSignInPath } from "./queries";
import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  oauthSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
} from "./schemas";

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
