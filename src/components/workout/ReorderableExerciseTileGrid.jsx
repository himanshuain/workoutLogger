import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import ExercisePreviewButton from "@/components/planner/ExercisePreviewButton";
import ExerciseSessionResetButton from "@/components/workout/ExerciseSessionResetButton";
import {
  getWorkoutExerciseLayout,
  setWorkoutExerciseLayout,
  tileSizeGridClass,
  isListLayout,
} from "@/lib/workoutTileSize";

function loggedSetLabel(count) {
  return `${count} set${count !== 1 ? "s" : ""}`;
}

function loggedCardClass(hasLogged, isDarkMode, dragging) {
  return cn(
    dragging ? "z-30 opacity-90 shadow-lg" : "z-0",
    hasLogged
      ? isDarkMode
        ? "bg-emerald-500/12 border-emerald-500/45 ring-1 ring-emerald-500/25"
        : "bg-emerald-50/90 border-emerald-400 shadow-sm"
      : isDarkMode
        ? "bg-iron-900/60 border-iron-800"
        : "bg-white border-slate-200 shadow-sm",
  );
}

function listActionBtnClass() {
  return "!h-8 !w-8";
}

function SortableExerciseTile({
  ex,
  tileSize,
  isDarkMode,
  media,
  showPlaceholder,
  onThumbError,
  onOpen,
  loggedCount,
  showReset,
  onReset,
  resetting,
  onRemoveAdded,
  exercisesCatalog,
}) {
  const id = ex.exercise_name;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasTrash = ex.added_today;
  const hasLogged = loggedCount > 0;
  const compact = tileSize === "compact";
  const pillSize = compact ? "!h-7 !text-[9px]" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex min-w-0 flex-col rounded-card overflow-hidden border",
        loggedCardClass(hasLogged, isDarkMode, isDragging),
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0.5 top-0.5 z-20 touch-none cursor-grab active:cursor-grabbing rounded-md",
          compact ? "p-0" : "p-0.5",
          isDarkMode ? "bg-iron-950/70 text-iron-500" : "bg-white/90 text-slate-400 shadow-sm",
        )}
        aria-label={`Reorder ${ex.exercise_name}`}
      >
        <GripVertical className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      {hasTrash ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemoveAdded?.(ex.exercise_name);
          }}
          className={cn(
            "absolute right-0.5 top-0.5 z-20 flex items-center justify-center rounded-md border",
            compact ? "h-6 w-6" : "h-7 w-7",
            isDarkMode
              ? "border-iron-700/80 bg-iron-900/80 text-iron-400 hover:text-red-400"
              : "border-slate-200 bg-white/95 text-slate-400 hover:text-red-600",
          )}
          aria-label={`Remove ${ex.exercise_name}`}
        >
          <Trash2 className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(ex.exercise_name, ex.category)}
        className="flex w-full min-w-0 flex-col text-left"
      >
        <div
          className={cn(
            "relative aspect-square w-full",
            isDarkMode ? "bg-iron-800" : "bg-slate-100",
          )}
        >
          {!showPlaceholder ? (
            <Image
              src={media}
              alt=""
              fill
              className="object-cover"
              sizes={compact ? "33vw" : "50vw"}
              unoptimized={exerciseImageUnoptimized(media)}
              onError={onThumbError}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <ExerciseIcon
                name={ex.exercise_name}
                className={compact ? "w-6 h-6" : "w-8 h-8"}
                color={isDarkMode ? "#71717a" : "#94a3b8"}
              />
              {!compact ? (
                <span
                  className={`text-[9px] font-medium ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                >
                  No image
                </span>
              ) : null}
            </div>
          )}
          {hasLogged ? (
            <span
              className={cn(
                "absolute bottom-1 left-1 right-1 mx-auto max-w-[calc(100%-0.5rem)] truncate text-center font-bold rounded-md px-1 py-0.5",
                compact ? "text-[9px]" : "text-[10px]",
                isDarkMode ? "bg-emerald-600/95 text-white" : "bg-emerald-600 text-white",
              )}
            >
              {loggedSetLabel(loggedCount)}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "px-1.5 font-semibold leading-snug line-clamp-2",
            compact ? "py-1 text-[10px] min-h-[2rem]" : "py-2 text-xs min-h-[2.5rem]",
            hasLogged
              ? isDarkMode
                ? "text-emerald-100"
                : "text-emerald-900"
              : isDarkMode
                ? "text-iron-100"
                : "text-slate-900",
          )}
        >
          {ex.exercise_name}
        </p>
      </button>

      <div
        className={cn(
          "flex w-full min-w-0 gap-1",
          compact ? "px-1 pb-1 pt-0.5" : "px-1.5 pb-1.5 pt-0.5",
        )}
      >
        <ExercisePreviewButton
          exerciseName={ex.exercise_name}
          exerciseId={ex.exercise_id}
          category={ex.category}
          notes={ex.notes}
          exercises={exercisesCatalog}
          isDarkMode={isDarkMode}
          variant="pill"
          className={pillSize}
        />
        {showReset ? (
          <ExerciseSessionResetButton
            exerciseName={ex.exercise_name}
            isDarkMode={isDarkMode}
            variant="pill"
            disabled={resetting}
            onClick={onReset}
            className={pillSize}
          />
        ) : null}
      </div>
    </div>
  );
}

function SortableExerciseListRow({
  ex,
  isDarkMode,
  media,
  showPlaceholder,
  onThumbError,
  onOpen,
  loggedCount,
  showReset,
  onReset,
  resetting,
  onRemoveAdded,
  exercisesCatalog,
}) {
  const id = ex.exercise_name;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasTrash = ex.added_today;
  const hasLogged = loggedCount > 0;
  const actionBtn = listActionBtnClass();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex min-w-0 items-stretch gap-2 rounded-card border p-2",
        loggedCardClass(hasLogged, isDarkMode, isDragging),
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "shrink-0 touch-none cursor-grab active:cursor-grabbing self-center rounded-md p-1",
          isDarkMode ? "text-iron-500" : "text-slate-400",
        )}
        aria-label={`Reorder ${ex.exercise_name}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => onOpen(ex.exercise_name, ex.category)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <div
          className={cn(
            "relative h-12 w-12 shrink-0 overflow-hidden rounded-lg",
            isDarkMode ? "bg-iron-800" : "bg-slate-100",
          )}
        >
          {!showPlaceholder ? (
            <Image
              src={media}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
              unoptimized={exerciseImageUnoptimized(media)}
              onError={onThumbError}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ExerciseIcon
                name={ex.exercise_name}
                className="w-6 h-6"
                color={isDarkMode ? "#71717a" : "#94a3b8"}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold leading-snug line-clamp-2",
              hasLogged
                ? isDarkMode
                  ? "text-emerald-100"
                  : "text-emerald-900"
                : isDarkMode
                  ? "text-iron-100"
                  : "text-slate-900",
            )}
          >
            {ex.exercise_name}
          </p>
          {hasLogged ? (
            <p
              className={cn(
                "mt-0.5 text-xs font-semibold",
                isDarkMode ? "text-emerald-400" : "text-emerald-700",
              )}
            >
              {loggedSetLabel(loggedCount)}
            </p>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 self-center">
        {hasTrash ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onRemoveAdded?.(ex.exercise_name);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border",
              isDarkMode
                ? "border-iron-700/80 text-iron-400 hover:text-red-400"
                : "border-slate-200 text-slate-400 hover:text-red-600",
            )}
            aria-label={`Remove ${ex.exercise_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
        {showReset ? (
          <ExerciseSessionResetButton
            exerciseName={ex.exercise_name}
            isDarkMode={isDarkMode}
            variant="inline"
            disabled={resetting}
            onClick={onReset}
            className={cn(actionBtn, "!relative !top-auto !right-auto")}
          />
        ) : null}
        <ExercisePreviewButton
          exerciseName={ex.exercise_name}
          exerciseId={ex.exercise_id}
          category={ex.category}
          notes={ex.notes}
          exercises={exercisesCatalog}
          isDarkMode={isDarkMode}
          variant="inline"
          className={actionBtn}
        />
      </div>
    </div>
  );
}

function LayoutToggle({ value, onChange, isDarkMode }) {
  const btn = (layout, label) => {
    const active = value === layout;
    return (
      <button
        type="button"
        onClick={() => onChange(layout)}
        aria-pressed={active}
        className={cn(
          "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap",
          active
            ? isDarkMode
              ? "bg-iron-700 text-iron-100"
              : "bg-white text-slate-800 shadow-sm"
            : isDarkMode
              ? "text-iron-500 hover:text-iron-300"
              : "text-slate-500 hover:text-slate-700",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      className={cn(
        "flex gap-0.5 rounded-lg p-0.5",
        isDarkMode ? "bg-iron-900/80" : "bg-slate-100",
      )}
      role="group"
      aria-label="Exercise layout"
    >
      {btn("list", "List")}
      {btn("normal", "Medium")}
      {btn("compact", "Small")}
    </div>
  );
}

/**
 * Reorderable exercise tile grid (GIF on top, name below). Uses rect sort for 2-column / 3-column grids.
 */
export default function ReorderableExerciseTileGrid({
  exercises,
  isDarkMode,
  onReorder,
  onOpen,
  resolveMedia,
  thumbFailed,
  onThumbFailed,
  completedSetCountFor,
  showResetFor,
  onResetExercise,
  resettingExercise,
  onRemoveAdded,
  exercisesCatalog,
  className = "",
  showSizeToggle = true,
}) {
  const [layout, setLayout] = useState(() => getWorkoutExerciseLayout());

  useEffect(() => {
    setLayout(getWorkoutExerciseLayout());
  }, []);

  const handleLayoutChange = useCallback(next => {
    setWorkoutExerciseLayout(next);
    setLayout(next);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const ids = exercises.map(ex => ex.exercise_name);

  const exerciseGroups = useMemo(() => groupExercisesByArea(exercises), [exercises]);

  const renderExercise = ex => {
    const media = resolveMedia(ex.exercise_name);
    const showPlaceholder = !media || thumbFailed[ex.exercise_name];
    const shared = {
      ex,
      isDarkMode,
      media,
      showPlaceholder,
      onThumbError: () => onThumbFailed(ex.exercise_name),
      onOpen,
      loggedCount: completedSetCountFor?.(ex.exercise_name) ?? 0,
      showReset: showResetFor?.(ex.exercise_name),
      onReset: onResetExercise,
      resetting: resettingExercise === ex.exercise_name,
      onRemoveAdded,
      exercisesCatalog,
    };
    if (isListLayout(layout)) {
      return <SortableExerciseListRow key={ex.exercise_name} {...shared} />;
    }
    return (
      <SortableExerciseTile key={ex.exercise_name} {...shared} tileSize={layout} />
    );
  };

  const groupHeaderClass = cn(
    "sticky top-0 z-20 font-semibold uppercase tracking-wide",
    "border-b backdrop-blur-md supports-[backdrop-filter]:bg-opacity-95",
    isListLayout(layout)
      ? "-mx-0 px-0 py-1.5 text-[11px]"
      : "col-span-full -mx-0 px-0 py-1.5 text-[10px]",
    isDarkMode
      ? "border-iron-800/80 bg-iron-950/92 text-iron-400"
      : "border-slate-200/80 bg-surface-section/95 text-slate-500",
  );

  const handleDragEnd = event => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(exercises, oldIndex, newIndex);
    onReorder(next);
  };

  if (!exercises?.length) return null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            isDarkMode ? "text-iron-600" : "text-slate-400",
          )}
        >
          Drag to reorder
        </span>
        {showSizeToggle ? (
          <LayoutToggle value={layout} onChange={handleLayoutChange} isDarkMode={isDarkMode} />
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={ids}
          strategy={isListLayout(layout) ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <div
            className={cn(isListLayout(layout) ? "flex flex-col gap-2" : cn("grid", tileSizeGridClass(layout)))}
          >
            {exerciseGroups.map(group => (
              <Fragment key={group.area}>
                <div className={groupHeaderClass}>
                  {group.label}
                  <span className={cn("ml-1.5 font-medium normal-case tracking-normal", isDarkMode ? "text-iron-600" : "text-slate-400")}>
                    · {group.exercises.length}
                  </span>
                </div>
                {group.exercises.map(renderExercise)}
              </Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
