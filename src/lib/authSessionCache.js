/** Supabase persists PKCE sessions in localStorage under sb-<project-ref>-auth-token. */

export function getSupabaseAuthStorageKey() {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (fromEnv?.[1]) {
    return `sb-${fromEnv[1]}-auth-token`;
  }

  if (typeof window === "undefined") return null;

  return (
    Object.keys(localStorage).find(key => key.startsWith("sb-") && key.endsWith("-auth-token")) ?? null
  );
}

export function readCachedAuthSession() {
  if (typeof window === "undefined") return null;

  try {
    const key = getSupabaseAuthStorageKey();
    if (!key) return null;

    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.access_token || !session?.user?.id) return null;

    return session;
  } catch {
    return null;
  }
}

export function readCachedAuthUser() {
  return readCachedAuthSession()?.user ?? null;
}
