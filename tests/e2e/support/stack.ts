import { execSync } from "node:child_process";

// The local Supabase stack (Docker) that the e2e tests run against. These are the CLI's public demo keys,
// not secrets. The hosted project in .env.local is never used by the tests.
export type LocalStack = {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  mailpitUrl: string;
};

let cached: LocalStack | null = null;

export function localStack(): LocalStack {
  if (cached) return cached;
  if (process.env.E2E_SUPABASE_URL && process.env.E2E_ANON_KEY && process.env.E2E_SERVICE_ROLE_KEY && process.env.E2E_MAILPIT_URL) {
    cached = {
      apiUrl: process.env.E2E_SUPABASE_URL,
      anonKey: process.env.E2E_ANON_KEY,
      serviceRoleKey: process.env.E2E_SERVICE_ROLE_KEY,
      mailpitUrl: process.env.E2E_MAILPIT_URL,
    };
    return cached;
  }

  let raw: string;
  try {
    raw = execSync("pnpm exec supabase status -o json", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });
  } catch {
    throw new Error("The local Supabase stack is not running. Start Docker Desktop and run `pnpm exec supabase start` first.");
  }
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as Record<string, string>;
  const apiUrl = status.API_URL;
  const anonKey = status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;
  const mailpitUrl = status.MAILPIT_URL ?? status.INBUCKET_URL;
  if (!apiUrl || !anonKey || !serviceRoleKey || !mailpitUrl) {
    throw new Error("`supabase status` did not report the API URL, keys and Mailpit URL. Is the local stack fully started?");
  }
  cached = { apiUrl, anonKey, serviceRoleKey, mailpitUrl };
  process.env.E2E_SUPABASE_URL = apiUrl;
  process.env.E2E_ANON_KEY = anonKey;
  process.env.E2E_SERVICE_ROLE_KEY = serviceRoleKey;
  process.env.E2E_MAILPIT_URL = mailpitUrl;
  return cached;
}
