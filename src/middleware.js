import { NextResponse } from "next/server";

/**
 * Supabase often appends ?code= to the configured Site URL. If Site URL has no path
 * (e.g. http://host:3000), the callback lands on / instead of /auth — PKCE/session
 * handling and UX expect /auth. Forward those requests before the page loads.
 */
export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/") return NextResponse.next();

  const code = searchParams.get("code");
  const err = searchParams.get("error");
  if (!code && !err) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/",
};
