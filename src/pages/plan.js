import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import RoutineExerciseThumb from "@/components/planner/RoutineExerciseThumb";
import ExerciseAreaGroupHeader from "@/components/workout/ExerciseAreaGroupHeader";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import { toast } from "sonner";
import PlannerSplitTabs from "@/components/planner/PlannerSplitTabs";
import ExerciseLibraryPanel from "@/components/planner/ExerciseLibraryPanel";
import ExercisePreviewButton from "@/components/planner/ExercisePreviewButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { getRoutineById, NEW_SPLIT_ID, sortRoutinesByName } from "@/lib/routineSplits";
import {
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  FileText,
} from "lucide-react";
import {
  actionDestructiveGhost,
  actionDestructive,
  actionSecondary,
  actionSecondaryCompact,
  actionPrimary,
} from "@/lib/actionButtonStyles";
import { cn } from "@/lib/utils";
import { SkeletonRoutineExercises } from "@/components/SkeletonLoader";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  buildSplitsExportPayload,
  downloadSplitsPdf,
  splitsExportFilename,
} from "@/lib/splitExport";

const AUTOSAVE_MS = 1200;
const PLANNER_VIEW_SPLITS = "splits";
const PLANNER_VIEW_LIBRARY = "library";

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

function routineToList(r, routineId) {
  return (r?.routine_exercises || []).map((ex, i) => ({
    key: ex.id || `re-${routineId}-${i}-${ex.exercise_name}`,
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    notes: ex.notes != null ? String(ex.notes) : "",
  }));
}

function draftSnapshot({ title, list }) {
  return JSON.stringify({
    title: title.trim(),
    list: list.map(({ exercise_id, exercise_name, category, target_sets, notes }) => ({
      exercise_id,
      exercise_name,
      category: category || "other",
      target_sets: target_sets || 3,
      notes: notes != null ? String(notes).trim() : "",
    })),
  });
}

const RoutineExerciseRow = memo(function RoutineExerciseRow({
  item,
  thumbUrl,
  isDarkMode,
  exercises,
  onNotesChange,
  onRemove,
}) {
  return (
    <div className="card-secondary flex items-center gap-3">
      <RoutineExerciseThumb
        exerciseName={item.exercise_name}
        thumbUrl={thumbUrl}
        isDarkMode={isDarkMode}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`font-medium leading-snug line-clamp-2 break-words ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
          {item.exercise_name}
        </p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
          <input
            type="text"
            value={item.notes ?? ""}
            maxLength={500}
            onChange={(e) => onNotesChange(item.key, e.target.value)}
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
      <ExercisePreviewButton
        exerciseName={item.exercise_name}
        exerciseId={item.exercise_id}
        exercises={exercises}
        isDarkMode={isDarkMode}
        variant="inline"
      />
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        className={`rounded-card p-2 ${actionDestructiveGhost(isDarkMode)}`}
        aria-label={`Remove ${item.exercise_name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

function serverSnapshot(routine) {
  if (!routine) {
    return JSON.stringify({ title: "", list: [] });
  }
  return JSON.stringify({
    title: (routine.name || "").trim(),
    list: listToPayload(routineToList(routine, routine.id)).map(ex => ({
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
    createRoutine,
    updateRoutine,
    deleteRoutine,
    activeSession,
  } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();

  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [title, setTitle] = useState("");
  const [list, setList] = useState([]);
  const [listReady, setListReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [plannerView, setPlannerView] = useState(PLANNER_VIEW_SPLITS);
  const [exportingSplits, setExportingSplits] = useState(false);
  const savingRef = useRef(false);

  const routine = useMemo(
    () => getRoutineById(routines, selectedRoutineId),
    [routines, selectedRoutineId],
  );
  const isNewSplit = selectedRoutineId === NEW_SPLIT_ID;

  const hydrateForm = useCallback((routineId) => {
    const r = getRoutineById(routines, routineId);
    if (r) {
      setTitle(r.name || "");
      setList(routineToList(r, r.id));
    } else {
      setTitle("");
      setList([]);
    }
    setListReady(true);
  }, [routines]);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.routine;
    if (raw === undefined || raw === null || raw === "") return;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (id === "new") setSelectedRoutineId(NEW_SPLIT_ID);
    else if (typeof id === "string" && id.length > 0) setSelectedRoutineId(id);
  }, [router.isReady, router.query.routine]);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.view;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v === PLANNER_VIEW_LIBRARY) setPlannerView(PLANNER_VIEW_LIBRARY);
    else setPlannerView(PLANNER_VIEW_SPLITS);
  }, [router.isReady, router.query.view]);

  const setPlannerViewWithUrl = useCallback(
    view => {
      setPlannerView(view);
      const query = { ...router.query };
      if (view === PLANNER_VIEW_LIBRARY) query.view = PLANNER_VIEW_LIBRARY;
      else delete query.view;
      void router.replace({ pathname: "/plan", query }, undefined, { shallow: true });
    },
    [router],
  );

  const libraryPreviewId = useMemo(() => {
    const raw = router.query.preview;
    const id = Array.isArray(raw) ? raw[0] : raw;
    return typeof id === "string" && id.length > 0 ? id : null;
  }, [router.query.preview]);

  const handleLibraryPreviewChange = useCallback(
    id => {
      const query = { ...router.query, view: PLANNER_VIEW_LIBRARY };
      if (id) query.preview = id;
      else delete query.preview;
      void router.replace({ pathname: "/plan", query }, undefined, { shallow: true });
    },
    [router],
  );

  useEffect(() => {
    if (!user || selectedRoutineId != null) return;
    const sorted = sortRoutinesByName(routines);
    if (sorted.length > 0) setSelectedRoutineId(sorted[0].id);
    else setSelectedRoutineId(NEW_SPLIT_ID);
  }, [user, routines, selectedRoutineId]);

  useEffect(() => {
    if (!user || selectedRoutineId == null) return;
    setListReady(false);
    hydrateForm(isNewSplit ? null : selectedRoutineId);
  }, [selectedRoutineId, user, hydrateForm, isNewSplit]);

  const initialHydratedRef = useRef(false);
  useEffect(() => {
    if (!user || initialHydratedRef.current) return;
    if (routines.length === 0 && selectedRoutineId !== NEW_SPLIT_ID) return;
    if (selectedRoutineId == null) return;
    initialHydratedRef.current = true;
    hydrateForm(isNewSplit ? null : selectedRoutineId);
  }, [user, routines.length, selectedRoutineId, hydrateForm, isNewSplit]);

  const areaGroups = useMemo(
    () => groupExercisesByArea(list, ex => ex.category),
    [list],
  );
  const routineExercisesLoading = isLoading || !listReady;

  const draftKey = useMemo(() => draftSnapshot({ title, list }), [title, list]);
  const serverKey = useMemo(() => serverSnapshot(routine), [routine]);
  const isDirty = listReady && draftKey !== serverKey;

  useEffect(() => {
    if (!user || !listReady || isDirty) return;
    hydrateForm(isNewSplit ? null : selectedRoutineId);
  }, [routines, user, listReady, isDirty, selectedRoutineId, hydrateForm, isNewSplit]);

  const persistRoutine = useCallback(async () => {
    if (!user || savingRef.current || selectedRoutineId == null) return;

    const hasContent = title.trim() || list.length > 0;
    if (!hasContent && isNewSplit) return;

    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const payload = {
        name: title.trim() || "Untitled split",
        day_of_week: null,
        color: routine?.color || "#3b82f6",
        exercises: listToPayload(list),
      };

      if (isNewSplit) {
        const created = await createRoutine(payload);
        if (created?.id) {
          setSelectedRoutineId(created.id);
          void router.replace(`/plan?routine=${created.id}`, undefined, { shallow: true });
        }
      } else if (routine) {
        await updateRoutine(routine.id, payload);
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      toast.error("Could not save split");
    } finally {
      savingRef.current = false;
    }
  }, [user, title, list, routine, isNewSplit, selectedRoutineId, createRoutine, updateRoutine, router]);

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

  const selectSplit = useCallback(
    async routineId => {
      if (routineId === selectedRoutineId) return;
      if (isDirty) await persistRef.current();
      setSelectedRoutineId(routineId);
      const q =
        routineId === NEW_SPLIT_ID
          ? "new"
          : encodeURIComponent(routineId);
      void router.replace(`/plan?routine=${q}`, undefined, { shallow: true });
    },
    [selectedRoutineId, isDirty, router],
  );

  const thumb = name => resolveExerciseMediaUrl(exercises, name, mediaOverrides);

  const handleClear = () => {
    setList([]);
    setTitle("");
  };

  const handleNotesChange = useCallback((key, notes) => {
    setList((prev) => prev.map((x) => (x.key === key ? { ...x, notes } : x)));
  }, []);

  const handleRemoveExercise = useCallback((key) => {
    setList((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const confirmDeleteSplit = useCallback(async () => {
    if (!routine?.id || deleting) return;
    setDeleting(true);
    try {
      if (
        activeSession?.status === "active" &&
        activeSession.routine_id === routine.id
      ) {
        toast.error("Finish or reset today’s workout before deleting this split");
        setShowDeleteConfirm(false);
        return;
      }

      const ok = await deleteRoutine(routine.id);
      if (!ok) {
        toast.error("Could not delete split");
        return;
      }

      toast.success("Split deleted");
      setShowDeleteConfirm(false);
      const remaining = sortRoutinesByName(routines).filter(r => r.id !== routine.id);
      if (remaining.length > 0) {
        const nextId = remaining[0].id;
        setSelectedRoutineId(nextId);
        hydrateForm(nextId);
        void router.replace(`/plan?routine=${encodeURIComponent(nextId)}`, undefined, {
          shallow: true,
        });
      } else {
        setSelectedRoutineId(NEW_SPLIT_ID);
        setTitle("");
        setList([]);
        setListReady(true);
        void router.replace("/plan?routine=new", undefined, { shallow: true });
      }
    } finally {
      setDeleting(false);
    }
  }, [
    routine?.id,
    deleting,
    activeSession,
    deleteRoutine,
    routines,
    hydrateForm,
    router,
  ]);

  const addExercisesHref =
    selectedRoutineId && !isNewSplit
      ? `/exercises?routineId=${encodeURIComponent(selectedRoutineId)}&returnTo=plan`
      : selectedRoutineId === NEW_SPLIT_ID
        ? null
        : null;

  const handleExportSplits = useCallback(async () => {
    if (exportingSplits) return;
    if (!routines.length) {
      toast.error("No splits to export");
      return;
    }

    setExportingSplits(true);
    try {
      const draftOverride =
        isDirty && routine?.id
          ? {
              id: routine.id,
              name: title.trim() || routine.name,
              exercises: listToPayload(list),
            }
          : null;
      const payload = buildSplitsExportPayload(routines, { draftOverride });
      await downloadSplitsPdf(payload, splitsExportFilename());
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExportingSplits(false);
    }
  }, [exportingSplits, routines, isDirty, routine, title, list]);

  if (!user) {
    return (
      <Layout>
        <div className="px-5 py-12 text-center text-iron-400">Sign in to plan workouts.</div>
      </Layout>
    );
  }

  const plannerTabListCls = cn(
    "grid h-11 w-full grid-cols-2 gap-1 rounded-card p-1",
    isDarkMode ? "bg-iron-900/90 text-iron-400" : "bg-slate-100 text-slate-500",
  );

  const plannerTabTriggerCls = cn(
    "rounded-lg py-2.5 text-sm font-semibold",
    isDarkMode &&
      "data-[state=inactive]:text-iron-400 data-[state=active]:bg-lift-primary data-[state=active]:text-iron-950",
  );

  return (
    <Layout>
      <PageContainer className="pt-8 pb-28">
        <h1 className="text-screen-title">Planner</h1>

        <Tabs
          value={plannerView}
          onValueChange={setPlannerViewWithUrl}
          className="mt-4"
        >
          <TabsList className={plannerTabListCls}>
            <TabsTrigger value={PLANNER_VIEW_SPLITS} className={plannerTabTriggerCls}>
              Workout splits
            </TabsTrigger>
            <TabsTrigger value={PLANNER_VIEW_LIBRARY} className={plannerTabTriggerCls}>
              Exercise library
            </TabsTrigger>
          </TabsList>

          <TabsContent value={PLANNER_VIEW_SPLITS} className="mt-4 focus-visible:outline-none">
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-600"}`}>
                Build named routines. On Today, pick which split you&apos;re logging.
              </p>
              {routines.length > 0 ? (
                <button
                  type="button"
                  disabled={exportingSplits}
                  onClick={() => void handleExportSplits()}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3 disabled:opacity-50",
                    actionSecondaryCompact(isDarkMode),
                  )}
                >
                  {exportingSplits ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="text-[11px] font-semibold whitespace-nowrap">Export all splits PDF</span>
                </button>
              ) : null}
            </div>

            <PlannerSplitTabs
              routines={routines}
              selectedRoutineId={selectedRoutineId}
              isDarkMode={isDarkMode}
              onSelectSplit={selectSplit}
              onNewSplit={() => selectSplit(NEW_SPLIT_ID)}
              className="mt-0"
            />

        {selectedRoutineId != null ? (
          <>
            <div className="mt-4 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Push, Pull, Legs"
                className={`w-full text-xl font-semibold tracking-tight rounded-card border px-4 py-3 outline-none ${
                  isDarkMode
                    ? "border-surface-subtle bg-surface-interactive text-iron-50 placeholder:text-iron-600"
                    : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm"
                }`}
              />
            </div>

            <div className="mt-6">
              {routineExercisesLoading ? (
                <SkeletonRoutineExercises isDarkMode={isDarkMode} count={4} />
              ) : areaGroups.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  No exercises yet — add some below.
                </p>
              ) : (
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
                      <div className="space-y-2">
                        {group.exercises.map(item => (
                          <RoutineExerciseRow
                            key={item.key}
                            item={item}
                            thumbUrl={thumb(item.exercise_name)}
                            isDarkMode={isDarkMode}
                            exercises={exercises}
                            onNotesChange={handleNotesChange}
                            onRemove={handleRemoveExercise}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={cn(
                "mt-6 space-y-3 border-t pt-5",
                isDarkMode ? "border-iron-800/80" : "border-slate-200",
              )}
            >
              {listReady &&
              user &&
              (saveStatus === "saving" ||
                saveStatus === "pending" ||
                saveStatus === "error" ||
                isDirty) ? (
                <p
                  className={cn(
                    "flex items-center justify-center gap-1.5 text-xs font-medium",
                    saveStatus === "error"
                      ? isDarkMode
                        ? "text-red-400"
                        : "text-red-600"
                      : isDarkMode
                        ? "text-iron-500"
                        : "text-slate-500",
                  )}
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

              <button
                type="button"
                disabled={isNewSplit && !title.trim()}
                onClick={async () => {
                  if (isNewSplit) {
                    if (savingRef.current) return;
                    savingRef.current = true;
                    try {
                      const created = await createRoutine({
                        name: title.trim(),
                        day_of_week: null,
                        color: "#3b82f6",
                        exercises: listToPayload(list),
                      });
                      if (created?.id) {
                        setSelectedRoutineId(created.id);
                        await router.replace(`/plan?routine=${created.id}`, undefined, {
                          shallow: true,
                        });
                        router.push(
                          `/exercises?routineId=${encodeURIComponent(created.id)}&returnTo=plan`,
                        );
                      }
                    } catch {
                      toast.error("Could not save split");
                    } finally {
                      savingRef.current = false;
                    }
                    return;
                  }
                  if (addExercisesHref) router.push(addExercisesHref);
                }}
                className={cn(
                  "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-card py-3 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50",
                  isNewSplit ? actionPrimary(isDarkMode) : actionSecondary(isDarkMode),
                )}
              >
                <Plus className="h-5 w-5 shrink-0" aria-hidden />
                {isNewSplit ? "Save split & add exercises" : "Add exercise"}
              </button>

              {!isNewSplit && routine ? (
                <div
                  className={cn(
                    "rounded-card border px-3 py-3",
                    isDarkMode
                      ? "border-iron-800/90 bg-iron-950/50"
                      : "border-slate-200 bg-slate-50",
                  )}
                >
                  <p
                    className={cn(
                      "mb-2.5 text-[11px] font-semibold uppercase tracking-wide",
                      isDarkMode ? "text-iron-500" : "text-slate-500",
                    )}
                  >
                    Manage split
                  </p>
                  <div
                    className={cn(
                      "grid gap-2",
                      list.length > 0 ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {list.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleClear}
                        className={cn(
                          "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-card px-2 py-2.5 text-xs font-semibold",
                          actionDestructiveGhost(isDarkMode),
                          isDarkMode ? "bg-iron-900/60" : "bg-white",
                        )}
                      >
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Clear list
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className={cn(
                        "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-card px-2 py-2.5 text-xs font-semibold",
                        actionDestructiveGhost(isDarkMode),
                        isDarkMode ? "bg-iron-900/60" : "bg-white",
                        list.length === 0 && "w-full",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Delete split
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
          </TabsContent>

          <TabsContent value={PLANNER_VIEW_LIBRARY} className="mt-4 focus-visible:outline-none">
            <ExerciseLibraryPanel
              embedded
              exercises={exercises}
              isDarkMode={isDarkMode}
              mediaOverrides={mediaOverrides}
              previewId={libraryPreviewId}
              onPreviewIdChange={handleLibraryPreviewChange}
            />
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
            <AlertDialogHeader>
              <AlertDialogTitle className={isDarkMode ? "text-iron-50" : ""}>
                Delete this split?
              </AlertDialogTitle>
              <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
                {routine
                  ? `“${routine.name?.trim() || "Untitled"}” and its exercise list will be removed. Past workouts you already logged are kept.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className={actionSecondary(isDarkMode)}
                disabled={deleting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={e => {
                  e.preventDefault();
                  void confirmDeleteSplit();
                }}
                className={actionDestructive(isDarkMode, "border-0")}
              >
                {deleting ? "Deleting…" : "Delete split"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </Layout>
  );
}
