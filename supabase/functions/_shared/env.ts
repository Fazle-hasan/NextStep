// Shared helpers for Edge Functions. Secrets come from function secrets (never from the repo).

export function env(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.length > 0 ? value : null;
}

export function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing function secret ${name}`);
  return value;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

// Cron-only functions: the caller must send the shared secret. Fails closed when CRON_SECRET is not set.
export function isCronRequest(req: Request): boolean {
  const expected = env("CRON_SECRET");
  const given = req.headers.get("x-cron-secret");
  return Boolean(expected && given && timingSafeEqual(expected, given));
}
