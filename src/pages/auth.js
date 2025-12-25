import { useState } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";

export default function Auth() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { signIn, signUp, user } = useWorkout();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Redirect if already logged in
  if (user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        router.push("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <h1
          className={`text-3xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
        >
          Logbook
        </h1>
        <p
          className={`mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
        >
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
              onChange={(e) => setEmail(e.target.value)}
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

          <div>
            <label
              className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                {isSignUp ? "Creating account..." : "Signing in..."}
              </span>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
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
                <span
                  className={
                    isDarkMode ? "text-lift-primary" : "text-workout-primary"
                  }
                >
                  Sign in
                </span>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <span
                  className={
                    isDarkMode ? "text-lift-primary" : "text-workout-primary"
                  }
                >
                  Sign up
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
