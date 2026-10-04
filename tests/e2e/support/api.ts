import { randomUUID } from "node:crypto";

import { localStack } from "./stack";

// Test setup through the local Supabase APIs. Users act through RPCs with their OWN token (so RLS and the
// database rules apply exactly as in the app); the service role is used only to create accounts and grant
// the admin role, which no UI can do.

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const PASSWORD = "e2e-Password-123!";

export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${randomUUID().slice(0, 8)}@example.com`;
}

// A valid, unique-ish Indian mobile number (+91 followed by 10 digits starting 6–9).
export function uniquePhoneDigits(): string {
  return `9${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;
}

async function call<T>(path: string, init: RequestInit & { token?: string; service?: boolean }): Promise<T> {
  const { apiUrl, anonKey, serviceRoleKey } = localStack();
  const bearer = init.service ? serviceRoleKey : (init.token ?? anonKey);
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      apikey: init.service ? serviceRoleKey : anonKey,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

export function rpc<T = Json>(token: string, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return call<T>(`/rest/v1/rpc/${fn}`, { method: "POST", token, body: JSON.stringify(args) });
}

export function select<T = Record<string, unknown>[]>(token: string | null, table: string, query: string): Promise<T> {
  return call<T>(`/rest/v1/${table}?${query}`, { method: "GET", ...(token ? { token } : {}) });
}

export function insert<T = Record<string, unknown>[]>(token: string, table: string, row: Record<string, unknown>): Promise<T> {
  return call<T>(`/rest/v1/${table}`, {
    method: "POST",
    token,
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
  });
}

export async function cityId(slug: string): Promise<string> {
  const rows = await select<{ id: string }[]>(null, "cities", `slug=eq.${slug}&select=id`);
  if (!rows[0]) throw new Error(`City ${slug} not found. Is the local database seeded?`);
  return rows[0].id;
}

export type Member = { id: string; email: string; token: string; name: string };

// Creates an account with a confirmed email and signs it in to get an access token.
async function createAccount(email: string, name: string): Promise<Member> {
  const user = await call<{ id: string }>("/auth/v1/admin/users", {
    method: "POST",
    service: true,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name } }),
  });
  const session = await call<{ access_token: string }>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return { id: user.id, email, token: session.access_token, name };
}

// An onboarded member, set up through the same RPC the onboarding wizard calls.
export async function createMember(options: {
  prefix: string;
  name: string;
  gender?: "male" | "female";
  city?: string;
  intents?: string[];
}): Promise<Member> {
  const member = await createAccount(uniqueEmail(options.prefix), options.name);
  await rpc(member.token, "complete_onboarding", {
    p_full_name: options.name,
    p_gender: options.gender ?? "male",
    p_city_id: await cityId(options.city ?? "mumbai"),
    p_intents: options.intents ?? ["find_job"],
    p_phone: `+91${uniquePhoneDigits()}`,
  });
  return member;
}

// An admin: a member who is given the admin role (admins are never self-assigned, D-014).
export async function createAdmin(prefix: string): Promise<Member> {
  const admin = await createMember({ prefix, name: "E2E Admin" });
  await call("/rest/v1/user_roles", {
    method: "POST",
    service: true,
    body: JSON.stringify({ user_id: admin.id, role: "admin" }),
  });
  return admin;
}

// A one-time sign-in link for the app's /auth/callback (the same token_hash path as the email link),
// created without sending an email.
export async function signInPath(email: string, next = "/home"): Promise<string> {
  const link = await call<{ hashed_token?: string; properties?: { hashed_token?: string } }>("/auth/v1/admin/generate_link", {
    method: "POST",
    service: true,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const tokenHash = link.hashed_token ?? link.properties?.hashed_token;
  if (!tokenHash) throw new Error("generate_link returned no hashed_token");
  return `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`;
}

// The 6-digit code from the newest email to this address in the local Mailpit inbox.
export async function latestEmailCode(email: string, timeoutMs = 30_000): Promise<string> {
  const { mailpitUrl } = localStack();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    if (search.ok) {
      const result = (await search.json()) as { messages?: { ID: string }[] };
      const id = result.messages?.[0]?.ID;
      if (id) {
        const message = (await (await fetch(`${mailpitUrl}/api/v1/message/${id}`)).json()) as { Text?: string; HTML?: string };
        // The code is the only element whose whole text is six digits (supabase/templates/magic_link.html).
        const code = (message.HTML ?? "").match(/>\s*(\d{6})\s*</)?.[1] ?? (message.Text ?? "").match(/^\s*(\d{6})\s*$/m)?.[1];
        if (code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in code arrived for ${email}`);
}

// The newest email to this address whose subject or body matches `kind`, as a link the browser can open:
// a confirmation (sign-up), a sign-in link or a password reset, from the local Mailpit inbox.
export async function latestEmailLink(email: string, timeoutMs = 30_000): Promise<string> {
  const { mailpitUrl } = localStack();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    if (search.ok) {
      const result = (await search.json()) as { messages?: { ID: string }[] };
      const id = result.messages?.[0]?.ID;
      if (id) {
        const message = (await (await fetch(`${mailpitUrl}/api/v1/message/${id}`)).json()) as { HTML?: string };
        const href = (message.HTML ?? "").match(/href="([^"]*(?:auth\/callback|auth\/v1\/verify)[^"]*)"/)?.[1];
        if (href) return href.replaceAll("&amp;", "&");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email link arrived for ${email}`);
}
