import { ChevronDown } from "lucide-react";
import { formatDaysSince } from "@/lib/lifelogUtils";
import { actionPrimary, actionSecondary, actionSuccess, actionNeutralIcon } from "@/lib/actionButtonStyles";
import LifeLogEventQuickGlyph from "@/components/logging/LifeLogEventQuickGlyph";
import { cn } from "@/lib/utils";

export default function BikeTrackerHero({
  tracker,
  isDarkMode,
  isLoggedToday,
  isOverdue,
  onQuickLog,
  quickLogPending,
  onExpand,
  expanded,
  onManage,
}) {
  if (!tracker) return null;

  return (
    <div
      className={cn(
        "rounded-card overflow-hidden",
        isDarkMode ? "bg-iron-900 border border-iron-800" : "bg-white border border-slate-200 shadow-sm",
        isOverdue && (isDarkMode ? "ring-1 ring-amber-500/40" : "ring-1 ring-amber-400/50"),
      )}
    >
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          onClick={onExpand}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div
            className="w-12 h-12 rounded-card flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${tracker.color || "#f97316"}28` }}
          >
            {tracker.icon || "🏍️"}
          </div>
          <div className="min-w-0 flex-1">
            <motionRowTitle isDarkMode={isDarkMode} name={tracker.name} isOverdue={isOverdue} />
            <p
              className={cn(
                "text-xs mt-0.5",
                isOverdue
                  ? "text-amber-500"
                  : isDarkMode
                    ? "text-iron-500"
                    : "text-slate-500",
              )}
            >
              {tracker.days_since === null ? "Never logged" : formatDaysSince(tracker.days_since)}
              {tracker.total_logs > 0 ? (
                <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>
                  {" "}
                  · {tracker.total_logs} entries
                </span>
              ) : null}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 transition-transform",
              expanded && "rotate-180",
              isDarkMode ? "text-iron-600" : "text-slate-400",
            )}
          />
        </button>
        <button
          type="button"
          disabled={quickLogPending}
          aria-pressed={isLoggedToday}
          onClick={onQuickLog}
          className={cn(
            "w-11 h-11 rounded-card flex items-center justify-center shrink-0 transition-transform active:scale-95",
            isLoggedToday ? actionSuccess(isDarkMode) : actionNeutralIcon(isDarkMode),
          )}
        >
          <LifeLogEventQuickGlyph
            isLoggedToday={isLoggedToday}
            needNotes={tracker.need_notes}
            needValue={tracker.need_value}
          />
        </button>
      </div>
      {expanded ? (
        <div
          className={cn(
            "px-3.5 pb-3.5 pt-0 border-t",
            isDarkMode ? "border-iron-800" : "border-slate-100",
          )}
        >
          {tracker.description ? (
            <p className={`text-xs mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {tracker.description}
            </p>
          ) : null}
          <motionHeroActions
            isDarkMode={isDarkMode}
            onQuickLog={onQuickLog}
            quickLogPending={quickLogPending}
            onManage={onManage}
          />
        </div>
      ) : null}
    </div>
  );
}

function motionHeroActions({ isDarkMode, onQuickLog, quickLogPending, onManage }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onQuickLog}
        disabled={quickLogPending}
        className={cn("flex-1 rounded-card py-2.5 text-sm font-semibold", actionPrimary(isDarkMode))}
      >
        Log today
      </button>
      {onManage ? (
        <button
          type="button"
          onClick={onManage}
          className={cn("rounded-card px-3 py-2.5 text-sm font-semibold", actionSecondary(isDarkMode))}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function motionRowTitle({ isDarkMode, name, isOverdue }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <h2 className={`font-semibold truncate ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>{name}</h2>
      {isOverdue ? (
        <span className="shrink-0 rounded-pill bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-500">
          Due
        </span>
      ) : null}
    </div>
  );
}
