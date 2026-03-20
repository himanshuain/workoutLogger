import { useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";

export default function GoogleLoginButton() {
  const { signInWithGoogle } = useWorkout();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        w-full h-12 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3 border disabled:opacity-50
        ${
          isDarkMode
            ? "bg-iron-900 text-iron-100 border-iron-700 active:bg-iron-800"
            : "bg-white text-slate-700 border-slate-300 active:bg-slate-50"
        }
      `}
    >
      {loading ? (
        <div
          className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
            isDarkMode ? "border-iron-400" : "border-slate-400"
          }`}
        />
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
