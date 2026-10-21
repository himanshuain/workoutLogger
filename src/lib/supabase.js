import { createClient } from "@supabase/supabase-js";

/** Supabase demo anon JWT — only used when env vars are missing during `next build` (e.g. CI). */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return { url, key };

  const isProductionBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (isProductionBuild) {
    return { url: BUILD_PLACEHOLDER_URL, key: BUILD_PLACEHOLDER_ANON_KEY };
  }

  return { url: url ?? "", key: key ?? "" };
}

const { url: supabaseUrl, key: supabaseAnonKey } = resolveSupabaseConfig();

/**
 * PKCE + detectSessionInUrl: required for OAuth redirect back with ?code=...
 * (implicit flow is deprecated and breaks the modern Google → Supabase → app redirect).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
  },
});
