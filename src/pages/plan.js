import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import DragReorderList from "@/components/DragReorderList";
import RoutineExerciseThumb from "@/components/planner/RoutineExerciseThumb";
import ExerciseAreaGroupHeader from "@/components/workout/ExerciseAreaGroupHeader";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import { groupExercisesByArea, mergeAreaReorder } from "@/lib/exerciseAreaGroups";
import { toast } from "sonner";
import {
  PLANNER_DAYS,
  persistRestMap,
  resolveRestMap,
} from "@/lib/routinePlanner";
import RoutinePlannerWeekStrip from "@/components/planner/RoutinePlannerWeekStrip";
import ExerciseLibraryPanel from "@/components/planner/ExerciseLibraryPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Plus,
  Trash2,
  Moon,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  actionDestructiveGhost,
  actionGhost,
} from "@/lib/actionButtonStyles";
import { SkeletonRoutineExercises } from "@/components/SkeletonLoader";

const AUTOSAVE_MS = 700;

function listToPayload(list) {
  return list.map(ex => ({
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    notes:
      ex.notes != null && String(ex.notes).trim()
        ? String(ex.notes).trim().slice(0, 500)
        : null,
  }));
}

function routineToList(r, selectedDay) {
  return (r?.routine_exercises || []).map((ex, i) => ({
    key: ex.id || `re-${selectedDay}-${i}-${ex.exercise_name}`,
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    notes: ex.notes != null ? String(ex.notes) : "",
  }));
}

function draftSnapshot({ title, list, restDay }) {
  const effectiveList = restDay
    ? []
    : list.map(({ exercise_id, exercise_name, category, target_sets, notes }) => ({
        exercise_id,
        exercise_name,
        category: category || "other",
        target_sets: target_sets || 3,
        notes: notes != null ? String(notes).trim() : "",
      }));
  return JSON.stringify({
    title: (restDay ? title.trim() || "Rest" : title.trim()),
    restDay,
    list: effectiveList,
  });
}

function serverSnapshot({ routine, restDay, selectedDay }) {
  if (restDay) {
    return JSON.stringify({
      title: (routine?.name || "Rest").trim(),
      restDay: true,
      list: [],
    });
  }
  return JSON.stringify({
    title: (routine?.name || "").trim(),
    restDay: false,
    list: listToPayload(routineToList(routine, selectedDay)).map(ex => ({
      ...ex,
      notes: ex.notes ?? "",
    })),
  });
}

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
    settings,
    updateSettings,
  } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();

  const [selectedDay, setSelectedDay] = useState(1);
  const [title, setTitle] = useState("");
  const [list, setList] = useState([]);
  const [listReady, setListReady] = useState(false);
  const [restByDay, setRestByDay] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle");
  const savingRef = useRef(false);
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
    setListReady(false);
  }, [selectedDay]);

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
    setListReady(true);
  }, [selectedDay, getRoutineForDay, routines]);

  const areaGroups = useMemo(
    () => groupExercisesByArea(list, ex => ex.category),
    [list],
  );
  const routineExercisesLoading = isLoading || !listReady;

  const draftKey = useMemo(
    () => draftSnapshot({ title, list, restDay }),
    [title, list, restDay],
  );
  const serverKey = useMemo(
    () => serverSnapshot({ routine, restDay, selectedDay }),
    [routine, restDay, selectedDay],
  );
  const isDirty = listReady && draftKey !== serverKey;

  const defaultTitle = useMemo(
    () => `${PLANNER_DAYS.find(d => d.value === selectedDay)?.label ?? "Day"} workout`,
    [selectedDay],
  );

  const persistRoutine = useCallback(async () => {
    if (!user || savingRef.current) return;

    if (restDay) {
      savingRef.current = true;
      setSaveStatus("saving");
      try {
        const payload = {
          name: title.trim() || "Rest",
          day_of_week: selectedDay,
          color: routine?.color || "#3b82f6",
          exercises: [],
        };
        if (routine) await updateRoutine(routine.id, payload);
        else await createRoutine(payload);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
        toast.error("Could not save routine");
      } finally {
        savingRef.current = false;
      }
      return;
    }

    const hasContent = title.trim() || list.length > 0;
    if (!hasContent && !routine) return;

    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const payload = {
        name: title.trim() || defaultTitle,
        day_of_week: selectedDay,
        color: routine?.color || "#3b82f6",
        exercises: listToPayload(list),
      };
      if (routine) await updateRoutine(routine.id, payload);
      else await createRoutine(payload);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      toast.error("Could not save routine");
    } finally {
      savingRef.current = false;
    }
  }, [
    user,
    restDay,
    title,
    list,
    routine,
    selectedDay,
    defaultTitle,
    createRoutine,
    updateRoutine,
  ]);

  const persistRef = useRef(persistRoutine);
  persistRef.current = persistRoutine;

  useEffect(() => {
    if (!user || !listReady || !isDirty) {
      if (listReady && !isDirty) setSaveStatus("saved");
      return;
    }
    setSaveStatus("pending");
    const t = setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [user, listReady, isDirty, draftKey]);

  const handleDaySelect = useCallback(
    async day => {
      if (day === selectedDay) return;
      if (isDirty) await persistRef.current();
      setSelectedDay(day);
    },
    [selectedDay, isDirty],
  );

  const setRestForDay = val => {
    if (!user?.id) return;
    const map = resolveRestMap(user.id, settings?.routine_rest_days);
    if (val) map[selectedDay] = true;
    else delete map[selectedDay];
    void persistRestMap(user.id, map, updateSettings);
    setRestByDay(map);
  };

  const thumb = name => resolveExerciseMediaUrl(exercises, name, mediaOverrides);

  const handleClear = () => {
    setList([]);
    setTitle("");
  };

  const renderRoutineExerciseItem = item => (
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
  );

  if (!user) {
    return (
      <Layout>
        <div className="px-5 py-12 text-center text-iron-400">Sign in to plan routines.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer className="pt-8 pb-28">
        <h1 className="text-screen-title">
          Workout Planner
        </h1>

        <RoutinePlannerWeekStrip
          selectedDay={selectedDay}
          onDaySelect={handleDaySelect}
          isDarkMode={isDarkMode}
          getRoutineForDay={getRoutineForDay}
          updateRoutine={updateRoutine}
          restMap={restByDay}
          onRestMapChange={handleRestMapCommit}
          onAddDay={day =>
            router.push(`/exercises?routineDay=${day}&returnTo=plan&day=${day}`)
          }
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
        </div>

        {list.length === 0 ? (
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
        ) : null}

        {!restDay && (
          <>
            <div className="mt-6">
              {routineExercisesLoading ? (
                <SkeletonRoutineExercises isDarkMode={isDarkMode} count={4} />
              ) : areaGroups.length === 0 ? null : (
                <div className="space-y-5">
                  {areaGroups.map(group => (
                    <div key={group.area}>
                      {areaGroups.length > 1 ? (
                        <ExerciseAreaGroupHeader
                          label={group.label}
                          count={group.exercises.length}
                          isDarkMode={isDarkMode}
                        />
                      ) : null}
                      <DragReorderList
                        items={group.exercises}
                        onReorder={next =>
                          setList(prev =>
                            mergeAreaReorder(prev, group.area, next, ex => ex.category),
                          )
                        }
                        keyExtractor={item => item.key}
                        isDarkMode={isDarkMode}
                        renderItem={renderRoutineExerciseItem}
                      />
                    </div>
                  ))}
                </div>
              )}
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

            {list.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-medium ${actionDestructiveGhost(isDarkMode)}`}
              >
                <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
                Clear day
              </button>
            ) : null}
          </>
        )}

        {listReady && user && (saveStatus === "saving" || saveStatus === "pending" || saveStatus === "error" || isDirty) ? (
          <p
            className={`mt-6 flex items-center justify-center gap-1.5 text-xs font-medium ${
              saveStatus === "error"
                ? isDarkMode
                  ? "text-red-400"
                  : "text-red-600"
                : isDarkMode
                  ? "text-iron-500"
                  : "text-slate-500"
            }`}
            aria-live="polite"
          >
            {saveStatus === "saving" || saveStatus === "pending" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : saveStatus === "error" ? (
              "Could not save — check connection"
            ) : (
              "Unsaved changes"
            )}
          </p>
        ) : null}

        <ExerciseLibraryPanel
          exercises={exercises}
          isDarkMode={isDarkMode}
          mediaOverrides={mediaOverrides}
        />
      </PageContainer>
    </Layout>
  );
}
