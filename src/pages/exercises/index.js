import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Layout from "@/components/Layout";
import ExerciseListThumbnail from "@/components/exercises/ExerciseListThumbnail";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import ExerciseIcon from "@/components/ExerciseIcon";
import { Modal, ModalContent, ModalBody, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { getExerciseEquipment, exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import {
  PARENT_CHIPS,
  getSubcategoriesForParent,
  exerciseMatchesSubFilter,
} from "@/lib/exerciseSubcategories";
import { Plus, List, LayoutGrid, ArrowLeft, Check, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Component to handle exercise thumbnails with proper error fallback
function ExerciseThumbnail({ exercise, isDarkMode }) {
  const [imageError, setImageError] = useState(false);
  const url = exerciseMediaUrl(exercise);
  
  // Reset error state when URL changes
  useEffect(() => {
    setImageError(false);
  }, [url]);
  
  if (!url || imageError) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-1 px-2 ${
          isDarkMode ? "bg-iron-800" : "bg-slate-100"
        }`}
      >
        <ExerciseIcon
          name={exercise.name}
          className="w-10 h-10"
          color={isDarkMode ? "#71717a" : "#94a3b8"}
        />
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            isDarkMode ? "text-iron-500" : "text-slate-400"
          }`}
        >
          No image
        </span>
      </div>
    );
  }
  
  return (
    <Image
      src={url}
      alt={exercise.name || "Exercise"}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 50vw, 33vw"
      unoptimized={exerciseImageUnoptimized(url)}
      onError={() => setImageError(true)}
    />
  );
}

export default function ExercisesSearchPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { user, exercises, getRoutineForDay, updateRoutine, createRoutine } = useWorkout();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState(null);
  const [subChip, setSubChip] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [addingBatch, setAddingBatch] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [uiHydrated, setUiHydrated] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"

  // Load view mode preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedViewMode = localStorage.getItem("exerciseViewMode");
      if (savedViewMode === "list" || savedViewMode === "card") {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // Save view mode preference to localStorage
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("exerciseViewMode", mode);
    }
  }, []);

  const routineDayStr = router.query.routineDay;
  const routineDayNum = typeof routineDayStr === "string" ? parseInt(routineDayStr, 10) : NaN;
  const isRoutinePicker = !Number.isNaN(routineDayNum) && routineDayNum >= 0 && routineDayNum <= 6;

  const uiStorageKey = useMemo(
    () => `wl_exercises_${isRoutinePicker && routineDayStr ? String(routineDayStr) : "browse"}`,
    [isRoutinePicker, routineDayStr]
  );

  useEffect(() => {
    setUiHydrated(false);
    if (typeof window === "undefined") {
      setUiHydrated(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(uiStorageKey);
      if (!raw) {
        setChip(null);
        setSubChip(null);
        setQ("");
        if (isRoutinePicker) setSelectedIds(new Set());
        setUiHydrated(true);
        return;
      }
      const o = JSON.parse(raw);
      const resolvedChip =
        o.chip && PARENT_CHIPS.includes(o.chip) ? o.chip : null;
      setChip(resolvedChip);
      if (typeof o.subChip === "string" && o.subChip && resolvedChip) {
        const subs = getSubcategoriesForParent(resolvedChip);
        if (subs.some(s => s.label === o.subChip)) setSubChip(o.subChip);
        else setSubChip(null);
      } else setSubChip(null);
      setQ(typeof o.q === "string" ? o.q : "");
      if (isRoutinePicker && Array.isArray(o.selected)) {
        setSelectedIds(new Set(o.selected.filter(Boolean)));
      } else if (!isRoutinePicker) {
        setSelectedIds(new Set());
      }
    } catch {
      setChip(null);
      setSubChip(null);
      setQ("");
      setSelectedIds(new Set());
    }
    setUiHydrated(true);
  }, [uiStorageKey, isRoutinePicker]);

  useEffect(() => {
    if (!uiHydrated || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        uiStorageKey,
        JSON.stringify({
          chip,
          subChip,
          q,
          selected: isRoutinePicker ? Array.from(selectedIds) : [],
        })
      );
    } catch {
      /* ignore quota */
    }
  }, [uiHydrated, uiStorageKey, chip, subChip, q, selectedIds, isRoutinePicker]);

  useEffect(() => {
    if (!router.isReady) return;
    const p = router.query.preview;
    if (typeof p === "string" && p) setPreviewId(p);
  }, [router.isReady, router.query.preview]);

  const previewExercise = useMemo(
    () => (previewId ? (exercises.find(e => e.id === previewId) ?? null) : null),
    [previewId, exercises]
  );

  const closePreview = useCallback(() => {
    setPreviewId(null);
    const next = { ...router.query };
    delete next.preview;
    router.replace({ pathname: "/exercises", query: next }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    if (!previewId || !router.isReady || !user) return;
    if (!exercises || exercises.length === 0) return;
    const ex = exercises.find(e => e.id === previewId);
    if (!ex) {
      toast.message("Exercise not found");
      closePreview();
    }
  }, [previewId, exercises, router.isReady, user, closePreview]);

  const openPreview = id => {
    setPreviewId(id);
    router.replace({ pathname: "/exercises", query: { ...router.query, preview: id } }, undefined, {
      shallow: true,
    });
  };

  const handleBack = useCallback(() => {
    if (isRoutinePicker) {
      setSelectedIds(new Set());
    }
    router.back();
  }, [isRoutinePicker, router]);

  const clearRoutineSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const filtered = useMemo(() => {
    let list = exercises || [];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        e => e.name?.toLowerCase().includes(term) || e.category?.toLowerCase().includes(term)
      );
    }
    if (chip && chip !== "Full Body") {
      list = list.filter(
        e =>
          (e.category || "").toLowerCase() === chip.toLowerCase() ||
          (e.category || "").toLowerCase().includes(chip.toLowerCase())
      );
    }
    if (subChip && chip && chip !== "Full Body") {
      list = list.filter(e => exerciseMatchesSubFilter(e, chip, subChip));
    }
    return list.slice(0, 80);
  }, [exercises, q, chip, subChip]);

  const subcategories = useMemo(() => getSubcategoriesForParent(chip), [chip]);

  const toggleSelect = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchAddToRoutine = async () => {
    if (!isRoutinePicker || selectedIds.size === 0) return;
    const picks = Array.from(selectedIds)
      .map(id => exercises.find(e => e.id === id))
      .filter(Boolean);
    if (picks.length === 0) return;

    setAddingBatch(true);
    try {
      const rows = picks.map(ex => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        category: ex.category || "other",
        target_sets: 3,
      }));

      const routine = getRoutineForDay(routineDayNum);
      if (!routine) {
        await createRoutine({
          name: `${DAY_NAMES[routineDayNum] ?? "Day"} workout`,
          day_of_week: routineDayNum,
          color: "#3b82f6",
          exercises: rows,
        });
        toast.success(`Routine created with ${rows.length} exercise(s)`);
        router.push("/plan");
        return;
      }

      const existing = (routine.routine_exercises || []).map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: ex.target_sets || 3,
      }));
      const existingNames = new Set(existing.map(e => e.exercise_name));
      let added = 0;
      for (const row of rows) {
        if (existingNames.has(row.exercise_name)) continue;
        existing.push(row);
        existingNames.add(row.exercise_name);
        added++;
      }
      if (added === 0) {
        toast.message("All selected exercises are already in this routine");
        return;
      }
      await updateRoutine(routine.id, {
        name: routine.name,
        day_of_week: routine.day_of_week,
        color: routine.color || "#3b82f6",
        exercises: existing,
      });
      toast.success(`Added ${added} exercise(s) to routine`);
      router.push("/plan");
    } finally {
      setAddingBatch(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="px-5 py-12 text-center text-iron-400">Sign in to browse exercises.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className={`px-5 pt-8 max-w-lg mx-auto ${
          isRoutinePicker && selectedIds.size > 0 ? "pb-40" : "pb-28"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={handleBack}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDarkMode
                ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-screen-title flex-1 min-w-0">
            Search exercise
          </h1>
          {isRoutinePicker && selectedIds.size > 0 ? (
            <button
              type="button"
              onClick={clearRoutineSelection}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl ${
                isDarkMode
                  ? "bg-iron-800 text-iron-200 hover:bg-iron-700"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              }`}
            >
              <XCircle className="w-4 h-4" />
              Clear ({selectedIds.size})
            </button>
          ) : null}
        </div>
        {isRoutinePicker && (
          <p className={`mt-2 text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
            Tap a row to select or deselect. Tap the <span className="font-medium">image</span> for
            a full preview (sheet). Then add to your{" "}
            <span className="font-medium">{DAY_NAMES[routineDayNum]}</span> routine.
          </p>
        )}

        <div
          className={cn(
            "sticky z-20 -mx-5 px-5 pt-2 mt-6 pb-3 border-b",
            isDarkMode
              ? "top-0 bg-iron-950 border-iron-800/90"
              : "top-0 bg-slate-50 border-slate-200/90"
          )}
        >
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search exercise…"
            className={`w-full rounded-2xl px-4 py-3.5 text-base outline-none ${
              isDarkMode
                ? "bg-iron-900 border border-iron-800 text-iron-100 placeholder:text-iron-600"
                : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {PARENT_CHIPS.map(c => {
              const active = chip === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChip(active ? null : c);
                    setSubChip(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-300"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {subcategories.length > 0 ? (
            <div className="mt-4">
              <p
                className={`text-[11px] font-medium uppercase tracking-wide mb-2 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                Muscle focus
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubChip(null)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    subChip == null
                      ? isDarkMode
                        ? "bg-iron-700 text-iron-100 ring-1 ring-iron-500"
                        : "bg-slate-200 text-slate-900 ring-1 ring-slate-400"
                      : isDarkMode
                        ? "bg-iron-800/80 text-iron-400"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  All
                </button>
                {subcategories.map(s => {
                  const active = subChip === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSubChip(active ? null : s.label)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? isDarkMode
                            ? "bg-iron-700 text-iron-100 ring-1 ring-lift-primary/80"
                            : "bg-slate-200 text-slate-900 ring-1 ring-workout-primary/70"
                          : isDarkMode
                            ? "bg-iron-800/80 text-iron-400"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          
          {/* View Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <p className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
              {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className={`flex rounded-lg p-1 ${
              isDarkMode ? "bg-iron-800" : "bg-slate-100"
            }`}>
              <button
                onClick={() => handleViewModeChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDarkMode
                      ? "text-iron-400 hover:text-iron-300"
                      : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => handleViewModeChange("card")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "card"
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDarkMode
                      ? "text-iron-400 hover:text-iron-300"
                      : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cards
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-6 ${viewMode === "card" ? "grid grid-cols-2 gap-3" : "space-y-2"}`}>
          {filtered.map(ex => {
            const selected = selectedIds.has(ex.id);
            
            if (viewMode === "card") {
              // Card view layout
              const cardClass = `w-full rounded-2xl overflow-hidden transition-colors ${
                isDarkMode
                  ? "bg-iron-900/50 border border-iron-800"
                  : "bg-white border border-slate-200 shadow-sm"
              }`;
              
              if (!isRoutinePicker) {
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => openPreview(ex.id)}
                    className={`${cardClass} overflow-hidden text-left ${
                      isDarkMode ? "hover:bg-iron-900" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="aspect-square relative mb-3">
                      <ExerciseThumbnail 
                        exercise={ex} 
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    <div className="p-3">
                      <p className={`font-semibold text-sm leading-tight ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                        {ex.name}
                      </p>
                      <p className={`text-xs mt-1 capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                        {ex.category || "General"}
                      </p>
                      {getExerciseEquipment(ex) && (
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                          {getExerciseEquipment(ex)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              }
              
              // Card view for routine picker (outer div avoids nested <button>)
              return (
                <div
                  key={ex.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelect(ex.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelect(ex.id);
                    }
                  }}
                  className={`${cardClass} text-left transition-all cursor-pointer ${selected ? (isDarkMode ? "ring-2 ring-lift-primary" : "ring-2 ring-workout-primary") : ""} ${
                    isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="aspect-square relative">
                    <ExerciseThumbnail 
                      exercise={ex} 
                      isDarkMode={isDarkMode}
                    />
                    
                    {/* Selection indicator overlay */}
                    {selected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
                        }`}>
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm leading-tight ${
                          selected
                            ? isDarkMode ? "text-lift-primary" : "text-workout-primary"
                            : isDarkMode ? "text-iron-100" : "text-slate-900"
                        }`}>
                          {ex.name}
                        </p>
                        <p className={`text-xs mt-1 capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                          {ex.category || "General"}
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openPreview(ex.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isDarkMode 
                            ? "bg-iron-700 hover:bg-iron-600 text-iron-300" 
                            : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                        }`}
                        aria-label={`Preview ${ex.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            
            // List view layout (existing)
            const baseCard = `w-full flex gap-3 items-stretch rounded-2xl overflow-hidden ${
              isDarkMode
                ? "bg-iron-900/50 border border-iron-800"
                : "bg-white border border-slate-200 shadow-sm"
            }`;

            if (!isRoutinePicker) {
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => openPreview(ex.id)}
                  className={`${baseCard} p-3 text-left transition-colors ${
                    isDarkMode ? "hover:bg-iron-900" : "hover:bg-slate-50"
                  }`}
                >
                  <ExerciseListThumbnail exercise={ex} isDarkMode={isDarkMode} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
                    >
                      {ex.name}
                    </p>
                    <p
                      className={`text-xs mt-0.5 capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                    >
                      {ex.category || "General"}
                    </p>
                    {getExerciseEquipment(ex) && (
                      <p
                        className={`text-[11px] mt-0.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                      >
                        {getExerciseEquipment(ex)}
                      </p>
                    )}
                  </div>
                </button>
              );
            }

            return (
              <div
                key={ex.id}
                className={`${baseCard} ${
                  selected
                    ? isDarkMode
                      ? "ring-2 ring-lift-primary border-lift-primary/50"
                      : "ring-2 ring-workout-primary border-workout-primary/40"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => openPreview(ex.id)}
                  className={`shrink-0 m-3 rounded-xl overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isDarkMode
                      ? "focus-visible:ring-lift-primary ring-offset-iron-950"
                      : "focus-visible:ring-workout-primary ring-offset-white"
                  }`}
                  aria-label={`Open preview: ${ex.name}`}
                >
                  <ExerciseListThumbnail exercise={ex} isDarkMode={isDarkMode} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelect(ex.id)}
                  className="flex-1 py-3 pr-3 pl-0 text-left min-w-0 rounded-r-2xl"
                  aria-pressed={selected}
                  aria-label={selected ? `Deselect ${ex.name}` : `Select ${ex.name}`}
                >
                  <p className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                    {ex.name}
                  </p>
                  <p
                    className={`text-xs mt-0.5 capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                  >
                    {ex.category || "General"}
                  </p>
                  {getExerciseEquipment(ex) && (
                    <p
                      className={`text-[11px] mt-0.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                    >
                      {getExerciseEquipment(ex)}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="my-8 flex items-center gap-3">
          <div className={`flex-1 h-px ${isDarkMode ? "bg-iron-800" : "bg-slate-200"}`} />
          <span className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>or</span>
          <div className={`flex-1 h-px ${isDarkMode ? "bg-iron-800" : "bg-slate-200"}`} />
        </div>

        <button
          type="button"
          onClick={() => {
            const p = new URLSearchParams();
            if (router.query.return) p.set("return", String(router.query.return));
            if (router.query.sessionId) p.set("sessionId", String(router.query.sessionId));
            if (router.query.routineDay) p.set("routineDay", String(router.query.routineDay));
            router.push(`/exercises/custom?${p.toString()}`);
          }}
          className={`w-full py-4 rounded-2xl font-semibold border border-dashed flex items-center justify-center gap-2 ${
            isDarkMode ? "border-iron-700 text-iron-200" : "border-slate-300 text-slate-800"
          }`}
        >
          <Plus className="w-5 h-5" />
          Create custom exercise
        </button>
      </div>

      {isRoutinePicker && selectedIds.size > 0 ? (
        <div
          className={`fixed left-0 right-0 z-30 px-4 border-t ${
            isDarkMode
              ? "bg-iron-900/95 border-iron-800 backdrop-blur-sm"
              : "bg-white/95 border-slate-200 backdrop-blur-sm"
          }`}
          style={{
            bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <button
            type="button"
            disabled={addingBatch}
            onClick={handleBatchAddToRoutine}
            className={`w-full my-3 py-3.5 rounded-2xl font-semibold text-center disabled:opacity-50 ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            {addingBatch ? "Adding…" : `Add ${selectedIds.size} to routine`}
          </button>
        </div>
      ) : null}

      <Modal
        open={Boolean(previewId && previewExercise)}
        onOpenChange={open => !open && closePreview()}
      >
        <ModalContent
          showCloseButton
          className={cn(
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200",
            "max-h-[90vh]"
          )}
        >
          <ModalHeader className="pb-0">
            <ModalTitle
              className={cn("pr-10 line-clamp-2", isDarkMode ? "!text-iron-50" : "!text-slate-900")}
            >
              {previewExercise?.name ?? "Exercise"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="pt-2">
            {previewExercise ? (
              <ExercisePreviewPanel
                exercise={previewExercise}
                isDarkMode={isDarkMode}
                hideHeading
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Layout>
  );
}
