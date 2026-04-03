import { useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import { toast } from "sonner";

/** Full-page exercise preview (deep links). Prefer in-app drawer from /exercises when possible. */
export default function ExercisePreviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isDarkMode } = useTheme();
  const { user, exercises } = useWorkout();

  const exercise = useMemo(() => {
    if (!id || typeof id !== "string") return null;
    return exercises.find((e) => e.id === id) || null;
  }, [exercises, id]);

  useEffect(() => {
    if (router.isReady && user && id && !exercise) {
      toast.error("Exercise not found");
      router.replace("/exercises");
    }
  }, [router, user, id, exercise]);

  if (!router.isReady || !user || !exercise) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-iron-950" : "bg-slate-50"
        }`}
      >
        <div
          className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isDarkMode ? "border-lift-primary border-t-transparent" : "border-workout-primary border-t-transparent"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col px-5 pt-8 pb-12 ${
        isDarkMode ? "bg-iron-950" : "bg-slate-50"
      }`}
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className={`text-sm font-medium mb-6 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
      >
        ← Back
      </button>
      <ExercisePreviewPanel exercise={exercise} isDarkMode={isDarkMode} />
    </div>
  );
}
