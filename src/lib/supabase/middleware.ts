import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { HOME_PATH, SIGN_IN_PATH, authCallbackRedirect, isPublicPath, isSignedOutOnlyPath } from "@/lib/routes";
import type { Database } from "@/types/database";

// Refreshes the Supabase session cookie on every request and protects private routes.
// Role and onboarding checks happen server-side in layouts and RLS; this is only the signed-in gate.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const callback = authCallbackRedirect(pathname, request.nextUrl.searchParams);
  if (callback) {
    return redirectWithCookies(new URL(callback, request.nextUrl.origin), response);
  }

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_PATH;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (signedIn && isSignedOutOnlyPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_PATH;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// Keep refreshed auth cookies when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
