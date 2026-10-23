import { ModalTitle } from "@/components/ui/modal";
import GoogleGIcon from "@/components/icons/GoogleGIcon";
import { googleImagesSearchUrl } from "@/lib/exerciseMedia";
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

function sheetActionChipClass(isDarkMode) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold transition-colors",
    isDarkMode
      ? "border border-white/10 bg-white/[0.06] text-iron-100 active:bg-white/10"
      : "border border-slate-200/90 bg-white text-slate-800 shadow-sm active:bg-slate-50",
  );
}

/** Exercise name + category on line 1; Google Images on line 2. */
export function ExerciseSheetTitleRow({ name, category, isDarkMode, titleClassName }) {
  const displayName = name || "Exercise";
  const googleHref = googleImagesSearchUrl(displayName);

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
        </span>
      </ModalTitle>
      {googleHref ? (
        <a
          href={googleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(sheetActionChipClass(isDarkMode), "w-fit")}
          aria-label={`Search SmartWorkout images for ${displayName}`}
          title="SmartWorkout on Google Images"
        >
          <GoogleGIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>Search</span>
        </a>
      ) : null}
    </div>
  );
}
