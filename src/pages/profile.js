import Link from "next/link";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { User, Settings, LogOut, Utensils, Activity } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useWorkout();
  const { isDarkMode } = useTheme();

  return (
    <Layout>
      <div className="px-5 pt-10 pb-28 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
              isDarkMode ? "bg-iron-800" : "bg-slate-100"
            }`}
          >
            <User className={`w-8 h-8 ${isDarkMode ? "text-iron-300" : "text-slate-500"}`} />
          </div>
          <div>
            <h1 className={`text-xl font-semibold ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>
              Profile
            </h1>
            <p className={`text-sm mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {user?.email || "Signed in"}
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl ${
              isDarkMode ? "bg-iron-900/70 border border-iron-800 text-iron-100" : "bg-white border border-slate-200 text-slate-800 shadow-sm"
            }`}
          >
            <Settings className="w-5 h-5 opacity-70" />
            Settings & navigation
          </Link>
          <Link
            href="/food"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl ${
              isDarkMode ? "bg-iron-900/70 border border-iron-800 text-iron-100" : "bg-white border border-slate-200 text-slate-800 shadow-sm"
            }`}
          >
            <Utensils className="w-5 h-5 opacity-70" />
            Food log
          </Link>
          <Link
            href="/progress"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl ${
              isDarkMode ? "bg-iron-900/70 border border-iron-800 text-iron-100" : "bg-white border border-slate-200 text-slate-800 shadow-sm"
            }`}
          >
            <Activity className="w-5 h-5 opacity-70" />
            Progress
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => signOut()}
          className={`mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium border ${
            isDarkMode ? "border-iron-800 text-iron-400" : "border-slate-200 text-slate-600"
          }`}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </Layout>
  );
}
