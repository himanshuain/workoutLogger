/**
 * OAuth PKCE and password-reset redirects must use a URL the user can open.
 *
 * - **Development:** always `window.location.origin` so localhost vs LAN matches the tab you used.
 * - **Production:** if `NEXT_PUBLIC_SITE_URL` is set to a public URL (not localhost / private LAN),
 *   use it as the canonical origin. That way Google OAuth returns to your domain (e.g. https://app.example.com)
 *   even when someone opens the app via http://SERVER_IP:3000.
 *
 * On your host (Vercel, VPS, etc.) set e.g. `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
 * and add the same `https://your-domain.com/auth` in Supabase → Authentication → URL configuration.
 */

function trimAbsoluteUrl(raw) {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  return t.replace(/\/$/, "");
}

function hostnameFromBase(base) {
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPrivateOrLocalhostHost(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m = hostname.match(/^172\.(\d{1,3})\./);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 16 && n <= 31;
  }
  return false;
}

/** Env URL safe to use as production canonical site (never LAN/localhost). */
function getTrustedProductionSiteBase() {
  const base = trimAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  if (!base) return null;
  const host = hostnameFromBase(base);
  if (!host || isPrivateOrLocalhostHost(host)) return null;
  return base;
}

export function getAppOrigin() {
  if (typeof window !== "undefined") {
    if (process.env.NODE_ENV === "production") {
      const trusted = getTrustedProductionSiteBase();
      if (trusted) return trusted;
    }
    return window.location.origin;
  }

  return getTrustedProductionSiteBase() ?? "";
}

export function getAuthRedirectUrl() {
  const base = getAppOrigin();
  return base ? `${base}/auth` : "/auth";
}
