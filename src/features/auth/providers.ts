import "server-only";

import { publicEnv } from "@/lib/env";

// Which sign-in methods are switched on in Supabase Auth. Read from the public /auth/v1/settings endpoint
// (cached for 5 minutes), so the sign-in page never shows a button for a disabled provider. If the read fails,
// every method is shown and the action reports any error, as before.
export type AuthProviders = { email: boolean; phone: boolean; google: boolean };

const ALL_ON: AuthProviders = { email: true, phone: true, google: true };

export async function getAuthProviders(): Promise<AuthProviders> {
  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey },
      next: { revalidate: 300 },
    });
    if (!response.ok) return ALL_ON;
    const body = (await response.json()) as { external?: Record<string, unknown> };
    const external = body.external ?? {};
    return {
      email: external.email !== false,
      phone: external.phone === true,
      google: external.google === true,
    };
  } catch {
    return ALL_ON;
  }
}
