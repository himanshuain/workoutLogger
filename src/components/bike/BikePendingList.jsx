import { useState } from "react";
import { Check, Circle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionPrimary, actionSecondaryCompact } from "@/lib/actionButtonStyles";

/**
 * Pending bike tasks — shared by page section and entry drawer.
 * @param {{ compact?: boolean }} props
 */
export default function BikePendingList({
  items,
  isDarkMode,
  onAdd,
  onUseItem,
  onRemove,
  compact = false,
  useItemLabel = "Use",
  className,
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const submitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd({ title });
    setDraft("");
    setAdding(false);
  };

  return (
    <div
      className={cn(compact ? "space-y-2" : "", className)}
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "" : "mb-2")}>
        <h3
          className={cn(
            "font-bold uppercase tracking-wide",
            compact ? "text-[10px]" : "text-xs",
            isDarkMode ? "text-lift-primary" : "text-amber-800",
          )}
        >
          Pending work
        </h3>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-2 py-1 font-semibold",
              compact ? "text-[10px]" : "text-[11px]",
              actionSecondaryCompact(isDarkMode),
            )}
          >
            <Plus className="w-3 h-3" aria-hidden />
            Add
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitDraft();
              }
            }}
            placeholder="What’s left to do?"
            autoFocus
            className={cn(
              "flex-1 min-w-0 rounded-card px-3 py-2 text-sm outline-none focus:ring-2",
              isDarkMode
                ? "bg-iron-900 text-iron-100 ring-1 ring-iron-700 focus:ring-lift-primary/40"
                : "bg-white text-slate-800 border border-slate-200 focus:ring-amber-400/50",
            )}
          />
          <button
            type="button"
            onClick={submitDraft}
            disabled={!draft.trim()}
            className={cn(
              "shrink-0 rounded-card px-3 text-xs font-semibold disabled:opacity-40",
              actionPrimary(isDarkMode),
            )}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            className={cn("shrink-0 p-2 rounded-card", isDarkMode ? "text-iron-500" : "text-slate-500")}
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className={cn("text-xs", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          Note repairs or errands — use one when you log it.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-1.5">
          {items.map(item => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-2 rounded-card px-2.5 py-2",
                isDarkMode ? "bg-iron-900/60" : "bg-white/90",
              )}
            >
              <Circle
                className={cn(
                  "w-4 h-4 shrink-0 mt-0.5",
                  isDarkMode ? "text-lift-primary/70" : "text-amber-600",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                  {item.title}
                </p>
                {item.notes ? (
                  <p
                    className={cn(
                      "text-xs mt-0.5 line-clamp-2",
                      isDarkMode ? "text-iron-500" : "text-slate-500",
                    )}
                  >
                    {item.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onUseItem ? (
                  <button
                    type="button"
                    onClick={() => onUseItem(item)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[10px] font-semibold",
                      isDarkMode ? "bg-lift-primary text-iron-950" : "bg-amber-500 text-white",
                    )}
                  >
                    <Check className="w-3 h-3" aria-hidden />
                    {useItemLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className={cn(
                    "p-1.5 rounded-card",
                    isDarkMode ? "text-iron-600 hover:text-iron-400" : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
