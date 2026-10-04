"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { suspensionSchema } from "./schemas";
import { usersStrings } from "./strings";

const { errors } = usersStrings;

// Codes the admin-user-action function returns when the database refused the change.
const REFUSALS = ["admin_only", "cannot_suspend_self", "cannot_suspend_admin", "reason_required", "user_not_found"] as const;
type Refusal = (typeof REFUSALS)[number];

function isRefusal(value: unknown): value is Refusal {
  return typeof value === "string" && (REFUSALS as readonly string[]).includes(value);
}

function readField(body: unknown, field: string): unknown {
  return body && typeof body === "object" && field in body ? (body as Record<string, unknown>)[field] : undefined;
}

// The error code in the function's JSON response, if it answered at all.
async function functionRefusal(error: unknown): Promise<Refusal | null> {
  const context: unknown = readField(error, "context");
  if (!(context instanceof Response)) return null;
  try {
    const code = readField(await context.json(), "error");
    return isRefusal(code) ? code : null;
  } catch {
    return null;
  }
}

// Suspends or restores a user. authBan tells the admin whether sign-in was blocked as well.
// 1. Tries the admin-user-action Edge Function: it applies the suspension through the admin RPC (with this
//    admin's own session) and then bans or un-bans the account in Supabase Auth.
// 2. If the function is not deployed or unreachable, falls back to the RPC alone: the app-level suspension
//    (enforced by RLS and written to the audit log) still holds, but sign-in is not blocked.
export async function setUserSuspension(input: unknown): Promise<ActionResult<{ authBan: boolean }>> {
  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.generic);
  const { userId, suspend, reason } = parsed.data;

  const supabase = await createClient();
  const done = (authBan: boolean) => {
    revalidatePath("/admin", "layout");
    return ok({ authBan });
  };

  const { data, error: invokeError } = await supabase.functions.invoke("admin-user-action", {
    body: { userId, suspend, reason: reason ?? "" },
  });
  if (!invokeError) return done(readField(data, "authBan") === true);

  const refusal = await functionRefusal(invokeError);
  if (refusal) return fail(errors[refusal]);

  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user_id: userId,
    p_suspend: suspend,
    p_reason: reason || undefined,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));
  return done(false);
}
