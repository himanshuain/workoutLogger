import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Layout from "@/components/Layout";
import ExerciseListThumbnail from "@/components/exercises/ExerciseListThumbnail";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import ExerciseIcon from "@/components/ExerciseIcon";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { getExerciseEquipment, exerciseMediaUrl, exerciseImageUnoptimized, googleImagesSearchUrl } from "@/lib/exerciseMedia";
import {
  PARENT_CHIPS,
  getSubcategoriesForParent,
  exerciseMatchesSubFilter,
} from "@/lib/exerciseSubcategories";
import {
  EQUIPMENT_FILTER_ROW,
  exerciseMatchesEquipmentFilter,
} from "@/lib/exerciseEquipmentFilter";
import {
  Plus,
  List,
  LayoutGrid,
  ArrowLeft,
  Check,
  Eye,
  XCircle,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getRoutinePlannerReturnHref, getQueryParamString } from "@/lib/workoutNavigation";

const EQUIPMENT_KEYS = new Set(EQUIPMENT_FILTER_ROW.map(({ key }) => key));

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pillScrollerClass =
  "overflow-x-auto overscroll-x-contain py-1.5 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const pillRowClass = "flex flex-nowrap items-center gap-1.5 w-max min-w-full";

// Component to handle exercise thumbnails with proper error fallback
function ExerciseThumbnail({ exercise, isDarkMode }) {
  const [imageError, setImageError] = useState(false);
  const url = exerciseMediaUrl(exercise);
  
  // Reset error state when URL changes
  useEffect(() => {
    setImageError(false);
  }, [url]);
  
  if (!url || imageError) {
    const imagesUrl = googleImagesSearchUrl(typeof exercise?.name === "string" ? exercise.name : "");
    if (imagesUrl) {
      return (
        <a
          href={imagesUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-4 text-center outline-none transition-colors ring-1 ring-inset focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isDarkMode
              ? "bg-iron-800 text-iron-200 ring-white/10 hover:bg-iron-700/90 focus-visible:ring-lift-primary focus-visible:ring-offset-iron-900"
              : "bg-slate-100 text-slate-700 ring-black/10 hover:bg-slate-200/90 focus-visible:ring-workout-primary focus-visible:ring-offset-white"
          }`}
          aria-label={`Search Google Images for ${exercise.name ?? "this exercise"}`}
        >
          <ExerciseIcon
            name={exercise.name}
            className="h-12 w-12 sm:h-14 sm:w-14"
            color={isDarkMode ? "#d4d4d8" : "#64748b"}
          />
          <span className={`text-[11px] font-medium leading-snug ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
            No image in catalog
          </span>
          <span
            className={`text-xs font-semibold underline decoration-2 underline-offset-2 ${
              isDarkMode ? "text-lift-primary decoration-lift-primary/40" : "text-workout-primary decoration-workout-primary/40"
            }`}
          >
            Search photos →
          </span>
        </a>
      );
    }
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
  const { user, exercises, routines, getRoutineForDay, updateRoutine, createRoutine } = useWorkout();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState(null);
  const [subChip, setSubChip] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [addingBatch, setAddingBatch] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [uiHydrated, setUiHydrated] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"
  const [equipmentFilter, setEquipmentFilter] = useState(null);
  /** Collapsible block showing exercises already saved on the planner day */
  const [pinnedSavedOpen, setPinnedSavedOpen] = useState(false);
  const exerciseRowRefs = useRef(new Map());
  const pendingScrollExerciseId = useRef(null);
  const [scrollFlashId, setScrollFlashId] = useState(null);

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
        setEquipmentFilter(null);
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
      if (typeof o.equipmentFilter === "string" && EQUIPMENT_KEYS.has(o.equipmentFilter)) {
        setEquipmentFilter(o.equipmentFilter);
      } else setEquipmentFilter(null);
      if (isRoutinePicker && Array.isArray(o.selected)) {
        setSelectedIds(new Set(o.selected.filter(Boolean)));
      } else if (!isRoutinePicker) {
        setSelectedIds(new Set());
      }
    } catch {
      setChip(null);
      setSubChip(null);
      setQ("");
      setEquipmentFilter(null);
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
          equipmentFilter,
          selected: isRoutinePicker ? Array.from(selectedIds) : [],
        })
      );
    } catch {
      /* ignore quota */
    }
  }, [uiHydrated, uiStorageKey, chip, subChip, q, equipmentFilter, selectedIds, isRoutinePicker]);

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

  /** Explicit planner URL — avoids router.back() landing on the wrong screen. */
  const getRoutinePickerBackHref = useCallback(() => {
    const fromNav = getRoutinePlannerReturnHref(router.query);
    if (fromNav) return fromNav;
    const rt = getQueryParamString(router.query, "returnTo").toLowerCase();
    const day = routineDayNum;
    if (Number.isNaN(day) || day < 0 || day > 6) return "/plan";
    if (rt === "routine") return `/routine?day=${encodeURIComponent(String(day))}`;
    return `/plan?day=${encodeURIComponent(String(day))}`;
  }, [router.query, routineDayNum]);

  const routineForDay = useMemo(
    () => (isRoutinePicker ? getRoutineForDay(routineDayNum) : null),
    [isRoutinePicker, routineDayNum, getRoutineForDay, routines],
  );

  const savedRoutineExercises = useMemo(
    () => routineForDay?.routine_exercises || [],
    [routineForDay],
  );

  const savedRoutineNameSet = useMemo(
    () => new Set(savedRoutineExercises.map(ex => ex.exercise_name)),
    [savedRoutineExercises],
  );

  const pendingAddCount = useMemo(() => {
    let n = 0;
    for (const id of selectedIds) {
      const ex = exercises.find(e => e.id === id);
      if (ex && !savedRoutineNameSet.has(ex.name)) n += 1;
    }
    return n;
  }, [selectedIds, exercises, savedRoutineNameSet]);

  const registerExerciseRowRef = useCallback((id, el) => {
    if (el) exerciseRowRefs.current.set(id, el);
    else exerciseRowRefs.current.delete(id);
  }, []);

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
      void router.replace(getRoutinePickerBackHref());
      return;
    }
    router.back();
  }, [isRoutinePicker, router, getRoutinePickerBackHref]);

  const clearRoutineSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const filtered = useMemo(() => {
    let list = exercises || [];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(e => {
        if (e.name?.toLowerCase().includes(term) || e.category?.toLowerCase().includes(term))
          return true;
        const edb = e.metadata?.exercisedb;
        const muscleBlob = [
          ...(edb?.targetMuscles ?? []),
          ...(edb?.secondaryMuscles ?? []),
          ...(edb?.bodyParts ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return muscleBlob.includes(term);
      });
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
    if (equipmentFilter) {
      list = list.filter(e => exerciseMatchesEquipmentFilter(e, equipmentFilter));
    }
    return list.slice(0, 80);
  }, [exercises, q, chip, subChip, equipmentFilter]);

  const scrollToCatalogExercise = useCallback(exerciseId => {
    const el = exerciseRowRefs.current.get(exerciseId);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollFlashId(exerciseId);
    window.setTimeout(() => setScrollFlashId(prev => (prev === exerciseId ? null : prev)), 1200);
    return true;
  }, []);

  const scrollToSavedExercise = useCallback(
    exerciseName => {
      const catalogEx = exercises.find(e => e.name === exerciseName);
      if (!catalogEx) {
        toast.message("Exercise not found in catalog");
        return;
      }
      const visible = filtered.some(e => e.id === catalogEx.id);
      if (!visible) {
        pendingScrollExerciseId.current = catalogEx.id;
        setChip(null);
        setSubChip(null);
        setEquipmentFilter(null);
        setQ(exerciseName);
        return;
      }
      scrollToCatalogExercise(catalogEx.id);
    },
    [exercises, filtered, scrollToCatalogExercise],
  );

  useEffect(() => {
    const id = pendingScrollExerciseId.current;
    if (!id) return;
    pendingScrollExerciseId.current = null;
    const t = window.setTimeout(() => {
      if (!scrollToCatalogExercise(id)) {
        toast.message("Could not scroll to exercise — try searching by name");
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [filtered, scrollToCatalogExercise]);

  const routinePickerRowClass = (exId, extra = "") =>
    cn(
      extra,
      isRoutinePicker && scrollFlashId === exId
        ? isDarkMode
          ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-iron-950"
          : "ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50"
        : "",
      isRoutinePicker ? "scroll-mt-24" : "",
    );

  const subcategories = useMemo(() => getSubcategoriesForParent(chip), [chip]);

  const toggleSelect = useCallback(
    id => {
      const ex = exercises.find(e => e.id === id);
      if (ex && savedRoutineNameSet.has(ex.name)) {
        toast.message("Already in this routine");
        return;
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [exercises, savedRoutineNameSet],
  );

  const handleBatchAddToRoutine = async () => {
    if (!isRoutinePicker || pendingAddCount === 0) return;
    const picks = Array.from(selectedIds)
      .map(id => exercises.find(e => e.id === id))
      .filter(ex => ex && !savedRoutineNameSet.has(ex.name));
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
        const href = getRoutinePlannerReturnHref(router.query);
        if (href) await router.replace(href);
        return;
      }

      const existing = (routine.routine_exercises || []).map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: ex.target_sets || 3,
        notes: ex.notes != null && String(ex.notes).trim() ? String(ex.notes).trim().slice(0, 500) : null,
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
      setSelectedIds(new Set());
      const href = getRoutinePlannerReturnHref(router.query);
      if (href) await router.replace(href);
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
          isRoutinePicker && pendingAddCount > 0 ? "pb-40" : "pb-28"
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
            aria-label={isRoutinePicker ? "Back to workout planner" : "Go back"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-screen-title flex-1 min-w-0">
            Search exercise
          </h1>
        </div>
        {isRoutinePicker && (
          <p className={`mt-1.5 text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Green = saved · gold = new picks for {DAY_NAMES[routineDayNum]}
          </p>
        )}

        <div
          className={cn(
            "sticky z-20 -mx-5 px-5 pb-2 border-b",
            isDarkMode
              ? "top-0 bg-iron-950/95 backdrop-blur-sm border-iron-800/90"
              : "top-0 bg-slate-50/95 backdrop-blur-sm border-slate-200/90",
          )}
        >
          {isRoutinePicker && savedRoutineExercises.length > 0 ? (
            <div
              className={`mt-2 rounded-xl border ${
                isDarkMode ? "border-iron-700/80 bg-iron-900/50" : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => setPinnedSavedOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left ${
                  isDarkMode ? "hover:bg-iron-800/70" : "hover:bg-slate-50"
                }`}
                aria-expanded={pinnedSavedOpen}
              >
                <p className={`min-w-0 text-xs font-medium truncate ${isDarkMode ? "text-iron-200" : "text-slate-800"}`}>
                  <span className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
                    {DAY_NAMES[routineDayNum]} plan ·{" "}
                  </span>
                  {savedRoutineExercises.length} saved
                  {!pinnedSavedOpen ? (
                    <span className={isDarkMode ? "text-iron-500" : "text-slate-400"}> · tap to expand</span>
                  ) : null}
                </p>
                {pinnedSavedOpen ? (
                  <ChevronUp
                    className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                  />
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                  />
                )}
              </button>
              {pinnedSavedOpen ? (
                <div
                  className={`border-t rounded-b-xl overflow-hidden ${
                    isDarkMode ? "border-iron-800" : "border-slate-100"
                  }`}
                >
                  <div className={pillScrollerClass}>
                    <div className={cn(pillRowClass, "px-2")}>
                      {savedRoutineExercises.map(ex => {
                        const note =
                          ex.notes != null && String(ex.notes).trim() ? String(ex.notes).trim() : "";
                        return (
                          <button
                            key={ex.id || ex.exercise_name}
                            type="button"
                            onClick={() => scrollToSavedExercise(ex.exercise_name)}
                            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap pl-2.5 pr-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-colors ${
                              isDarkMode
                                ? "bg-iron-800/80 text-iron-200 border border-iron-700 hover:bg-iron-700"
                                : "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
                            }`}
                            aria-label={`Scroll to ${ex.exercise_name} in list`}
                          >
                            <Check
                              className={`w-3 h-3 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                              strokeWidth={2.5}
                            />
                            <span>{ex.exercise_name}</span>
                            {note ? (
                              <span className={`opacity-70 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                                · {note}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              isRoutinePicker && savedRoutineExercises.length > 0 ? "mt-2" : "mt-3",
            )}
          >
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search exercise…"
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none ${
              isDarkMode
                ? "bg-iron-900 border border-iron-800 text-iron-100 placeholder:text-iron-600"
                : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />

          <div className={cn(pillScrollerClass, "mt-2")}>
            <div className={pillRowClass}>
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
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
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
              <span
                className={`shrink-0 w-px h-4 self-center mx-0.5 ${isDarkMode ? "bg-iron-700" : "bg-slate-300"}`}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setEquipmentFilter(null)}
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  equipmentFilter == null
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100 ring-1 ring-inset ring-iron-500"
                      : "bg-slate-200 text-slate-900 ring-1 ring-inset ring-slate-400"
                    : isDarkMode
                      ? "bg-iron-800/80 text-iron-400"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                All equip.
              </button>
              {EQUIPMENT_FILTER_ROW.map(row => {
                const active = equipmentFilter === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setEquipmentFilter(active ? null : row.key)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? isDarkMode
                          ? "bg-iron-700 text-iron-100 ring-1 ring-inset ring-lift-primary/80"
                          : "bg-slate-200 text-slate-900 ring-1 ring-inset ring-workout-primary/70"
                        : isDarkMode
                          ? "bg-iron-800/80 text-iron-400"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.label}
                  </button>
                );
              })}
            </div>
          </div>

          {subcategories.length > 0 ? (
            <div className={cn(pillScrollerClass, "mt-1.5")}>
              <div className={pillRowClass}>
                <span
                  className={`shrink-0 self-center px-1 text-[10px] font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-iron-600" : "text-slate-400"
                  }`}
                >
                  Focus
                </span>
                <button
                  type="button"
                  onClick={() => setSubChip(null)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    subChip == null
                      ? isDarkMode
                        ? "bg-iron-700 text-iron-100 ring-1 ring-inset ring-iron-500"
                        : "bg-slate-200 text-slate-900 ring-1 ring-inset ring-slate-400"
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
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? isDarkMode
                            ? "bg-iron-700 text-iron-100 ring-1 ring-inset ring-lift-primary/80"
                            : "bg-slate-200 text-slate-900 ring-1 ring-inset ring-workout-primary/70"
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
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className={`flex rounded-lg p-0.5 ${
              isDarkMode ? "bg-iron-800" : "bg-slate-100"
            }`}>
              <button
                onClick={() => handleViewModeChange("list")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === "list"
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDarkMode
                      ? "text-iron-400 hover:text-iron-300"
                      : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                onClick={() => handleViewModeChange("card")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === "card"
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDarkMode
                      ? "text-iron-400 hover:text-iron-300"
                      : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className={`mt-6 ${viewMode === "card" ? "grid grid-cols-2 gap-3" : "space-y-2"}`}>
          {filtered.map(ex => {
            const inRoutine = savedRoutineNameSet.has(ex.name);
            const pendingAdd = selectedIds.has(ex.id) && !inRoutine;
            const highlighted = inRoutine || pendingAdd;
            
            if (viewMode === "card") {
              // Card view layout
              const cardClass = `w-full rounded-2xl overflow-hidden transition-colors ${
                isDarkMode
                  ? "bg-iron-900/50 border border-iron-800"
                  : "bg-white border border-slate-200 shadow-sm"
              }`;
              
              if (!isRoutinePicker) {
                return (
                  <div
                    key={ex.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPreview(ex.id)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPreview(ex.id);
                      }
                    }}
                    className={`${cardClass} cursor-pointer overflow-hidden text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isDarkMode
                        ? "hover:bg-iron-900 focus-visible:ring-lift-primary focus-visible:ring-offset-iron-950"
                        : "hover:bg-slate-50 focus-visible:ring-workout-primary focus-visible:ring-offset-slate-50"
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
                  </div>
                );
              }
              
              // Card view for routine picker (outer div avoids nested <button>)
              return (
                <div
                  key={ex.id}
                  ref={el => registerExerciseRowRef(ex.id, el)}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelect(ex.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelect(ex.id);
                    }
                  }}
                  className={routinePickerRowClass(
                    ex.id,
                    cn(
                      cardClass,
                      "text-left transition-all cursor-pointer",
                      highlighted
                        ? inRoutine
                          ? isDarkMode
                            ? "ring-2 ring-emerald-500/70"
                            : "ring-2 ring-emerald-500/60"
                          : isDarkMode
                            ? "ring-2 ring-lift-primary"
                            : "ring-2 ring-workout-primary"
                        : "",
                      isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-50",
                    ),
                  )}
                >
                  <div className="aspect-square relative">
                    <ExerciseThumbnail 
                      exercise={ex} 
                      isDarkMode={isDarkMode}
                    />
                    
                    {/* Selection indicator overlay */}
                    {highlighted && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            inRoutine
                              ? isDarkMode
                                ? "bg-emerald-500"
                                : "bg-emerald-600"
                              : isDarkMode
                                ? "bg-lift-primary"
                                : "bg-workout-primary"
                          }`}
                        >
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm leading-tight ${
                          highlighted
                            ? inRoutine
                              ? isDarkMode
                                ? "text-emerald-300"
                                : "text-emerald-700"
                              : isDarkMode
                                ? "text-lift-primary"
                                : "text-workout-primary"
                            : isDarkMode
                              ? "text-iron-100"
                              : "text-slate-900"
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
                <div
                  key={ex.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(ex.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreview(ex.id);
                    }
                  }}
                  className={`${baseCard} cursor-pointer p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isDarkMode
                      ? "hover:bg-iron-900 focus-visible:ring-lift-primary focus-visible:ring-offset-iron-950"
                      : "hover:bg-slate-50 focus-visible:ring-workout-primary focus-visible:ring-offset-slate-50"
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
                </div>
              );
            }

            return (
              <div
                key={ex.id}
                ref={el => registerExerciseRowRef(ex.id, el)}
                className={routinePickerRowClass(
                  ex.id,
                  cn(
                    baseCard,
                    highlighted
                      ? inRoutine
                        ? isDarkMode
                          ? "ring-2 ring-emerald-500/70 border-emerald-500/40 bg-emerald-500/10"
                          : "ring-2 ring-emerald-500/60 border-emerald-500/30 bg-emerald-50"
                        : isDarkMode
                          ? "ring-2 ring-lift-primary border-lift-primary/50 bg-lift-primary/10"
                          : "ring-2 ring-workout-primary border-workout-primary/40 bg-workout-primary/[0.07]"
                      : "",
                  ),
                )}
              >
                {exerciseMediaUrl(ex) ? (
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
                ) : (
                  <div className="m-3 flex shrink-0 items-center justify-center rounded-xl">
                    <ExerciseListThumbnail exercise={ex} isDarkMode={isDarkMode} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleSelect(ex.id)}
                  className="flex-1 py-3 pr-3 pl-0 text-left min-w-0 rounded-r-2xl flex items-start gap-2"
                  aria-pressed={pendingAdd}
                  aria-label={
                    inRoutine
                      ? `${ex.name} is already in this routine`
                      : pendingAdd
                        ? `Deselect ${ex.name}`
                        : `Select ${ex.name}`
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${
                        highlighted
                          ? inRoutine
                            ? isDarkMode
                              ? "text-emerald-300"
                              : "text-emerald-700"
                            : isDarkMode
                              ? "text-lift-primary"
                              : "text-workout-primary"
                          : isDarkMode
                            ? "text-iron-100"
                            : "text-slate-900"
                      }`}
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
                  {highlighted ? (
                    <span
                      className={`shrink-0 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${
                        inRoutine
                          ? isDarkMode
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-600 text-white"
                          : isDarkMode
                            ? "bg-lift-primary text-iron-950"
                            : "bg-workout-primary text-white"
                      }`}
                      aria-hidden
                    >
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : null}
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
            if (router.query.returnTo) p.set("returnTo", String(router.query.returnTo));
            if (router.query.day) p.set("day", String(router.query.day));
            if (router.query.sessionId) p.set("sessionId", String(router.query.sessionId));
            if (router.query.routineDay) p.set("routineDay", String(router.query.routineDay));
            const addReturn = getQueryParamString(router.query, "addReturn");
            if (addReturn) p.set("addReturn", addReturn);
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

      {isRoutinePicker && pendingAddCount > 0 ? (
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
          <div className="my-3 flex items-stretch gap-2">
            <button
              type="button"
              onClick={clearRoutineSelection}
              className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl font-semibold text-sm ${
                isDarkMode
                  ? "border border-iron-600 text-iron-200 hover:bg-iron-800"
                  : "border border-slate-300 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <XCircle className="w-4 h-4 shrink-0" />
              Clear
            </button>
            <button
              type="button"
              disabled={addingBatch}
              onClick={handleBatchAddToRoutine}
              className={`flex-1 min-w-0 py-3.5 rounded-2xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <ListChecks className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
              {addingBatch ? "Adding…" : `Add ${pendingAddCount} to routine`}
            </button>
          </div>
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
            "!max-h-[min(92dvh,760px)] flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <ModalHeader className="shrink-0 pb-2">
            <ModalTitle
              className={cn("pr-10 line-clamp-2", isDarkMode ? "!text-iron-50" : "!text-slate-900")}
            >
              {previewExercise?.name ?? "Exercise"}
            </ModalTitle>
          </ModalHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-1">
            {previewExercise ? (
              <ExercisePreviewPanel
                exercise={previewExercise}
                isDarkMode={isDarkMode}
                hideHeading
                variant="sheet"
              />
            ) : null}
          </div>
        </ModalContent>
      </Modal>
    </Layout>
  );
}
