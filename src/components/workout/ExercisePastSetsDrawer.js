import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { analyzeExerciseSetHistory } from "@/lib/exerciseSetHistoryAnalysis";
import { localDateStr } from "@/lib/dateLogUtils";
import { formatDaysSince } from "@/lib/lifelogUtils";
import { cn } from "@/lib/utils";
import { Loader2, Trophy, Dumbbell, ChevronDown } from "lucide-react";

function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysSinceDate(isoDate, todayRef = localDateStr()) {
  const [y1, m1, d1] = isoDate.split("-").map(Number);
  const [y2, m2, d2] = todayRef.split("-").map(Number);
  const from = new Date(y1, m1 - 1, d1);
  const to = new Date(y2, m2 - 1, d2);
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
}

function formatRelativeLabel(dateStr, todayRef = localDateStr()) {
  return formatDaysSince(daysSinceDate(dateStr, todayRef)).toLowerCase();
}

function DateWithRelative({ dateStr, isDarkMode, short = false, className }) {
  const label = short ? formatShortDate(dateStr) : formatDateLabel(dateStr);
  const relative = formatRelativeLabel(dateStr);

  return (
    <span className={className}>
      {label}{" "}
      <span className={cn("font-normal", isDarkMode ? "text-iron-500" : "text-slate-500")}>({relative})</span>
    </span>
  );
}

function WeightRepsDisplay({ weight, reps, isDarkMode, size = "lg" }) {
  const weightClass =
    size === "hero" ? "text-3xl font-bold" : size === "sm" ? "text-sm font-semibold" : "text-xl font-bold";
  const repsClass =
    size === "hero" ? "text-3xl font-bold" : size === "sm" ? "text-sm font-semibold" : "text-xl font-bold";

  return (
    <span className="inline-flex items-baseline gap-2 tabular-nums">
      <span className={cn(weightClass, isDarkMode ? "text-sky-300" : "text-sky-700")}>
        {weight}
        <span
          className={cn(
            "ml-1 font-medium",
            size === "hero" ? "text-lg" : "text-xs",
            isDarkMode ? "text-sky-500/80" : "text-sky-600/80",
          )}
        >
          kg
        </span>
      </span>
      <span className={cn(size === "hero" ? "text-2xl" : "text-base", isDarkMode ? "text-iron-600" : "text-slate-300")}>
        ×
      </span>
      <span className={cn(repsClass, isDarkMode ? "text-violet-300" : "text-violet-700")}>
        {reps}
        <span
          className={cn(
            "ml-1 font-medium",
            size === "hero" ? "text-lg" : "text-xs",
            isDarkMode ? "text-violet-500/80" : "text-violet-600/80",
          )}
        >
          reps
        </span>
      </span>
    </span>
  );
}

function buildHeroInsight(analysis) {
  const { suggestion, currentStreak, personalBest } = analysis;

  if (suggestion && currentStreak) {
    return {
      mode: "progress",
      line: `+weight · ${currentStreak.sessions}× at ${currentStreak.weight} kg`,
      weight: suggestion.suggestedWeight,
      reps: suggestion.suggestedReps,
    };
  }

  if (currentStreak) {
    const remaining = Math.max(0, 3 - currentStreak.sessions);
    return {
      mode: "hold",
      line:
        remaining > 0
          ? `${remaining} more session${remaining !== 1 ? "s" : ""} at this load`
          : "Ready to add weight soon",
      weight: currentStreak.weight,
      reps: currentStreak.reps,
      date: currentStreak.latestDate,
    };
  }

  if (personalBest) {
    return {
      mode: "baseline",
      line: "No recent pattern",
      weight: personalBest.weight,
      reps: personalBest.reps,
      date: personalBest.date,
    };
  }

  return null;
}

function LastSessionCard({ row, isDarkMode }) {
  return (
    <section aria-label="Last session">
      <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", isDarkMode ? "text-iron-500" : "text-slate-500")}>
        Last time
      </p>
      <div
        className={cn(
          "rounded-card border px-4 py-3",
          isDarkMode ? "border-iron-700/80 bg-iron-900/50" : "border-slate-200 bg-white",
        )}
      >
        <p className={cn("text-sm font-medium", isDarkMode ? "text-iron-200" : "text-slate-800")}>
          <DateWithRelative dateStr={row.date} isDarkMode={isDarkMode} />
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {row.sets.map((set, idx) => (
            <SetChip key={`last-${row.date}-${idx}`} weight={set.weight} reps={set.reps} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCard({ insight, isDarkMode }) {
  if (!insight) return null;

  const isProgress = insight.mode === "progress";

  return (
    <section aria-label="Recommendation">
      <div
        className={cn(
          "rounded-card border px-4 py-4 text-center",
          isProgress
            ? isDarkMode
              ? "border-emerald-500/35 bg-emerald-950/40"
              : "border-emerald-200 bg-emerald-50/80"
            : isDarkMode
              ? "border-sky-500/30 bg-sky-950/30"
              : "border-sky-200 bg-sky-50/50",
        )}
      >
        <p className={cn("text-sm font-medium", isDarkMode ? "text-iron-300" : "text-slate-600")}>{insight.line}</p>
        <div className="mt-3 flex justify-center">
          <WeightRepsDisplay weight={insight.weight} reps={insight.reps} isDarkMode={isDarkMode} size="hero" />
        </div>
        {insight.date ? (
          <p className={cn("mt-2 text-xs", isDarkMode ? "text-iron-500" : "text-slate-500")}>
            <DateWithRelative dateStr={insight.date} isDarkMode={isDarkMode} />
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SetChip({ weight, reps, isDarkMode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium tabular-nums",
        isDarkMode ? "border-iron-700/80 bg-iron-900/60" : "border-slate-200 bg-slate-50",
      )}
    >
      <span className={isDarkMode ? "text-sky-300" : "text-sky-700"}>{weight} kg</span>
      <span className={isDarkMode ? "text-iron-600" : "text-slate-300"}>×</span>
      <span className={isDarkMode ? "text-violet-300" : "text-violet-700"}>{reps}</span>
    </span>
  );
}

function SessionCard({ row, isDarkMode }) {
  return (
    <div
      className={cn(
        "rounded-card border px-3 py-2.5",
        isDarkMode ? "border-iron-800/80 bg-iron-900/35" : "border-slate-200/90 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-xs font-medium", isDarkMode ? "text-iron-200" : "text-slate-800")}>
          <DateWithRelative dateStr={row.date} isDarkMode={isDarkMode} />
        </p>
        <p className={cn("text-xs font-semibold tabular-nums", isDarkMode ? "text-emerald-400/90" : "text-emerald-700")}>
          {Math.round(row.volume).toLocaleString()} kg
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {row.sets.map((set, idx) => (
          <SetChip key={`${row.date}-${idx}`} weight={set.weight} reps={set.reps} isDarkMode={isDarkMode} />
        ))}
      </div>
    </div>
  );
}

function CollapsibleBlock({ title, count, isDarkMode, children }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-card border px-3.5 py-2.5 text-left transition-colors",
          isDarkMode
            ? "border-iron-800 bg-iron-900/30 hover:bg-iron-900/50"
            : "border-slate-200 bg-white hover:bg-slate-50",
        )}
        aria-expanded={open}
      >
        <span className={cn("text-sm font-semibold", isDarkMode ? "text-iron-200" : "text-slate-800")}>{title}</span>
        <span className="flex items-center gap-2">
          {count != null ? (
            <span
              className={cn(
                "rounded-pill px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-500",
              )}
            >
              {count}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              open && "rotate-180",
              isDarkMode ? "text-iron-500" : "text-slate-400",
            )}
            aria-hidden
          />
        </span>
      </button>
      {open ? <div className="mt-2 space-y-2">{children}</div> : null}
    </section>
  );
}

export default function ExercisePastSetsDrawer({
  open,
  onOpenChange,
  isDarkMode,
  exerciseName,
  excludeSessionId = null,
  getExerciseSetHistory,
  userId,
}) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["exerciseSetHistory", userId, exerciseName, excludeSessionId],
    queryFn: () =>
      getExerciseSetHistory(exerciseName, {
        lookbackDays: 365,
        excludeSessionId,
      }),
    enabled: Boolean(open && userId && exerciseName && getExerciseSetHistory),
  });

  const analysis = useMemo(() => analyzeExerciseSetHistory(sessions), [sessions]);
  const heroInsight = useMemo(() => buildHeroInsight(analysis), [analysis]);

  const maxPlateauSessions = Math.max(...analysis.plateaus.map(p => p.sessionCount), 1);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "flex max-h-[min(92vh,860px)] flex-col",
          isDarkMode ? "!border-iron-800 !bg-iron-950" : "!border-slate-200 !bg-slate-50",
        )}
      >
        <DrawerHeader className="shrink-0 border-b px-5 pb-3 pt-2 text-left">
          <DrawerTitle className={cn("text-lg font-semibold", isDarkMode ? "text-iron-50" : "text-slate-900")}>
            {exerciseName}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 className={cn("h-5 w-5 animate-spin", isDarkMode ? "text-iron-500" : "text-slate-400")} aria-hidden />
              <span className={cn("text-sm", isDarkMode ? "text-iron-500" : "text-slate-500")}>Loading…</span>
            </div>
          ) : analysis.totalSessions === 0 ? (
            <p className={cn("py-12 text-center text-sm", isDarkMode ? "text-iron-500" : "text-slate-500")}>
              No history yet
            </p>
          ) : (
            <div className="space-y-3">
              {analysis.tableRows[0] ? (
                <LastSessionCard row={analysis.tableRows[0]} isDarkMode={isDarkMode} />
              ) : null}

              <HeroCard insight={heroInsight} isDarkMode={isDarkMode} />

              <CollapsibleBlock title="All sessions" count={analysis.tableRows.length} isDarkMode={isDarkMode}>
                {analysis.tableRows.map(row => (
                  <SessionCard key={row.date} row={row} isDarkMode={isDarkMode} />
                ))}
              </CollapsibleBlock>

              {analysis.plateaus.length > 0 ? (
                <CollapsibleBlock title="Same weight streaks" count={analysis.plateaus.length} isDarkMode={isDarkMode}>
                  {analysis.plateaus.map((plateau, idx) => {
                    const widthPct = Math.max(12, Math.round((plateau.sessionCount / maxPlateauSessions) * 100));
                    return (
                      <div
                        key={`${plateau.startDate}-${plateau.weight}-${plateau.reps}`}
                        className={cn(
                          "rounded-card border px-3 py-2.5",
                          idx === 0
                            ? isDarkMode
                              ? "border-violet-500/25 bg-violet-950/20"
                              : "border-violet-200 bg-violet-50/50"
                            : isDarkMode
                              ? "border-iron-800/80 bg-iron-900/30"
                              : "border-slate-200 bg-white",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <WeightRepsDisplay weight={plateau.weight} reps={plateau.reps} isDarkMode={isDarkMode} size="sm" />
                          <span className={cn("text-xs font-bold tabular-nums", isDarkMode ? "text-violet-300" : "text-violet-700")}>
                            {plateau.sessionCount}×
                          </span>
                        </div>
                        <div className={cn("mt-2 h-1 overflow-hidden rounded-full", isDarkMode ? "bg-iron-800" : "bg-slate-100")}>
                          <div
                            className={cn("h-full rounded-full", isDarkMode ? "bg-violet-500/70" : "bg-violet-400")}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <p className={cn("mt-1 text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                          <DateWithRelative dateStr={plateau.endDate} isDarkMode={isDarkMode} short />
                          {plateau.startDate !== plateau.endDate ? (
                            <>
                              {" – "}
                              <DateWithRelative dateStr={plateau.startDate} isDarkMode={isDarkMode} short />
                            </>
                          ) : null}
                        </p>
                      </div>
                    );
                  })}
                </CollapsibleBlock>
              ) : null}

              {analysis.personalBest && heroInsight?.mode !== "baseline" ? (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-card border px-3 py-2",
                    isDarkMode ? "border-amber-500/20 bg-amber-950/15" : "border-amber-200/80 bg-amber-50/40",
                  )}
                >
                  <Trophy className={cn("h-3.5 w-3.5 shrink-0", isDarkMode ? "text-amber-400" : "text-amber-600")} aria-hidden />
                  <p className={cn("text-xs tabular-nums", isDarkMode ? "text-amber-200/90" : "text-amber-900/90")}>
                    PR {analysis.personalBest.weight} kg × {analysis.personalBest.reps} ·{" "}
                    <DateWithRelative dateStr={analysis.personalBest.date} isDarkMode={isDarkMode} />
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
