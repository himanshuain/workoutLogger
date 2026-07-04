import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { readCachedAuthUser } from "@/lib/authSessionCache";

/** Auth session + sign-in/out helpers extracted from WorkoutContext. */
export function useWorkoutAuth(onSignOut) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const setUserStable = newUser => {
      setUser(prev => {
        const prevId = prev?.id ?? null;
        const newId = newUser?.id ?? null;
        if (prevId === newId) return prev;
        return newUser;
      });
    };

    const cached = readCachedAuthUser();
    if (cached) {
      setUserStable(cached);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserStable(session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserStable(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }, []);

  const resetPassword = useCallback(async email => {
    const redirectTo = typeof window !== "undefined" ? getAuthRedirectUrl() : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  }, []);

  const updatePassword = useCallback(async newPassword => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (typeof window === "undefined") {
      return { error: new Error("Google sign-in is only available in the browser.") };
    }
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) {
        console.error("Google login error:", error.message);
        return { error };
      }
      return { error: null, data };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("Google login error:", err);
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    onSignOut?.();
  }, [onSignOut]);

  return {
    user,
    authReady,
    setUser,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signOut,
  };
}
