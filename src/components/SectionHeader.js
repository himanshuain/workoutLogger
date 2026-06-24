import { cn } from "@/lib/utils";

/**
 * Consistent section chrome: icon + label + optional "· meta" + right-side action.
 * @example Workout · 3 sets | Habits · 1/4 | Food · 2 logged
 */
export default function SectionHeader({
  icon: Icon,
  label,
  /** Short summary after the middle dot, e.g. "1/4", "3 sets", "2 logged" */
  meta,
  isDarkMode,
  className,
  children,
  as: Tag = "h3",
}) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-2", className)}>
      <Tag
        className={cn(
          "text-section-header flex min-w-0 flex-1 items-start gap-2",
          isDarkMode && "text-iron-200",
        )}
      >
        {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span className="min-w-0 break-words leading-snug">
          {label}
          {meta ? (
            <span
              className={cn(
                "font-normal normal-case tracking-normal",
                isDarkMode ? "text-iron-500" : "text-slate-500",
              )}
            >
              {" · "}
              {meta}
            </span>
          ) : null}
        </span>
      </Tag>
      {children ? <div className="flex shrink-0 items-center gap-2 pt-0.5">{children}</div> : null}
    </div>
  );
}

/** Text link for section header actions (e.g. View all). */
export function SectionHeaderLink({ isDarkMode, onClick, children, className, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold transition-colors",
        isDarkMode
          ? "text-iron-300 hover:text-iron-200 active:text-iron-200"
          : "text-slate-500 hover:text-slate-800 active:text-slate-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
