import { cn } from "@/lib/utils";

function bone(isDarkMode, className) {
  return cn(
    "animate-pulse rounded-lg",
    isDarkMode ? "bg-iron-700/80" : "bg-slate-200/90",
    className,
  );
}

function shell(isDarkMode, className) {
  return cn(
    "rounded-card border",
    isDarkMode
      ? "border-surface-subtle bg-surface-section"
      : "border-surface-subtle bg-surface-section shadow-[var(--shadow-elevation-section)]",
    className,
  );
}

/** Single list/table row */
export function SkeletonRow({ isDarkMode = false, className }) {
  return (
    <div className={cn("flex items-center gap-3 py-3", className)}>
      <div className={bone(isDarkMode, "h-10 w-10 shrink-0 rounded-card")} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={bone(isDarkMode, "h-3.5 w-2/3")} />
        <div className={bone(isDarkMode, "h-3 w-1/2")} />
      </div>
    </div>
  );
}

/** Section card with optional header + rows or pills */
export function SkeletonSection({
  isDarkMode = false,
  rows = 3,
  pills = false,
  grid = false,
  className,
}) {
  return (
    <div className={cn(shell(isDarkMode, "p-4"), className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={bone(isDarkMode, "h-3.5 w-3.5 rounded")} />
          <div className={bone(isDarkMode, "h-3 w-24")} />
        </div>
        <div className={bone(isDarkMode, "h-8 w-16 rounded-card")} />
      </div>
      {pills ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={bone(isDarkMode, "h-11 w-24 rounded-pill")} />
          ))}
        </div>
      ) : grid ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={bone(isDarkMode, "h-20 rounded-card")} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-surface-subtle">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} isDarkMode={isDarkMode} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkeletonCard({ isDarkMode = false, className }) {
  return (
    <div className={cn(shell(isDarkMode, "animate-pulse p-4"), className)}>
      <div className={bone(isDarkMode, "mb-3 h-4 w-1/3")} />
      <div className={bone(isDarkMode, "mb-2 h-3 w-full")} />
      <div className={bone(isDarkMode, "mb-2 h-3 w-full")} />
      <div className={bone(isDarkMode, "h-3 w-2/3")} />
    </div>
  );
}

export function SkeletonList({ isDarkMode = false, count = 5, className }) {
  return (
    <div className={cn(shell(isDarkMode, "p-2"), className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow
          key={i}
          isDarkMode={isDarkMode}
          className={cn("px-2", i < count - 1 && "border-b border-surface-subtle")}
        />
      ))}
    </div>
  );
}

/** Routine planner exercise rows (thumb + title + meta). */
export function SkeletonRoutineExercises({ isDarkMode = false, count = 4, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            shell(isDarkMode, "flex items-center gap-3 p-3"),
          )}
        >
          <div className={bone(isDarkMode, "h-12 w-12 shrink-0 rounded-card")} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={bone(isDarkMode, "h-4 w-2/5")} />
            <div className={bone(isDarkMode, "h-3 w-1/3")} />
          </div>
          <div className={bone(isDarkMode, "h-8 w-8 shrink-0 rounded-card")} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ isDarkMode = false }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border animate-pulse",
        isDarkMode ? "border-iron-800 bg-iron-900/60" : "border-slate-200 bg-white",
      )}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-surface-subtle">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-2 py-2.5 text-center sm:px-3">
            <div className={bone(isDarkMode, "mx-auto mb-1.5 h-2.5 w-12")} />
            <div className={bone(isDarkMode, "mx-auto h-5 w-10")} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeatmap({ isDarkMode = false }) {
  return (
    <div className={cn(shell(isDarkMode, "animate-pulse p-4"))}>
      <div className="mb-4 flex items-center gap-3">
        <div className={bone(isDarkMode, "h-10 w-10 rounded-card")} />
        <div className={bone(isDarkMode, "h-4 w-1/3")} />
      </div>
      <div className="grid grid-cols-7 gap-1.5 md:max-w-[min(100%,20.5rem)] lg:max-w-[22.5rem] md:mx-auto">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className={bone(isDarkMode, "aspect-square rounded-md")} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDateStrip({ isDarkMode = false, className }) {
  return (
    <div className={cn(shell(isDarkMode, "animate-pulse px-2 py-2"), className)}>
      <div className="mb-1">
        <div className={bone(isDarkMode, "h-3.5 w-8 rounded-md")} />
      </div>
      <div className="relative">
        <div className="flex gap-1.5 overflow-hidden pr-12">
          {Array.from({ length: 7 }).map(i => (
            <div key={i} className={bone(isDarkMode, "h-[3.25rem] w-12 shrink-0 rounded-card")} />
          ))}
        </div>
        <div className={bone(isDarkMode, "absolute right-0 top-0 h-9 w-9 rounded-card")} />
      </div>
    </div>
  );
}

/** Today page: date strip + workout, habits, food sections */
export function SkeletonTodaySections({ isDarkMode = false }) {
  return (
    <>
      <SkeletonDateStrip isDarkMode={isDarkMode} className="mb-4" />
      <div className="space-y-section">
        <SkeletonSection isDarkMode={isDarkMode} rows={2} />
        <SkeletonSection isDarkMode={isDarkMode} pills />
        <SkeletonSection isDarkMode={isDarkMode} grid />
      </div>
    </>
  );
}

export function SkeletonPage({ isDarkMode = false }) {
  return (
    <div className="space-y-4 px-4 pt-4">
      <div className={bone(isDarkMode, "mb-2 h-8 w-1/2 rounded-card")} />
      <div className={bone(isDarkMode, "mb-6 h-4 w-1/4")} />
      <SkeletonStats isDarkMode={isDarkMode} />
      <div className="space-y-3 pt-2">
        <SkeletonCard isDarkMode={isDarkMode} />
        <SkeletonCard isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
