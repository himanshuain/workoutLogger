import { cn } from "@/lib/utils";
import { actionPrimary, actionSecondary } from "@/lib/actionButtonStyles";

/**
 * Compact, action-oriented empty state — no large illustrations.
 */
export default function EmptyState({
  isDarkMode,
  message,
  hint,
  actionLabel,
  onAction,
  actionVariant = "primary",
  className,
  children,
}) {
  return (
    <div
      className={cn(
        "rounded-card border px-4 py-3",
        isDarkMode
          ? "border-surface-subtle bg-surface-interactive"
          : "border-surface-subtle bg-surface-interactive",
        className,
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]",
        )}
      >
        {message}
      </p>
      {hint ? <p className="text-metadata mt-0.5">{hint}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-3 w-full rounded-card py-2.5 text-sm font-semibold transition-colors",
            actionVariant === "primary"
              ? actionPrimary(isDarkMode)
              : actionSecondary(isDarkMode),
          )}
        >
          {actionLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}

/** Inline empty hint for list panels and modals. */
export function EmptyInline({ isDarkMode, message, className }) {
  return (
    <p
      className={cn(
        "py-3 text-center text-sm",
        isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]",
        className,
      )}
    >
      {message}
    </p>
  );
}
