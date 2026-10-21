import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import ExerciseMediaImage from "@/components/exercises/ExerciseMediaImage";
import {
  DndContext,
  closestCenter,
  MouseSensor,
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
import { MoreVertical, Trash2 } from "lucide-react";
import { resolveExerciseForPreview } from "@/lib/plannerLibraryNavigation";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  getWorkoutExerciseLayout,
  setWorkoutExerciseLayout,
  tileSizeGridClass,
  loggedMiniTileScrollOuterClass,
  loggedMiniTileScrollInnerClass,
  isListLayout,
} from "@/lib/workoutTileSize";

function loggedSetLabel(count) {
  return `${count} set${count !== 1 ? "s" : ""}`;
}

const LOGGED_TILE_SECTION = "__logged__";

function loggedCardClass(hasLogged, isDarkMode, dragging, solidLoggedTile) {
  return cn(
    dragging ? "z-30 opacity-90 shadow-lg" : "z-0",
    hasLogged
      ? solidLoggedTile
        ? isDarkMode
          ? "border-emerald-500 bg-emerald-600"
          : "border-emerald-600 bg-emerald-500"
        : isDarkMode
          ? "bg-emerald-500/12 border-emerald-500/45 ring-1 ring-emerald-500/25"
          : "bg-emerald-50/90 border-emerald-400 shadow-sm"
      : isDarkMode
        ? "bg-iron-900/60 border-iron-800"
        : "bg-white border-slate-200 shadow-sm",
  );
}

function buildExerciseDisplayGroups(exercises, completedSetCountFor, prioritizeLoggedTiles) {
  if (!prioritizeLoggedTiles) {
    return groupExercisesByArea(exercises);
  }
  const logged = [];
  const pending = [];
  for (const ex of exercises || []) {
    const count = completedSetCountFor?.(ex.exercise_name) ?? 0;
    if (count > 0) logged.push(ex);
    else pending.push(ex);
  }
  const sections = [];
  if (logged.length) {
    sections.push({ area: LOGGED_TILE_SECTION, label: "Logged set", exercises: logged });
  }
  sections.push(...groupExercisesByArea(pending));
  return sections;
}

/** Mouse for desktop; Touch with press-and-hold for mobile (PointerSensor steals touch and fights scroll). */
function useExerciseReorderSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 12 },
    }),
  );
}

const tileDragSurfaceClass =
  "flex min-w-0 cursor-grab touch-pan-y select-none text-left active:cursor-grabbing";

function openExerciseFromKey(e, onOpen, name, category) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen(name, category);
  }
}

function openExerciseFromTileClick(e, onOpen, name, category) {
  if (isExerciseTileNavigationBlocked()) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    return;
  }
  if (
    e.target instanceof Element &&
    e.target.closest("[data-exercise-tile-menu], [data-tile-menu-backdrop], [role='menu']")
  ) {
    return;
  }
  onOpen(name, category);
}

/** After tile ⋮ menu interaction, block accidental navigation to the logger (ghost taps). */
let suppressExerciseTileNavigationUntil = 0;

function guardExerciseTileNavigation(ms = 550) {
  suppressExerciseTileNavigationUntil = performance.now() + ms;
}

function isExerciseTileNavigationBlocked() {
  return performance.now() < suppressExerciseTileNavigationUntil;
}

const LOGGED_MINI_MENU_WIDTH = 148;
const TILE_MENU_Z_BACKDROP = 99980;
const TILE_MENU_Z_MENU = 99990;
const TILE_MENU_Z_TRIGGER = 99970;

function LoggedMiniExerciseMenu({
  exerciseName,
  exerciseId,
  category,
  notes,
  exercises,
  isDarkMode,
  onReset,
  resetting,
  showReset = true,
  overlay = false,
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState(null);

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? 88;
      const gap = 4;
      const fitsBelow = rect.bottom + gap + menuHeight <= window.innerHeight - 8;
      const top = fitsBelow ? rect.bottom + gap : rect.top - gap - menuHeight;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - LOGGED_MINI_MENU_WIDTH / 2),
        window.innerWidth - LOGGED_MINI_MENU_WIDTH - 8,
      );
      setMenuStyle({ top, left, width: LOGGED_MINI_MENU_WIDTH });
    };
    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = event => {
      const target = event.target;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        target instanceof Element &&
          target.closest("[data-tile-menu-backdrop]")
      ) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer, true);
    return () => document.removeEventListener("pointerdown", handlePointer, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = e => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const runViewPreview = useCallback(() => {
    const ex = resolveExerciseForPreview(exercises, {
      exerciseId,
      exerciseName,
      category,
      notes,
    });
    if (!ex) {
      toast.message("Exercise not found in catalog");
      return;
    }
    setPreviewExercise(ex);
    setPreviewOpen(true);
  }, [exercises, exerciseId, exerciseName, category, notes]);

  const handleMenuView = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      guardExerciseTileNavigation();
      setMenuOpen(false);
      runViewPreview();
    },
    [runViewPreview],
  );

  const handleMenuReset = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      guardExerciseTileNavigation();
      setMenuOpen(false);
      onReset?.(exerciseName);
    },
    [exerciseName, onReset],
  );

  const menuItemClass = cn(
    "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs font-semibold transition-colors",
    isDarkMode ? "text-iron-100 active:bg-iron-800" : "text-slate-800 active:bg-slate-100",
  );

  const blockPointerToTile = e => {
    e.stopPropagation();
  };

  const menu = menuOpen ? (
    <>
      <div
        data-tile-menu-backdrop
        className="fixed inset-0"
        style={{ zIndex: TILE_MENU_Z_BACKDROP }}
        aria-hidden
        onPointerDown={blockPointerToTile}
        onClick={e => {
          e.stopPropagation();
          setMenuOpen(false);
        }}
      />
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuStyle?.top ?? -9999,
          left: menuStyle?.left ?? -9999,
          width: LOGGED_MINI_MENU_WIDTH,
          zIndex: TILE_MENU_Z_MENU,
          visibility: menuStyle ? "visible" : "hidden",
        }}
        className={cn(
          "overflow-hidden rounded-lg border py-0.5 shadow-lg",
          isDarkMode ? "border-iron-700 bg-iron-900" : "border-slate-200 bg-white",
        )}
        role="menu"
        onPointerDown={blockPointerToTile}
      >
        <button
          type="button"
          role="menuitem"
          className={menuItemClass}
          onPointerDown={blockPointerToTile}
          onPointerUp={handleMenuView}
          onClick={handleMenuView}
        >
          View
        </button>
        {showReset ? (
          <button
            type="button"
            role="menuitem"
            disabled={resetting}
            className={cn(
              menuItemClass,
              resetting && "opacity-50",
              isDarkMode ? "text-red-400" : "text-red-600",
            )}
            onPointerDown={blockPointerToTile}
            onPointerUp={handleMenuReset}
            onClick={handleMenuReset}
          >
            Reset
          </button>
        ) : null}
      </div>
    </>
  ) : null;

  return (
    <>
      <div
        ref={rootRef}
        data-exercise-tile-menu
        className={cn(
          overlay ? "absolute right-0 top-0 z-[99970]" : "relative flex justify-center",
        )}
        style={!overlay && menuOpen ? { zIndex: TILE_MENU_Z_TRIGGER } : undefined}
      >
        <button
          ref={buttonRef}
          type="button"
          onPointerDown={e => {
            e.stopPropagation();
          }}
          onClick={e => {
            e.stopPropagation();
            guardExerciseTileNavigation();
            setMenuOpen(open => !open);
          }}
          aria-label={`Actions for ${exerciseName}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "flex items-center justify-center touch-manipulation transition-colors",
            overlay
              ? cn(
                  "h-7 w-7 rounded-bl-md rounded-tr-[9px] text-white",
                  menuOpen ? "bg-black/65" : "bg-black/45 hover:bg-black/55 active:bg-black/60",
                )
              : cn(
                  "h-7 w-7 rounded-md",
                  menuOpen
                    ? isDarkMode
                      ? "bg-iron-800 text-iron-200"
                      : "bg-slate-100 text-slate-700"
                    : isDarkMode
                      ? "text-iron-500 hover:bg-iron-800/80 hover:text-iron-300"
                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                ),
          )}
        >
          <MoreVertical className={cn(overlay ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
        </button>
      </div>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
      <Modal
        open={previewOpen}
        onOpenChange={next => {
          setPreviewOpen(next);
          if (!next) setPreviewExercise(null);
        }}
      >
        <ModalContent
          showCloseButton
          className={cn(
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-surface-section border-surface-subtle",
            "!max-h-[min(92dvh,760px)] flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <ModalHeader className="shrink-0 pb-2">
            <ModalTitle
              className={cn(
                "line-clamp-2 pr-10",
                isDarkMode ? "!text-iron-50" : "!text-[color:var(--text-primary)]",
              )}
            >
              {previewExercise?.name ?? exerciseName ?? "Exercise"}
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
                onOpenExercise={ex => {
                  const next = exercises.find(item => item.id === ex.id);
                  if (next) setPreviewExercise(next);
                }}
              />
            ) : null}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
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
  solidLoggedTile = false,
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
  const miniLogged = solidLoggedTile && hasLogged;
  const compact = tileSize === "compact";
  if (miniLogged) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex w-[7rem] shrink-0 flex-col items-center gap-1",
          isDragging && "z-30 opacity-90",
        )}
      >
        <div
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
            loggedCardClass(hasLogged, isDarkMode, isDragging, solidLoggedTile),
          )}
        >
          {hasTrash ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onRemoveAdded?.(ex.exercise_name);
              }}
              className={cn(
                "absolute left-0 top-0 z-20 flex h-4 w-4 items-center justify-center rounded-br-md",
                "bg-emerald-800/90 text-white hover:text-red-200",
              )}
              aria-label={`Remove ${ex.exercise_name}`}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          ) : null}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={0}
            onClick={e => openExerciseFromTileClick(e, onOpen, ex.exercise_name, ex.category)}
            onKeyDown={e => openExerciseFromKey(e, onOpen, ex.exercise_name, ex.category)}
            onContextMenu={e => e.preventDefault()}
            className={cn(tileDragSurfaceClass, "relative h-16 w-16")}
            aria-label={`${ex.exercise_name}. Tap to log sets, press and hold to reorder`}
          >
            {!showPlaceholder ? (
              <ExerciseMediaImage
                src={media}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                onError={onThumbError}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ExerciseIcon name={ex.exercise_name} className="w-5 h-5" color="#ffffff" />
              </div>
            )}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 truncate text-center font-semibold px-1 py-0.5 text-[8px] leading-tight",
                "bg-black/40 text-white backdrop-blur-[2px]",
              )}
            >
              {loggedSetLabel(loggedCount)}
            </span>
          </div>
          <LoggedMiniExerciseMenu
            overlay
            showReset={showReset}
            exerciseName={ex.exercise_name}
            exerciseId={ex.exercise_id}
            category={ex.category}
            notes={ex.notes}
            exercises={exercisesCatalog}
            isDarkMode={isDarkMode}
            onReset={onReset}
            resetting={resetting}
          />
        </div>
        <p
          className={cn(
            "w-full text-center text-[11px] font-medium leading-tight line-clamp-2",
            isDarkMode ? "text-iron-200" : "text-slate-700",
          )}
          title={ex.exercise_name}
        >
          {ex.exercise_name}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-card border",
        loggedCardClass(hasLogged, isDarkMode, isDragging, solidLoggedTile),
      )}
    >
      <div
        className={cn(
          "relative w-full",
          miniLogged ? "h-10 w-10" : "aspect-square",
          !miniLogged && (isDarkMode ? "bg-iron-800" : "bg-slate-100"),
        )}
      >
        {!miniLogged ? (
          <LoggedMiniExerciseMenu
            overlay
            showReset={showReset}
            exerciseName={ex.exercise_name}
            exerciseId={ex.exercise_id}
            category={ex.category}
            notes={ex.notes}
            exercises={exercisesCatalog}
            isDarkMode={isDarkMode}
            onReset={onReset}
            resetting={resetting}
          />
        ) : null}
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          onClick={e => openExerciseFromTileClick(e, onOpen, ex.exercise_name, ex.category)}
          onKeyDown={e => openExerciseFromKey(e, onOpen, ex.exercise_name, ex.category)}
          onContextMenu={e => e.preventDefault()}
          className={cn(tileDragSurfaceClass, "absolute inset-0")}
          aria-label={`${ex.exercise_name}. Tap to log sets, press and hold to reorder`}
        >
          {hasTrash ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onRemoveAdded?.(ex.exercise_name);
              }}
              className={cn(
                "absolute left-0 top-0 z-20 flex items-center justify-center rounded-br-md",
                compact ? "h-6 w-6" : "h-7 w-7",
                hasLogged && solidLoggedTile
                  ? "bg-emerald-800/90 text-white hover:text-red-200"
                  : isDarkMode
                    ? "border border-iron-700/80 bg-iron-900/90 text-iron-400 hover:text-red-400"
                    : "border border-slate-200 bg-white/95 text-slate-400 hover:text-red-600",
              )}
              aria-label={`Remove ${ex.exercise_name}`}
            >
              <Trash2 className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
          ) : null}
          <div className="absolute inset-0">
            {!showPlaceholder ? (
              <ExerciseMediaImage
                src={media}
                alt=""
                fill
                className="object-cover"
                sizes={miniLogged ? "40px" : compact ? "33vw" : "50vw"}
                onError={onThumbError}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <ExerciseIcon
                  name={ex.exercise_name}
                  className={miniLogged ? "w-4 h-4" : compact ? "w-6 h-6" : "w-8 h-8"}
                  color={miniLogged ? "#ffffff" : isDarkMode ? "#71717a" : "#94a3b8"}
                />
              {!compact && !miniLogged ? (
                <span
                  className={`text-[9px] font-medium ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                >
                  No image
                </span>
              ) : null}
              </div>
            )}
          </div>
          {hasLogged ? (
            <span
              className={cn(
                miniLogged
                  ? "absolute inset-x-0 bottom-0 z-10 truncate text-center font-bold px-0.5 py-px leading-none"
                  : "absolute bottom-1 left-1 right-1 z-10 mx-auto max-w-[calc(100%-0.5rem)] truncate text-center font-bold rounded-md px-1 py-0.5",
                miniLogged ? "text-[7px]" : compact ? "text-[9px]" : "text-[10px]",
                solidLoggedTile
                  ? "bg-white/25 text-white"
                  : isDarkMode
                    ? "bg-emerald-600/95 text-white"
                    : "bg-emerald-600 text-white",
              )}
            >
              {loggedSetLabel(loggedCount)}
            </span>
          ) : null}
        </div>
      </div>
      {!miniLogged ? (
        <p
          role="button"
          tabIndex={0}
          onClick={e => openExerciseFromTileClick(e, onOpen, ex.exercise_name, ex.category)}
          onKeyDown={e => openExerciseFromKey(e, onOpen, ex.exercise_name, ex.category)}
          className={cn(
            "px-1.5 font-semibold leading-snug line-clamp-2 cursor-pointer",
            compact ? "py-1 text-[10px] min-h-[2rem]" : "py-2 text-xs min-h-[2.5rem]",
            hasLogged && solidLoggedTile
              ? "text-white"
              : hasLogged
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
      ) : null}
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
  solidLoggedTile = false,
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
  const solidLogged = solidLoggedTile && hasLogged;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex min-w-0 items-stretch gap-2 rounded-card border p-2",
        loggedCardClass(hasLogged, isDarkMode, isDragging, solidLoggedTile),
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-visible rounded-lg">
        <LoggedMiniExerciseMenu
          overlay
          showReset={showReset}
          exerciseName={ex.exercise_name}
          exerciseId={ex.exercise_id}
          category={ex.category}
          notes={ex.notes}
          exercises={exercisesCatalog}
          isDarkMode={isDarkMode}
          onReset={onReset}
          resetting={resetting}
        />
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          onClick={e => openExerciseFromTileClick(e, onOpen, ex.exercise_name, ex.category)}
          onKeyDown={e => openExerciseFromKey(e, onOpen, ex.exercise_name, ex.category)}
          onContextMenu={e => e.preventDefault()}
          className={cn(tileDragSurfaceClass, "absolute inset-0 overflow-hidden rounded-lg")}
          aria-label={`${ex.exercise_name}. Tap to log sets, press and hold to reorder`}
        >
          <div
            className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-iron-800" : "bg-slate-100",
            )}
          >
            {!showPlaceholder ? (
              <ExerciseMediaImage
                src={media}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
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
        </div>
      </div>
      <div
        className={cn(tileDragSurfaceClass, "min-w-0 flex-1")}
        role="button"
        tabIndex={0}
        onClick={e => openExerciseFromTileClick(e, onOpen, ex.exercise_name, ex.category)}
        onKeyDown={e => openExerciseFromKey(e, onOpen, ex.exercise_name, ex.category)}
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold leading-snug line-clamp-2",
              solidLogged
                ? "text-white"
                : hasLogged
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
                solidLogged
                  ? "text-emerald-50/90"
                  : isDarkMode
                    ? "text-emerald-400"
                    : "text-emerald-700",
              )}
            >
              {loggedSetLabel(loggedCount)}
            </p>
          ) : null}
        </div>
      </div>

      {hasTrash ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemoveAdded?.(ex.exercise_name);
          }}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg border",
            solidLogged
              ? "border-white/40 bg-white/15 text-white hover:bg-white/25 hover:text-red-200"
              : isDarkMode
                ? "border-iron-700/80 text-iron-400 hover:text-red-400"
                : "border-slate-200 text-slate-400 hover:text-red-600",
          )}
          aria-label={`Remove ${ex.exercise_name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : null}
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
  prioritizeLoggedTiles = false,
}) {
  const [layout, setLayout] = useState(() => getWorkoutExerciseLayout());

  useEffect(() => {
    setLayout(getWorkoutExerciseLayout());
  }, []);

  const handleLayoutChange = useCallback(next => {
    setWorkoutExerciseLayout(next);
    setLayout(next);
  }, []);

  const sensors = useExerciseReorderSensors();

  const listMode = isListLayout(layout);

  const exerciseGroups = useMemo(
    () => buildExerciseDisplayGroups(exercises, completedSetCountFor, prioritizeLoggedTiles),
    [exercises, completedSetCountFor, prioritizeLoggedTiles],
  );

  const ids = useMemo(
    () => exerciseGroups.flatMap(group => group.exercises.map(ex => ex.exercise_name)),
    [exerciseGroups],
  );

  const solidLoggedTile = prioritizeLoggedTiles;

  const guardedOnOpen = useCallback(
    (name, category) => {
      if (isExerciseTileNavigationBlocked()) return;
      onOpen(name, category);
    },
    [onOpen],
  );

  const renderExercise = ex => {
    const media = resolveMedia(ex.exercise_name);
    const showPlaceholder = !media || thumbFailed[ex.exercise_name];
    const shared = {
      ex,
      isDarkMode,
      media,
      showPlaceholder,
      onThumbError: () => onThumbFailed(ex.exercise_name),
      onOpen: guardedOnOpen,
      loggedCount: completedSetCountFor?.(ex.exercise_name) ?? 0,
      showReset: showResetFor?.(ex.exercise_name),
      onReset: onResetExercise,
      resetting: resettingExercise === ex.exercise_name,
      onRemoveAdded,
      exercisesCatalog,
      solidLoggedTile,
    };
    if (isListLayout(layout)) {
      return <SortableExerciseListRow key={ex.exercise_name} {...shared} />;
    }
    return (
      <SortableExerciseTile key={ex.exercise_name} {...shared} tileSize={layout} />
    );
  };

  const groupHeaderClass = (area) =>
    cn(
    "sticky top-0 z-20 font-semibold uppercase tracking-wide",
    "border-b backdrop-blur-md supports-[backdrop-filter]:bg-opacity-95",
    listMode ? "-mx-0 px-0 py-1.5 text-[11px]" : "col-span-full -mx-0 px-0 py-1.5 text-[10px]",
    area === LOGGED_TILE_SECTION
      ? isDarkMode
        ? "border-emerald-600/80 bg-emerald-950/95 text-emerald-300"
        : "border-emerald-300/90 bg-emerald-50 text-emerald-800"
      : isDarkMode
        ? "border-iron-800/80 bg-iron-950/92 text-iron-400"
        : "border-slate-200/80 bg-surface-section/95 text-slate-500",
    );

  const handleDragEnd = event => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const flat = exerciseGroups.flatMap(group => group.exercises);
    const next = arrayMove(flat, oldIndex, newIndex);
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
          Press and hold a tile to reorder
        </span>
        {showSizeToggle ? (
          <LayoutToggle value={layout} onChange={handleLayoutChange} isDarkMode={isDarkMode} />
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={{ threshold: { x: 0, y: 0.12 }, acceleration: 8 }}
      >
        <SortableContext
          items={ids}
          strategy={listMode ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <div
            className={cn(
              "touch-pan-y",
              listMode ? "flex flex-col gap-2" : cn("grid", tileSizeGridClass(layout)),
            )}
          >
            {exerciseGroups.map(group => (
              <Fragment key={group.area}>
                <div className={groupHeaderClass(group.area)}>
                  {group.label}
                  <span
                    className={cn(
                      "ml-1.5 font-medium normal-case tracking-normal",
                      group.area === LOGGED_TILE_SECTION
                        ? isDarkMode
                          ? "text-emerald-500"
                          : "text-emerald-600"
                        : isDarkMode
                          ? "text-iron-600"
                          : "text-slate-400",
                    )}
                  >
                    · {group.exercises.length}
                  </span>
                </div>
                {group.area === LOGGED_TILE_SECTION && !listMode ? (
                  <div
                    className={loggedMiniTileScrollOuterClass}
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className={loggedMiniTileScrollInnerClass}>
                      {group.exercises.map(renderExercise)}
                    </div>
                  </div>
                ) : (
                  group.exercises.map(renderExercise)
                )}
              </Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function shouldBlockExerciseTileNavigation() {
  return isExerciseTileNavigationBlocked();
}
