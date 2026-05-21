import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { supabase } from "@/lib/supabase";

function decodeOAuthErrorDescription(raw) {
  if (!raw || typeof raw !== "string") return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

/** Map Supabase / network errors to clearer copy (e.g. 429 on password reset). */
function friendlyAuthError(err) {
  const msg = err?.message || String(err);
  const status = err?.status;
  if (status === 429 || /rate limit|429|too many requests/i.test(msg)) {
    return "Too many emails were sent from this app. Wait a few minutes, then try “Forgot password” again. (Supabase limits reset emails per hour to prevent abuse.)";
  }
  return msg;
}

function isPrivateLanHostname(hostname) {
  if (!hostname || hostname === "localhost") return false;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m = hostname.match(/^172\.(\d{1,3})\./);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 16 && n <= 31;
  }
  return false;
}

export default function Auth() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { signIn, signUp, resetPassword, updatePassword, user } = useWorkout();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lanSupabaseHints, setLanSupabaseHints] = useState(null);
  /** True after email recovery link establishes session (PKCE) or hash type=recovery (implicit). */
  const [recoveryMode, setRecoveryMode] = useState(false);
  /** First auth event processed — avoids redirecting before PASSWORD_RECOVERY is handled. */
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development" && isPrivateLanHostname(window.location.hostname)) {
      const site = window.location.origin;
      setLanSupabaseHints({ site, auth: `${site}/auth` });
    }
  }, []);

  // Password recovery: Supabase redirects to /auth with PKCE ?code=... or hash type=recovery
  useEffect(() => {
    const fallback = setTimeout(() => setSessionReady(true), 2500);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      setSessionReady(true);
      clearTimeout(fallback);
    });
    if (typeof window !== "undefined") {
      const hash = window.location.hash?.substring(1) ?? "";
      const hp = new URLSearchParams(hash);
      if (hp.get("type") === "recovery") {
        setRecoveryMode(true);
      }
    }
    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  // OAuth / PKCE failures land on /auth?error=...&error_description=...
  useEffect(() => {
    if (!router.isReady || user) return;
    const qIdx = router.asPath.indexOf("?");
    if (qIdx === -1) return;
    const params = new URLSearchParams(router.asPath.slice(qIdx + 1));
    const errParam = params.get("error");
    if (!errParam) return;

    const desc = params.get("error_description");
    const friendly =
      desc && desc.length > 0
        ? decodeOAuthErrorDescription(desc)
        : errParam === "access_denied"
          ? "Google sign-in was cancelled."
          : errParam;

    setError(friendly);
    router.replace({ pathname: "/auth" }, undefined, { shallow: true });
  }, [router.isReady, user, router.asPath, router]);

  // Logged-in users go home, except during password recovery (must set new password first)
  useEffect(() => {
    if (!sessionReady || !router.isReady) return;
    if (!user || recoveryMode) return;
    const t = setTimeout(() => {
      router.replace("/");
    }, 400);
    return () => clearTimeout(t);
  }, [sessionReady, router.isReady, user, recoveryMode, router]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage("Password reset link sent! Check your email.");
      } else if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        router.push("/");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await updatePassword(newPassword);
      if (err) throw err;
      setMessage("Password updated. Redirecting…");
      setRecoveryMode(false);
      setNewPassword("");
      setConfirmNewPassword("");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      }
      router.replace("/");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isDarkMode ? "bg-iron-950" : "bg-slate-50"
        }`}
      >
        <div
          className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
            isDarkMode ? "border-lift-primary" : "border-workout-primary"
          }`}
        />
        <p className={`mt-4 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          Loading…
        </p>
      </div>
    );
  }

  if (recoveryMode) {
    if (!user) {
      return (
        <div
          className={`min-h-screen flex flex-col items-center justify-center p-6 ${
            isDarkMode ? "bg-iron-950" : "bg-slate-50"
          }`}
        >
          <div
            className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
              isDarkMode ? "border-lift-primary" : "border-workout-primary"
            }`}
          />
          <p className={`mt-4 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Confirming reset link…
          </p>
        </div>
      );
    }

    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isDarkMode ? "bg-iron-950" : "bg-slate-50"
        }`}
      >
        <div className="mb-8 text-center">
          <h1 className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            Set a new password
          </h1>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Choose a new password for your account.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`
                  w-full h-12 px-4 rounded-xl outline-none focus:ring-2 border
                  ${
                    isDarkMode
                      ? "bg-iron-900 text-iron-100 placeholder-iron-600 border-iron-800 focus:ring-lift-primary/50"
                      : "bg-white text-slate-800 placeholder-slate-400 border-slate-200 focus:ring-workout-primary/50"
                  }
                `}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`
                  w-full h-12 px-4 rounded-xl outline-none focus:ring-2 border
                  ${
                    isDarkMode
                      ? "bg-iron-900 text-iron-100 placeholder-iron-600 border-iron-800 focus:ring-lift-primary/50"
                      : "bg-white text-slate-800 placeholder-slate-400 border-slate-200 focus:ring-workout-primary/50"
                  }
                `}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm border ${
                  isDarkMode
                    ? "bg-lift-primary/10 border-lift-primary/20 text-lift-primary"
                    : "bg-workout-primary/10 border-workout-primary/20 text-workout-primary"
                }`}
              >
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full h-12 rounded-xl font-bold transition-colors disabled:opacity-50
                ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950 active:bg-lift-secondary"
                    : "bg-workout-primary text-white active:bg-workout-secondary"
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div
                    className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                      isDarkMode ? "border-iron-950" : "border-white"
                    }`}
                  />
                  Updating…
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        isDarkMode ? "bg-iron-950" : "bg-slate-50"
      }`}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div
          className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{
            background: isDarkMode
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
          }}
        >
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <h1 className={`text-3xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
          Logbook
        </h1>
        <p className={`mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          Simple workout logging
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`
                w-full h-12 px-4 rounded-xl outline-none focus:ring-2 border
                ${
                  isDarkMode
                    ? "bg-iron-900 text-iron-100 placeholder-iron-600 border-iron-800 focus:ring-lift-primary/50"
                    : "bg-white text-slate-800 placeholder-slate-400 border-slate-200 focus:ring-workout-primary/50"
                }
              `}
              placeholder="your@email.com"
              required
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`
                  w-full h-12 px-4 rounded-xl outline-none focus:ring-2 border
                  ${
                    isDarkMode
                      ? "bg-iron-900 text-iron-100 placeholder-iron-600 border-iron-800 focus:ring-lift-primary/50"
                      : "bg-white text-slate-800 placeholder-slate-400 border-slate-200 focus:ring-workout-primary/50"
                  }
                `}
                placeholder="••••••••"
                required
                minLength={6}
              />
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError("");
                    setMessage("");
                  }}
                  className={`mt-2 text-xs ${
                    isDarkMode ? "text-lift-primary" : "text-workout-primary"
                  }`}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-lg text-sm border ${
                isDarkMode
                  ? "bg-lift-primary/10 border-lift-primary/20 text-lift-primary"
                  : "bg-workout-primary/10 border-workout-primary/20 text-workout-primary"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`
              w-full h-12 rounded-xl font-bold transition-colors disabled:opacity-50
              ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950 active:bg-lift-secondary"
                  : "bg-workout-primary text-white active:bg-workout-secondary"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div
                  className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                    isDarkMode ? "border-iron-950" : "border-white"
                  }`}
                />
                {isForgotPassword
                  ? "Sending link..."
                  : isSignUp
                    ? "Creating account..."
                    : "Signing in..."}
              </span>
            ) : isForgotPassword ? (
              "Send Reset Link"
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className={`flex-1 h-px ${isDarkMode ? "bg-iron-800" : "bg-slate-200"}`} />
          <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>or</span>
          <div className={`flex-1 h-px ${isDarkMode ? "bg-iron-800" : "bg-slate-200"}`} />
        </div>

        {/* Google Login */}
        <GoogleLoginButton />

        {/* Toggle / Back */}
        <div className="mt-6 text-center">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError("");
                setMessage("");
              }}
              className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
            >
              Back to{" "}
              <span className={isDarkMode ? "text-lift-primary" : "text-workout-primary"}>
                Sign in
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setMessage("");
              }}
              className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className={isDarkMode ? "text-lift-primary" : "text-workout-primary"}>
                    Sign in
                  </span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <span className={isDarkMode ? "text-lift-primary" : "text-workout-primary"}>
                    Sign up
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
