import { useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { getSessionExtras, getExerciseDoneMap } from "@/lib/workoutSessionClient";
import {
  Plus,
  CheckCircle2,
  Circle,
  Play,
  Calendar,
  Dumbbell,
  ChevronRight,
  Edit3,
  ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";

function mergePlannedExercises(todayRoutine, extras) {
  const map = new Map();
  for (const ex of todayRoutine?.routine_exercises || []) {
    map.set(ex.exercise_name, {
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      equipment: "",
      added_today: false,
    });
  }
  for (const ex of extras) {
    if (!map.has(ex.exercise_name)) {
      map.set(ex.exercise_name, { ...ex, added_today: true });
    }
  }
  return [...map.values()];
}

function exerciseStatus(name, doneMap, setLogs) {
  if (doneMap[name]) return "completed";
  const completed = (setLogs || []).filter(l => l.exercise_name === name && l.is_completed);
  if (completed.length > 0) return "in_progress";
  return "not_started";
}

function statusLabel(s) {
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "In Progress";
  return "Not Started";
}

/**
 * New workout board + start/finish flow (embedded on the home Today page).
 * @param {{ completedTodaySession?: object | null, onChooseRoutine?: () => void }} props
 */
export default function TodayWorkoutSection({ completedTodaySession = null, onChooseRoutine }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    activeSession,
    getTodayRoutine,
    startWorkoutSession,
    exercises,
    loadActiveSession,
  } = useWorkout();

  const [starting, setStarting] = useState(false);
  const [extrasVersion, setExtrasVersion] = useState(0);

  const bumpExtras = useCallback(() => setExtrasVersion(v => v + 1), []);

  useEffect(() => {
    if (user) loadActiveSession?.();
  }, [user, loadActiveSession]);

  useEffect(() => {
    bumpExtras();
  }, [router.asPath, bumpExtras]);

  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine, routines]);

  /** When user starts a session from "Choose routine" on a day with no template, exercises come from the session's routine_id. */
  const templateRoutine = useMemo(() => {
    if (activeSession?.routine_id) {
      const r = routines.find(x => x.id === activeSession.routine_id);
      if (r) return r;
    }
    return getTodayRoutine();
  }, [activeSession?.routine_id, routines, getTodayRoutine]);

  const extras = useMemo(() => {
    if (!activeSession?.id) return [];
    return getSessionExtras(activeSession.id);
  }, [activeSession?.id, extrasVersion]);

  const doneMap = useMemo(() => {
    if (!activeSession?.id) return {};
    return getExerciseDoneMap(activeSession.id);
  }, [activeSession?.id, extrasVersion]);

  const plannedExercises = useMemo(
    () => mergePlannedExercises(templateRoutine, extras),
    [templateRoutine, extras]
  );

  const setLogs = activeSession?.set_logs || [];

  const stats = useMemo(() => {
    let completed = 0;
    let added = 0;
    for (const ex of plannedExercises) {
      const st = exerciseStatus(ex.exercise_name, doneMap, setLogs);
      if (st === "completed") completed += 1;
      if (ex.added_today) added += 1;
    }
    return {
      planned: plannedExercises.length,
      completed,
      addedToday: added,
    };
  }, [plannedExercises, doneMap, setLogs]);

  useEffect(() => {
    const onFocus = () => bumpExtras();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [bumpExtras]);

  const handleStartOrResume = async () => {
    if (!todayRoutine) return;
    setStarting(true);
    try {
      await startWorkoutSession(todayRoutine);
      await loadActiveSession();
    } finally {
      setStarting(false);
    }
  };

  const openExercise = (name, category) => {
    if (!activeSession?.id) return;
    const q = new URLSearchParams({ category: category || "other" });
    router.push(
      `/workout/${activeSession.id}/exercise/${encodeURIComponent(name)}?${q.toString()}`
    );
  };

  const handleFinish = () => {
    if (!activeSession?.id) return;
    router.push(`/workout/${activeSession.id}/summary`);
  };

  const resolveExerciseMedia = exerciseName => {
    const cat =
      exercises.find(e => e.name === exerciseName) ||
      exercises.find(e => e.name?.toLowerCase() === exerciseName?.toLowerCase());
    return cat ? exerciseMediaUrl(cat) : null;
  };

  if (!user) return null;

  const hasSession = activeSession && activeSession.status === "active";
  const routineTitle =
    templateRoutine?.name || activeSession?.routine_name || todayRoutine?.name || "Workout";

  const getDayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });

  if (completedTodaySession && !hasSession) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-secondary overflow-hidden">
          <div
            className={`px-4 py-2.5 border-b ${
              isDarkMode ? "border-iron-800" : "border-slate-100"
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-lift-primary" : "text-green-600"
              }`}
            >
              Completed today
            </span>
          </div>
          <div className="p-4">
            <h3
              className={`text-lg font-bold mb-1 ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
            >
              {completedTodaySession.routine_name}
            </h3>
            <p className={`text-sm mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {(completedTodaySession.set_logs || []).filter(s => s.is_completed).length} sets
              logged
            </p>
            <button
              type="button"
              onClick={() => router.push("/history")}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border ${
                isDarkMode
                  ? "border-iron-700 text-iron-200 active:bg-iron-800"
                  : "border-slate-200 text-slate-700 active:bg-slate-50"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Review session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && !todayRoutine && routines.length > 0) {
    const todayDow = new Date().getDay();
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-hero">
          <div
            className={`flex items-center gap-2 text-sm mb-2 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            No workout assigned for {getDayName()}
          </div>
          <h3
            className={`text-xl font-bold mb-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            Start a workout?
          </h3>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onChooseRoutine?.()}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              Choose routine
            </button>
            <button
              type="button"
              onClick={() => router.push(`/plan?day=${todayDow}`)}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border ${
                isDarkMode
                  ? "border-iron-700 text-iron-200 hover:bg-iron-800/80"
                  : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              Plan this day
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && !todayRoutine && routines.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => router.push("/plan")}
          className={`
                w-full p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3
                ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700"
                    : "border-slate-300 hover:border-slate-400"
                }
              `}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: isDarkMode
                ? "linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%)"
                : "linear-gradient(135deg, #4F8CFF20 0%, #6366f120 100%)",
            }}
          >
            <Plus
              className={`w-8 h-8 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
            />
          </div>
          <div className="text-center">
            <p className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              Create your first routine
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Plan your workouts for each day
            </p>
          </div>
          <span
            className={`text-sm flex items-center gap-1 ${
              isDarkMode ? "text-lift-primary" : "text-workout-primary"
            }`}
          >
            Get started <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-section-header"
      >
        Today&apos;s Workout
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-2 text-screen-title"
      >
        {routineTitle}
      </motion.h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: "Planned", value: stats.planned },
          { label: "Done", value: stats.completed },
          { label: "Added today", value: stats.addedToday },
        ].map(chip => (
          <div
            key={chip.label}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              isDarkMode
                ? "bg-iron-800/80 text-iron-200 border border-iron-700/80"
                : "bg-white text-slate-700 border border-slate-200 shadow-sm"
            }`}
          >
            {chip.label}: {chip.value}
          </div>
        ))}
      </div>

      {!hasSession ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={handleStartOrResume}
            disabled={starting}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            {starting ? (
              <span className="animate-pulse">Starting…</span>
            ) : (
              <>
                <Play className="w-4 h-4" fill="currentColor" />
                Start / Resume Workout
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {plannedExercises.map(ex => {
              const st = exerciseStatus(ex.exercise_name, doneMap, setLogs);
              const media = resolveExerciseMedia(ex.exercise_name);
              return (
                <button
                  key={ex.exercise_name}
                  type="button"
                  onClick={() => openExercise(ex.exercise_name, ex.category)}
                  className={`w-full text-left rounded-2xl p-4 flex gap-4 transition-colors active:scale-[0.99] ${
                    isDarkMode
                      ? "bg-iron-900/50 border border-iron-800 hover:border-iron-700"
                      : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    {media ? (
                      <Image
                        src={media}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={exerciseImageUnoptimized(media)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ExerciseIcon
                          name={ex.exercise_name}
                          className="w-8 h-8"
                          color={isDarkMode ? "#71717a" : "#94a3b8"}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold leading-snug ${
                        isDarkMode ? "text-iron-100" : "text-slate-900"
                      }`}
                    >
                      {ex.exercise_name}
                    </p>
                    <p
                      className={`text-xs mt-0.5 capitalize ${
                        isDarkMode ? "text-iron-500" : "text-slate-500"
                      }`}
                    >
                      {ex.category && ex.category !== "other" ? ex.category : "General"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          st === "completed"
                            ? isDarkMode
                              ? "text-emerald-400"
                              : "text-emerald-600"
                            : st === "in_progress"
                              ? isDarkMode
                                ? "text-lift-primary"
                                : "text-workout-primary"
                              : isDarkMode
                                ? "text-iron-500"
                                : "text-slate-500"
                        }`}
                      >
                        {st === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                        {statusLabel(st)}
                      </span>
                      {ex.added_today && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isDarkMode
                              ? "bg-violet-500/15 text-violet-300"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          Added today
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/exercises?return=today&sessionId=${encodeURIComponent(activeSession.id)}`
              )
            }
            className={`mt-4 w-full py-3.5 rounded-xl font-semibold border flex items-center justify-center gap-2 ${
              isDarkMode
                ? "border-iron-700 text-iron-100 border-dashed"
                : "border-slate-300 text-slate-800 border-dashed"
            }`}
          >
            <Plus className="w-5 h-5" />
            Add exercise for today
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className={`mt-3 w-full py-3.5 rounded-xl font-bold text-sm ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            Finish workout
          </button>
        </>
      )}
    </div>
  );
}
