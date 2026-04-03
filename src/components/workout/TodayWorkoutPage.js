import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import TodayWorkoutSection from "./TodayWorkoutSection";

/** Standalone route helper (home uses the same section inline). */
export default function TodayWorkoutPage() {
  const { user } = useWorkout();
  const { isDarkMode } = useTheme();

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-8">
          <p className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
            Sign in to start your workout.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4">
        <TodayWorkoutSection />
      </div>
    </Layout>
  );
}
