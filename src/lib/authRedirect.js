/**
 * OAuth PKCE and password-reset links must return to a URL the device can open.
 * On LAN dev, `window.location.origin` is correct when you open the app via IP —
 * but if anything forces localhost, set NEXT_PUBLIC_SITE_URL (dev:lan sets this).
 */
export function getAppOrigin() {
  if (typeof window !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof fromEnv === "string" && /^https?:\/\//i.test(fromEnv.trim())) {
      return fromEnv.trim().replace(/\/$/, "");
    }
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
