// Route access rules used by the proxy (D-012: what signed-out visitors can see).

export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
// Reached from the password-reset email with a recovery session, so it needs a signed-in user.
export const RESET_PASSWORD_PATH = "/reset-password";

// Pages only for signed-out visitors.
const SIGNED_OUT_ONLY = [SIGN_IN_PATH, SIGN_UP_PATH, FORGOT_PASSWORD_PATH];
export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/home";

// Signed-out visitors can open these (and everything under them).
const PUBLIC_PREFIXES = ["/jobs", "/companies", "/leap", "/places", "/areas", "/auth"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return pathname === "/" || SIGNED_OUT_ONLY.includes(pathname) || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

// Pages a signed-in user should be bounced away from.
export function isSignedOutOnlyPath(pathname: string): boolean {
  return SIGNED_OUT_ONLY.includes(pathname);
}

// Supabase sends people to the Site URL (the home page) with ?code= or ?token_hash= when the link's own
// redirect is not on the allow list. Those links are finished by /auth/callback instead of being dropped.
export function authCallbackRedirect(pathname: string, params: URLSearchParams): string | null {
  if (pathname !== "/") return null;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!code && !(tokenHash && type)) return null;
  const forward = new URLSearchParams();
  if (code) forward.set("code", code);
  if (tokenHash && type) {
    forward.set("token_hash", tokenHash);
    forward.set("type", type);
  }
  forward.set("next", type === "recovery" ? RESET_PASSWORD_PATH : HOME_PATH);
  return `/auth/callback?${forward.toString()}`;
}
