import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User,
  Zap,
  Sun,
  Moon,
} from "lucide-react";

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    user,
    signOut,
    updateSettings,
  } = useWorkout();

  const handleToggleTheme = () => {
    toggleTheme();
    // Also update in database
    updateSettings({ dark_mode: !isDarkMode });
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to access settings
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 pb-24">
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            Settings
          </h2>
        </div>

        <div className="space-y-6 mt-4">
          {/* Theme Toggle */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              Appearance
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    {isDarkMode ? (
                      <Moon
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    ) : (
                      <Sun
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {isDarkMode ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {isDarkMode ? "Easy on the eyes" : "Bright and clean"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleTheme}
                  className={`
                    relative w-14 h-8 rounded-full transition-colors duration-300
                    ${isDarkMode ? "bg-lift-primary" : "bg-workout-primary"}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300
                      ${isDarkMode ? "left-7" : "left-1"}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Account */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Account
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                    {user.email}
                  </p>
                  <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Logged in
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                  }`}
                >
                  <span
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-lift-primary" : "text-workout-primary"
                    }`}
                  >
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/auth");
                }}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400 active:bg-iron-700"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }`}
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* About */}
          <section className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
              }}
            >
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className={`font-bold text-lg ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              Logbook
            </h3>
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Version 3.0.0
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
              Simple workout & habit tracking
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
