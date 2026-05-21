import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import DragReorderList from "@/components/DragReorderList";
import RoutineExerciseThumb from "@/components/planner/RoutineExerciseThumb";
import { exerciseMediaUrl } from "@/lib/exerciseMedia";
import { toast } from "sonner";
import {
  PLANNER_DAYS,
  persistRestMap,
  resolveRestMap,
  sortRoutinesForList,
  routineDayLabel,
} from "@/lib/routinePlanner";
import RoutinePlannerWeekStrip from "@/components/planner/RoutinePlannerWeekStrip";
import {
  Plus,
  Trash2,
  Save,
  Moon,
  ListChecks,
  RotateCcw,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  actionPrimary,
  actionSecondary,
  actionDestructive,
  actionDestructiveGhost,
  actionGhost,
} from "@/lib/actionButtonStyles";
import { surfaceInteractive } from "@/lib/surfaceStyles";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonLoader";

export default function RoutinePlannerPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    isLoading,
    exercises,
    routines,
    getRoutineForDay,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    settings,
    updateSettings,
  } = useWorkout();

  const [selectedDay, setSelectedDay] = useState(1);
  const [title, setTitle] = useState("");
  const [list, setList] = useState([]);
  const [restByDay, setRestByDay] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const routinesSorted = useMemo(() => sortRoutinesForList(routines), [routines]);
  const restDay = !!restByDay[selectedDay];

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.day;
    if (raw === undefined || raw === null || raw === "") return;
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    if (Number.isNaN(n)) return;
    if ([0, 1, 2, 3, 4, 5, 6].includes(n)) setSelectedDay(n);
  }, [router.isReady, router.query.day]);

  const routine = useMemo(() => getRoutineForDay(selectedDay), [getRoutineForDay, selectedDay, routines]);

  useEffect(() => {
    if (!user?.id) return;
    setRestByDay(resolveRestMap(user.id, settings?.routine_rest_days));
  }, [user?.id, settings?.routine_rest_days]);

  const handleRestMapCommit = useCallback(patch => {
    if (!user?.id) return;
    setRestByDay(prev => {
      const next = typeof patch === "function" ? patch(prev) : patch;
      void persistRestMap(user.id, next, updateSettings);
      return next;
    });
  }, [user?.id, updateSettings]);

  useEffect(() => {
    const r = getRoutineForDay(selectedDay);
    if (r) {
      setTitle(r.name || "");
      setList(
        (r.routine_exercises || []).map((ex, i) => ({
          key: ex.id || `re-${selectedDay}-${i}-${ex.exercise_name}`,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          category: ex.category || "other",
          target_sets: ex.target_sets || 3,
          notes: ex.notes != null ? String(ex.notes) : "",
        })),
      );
    } else {
      setTitle("");
      setList([]);
    }
  }, [selectedDay, getRoutineForDay, routines]);

  const setRestForDay = val => {
    if (!user?.id) return;
    const map = resolveRestMap(user.id, settings?.routine_rest_days);
    if (val) map[selectedDay] = true;
    else delete map[selectedDay];
    void persistRestMap(user.id, map, updateSettings);
    setRestByDay(map);
  };

  const thumb = (name) => {
    const ex = exercises.find((e) => e.name === name);
    return ex ? exerciseMediaUrl(ex) : null;
  };

  const handleSave = async () => {
    if (!user) return;
    if (restDay) {
      const empty = [];
      if (routine) {
        await updateRoutine(routine.id, {
          name: title.trim() || "Rest",
          day_of_week: selectedDay,
          color: routine.color || "#3b82f6",
          exercises: empty,
        });
      } else {
        await createRoutine({
          name: title.trim() || "Rest",
          day_of_week: selectedDay,
          color: "#3b82f6",
          exercises: empty,
        });
      }
      toast.success("Routine saved");
      return;
    }

    if (!title.trim()) {
      toast.error("Add a title for this day");
      return;
    }

    const exercisesPayload = list.map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
      notes:
        ex.notes != null && String(ex.notes).trim()
          ? String(ex.notes).trim().slice(0, 500)
          : null,
    }));

    if (routine) {
      await updateRoutine(routine.id, {
        name: title.trim(),
        day_of_week: selectedDay,
        color: routine.color || "#3b82f6",
        exercises: exercisesPayload,
      });
    } else {
      await createRoutine({
        name: title.trim(),
        day_of_week: selectedDay,
        color: "#3b82f6",
        exercises: exercisesPayload,
      });
    }
    toast.success("Routine saved");
  };

  const handleClear = () => {
    setList([]);
    setTitle("");
  };

  const handleConfirmDeleteRoutine = useCallback(async () => {
    if (!deleteTarget?.id) return;
    await deleteRoutine(deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Routine deleted");
  }, [deleteTarget, deleteRoutine]);

  if (!user) {
    return (
      <Layout>
        <div className="px-5 py-12 text-center text-iron-400">Sign in to plan routines.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-8 pb-28 max-w-lg mx-auto">
        <h1 className="text-screen-title">
          Workout Planner
        </h1>

        <RoutinePlannerWeekStrip
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          isDarkMode={isDarkMode}
          getRoutineForDay={getRoutineForDay}
          updateRoutine={updateRoutine}
          restMap={restByDay}
          onRestMapChange={handleRestMapCommit}
        />

        <div className="mt-6 space-y-2">
          <p className="text-section-header">
            {PLANNER_DAYS.find((d) => d.value === selectedDay)?.label}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine / focus title"
            className={`w-full text-xl font-semibold tracking-tight rounded-card border px-4 py-3 outline-none ${
              isDarkMode
                ? "border-surface-subtle bg-surface-interactive text-iron-50 placeholder:text-iron-600"
                : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm"
            }`}
          />
          <p className="text-body">
            You can perform these in any order while logging.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRestForDay(!restDay)}
          className={`mt-4 flex items-center gap-2 text-sm font-medium ${actionGhost(isDarkMode)} ${
            restDay ? (isDarkMode ? "!text-iron-200" : "!text-slate-700") : ""
          }`}
        >
          <Moon className="w-4 h-4" />
          {restDay ? "Rest day (on)" : "Mark as rest day"}
        </button>

        {!restDay && (
          <>
            <div className="mt-6">
              <DragReorderList
                items={list}
                onReorder={setList}
                keyExtractor={(item) => item.key}
                isDarkMode={isDarkMode}
                renderItem={(item) => (
                  <div className="card-secondary flex items-center gap-3">
                    <RoutineExerciseThumb
                      exerciseName={item.exercise_name}
                      thumbUrl={thumb(item.exercise_name)}
                      isDarkMode={isDarkMode}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={`font-medium truncate ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                        {item.exercise_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                        <span className={`text-xs capitalize shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                          {item.category}
                        </span>
                        <span className={`text-xs shrink-0 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`} aria-hidden>
                          ·
                        </span>
                        <input
                          type="text"
                          value={item.notes ?? ""}
                          maxLength={500}
                          onChange={(e) => {
                            const v = e.target.value;
                            setList((prev) =>
                              prev.map((x) => (x.key === item.key ? { ...x, notes: v } : x)),
                            );
                          }}
                          placeholder="Note (optional)"
                          className={`min-w-0 flex-1 basis-[6rem] text-xs bg-transparent border-0 p-0 outline-none ring-0 focus:ring-0 ${
                            isDarkMode
                              ? "text-iron-300 placeholder:text-iron-600"
                              : "text-slate-700 placeholder:text-slate-400"
                          }`}
                          aria-label={`Note for ${item.exercise_name}`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setList((prev) => prev.filter((x) => x.key !== item.key))}
                      className={`rounded-card p-2 ${actionDestructiveGhost(isDarkMode)}`}
                      aria-label={`Remove ${item.exercise_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/exercises?routineDay=${selectedDay}&returnTo=plan&day=${selectedDay}`
                )
              }
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-dashed py-3 font-semibold ${
                isDarkMode
                  ? "border-iron-700 bg-transparent text-iron-300 hover:bg-iron-800/50"
                  : "border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Plus className="w-5 h-5" />
              Add exercise
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`mt-2 inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-medium ${actionDestructiveGhost(isDarkMode)}`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
              Clear day
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleSave}
          className={`mt-8 flex w-full items-center justify-center gap-2 rounded-card py-4 font-semibold ${actionPrimary(isDarkMode)}`}
        >
          <Save className="w-5 h-5" />
          Save routine
        </button>

        <section
          className={`mt-10 pt-8 border-t ${isDarkMode ? "border-iron-800" : "border-slate-200"}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className={`w-4 h-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`} />
            <h2
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? "text-iron-400" : "text-slate-500"
              }`}
            >
              All routines
            </h2>
          </div>
          <p className={`text-sm mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-600"}`}>
            Every saved template. Delete removes it from the database (including exercises).
          </p>
          {isLoading && routinesSorted.length === 0 ? (
            <SkeletonList isDarkMode={isDarkMode} count={3} />
          ) : routinesSorted.length === 0 ? (
            <EmptyState
              isDarkMode={isDarkMode}
              message="No routines yet"
              hint="Name a day above, add exercises, then save."
            />
          ) : (
            <ul className="space-y-2">
              {routinesSorted.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-card px-3 py-3 ${surfaceInteractive(isDarkMode)}`}
                >
                  <div
                    className="w-9 h-9 rounded-card shrink-0"
                    style={{ backgroundColor: `${r.color || "#3b82f6"}25` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                      {r.name || "Untitled"}
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {routineDayLabel(r.day_of_week)} · {r.routine_exercises?.length || 0} exercises
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: r.id, name: r.name || "Untitled" })}
                    className={`shrink-0 rounded-card p-2.5 ${actionDestructiveGhost(isDarkMode)}`}
                    aria-label={`Delete routine ${r.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-50" : ""}>Delete routine?</AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed permanently. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={`inline-flex items-center justify-center gap-2 ${actionSecondary(isDarkMode)}`}
            >
              <X className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteRoutine();
              }}
              className={`inline-flex items-center justify-center gap-2 border-0 ${actionDestructive(isDarkMode)}`}
            >
              <Trash2 className="w-4 h-4 shrink-0" aria-hidden />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
