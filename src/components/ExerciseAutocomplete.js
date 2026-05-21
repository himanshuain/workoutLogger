import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { Search, Plus, Check, X } from "lucide-react";
import { CompletionBadge } from "@/components/CompletionToggle";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseMediaUrl } from "@/lib/exerciseMedia";
import {
  dedupeExercisesForPicker,
  normalizeExerciseName,
} from "@/lib/dedupeExercisesForPicker";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "legs", label: "Legs" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "core", label: "Core" },
  { id: "other", label: "Other" },
];

export default function ExerciseAutocomplete({
  exercises = [],
  recentExercises = [],
  loggedToday = new Set(),
  onSelect,
  onClose,
  isDarkMode = true,
  multiSelect = false,
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const searchRef = useRef(null);

  const dedupedExercises = useMemo(
    () => dedupeExercisesForPicker(exercises),
    [exercises],
  );

  const nameToCanonical = useMemo(() => {
    const m = new Map();
    for (const e of dedupedExercises) {
      m.set(normalizeExerciseName(e.name), e);
    }
    return m;
  }, [dedupedExercises]);

  const filteredExercises = useMemo(() => {
    let list = dedupedExercises;
    if (activeCategory !== "all") {
      list = list.filter(e => (e.category || "other").toLowerCase() === activeCategory);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        e => e.name.toLowerCase().includes(s) || e.category?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [dedupedExercises, search, activeCategory]);

  const alphabetGroups = useMemo(() => {
    const groups = {};
    filteredExercises.forEach(ex => {
      const letter = ex.name[0]?.toUpperCase() || "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(ex);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredExercises]);

  const filteredRecent = useMemo(() => {
    if (search) return [];
    if (activeCategory !== "all") return [];
    const seen = new Set();
    const out = [];
    for (const e of recentExercises) {
      const key = normalizeExerciseName(e.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(nameToCanonical.get(key) ?? e);
      if (out.length >= 5) break;
    }
    return out;
  }, [recentExercises, search, activeCategory, nameToCanonical]);

  const handleSelect = (exercise) => {
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    if (multiSelect) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(exercise.id)) next.delete(exercise.id);
        else next.add(exercise.id);
        return next;
      });
    } else {
      onSelect(exercise);
    }
  };

  const handleDone = () => {
    if (multiSelect) {
      const selectedExercises = dedupedExercises.filter(e => selected.has(e.id));
      selectedExercises.forEach(e => onSelect(e));
    }
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Category Tabs */}
      <div className={`border-b flex-shrink-0 ${isDarkMode ? "border-iron-800" : "border-slate-200"}`}>
        <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent Section */}
        {filteredRecent.length > 0 && (
          <div className="px-3 pt-2">
            <p className={`px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
              isDarkMode ? "text-iron-500" : "text-slate-400"
            }`}>
              Recent
            </p>
            {filteredRecent.map(exercise => (
              <ExerciseRow
                key={`recent-${exercise.id}`}
                exercise={exercise}
                isDarkMode={isDarkMode}
                isLogged={loggedToday.has(exercise.name)}
                isSelected={selected.has(exercise.id)}
                onSelect={() => handleSelect(exercise)}
              />
            ))}
          </div>
        )}

        {/* Alphabetical Groups */}
        {alphabetGroups.map(([letter, exList]) => (
          <div key={letter} className="px-3">
            <p className={`px-1 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${
              isDarkMode ? "text-iron-600" : "text-slate-400"
            }`}>
              {letter}
            </p>
            {exList.map(exercise => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                isDarkMode={isDarkMode}
                isLogged={loggedToday.has(exercise.name)}
                isSelected={selected.has(exercise.id)}
                onSelect={() => handleSelect(exercise)}
              />
            ))}
          </div>
        ))}

        {/* Empty State */}
        {filteredExercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className={`w-14 h-14 rounded-card flex items-center justify-center mb-3 ${
              isDarkMode ? "bg-iron-800" : "bg-slate-100"
            }`}>
              <Search className={`w-7 h-7 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`} />
            </div>
            <p className={isDarkMode ? "text-iron-400" : "text-slate-500"}>No exercises found</p>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
              Try a different search or category
            </p>
          </div>
        )}
      </div>

      {/* Bottom Bar: Search + Done */}
      <div
        className={`flex-shrink-0 border-t px-3 py-2.5 flex items-center gap-2 ${
          isDarkMode ? "border-iron-800 bg-iron-900/80" : "border-slate-200 bg-white/80"
        }`}
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-card ${
          isDarkMode ? "bg-iron-800" : "bg-slate-100"
        }`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search for an exercise"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDarkMode
                ? "text-iron-100 placeholder:text-iron-500"
                : "text-slate-800 placeholder:text-slate-400"
            }`}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className={`w-4 h-4 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
            </button>
          )}
        </div>
        <button
          onClick={handleDone}
          className={`px-4 py-2 rounded-card text-sm font-bold flex items-center gap-1.5 ${
            isDarkMode
              ? "bg-iron-100 text-iron-900"
              : "bg-slate-900 text-white"
          }`}
        >
          Done
          {multiSelect && selected.size > 0 && (
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              isDarkMode ? "bg-iron-900 text-iron-100" : "bg-white text-slate-900"
            }`}>
              {selected.size}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function ExerciseRow({ exercise, isDarkMode, isLogged, isSelected, onSelect }) {
  const mediaUrl = exerciseMediaUrl(exercise);
  const hasMedia = Boolean(mediaUrl);

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3.5 px-2 py-3 rounded-card transition-colors ${
        isDarkMode ? "active:bg-iron-800/70" : "active:bg-slate-50"
      }`}
    >
      <div
        className={`relative isolate h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-card border ${
          isDarkMode
            ? "border-iron-700/80 bg-iron-900"
            : "border-slate-200/90 bg-white"
        }`}
      >
        {hasMedia ? (
          <Image
            src={mediaUrl}
            alt=""
            fill
            unoptimized
            sizes="72px"
            className="object-contain p-1"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              isDarkMode ? "bg-iron-800/90" : "bg-slate-100"
            }`}
          >
            <ExerciseIcon
              name={exercise.name}
              className="h-10 w-10"
              color={isDarkMode ? "#a1a1aa" : "#64748b"}
            />
          </div>
        )}
        {isLogged ? (
          <span className="absolute bottom-1 right-1">
            <CompletionBadge isDarkMode={isDarkMode} />
          </span>
        ) : null}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p
          className={`text-[15px] font-semibold leading-snug ${
            isLogged
              ? isDarkMode
                ? "text-lift-primary"
                : "text-workout-primary"
              : isDarkMode
                ? "text-iron-100"
                : "text-slate-800"
          }`}
        >
          {exercise.name}
        </p>
        <p className={`mt-0.5 text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          {exercise.category || "Other"}
        </p>
      </div>
      {isLogged ? (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isDarkMode ? "text-lift-primary bg-lift-primary/10" : "text-workout-primary bg-workout-primary/10"
        }`}>
          Logged
        </span>
      ) : isSelected ? (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
        }`}>
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      ) : (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          isDarkMode ? "bg-iron-800 text-iron-500" : "bg-slate-100 text-slate-400"
        }`}>
          <Plus className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}
