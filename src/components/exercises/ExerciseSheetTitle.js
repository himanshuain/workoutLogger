import { ModalTitle } from "@/components/ui/modal";
import ExerciseGoogleSearchChip from "@/components/exercises/ExerciseGoogleSearchChip";
import { cn } from "@/lib/utils";

export function ExerciseCategoryPill({ category, isDarkMode, className }) {
  const label = category || "General";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1",
        isDarkMode
          ? "bg-white/[0.06] text-iron-200 ring-white/10"
          : "bg-slate-100 text-slate-700 ring-slate-200/80",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Exercise name + category; optional Google chip inline after name. */
export function ExerciseSheetTitleRow({
  name,
  category,
  isDarkMode,
  titleClassName,
  /** SmartWorkout sheet: title + Google live in body card. */
  titleInBody = false,
}) {
  if (titleInBody) return null;

  const displayName = name || "Exercise";

  return (
    <div className="flex flex-col gap-2 pr-11">
      <ModalTitle
        className={cn(
          "text-left text-lg font-bold leading-snug tracking-tight",
          isDarkMode ? "!text-iron-50" : "!text-[color:var(--text-primary)]",
          titleClassName,
        )}
      >
        <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0">{displayName}</span>
          <ExerciseCategoryPill
            category={category}
            isDarkMode={isDarkMode}
            className="align-middle"
          />
          <ExerciseGoogleSearchChip name={displayName} isDarkMode={isDarkMode} />
        </span>
      </ModalTitle>
    </div>
  );
}
