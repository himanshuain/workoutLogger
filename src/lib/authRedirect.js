/**
 * OAuth PKCE and password-reset links must return to a URL the current tab can open.
 *
 * In the browser we always use `window.location.origin` so redirects match how you opened the app
 * (localhost, LAN IP, production domain). Do not prefer NEXT_PUBLIC_SITE_URL here: it is baked at
 * build time and often holds a dev LAN IP, which breaks Google login on localhost and on server.
 *
 * NEXT_PUBLIC_SITE_URL is only used when there is no window (SSR / non-browser), which is rare for
 * these flows.
 */
export function getAppOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof fromEnv === "string" && /^https?:\/\//i.test(fromEnv.trim())) {
    return fromEnv.trim().replace(/\/$/, "");
  }
  return "";
}

export function getAuthRedirectUrl() {
  const base = getAppOrigin();
  return base ? `${base}/auth` : "/auth";
}
