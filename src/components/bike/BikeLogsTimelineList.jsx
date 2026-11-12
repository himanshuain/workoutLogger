import LifeLogGapPill from "@/components/lifelog/LifeLogGapPill";
import BikeLogTimelineRow from "@/components/bike/BikeLogTimelineRow";
import { gapDaysBetween } from "@/lib/lifelogUtils";
import { cn } from "@/lib/utils";

export default function BikeLogsTimelineList({
  logs,
  isDarkMode,
  showTrackerName,
  onEdit,
  onDelete,
}) {
  if (logs.length === 0) return null;

  const lineClass = isDarkMode ? "bg-iron-700" : "bg-slate-300";
  const dotClass = isDarkMode
    ? "border-lift-primary bg-iron-950"
    : "border-workout-primary bg-white";

  return (
    <ol className="m-0 list-none" aria-label="Bike log timeline">
      {logs.map((row, index) => {
        const older = logs[index + 1];
        const gapDays = older ? gapDaysBetween(row.date, older.date) : 0;
        const isLast = index === logs.length - 1;

        return (
          <li key={row.id} className="flex gap-3 sm:gap-4">
            <div className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
              <span
                className={cn(
                  "mt-4 h-3 w-3 shrink-0 rounded-full border-[2.5px]",
                  dotClass,
                )}
              />
              {!isLast ? (
                <span className={cn("mt-1 w-0.5 min-h-[1.25rem] flex-1", lineClass)} />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <BikeLogTimelineRow
                row={row}
                isDarkMode={isDarkMode}
                showTrackerName={showTrackerName}
                onEdit={() => onEdit(row)}
                onDelete={() => onDelete(row)}
                layout="timeline"
              />
              {gapDays > 0 && older ? (
                <div
                  className={cn(
                    "flex justify-center py-1 my-2",
                    isDarkMode ? "opacity-75" : "opacity-90",
                  )}
                >
                  <LifeLogGapPill
                    gapDays={gapDays}
                    newerDateStr={row.date}
                    olderDateStr={older.date}
                    kind="logs"
                    isDarkMode={isDarkMode}
                  />
                </div>
              ) : !isLast ? (
                <div className="h-2" aria-hidden />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
