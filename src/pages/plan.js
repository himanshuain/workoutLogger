import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import DragReorderList from "@/components/DragReorderList";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Moon,
  ListChecks,
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

const PLANNER_DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const REST_KEY = (userId) => `wl_routine_rest_${userId}`;

function loadRestMap(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(REST_KEY(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRestMap(userId, map) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(REST_KEY(userId), JSON.stringify(map));
}

/** Mon–Sun order (0 = Sunday last in week), then templates with no day last. */
function sortRoutinesForList(routines) {
  const rank = (d) => {
    if (d === null || d === undefined) return 999;
    if (d === 0) return 7;
    return d;
  };
  return [...routines].sort((a, b) => {
    const ra = rank(a.day_of_week);
    const rb = rank(b.day_of_week);
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "");
  });
}

function routineDayLabel(dayOfWeek) {
  if (dayOfWeek === null || dayOfWeek === undefined) return "Any day";
  return PLANNER_DAYS.find((d) => d.value === dayOfWeek)?.label ?? "Day";
}

export default function RoutinePlannerPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    exercises,
    routines,
    getRoutineForDay,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  } = useWorkout();

  const [selectedDay, setSelectedDay] = useState(1);
  const [title, setTitle] = useState("");
  const [list, setList] = useState([]);
  const [restDay, setRestDay] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const routinesSorted = useMemo(() => sortRoutinesForList(routines), [routines]);

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
    if (!user) return;
    const map = loadRestMap(user.id);
    setRestDay(!!map[selectedDay]);
  }, [user, selectedDay]);

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
        })),
      );
    } else {
      setTitle("");
      setList([]);
    }
  }, [selectedDay, getRoutineForDay, routines]);

  const setRestForDay = (val) => {
    setRestDay(val);
    if (!user) return;
    const map = loadRestMap(user.id);
    if (val) map[selectedDay] = true;
    else delete map[selectedDay];
    saveRestMap(user.id, map);
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

        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {PLANNER_DAYS.map((d) => {
            const active = selectedDay === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDay(d.value)}
                className={`shrink-0 min-w-[2.75rem] py-2 rounded-xl text-xs font-semibold ${
                  active
                    ? isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white"
                    : isDarkMode
                      ? "bg-iron-800 text-iron-400"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-section-header">
            {PLANNER_DAYS.find((d) => d.value === selectedDay)?.label}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine / focus title"
            className={`w-full text-xl font-semibold tracking-tight rounded-2xl px-4 py-3 outline-none ${
              isDarkMode
                ? "bg-iron-900/80 border border-iron-800 text-iron-50 placeholder:text-iron-600"
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
          className={`mt-4 flex items-center gap-2 text-sm font-medium ${
            restDay ? (isDarkMode ? "text-lift-primary" : "text-workout-primary") : isDarkMode ? "text-iron-500" : "text-slate-500"
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
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-iron-800">
                      {thumb(item.exercise_name) ? (
                        <Image
                          src={thumb(item.exercise_name)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={exerciseImageUnoptimized(thumb(item.exercise_name))}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                        {item.exercise_name}
                      </p>
                      <p className={`text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                        {item.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setList((prev) => prev.filter((x) => x.key !== item.key))}
                      className={`p-2 rounded-xl ${isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-400 hover:bg-slate-100"}`}
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push(`/exercises?routineDay=${selectedDay}`)}
              className={`mt-4 w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"
              }`}
            >
              <Plus className="w-5 h-5" />
              Add exercise
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`mt-2 w-full py-3 text-sm font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Clear day
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleSave}
          className={`mt-8 w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
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
          {routinesSorted.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? "text-iron-600" : "text-slate-500"}`}>No routines yet.</p>
          ) : (
            <ul className="space-y-2">
              {routinesSorted.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                    isDarkMode ? "bg-iron-900/70 border border-iron-800" : "bg-slate-50 border border-slate-200"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl shrink-0"
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
                    className={`shrink-0 p-2.5 rounded-xl ${
                      isDarkMode
                        ? "text-red-400 hover:bg-red-950/50"
                        : "text-red-600 hover:bg-red-50"
                    }`}
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
              className={isDarkMode ? "border-iron-700 bg-iron-800 text-iron-200" : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteRoutine();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
