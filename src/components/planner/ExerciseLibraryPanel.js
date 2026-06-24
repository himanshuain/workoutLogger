import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, LayoutGrid, List, Search } from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";
import ExerciseListThumbnail from "@/components/exercises/ExerciseListThumbnail";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  PARENT_CHIPS,
  getSubcategoriesForParent,
  exerciseMatchesSubFilter,
} from "@/lib/exerciseSubcategories";
import {
  EQUIPMENT_FILTER_ROW,
  exerciseMatchesEquipmentFilter,
} from "@/lib/exerciseEquipmentFilter";
import { exerciseMatchesSearch } from "@/lib/exerciseCatalog";
import { exerciseMediaUrl, exerciseImageUnoptimized, getExerciseEquipment } from "@/lib/exerciseMedia";

const pillScrollerClass =
  "overflow-x-auto overscroll-x-contain py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const pillRowClass = "flex flex-nowrap items-center gap-1.5 w-max min-w-full";

function LibraryCardThumbnail({ exercise, isDarkMode, mediaOverrides }) {
  const [failed, setFailed] = useState(false);
  const url = exerciseMediaUrl(exercise, mediaOverrides);

  if (!url || failed) {
    return (
      <div
        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 ${
          isDarkMode ? "bg-iron-800 text-iron-500" : "bg-surface-interactive text-[color:var(--text-muted)]"
        }`}
      >
        <ExerciseIcon name={exercise.name} className="h-10 w-10" color="currentColor" />
      </div>
    );
  }

  return (
    <div className={`relative aspect-square w-full ${isDarkMode ? "bg-iron-800" : "bg-surface-interactive"}`}>
      <Image
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 50vw, 200px"
        unoptimized={exerciseImageUnoptimized(url)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ExerciseLibraryPanel({
  exercises = [],
  isDarkMode,
  mediaOverrides,
  className,
  embedded = false,
  previewId: previewIdProp,
  onPreviewIdChange,
}) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("");
  const [chip, setChip] = useState(null);
  const [subChip, setSubChip] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState(null);
  const [viewMode, setViewMode] = useState("card");
  const [previewIdInternal, setPreviewIdInternal] = useState(null);

  const previewControlled = embedded && onPreviewIdChange != null;
  const previewId = previewControlled ? (previewIdProp ?? null) : previewIdInternal;
  const setPreviewId = useCallback(
    id => {
      if (previewControlled) onPreviewIdChange(id);
      else setPreviewIdInternal(id);
    },
    [previewControlled, onPreviewIdChange],
  );

  const subcategories = useMemo(
    () => (chip && chip !== "Full Body" ? getSubcategoriesForParent(chip) : []),
    [chip],
  );

  const filtered = useMemo(() => {
    let list = exercises || [];
    const term = q.trim();
    if (term) list = list.filter(e => exerciseMatchesSearch(e, term));
    if (chip && chip !== "Full Body") {
      list = list.filter(
        e =>
          (e.category || "").toLowerCase() === chip.toLowerCase() ||
          (e.category || "").toLowerCase().includes(chip.toLowerCase()),
      );
    }
    if (subChip && chip && chip !== "Full Body") {
      list = list.filter(e => exerciseMatchesSubFilter(e, chip, subChip));
    }
    if (equipmentFilter) {
      list = list.filter(e => exerciseMatchesEquipmentFilter(e, equipmentFilter));
    }
    return list.slice(0, 72);
  }, [exercises, q, chip, subChip, equipmentFilter]);

  const previewExercise = useMemo(
    () => (previewId ? exercises.find(e => e.id === previewId) ?? null : null),
    [previewId, exercises],
  );

  const openPreview = useCallback(id => setPreviewId(id), [setPreviewId]);
  const closePreview = useCallback(() => setPreviewId(null), [setPreviewId]);

  const cardShell = cn(
    "overflow-hidden rounded-card border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isDarkMode
      ? "border-surface-subtle bg-surface-section hover:bg-surface-interactive focus-visible:ring-lift-primary focus-visible:ring-offset-iron-950"
      : "border-surface-subtle bg-surface-section shadow-sm hover:bg-surface-interactive focus-visible:ring-workout-primary focus-visible:ring-offset-[color:var(--surface-page)]",
  );

  const libraryBody = (
        <div
          className={cn(
            "space-y-3",
            embedded
              ? ""
              : cn(
                  "mt-3 rounded-card border p-4",
                  isDarkMode
                    ? "border-surface-subtle bg-surface-section/60"
                    : "border-surface-subtle bg-surface-section shadow-sm",
                ),
          )}
        >
          <div className="relative">
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"
              }`}
            />
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search exercises…"
              className={cn(
                "w-full rounded-card py-2.5 pl-9 pr-3 text-sm outline-none",
                isDarkMode
                  ? "border border-surface-subtle bg-surface-interactive text-iron-100 placeholder:text-iron-600"
                  : "border border-surface-subtle bg-white text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]",
              )}
            />
          </div>

          <div className={pillScrollerClass}>
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
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-pill px-3 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950"
                          : "bg-workout-primary text-white"
                        : isDarkMode
                          ? "bg-surface-interactive text-iron-300"
                          : "bg-surface-interactive text-[color:var(--text-secondary)]",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {subcategories.length > 0 ? (
            <div className={pillScrollerClass}>
              <div className={pillRowClass}>
                <button
                  type="button"
                  onClick={() => setSubChip(null)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-medium",
                    subChip == null
                      ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-surface-pressed text-[color:var(--text-primary)]"
                      : isDarkMode ? "bg-surface-interactive text-iron-400" : "bg-surface-interactive text-[color:var(--text-muted)]",
                  )}
                >
                  All
                </button>
                {subcategories.map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSubChip(subChip === s.label ? null : s.label)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-medium",
                      subChip === s.label
                        ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-surface-pressed text-[color:var(--text-primary)]"
                        : isDarkMode ? "bg-surface-interactive text-iron-400" : "bg-surface-interactive text-[color:var(--text-muted)]",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={pillScrollerClass}>
            <div className={pillRowClass}>
              <button
                type="button"
                onClick={() => setEquipmentFilter(null)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-medium",
                  equipmentFilter == null
                    ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-surface-pressed text-[color:var(--text-primary)]"
                    : isDarkMode ? "bg-surface-interactive text-iron-400" : "bg-surface-interactive text-[color:var(--text-muted)]",
                )}
              >
                All equip.
              </button>
              {EQUIPMENT_FILTER_ROW.map(row => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => setEquipmentFilter(equipmentFilter === row.key ? null : row.key)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-medium",
                    equipmentFilter === row.key
                      ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-surface-pressed text-[color:var(--text-primary)]"
                      : isDarkMode ? "bg-surface-interactive text-iron-400" : "bg-surface-interactive text-[color:var(--text-muted)]",
                  )}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`}>
              {filtered.length} shown{filtered.length >= 72 ? "+" : ""}
            </p>
            <div className={cn("flex rounded-pill p-0.5", isDarkMode ? "bg-surface-interactive" : "bg-surface-interactive")}>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                  viewMode === "list"
                    ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-white text-[color:var(--text-primary)] shadow-sm"
                    : isDarkMode ? "text-iron-400" : "text-[color:var(--text-muted)]",
                )}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                  viewMode === "card"
                    ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-white text-[color:var(--text-primary)] shadow-sm"
                    : isDarkMode ? "text-iron-400" : "text-[color:var(--text-muted)]",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>
          </div>

          <div
            className={cn(
              "overflow-y-auto scrollbar-thin pr-0.5",
              embedded ? "max-h-[min(68vh,640px)]" : "max-h-[min(52vh,520px)]",
              viewMode === "card" ? "grid grid-cols-2 gap-3 lg:grid-cols-3" : "space-y-2",
            )}
          >
            {filtered.length === 0 ? (
              <p className={`col-span-full py-8 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`}>
                No exercises match your filters
              </p>
            ) : null}

            {filtered.map(ex => {
              if (viewMode === "card") {
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => openPreview(ex.id)}
                    className={cardShell}
                  >
                    <LibraryCardThumbnail exercise={ex} isDarkMode={isDarkMode} mediaOverrides={mediaOverrides} />
                    <div className="p-2.5 text-left">
                      <p className={`line-clamp-2 text-sm font-semibold leading-snug ${isDarkMode ? "text-iron-100" : "text-[color:var(--text-primary)]"}`}>
                        {ex.name}
                      </p>
                      <p className={`mt-0.5 text-[11px] capitalize ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`}>
                        {ex.user_id ? "Custom · " : ""}{ex.category || "General"}
                      </p>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => openPreview(ex.id)}
                  className={cn(cardShell, "flex w-full items-center gap-3 p-3")}
                >
                  <ExerciseListThumbnail exercise={ex} isDarkMode={isDarkMode} mediaOverrides={mediaOverrides} />
                  <div className="min-w-0 flex-1 text-left">
                    <p className={`font-semibold leading-snug line-clamp-2 break-words ${isDarkMode ? "text-iron-100" : "text-[color:var(--text-primary)]"}`}>
                      {ex.name}
                    </p>
                    <p className={`mt-0.5 text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`}>
                      {ex.user_id ? "Custom · " : ""}{ex.category || "General"}
                      {getExerciseEquipment(ex) ? ` · ${getExerciseEquipment(ex)}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
  );

  return (
    <section className={cn(embedded ? "" : "mt-10", className)}>
      {!embedded ? (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-card border px-4 py-3 text-left",
            isDarkMode ? "border-surface-subtle bg-surface-section" : "border-surface-subtle bg-surface-section shadow-sm",
          )}
        >
          <div>
            <p className="text-section-header">Exercise library</p>
            <p className={`mt-0.5 text-sm ${isDarkMode ? "text-iron-400" : "text-[color:var(--text-secondary)]"}`}>
              Browse {exercises.length} exercises — tap to preview
            </p>
          </div>
          {open ? (
            <ChevronUp className={`h-5 w-5 shrink-0 ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`} />
          ) : (
            <ChevronDown className={`h-5 w-5 shrink-0 ${isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]"}`} />
          )}
        </button>
      ) : (
        <p className={`mb-3 text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
          Browse {exercises.length} exercises — tap to preview
        </p>
      )}

      {open || embedded ? libraryBody : null}

      <Modal open={Boolean(previewExercise)} onOpenChange={v => !v && closePreview()}>
        <ModalContent
          showCloseButton
          className={cn(
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-surface-section border-surface-subtle",
            "!max-h-[min(92dvh,760px)] flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <ModalHeader className="shrink-0 pb-2">
            <ModalTitle className={cn("line-clamp-2 pr-10", isDarkMode ? "!text-iron-50" : "!text-[color:var(--text-primary)]")}>
              {previewExercise?.name ?? "Exercise"}
            </ModalTitle>
          </ModalHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y">
            {previewExercise ? (
              <ExercisePreviewPanel
                exercise={previewExercise}
                isDarkMode={isDarkMode}
                hideHeading
                hideActions
                variant="sheet"
                onOpenExercise={ex => setPreviewId(ex.id)}
              />
            ) : null}
          </div>
        </ModalContent>
      </Modal>
    </section>
  );
}
