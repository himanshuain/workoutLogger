import { Check, Circle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { hapticLight, touchPress } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: {
    btn: "h-8 w-8 min-h-[2rem] min-w-[2rem]",
    check: "h-4 w-4",
    circle: "h-5 w-5",
    text: "text-sm",
  },
  md: {
    btn: "h-10 w-10 min-h-[2.5rem] min-w-[2.5rem]",
    check: "h-5 w-5",
    circle: "h-6 w-6",
    text: "text-base",
  },
};

/**
 * Binary “done / not done” control: incomplete = outline circle (no check); done = filled success + check.
 *
 * @param {"default"|"modal"} variant — `modal` matches iron-heavy modals (ExerciseLogModal).
 */
export default function CompletionToggle({
  completed,
  onClick,
  size = "md",
  incompleteContent,
  variant = "default",
  /** Optional override when not using ThemeContext (e.g. storybook) */
  isDarkMode: isDarkModeProp,
  className = "",
  ariaLabelComplete = "Mark complete",
  ariaLabelIncomplete = "Mark not done",
  disabled = false,
  type = "button",
}) {
  const { isDarkMode: ctxDark } = useTheme();
  const isDarkMode = isDarkModeProp ?? ctxDark;
  const s = SIZE[size] || SIZE.md;

  const incompleteDefault = isDarkMode
    ? "bg-iron-800 text-iron-400 ring-1 ring-inset ring-iron-600"
    : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-300";

  /** ExerciseLogModal and similar always use iron surfaces */
  const incompleteModal = "bg-iron-700 text-iron-400 ring-0";

  const incompleteShell =
    variant === "modal" ? incompleteModal : incompleteDefault;

  const completeShell = isDarkMode
    ? "bg-lift-primary text-iron-950"
    : "bg-green-500 text-white";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={e => {
        hapticLight();
        onClick?.(e);
      }}
      aria-pressed={completed}
      aria-label={completed ? ariaLabelIncomplete : ariaLabelComplete}
      className={cn(
        touchPress,
        "inline-flex shrink-0 items-center justify-center rounded-pill disabled:pointer-events-none disabled:opacity-50",
        s.btn,
        completed ? completeShell : incompleteShell,
        className,
      )}
    >
      {completed ? (
        <Check className={s.check} strokeWidth={2.5} aria-hidden />
      ) : incompleteContent ? (
        <span className={`font-bold tabular-nums ${s.text}`}>{incompleteContent}</span>
      ) : (
        <Circle className={s.circle} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}

/** Read-only “logged / done” dot (filled + check), e.g. exercise thumbnail badge */
export function CompletionBadge({ className = "", isDarkMode: isDarkModeProp }) {
  const { isDarkMode: ctxDark } = useTheme();
  const isDarkMode = isDarkModeProp ?? ctxDark;
  const shell = isDarkMode
    ? "bg-lift-primary text-iron-950"
    : "bg-workout-primary text-white";
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full shadow-md ${shell} ${className}`}
      aria-hidden
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}
