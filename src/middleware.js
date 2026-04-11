import { NextResponse } from "next/server";

/**
 * Middleware to handle:
 * 1. Supabase auth callback redirects
 * 2. Route redirects for renamed pages
 */
export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Handle route redirects for renamed pages
  const routeRedirects = {
    "/lifelog": "/log",
    "/routine": "/plan", 
    "/steps": "/checklists"
  };
  
  if (routeRedirects[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = routeRedirects[pathname];
    return NextResponse.redirect(url);
  }
  
  // Handle Supabase auth callback redirects
  if (pathname !== "/") return NextResponse.next();

  const code = searchParams.get("code");
  const err = searchParams.get("error");
  if (!code && !err) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/lifelog", "/routine", "/steps"],
};
