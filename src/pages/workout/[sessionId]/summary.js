import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { getSessionExtras } from "@/lib/workoutSessionClient";
import { getPostWorkoutReturnPath, isSessionToday } from "@/lib/workoutNavigation";
import { toast } from "sonner";
import { ClipboardList, Home, Save, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function WorkoutSummaryPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { isDarkMode } = useTheme();
  const {
    user,
    getWorkoutSession,
    completeWorkoutSession,
    getTodayRoutine,
    updateRoutine,
    routines,
    deleteSessionExerciseByName,
    updateSetLogData,
    deleteSetLog,
    addSetLog,
    loadActiveSession,
  } = useWorkout();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extrasVersion, setExtrasVersion] = useState(0);
  const bumpExtrasVersion = useCallback(() => setExtrasVersion(v => v + 1), []);
  const [mutatingKey, setMutatingKey] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editOriginalName, setEditOriginalName] = useState("");
  const [editingSetRow, setEditingSetRow] = useState(null);
  const [deletingSetId, setDeletingSetId] = useState(null);
  const [addingSetBusy, setAddingSetBusy] = useState(false);
  const [patchingSetId, setPatchingSetId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reloadSession = useCallback(async () => {
    if (typeof sessionId !== "string" || !user) return;
    const data = await getWorkoutSession(sessionId);
    setSession(data);
  }, [sessionId, user, getWorkoutSession]);

  const persistSessionRefresh = useCallback(async () => {
    await reloadSession();
    await loadActiveSession();
  }, [reloadSession, loadActiveSession]);

  useEffect(() => {
    async function load() {
      if (!sessionId || !user) return;
      setLoading(true);
      const data = await getWorkoutSession(sessionId);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [sessionId, user, getWorkoutSession]);

  useEffect(() => {
    if (!editOpen || !editOriginalName) return;
    const count = (session?.set_logs || []).filter(l => l.exercise_name === editOriginalName && l.is_completed).length;
    if (count === 0) {
      setEditOpen(false);
      setEditingSetRow(null);
    }
  }, [editOpen, editOriginalName, session?.set_logs]);

  const extras = useMemo(() => {
    if (typeof sessionId !== "string") return [];
    return getSessionExtras(sessionId);
  }, [sessionId, extrasVersion]);

  const categoryByExerciseName = useMemo(() => {
    const m = {};
    for (const log of session?.set_logs || []) {
      if (log?.is_completed && log.exercise_name && m[log.exercise_name] == null) {
        m[log.exercise_name] = log.category || "other";
      }
    }
    return m;
  }, [session]);

  const stats = useMemo(() => {
    const logs = (session?.set_logs || []).filter(l => l.is_completed);
    const names = [...new Set(logs.map(l => l.exercise_name))];
    const addedTodayNames = new Set(extras.map(e => e.exercise_name));
    const completedExercises = names.length;
    const addedToday = extras.length;
    const totalSets = logs.length;
    return {
      completedExercises,
      addedToday,
      totalSets,
      exerciseNames: names,
      addedTodayNames,
    };
  }, [session, extras]);

  const editSetsList = useMemo(() => {
    if (!editOpen || !editOriginalName || !session?.set_logs) return [];
    return [...session.set_logs]
      .filter(l => l.exercise_name === editOriginalName && l.is_completed)
      .sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
  }, [session?.set_logs, editOpen, editOriginalName]);

  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine, routines]);

  const handleSaveWorkout = async () => {
    if (typeof sessionId !== "string") return;
    setSaving(true);
    try {
      await completeWorkoutSession(sessionId);
      toast.success("Workout saved");
      const returnPath = getPostWorkoutReturnPath(session);
      router.replace(returnPath);
    } catch {
      toast.error("Could not save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtrasToRoutine = async () => {
    if (!todayRoutine?.id || extras.length === 0) {
      toast.message("Nothing to add or no routine for today");
      return;
    }
    const existing = (todayRoutine.routine_exercises || []).map(ex => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
    }));
    const seen = new Set(existing.map(e => e.exercise_name));
    for (const ex of extras) {
      if (seen.has(ex.exercise_name)) continue;
      seen.add(ex.exercise_name);
      existing.push({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: 3,
      });
    }
    await updateRoutine(todayRoutine.id, {
      name: todayRoutine.name,
      day_of_week: todayRoutine.day_of_week,
      color: todayRoutine.color || "#3b82f6",
      exercises: existing,
    });
    toast.success("Added to your routine");
  };

  const openEdit = name => {
    setEditingSetRow(null);
    setPatchingSetId(null);
    setEditOriginalName(name);
    setEditOpen(true);
  };

  const handleSaveEditedSetRow = async () => {
    if (!editingSetRow) return;
    setPatchingSetId(editingSetRow.id);
    const ok = await updateSetLogData(editingSetRow.id, {
      weight: parseFloat(String(editingSetRow.weight).replace(",", ".")) || 0,
      reps: parseInt(String(editingSetRow.reps), 10) || 0,
    });
    setPatchingSetId(null);
    if (!ok) {
      toast.error("Could not update set");
      return;
    }
    setEditingSetRow(null);
    await persistSessionRefresh();
    toast.success("Set updated");
  };

  const handleRemoveSetRow = async logId => {
    setDeletingSetId(logId);
    try {
      const ok = await deleteSetLog(logId);
      if (!ok) {
        toast.error("Could not remove set");
        return;
      }
      setEditingSetRow(prev => (prev?.id === logId ? null : prev));
      await persistSessionRefresh();
      toast.success("Set removed");
    } finally {
      setDeletingSetId(null);
    }
  };

  const handleAddSetForExercise = async () => {
    if (typeof sessionId !== "string" || !editOriginalName) return;
    const cat = categoryByExerciseName[editOriginalName] || "other";
    const tail = editSetsList[editSetsList.length - 1];
    const w = tail != null ? Number(tail.weight) || 0 : 0;
    const r = tail != null ? Number(tail.reps) || 0 : 10;
    setAddingSetBusy(true);
    try {
      const row = await addSetLog({
        sessionId,
        exerciseName: editOriginalName,
        category: cat,
      });
      if (!row) {
        toast.error("Could not add set");
        return;
      }
      const ok = await updateSetLogData(row.id, {
        weight: w,
        reps: r || 10,
        is_completed: true,
      });
      if (!ok) {
        toast.error("Could not finalize new set");
        return;
      }
      await persistSessionRefresh();
      toast.success("Set added");
    } finally {
      setAddingSetBusy(false);
    }
  };
  const confirmDelete = async () => {
    if (typeof sessionId !== "string" || !deleteTarget) return;
    const name = deleteTarget;
    setMutatingKey(`del:${name}`);
    const ok = await deleteSessionExerciseByName(sessionId, name);
    setMutatingKey("");
    if (!ok) {
      toast.error("Could not remove exercise");
      return;
    }
    setDeleteTarget(null);
    bumpExtrasVersion();
    await persistSessionRefresh();
    toast.success("Exercise removed");
  };

  const dialogSkin = cn(
    isDarkMode ? "border-iron-800 bg-iron-950 text-iron-100" : "!border-slate-200 !bg-white",
  );

  const descriptionSkin = cn(isDarkMode ? "text-iron-400" : "!text-slate-600");

  if (!router.isReady || loading || !sessionId) {
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
      className={`min-h-screen flex flex-col px-5 pt-10 pb-12 ${
        isDarkMode ? "bg-iron-950" : "bg-slate-50"
      }`}
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <h1
        className={`text-2xl font-semibold tracking-tight ${
          isDarkMode ? "text-iron-50" : "text-slate-900"
        }`}
      >
        Workout complete
      </h1>
      <p className={`mt-2 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
        {session?.routine_name || "Session"}
      </p>

      <div className="mt-8 space-y-3">
        {[
          { label: "Completed exercises", value: stats.completedExercises },
          { label: "Added today", value: stats.addedToday },
          { label: "Total sets", value: stats.totalSets },
        ].map(row => (
          <div
            key={row.label}
            className={`flex justify-between items-center py-3 px-4 rounded-card ${
              isDarkMode ? "bg-iron-900/70 border border-iron-800" : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <span className={isDarkMode ? "text-iron-400" : "text-slate-600"}>{row.label}</span>
            <span className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-3 mb-3">
          <p
            className={`text-[11px] font-semibold uppercase tracking-widest ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            Exercises
          </p>
          <button
            type="button"
            onClick={() => {
              router.push(
                `/exercises?return=today&sessionId=${encodeURIComponent(sessionId)}&addReturn=summary`,
              );
            }}
            disabled={Boolean(mutatingKey)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold transition-colors shrink-0",
              isDarkMode
                ? "bg-iron-800 text-lift-primary hover:bg-iron-700 disabled:opacity-50"
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add exercise
          </button>
        </div>

        <div className="space-y-2">
          {stats.exerciseNames.map(name => {
            const busy = mutatingKey === `del:${name}`;
            return (
              <div
                key={name}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-card ${
                  isDarkMode ? "bg-iron-900/50 border border-iron-800/80" : "bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span className="text-emerald-500 shrink-0">✓</span>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-medium leading-snug",
                    isDarkMode ? "text-iron-100" : "text-slate-800",
                  )}
                >
                  {name}
                </span>
                {stats.addedTodayNames.has(name) && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      isDarkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    Added today
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(name)}
                  disabled={Boolean(mutatingKey)}
                  aria-label={`Edit sets for ${name}`}
                  className={cn(
                    "shrink-0 rounded-lg p-2 transition-colors disabled:opacity-40",
                    isDarkMode ? "text-iron-400 hover:bg-iron-800 hover:text-iron-100" : "text-slate-500 hover:bg-white",
                  )}
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(name)}
                  disabled={Boolean(mutatingKey)}
                  aria-label={`Remove ${name}`}
                  title="Remove from this workout"
                  className={cn(
                    "shrink-0 rounded-lg p-2 transition-colors disabled:opacity-40",
                    isDarkMode ? "text-red-400 hover:bg-red-950/40" : "text-red-600 hover:bg-red-50",
                  )}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                {busy && (
                  <div
                    className={`ml-1 h-4 w-4 shrink-0 rounded-full border animate-spin border-t-transparent ${
                      isDarkMode ? "border-lift-primary" : "border-workout-primary"
                    }`}
                  />
                )}
              </div>
            );
          })}
          {stats.exerciseNames.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>No logged exercises.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto pt-10 space-y-3">
        <button
          type="button"
          onClick={handleSaveWorkout}
          disabled={saving || stats.exerciseNames.length === 0 || Boolean(mutatingKey)}
          className={`w-full py-4 rounded-card font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          <Save className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
          {saving ? "Saving…" : "Save workout"}
        </button>
        {extras.length > 0 ? (
          <button
            type="button"
            onClick={handleAddExtrasToRoutine}
            disabled={Boolean(mutatingKey)}
            className={`w-full py-4 rounded-card font-semibold border inline-flex items-center justify-center gap-2 disabled:opacity-50 ${
              isDarkMode ? "border-iron-700 text-iron-200" : "border-slate-300 text-slate-800"
            }`}
          >
            <ClipboardList className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
            {isSessionToday(session) ? "Add added-today exercises to routine" : "Add exercises to routine"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(mutatingKey)}
          onClick={() => {
            const returnPath = getPostWorkoutReturnPath(session);
            router.push(returnPath);
          }}
          className={`w-full py-3 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 ${
            isDarkMode ? "text-iron-500" : "text-slate-500"
          }`}
        >
          <Home className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
          {isSessionToday(session) ? "Back to home" : "Back to log"}
        </button>
      </div>

      {/* Edit sets */}
      <Dialog
        open={editOpen}
        onOpenChange={open => {
          setEditOpen(open);
          if (!open) setEditingSetRow(null);
        }}
      >
        <DialogContent
          className={cn("flex max-h-[min(92vh,760px)] max-w-lg flex-col gap-0 overflow-hidden", dialogSkin)}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-2 px-1">
            <DialogTitle className={isDarkMode ? "" : "!text-slate-900"}>Sets</DialogTitle>
            {editOriginalName ? (
              <p
                className={cn("text-base font-semibold leading-snug", isDarkMode ? "text-iron-100" : "text-slate-900")}
              >
                {editOriginalName}
              </p>
            ) : null}
            <DialogDescription className={cn("text-sm", descriptionSkin)}>
              Adjust weight × reps below. Totals update when you save the workout.
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "mt-5 min-h-0 flex-1 overflow-y-auto border-t pt-4",
              isDarkMode ? "border-iron-800" : "border-slate-200",
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  isDarkMode ? "text-iron-500" : "text-slate-500",
                )}
              >
                Sets logged
              </span>
              <button
                type="button"
                onClick={handleAddSetForExercise}
                disabled={addingSetBusy || Boolean(patchingSetId)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-45",
                  isDarkMode ? "bg-iron-800 text-lift-primary hover:bg-iron-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200",
                )}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Add set
              </button>
            </div>

            <div className="space-y-2 pb-2">
              {editSetsList.map((s, idx) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-card border px-3 py-2.5",
                    isDarkMode ? "border-iron-800 bg-iron-900/80" : "border-slate-200 bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums",
                      isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {idx + 1}
                  </span>

                  {editingSetRow?.id === s.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.25"
                          value={editingSetRow.weight}
                          onChange={e =>
                            setEditingSetRow({ ...editingSetRow, weight: e.target.value })
                          }
                          className={cn(
                            "w-16 rounded-lg border px-2 py-2 text-xs text-center tabular-nums outline-none focus-visible:ring-2",
                            isDarkMode
                              ? "border-iron-600 bg-iron-950 text-iron-100 focus-visible:ring-lift-primary"
                              : "border-slate-200 bg-white text-slate-900 focus-visible:ring-workout-primary",
                          )}
                        />
                        <span className={cn("text-xs", descriptionSkin)}>kg</span>
                      </div>
                      <span className={cn("text-xs opacity-70", descriptionSkin)}>×</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={editingSetRow.reps}
                          onChange={e =>
                            setEditingSetRow({ ...editingSetRow, reps: e.target.value })
                          }
                          className={cn(
                            "w-14 rounded-lg border px-2 py-2 text-xs text-center tabular-nums outline-none focus-visible:ring-2",
                            isDarkMode
                              ? "border-iron-600 bg-iron-950 text-iron-100 focus-visible:ring-lift-primary"
                              : "border-slate-200 bg-white text-slate-900 focus-visible:ring-workout-primary",
                          )}
                        />
                        <span className={cn("text-xs", descriptionSkin)}>reps</span>
                      </div>
                      <button
                        type="button"
                        disabled={patchingSetId === s.id || Boolean(patchingSetId)}
                        onClick={handleSaveEditedSetRow}
                        className={cn(
                          "ml-auto shrink-0 rounded-lg p-2 disabled:opacity-40",
                          isDarkMode ? "text-emerald-400 hover:bg-iron-800" : "text-emerald-600 hover:bg-slate-100",
                        )}
                        aria-label="Save set"
                      >
                        <Save className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        disabled={patchingSetId === s.id}
                        onClick={() => setEditingSetRow(null)}
                        className={cn(
                          "shrink-0 rounded-lg p-2",
                          isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-400 hover:bg-slate-100",
                        )}
                        aria-label="Cancel editing set"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 gap-y-1">
                        <span
                          className={cn(
                            "text-base font-semibold tabular-nums",
                            isDarkMode ? "text-iron-100" : "text-slate-800",
                          )}
                        >
                          {s.weight}
                          <span className={cn("ml-1 text-xs font-normal", descriptionSkin)}>kg</span>
                        </span>
                        <span className={cn("text-xs opacity-70", descriptionSkin)}>×</span>
                        <span
                          className={cn(
                            "text-base font-semibold tabular-nums",
                            isDarkMode ? "text-iron-100" : "text-slate-800",
                          )}
                        >
                          {s.reps}
                          <span className={cn("ml-1 text-xs font-normal", descriptionSkin)}>reps</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(patchingSetId)}
                        onClick={() =>
                          setEditingSetRow({
                            id: s.id,
                            weight: s.weight ?? "",
                            reps: s.reps ?? "",
                          })
                        }
                        className={cn(
                          "rounded-lg p-2 disabled:opacity-40",
                          isDarkMode ? "text-iron-400 hover:bg-iron-800" : "text-slate-500 hover:bg-slate-100",
                        )}
                        aria-label={`Edit set ${idx + 1}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingSetId === s.id}
                        onClick={() => handleRemoveSetRow(s.id)}
                        className={cn(
                          "rounded-lg p-2 disabled:opacity-40",
                          isDarkMode ? "text-red-400 hover:bg-red-950/35" : "text-red-600 hover:bg-red-50",
                        )}
                        aria-label={`Delete set ${idx + 1}`}
                      >
                        {deletingSetId === s.id ? (
                          <span
                            className={cn(
                              "inline-block h-4 w-4 animate-spin rounded-full border border-t-transparent",
                              isDarkMode ? "border-red-400" : "border-red-600",
                            )}
                          />
                        ) : (
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter
            className={cn(
              "mt-4 shrink-0 border-t px-1 pt-4",
              isDarkMode ? "border-iron-800" : "border-slate-200",
            )}
          >
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className={cn(
                "w-full rounded-card py-3 text-sm font-semibold disabled:opacity-45",
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white",
              )}
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent
          className={cn(dialogSkin)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "" : "!text-slate-900"}>Remove exercise?</AlertDialogTitle>
            <AlertDialogDescription className={cn(descriptionSkin)}>
              Remove <span className="font-semibold text-inherit">{deleteTarget}</span> and every set logged for it on
              this workout. You can’t undo after saving the workout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={cn(
                isDarkMode &&
                  "!border-iron-700 !bg-transparent !text-iron-200 hover:!bg-iron-800",
              )}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                confirmDelete();
              }}
              className={cn(
                isDarkMode && "!bg-red-600 hover:!bg-red-500 focus-visible:!ring-red-500",
              )}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
