import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getSupabaseAuthStorageKey,
  readCachedAuthSession,
  readCachedAuthUser,
} from "@/lib/authSessionCache";

describe("authSessionCache", () => {
  const storage = new Map();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
      clear: () => storage.clear(),
      key: i => [...storage.keys()][i] ?? null,
      get length() {
        return storage.size;
      },
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("derives storage key from project URL", () => {
    expect(getSupabaseAuthStorageKey()).toBe("sb-abcdefgh-auth-token");
  });

  it("reads cached user from localStorage session", () => {
    storage.set(
      "sb-abcdefgh-auth-token",
      JSON.stringify({
        access_token: "token",
        user: { id: "user-1", email: "a@b.com" },
      }),
    );

    expect(readCachedAuthUser()).toEqual({ id: "user-1", email: "a@b.com" });
    expect(readCachedAuthSession()?.access_token).toBe("token");
  });

  it("returns null when session is missing or invalid", () => {
    expect(readCachedAuthUser()).toBeNull();
    storage.set("sb-abcdefgh-auth-token", JSON.stringify({ user: { id: "x" } }));
    expect(readCachedAuthUser()).toBeNull();
  });
});
