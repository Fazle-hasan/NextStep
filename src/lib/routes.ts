// Route access rules used by the proxy (D-012: what signed-out visitors can see).

export const SIGN_IN_PATH = "/sign-in";
export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/home";

// Signed-out visitors can open these (and everything under them).
const PUBLIC_PREFIXES = ["/jobs", "/companies", "/leap", "/places", "/areas", "/auth"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === SIGN_IN_PATH || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

// Pages a signed-in user should be bounced away from.
export function isSignedOutOnlyPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH;
}
