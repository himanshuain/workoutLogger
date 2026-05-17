import { Circle, CircleCheck, FileText, Hash, NotebookPen } from "lucide-react";

/**
 * Quick-action icon for a life-log event row.
 * - Not logged today: hollow/outline (Circle, Hash, FileText, or NotebookPen).
 * - Logged today: bold CircleCheck (“filled”) on accent; use loggedIconClass for contrast vs button bg.
 */
export default function LifeLogEventQuickGlyph({
  isLoggedToday,
  needValue,
  needNotes,
  loggedIconClass = "",
  mutedIconClass = "",
}) {
  const muted = mutedIconClass.trim();

  if (isLoggedToday) {
    const lc = loggedIconClass.trim();
    return (
      <CircleCheck
        className={`h-[1.3rem] w-[1.3rem] shrink-0 stroke-[3] ${lc}`.trim()}
        aria-hidden
      />
    );
  }

  if (needValue && needNotes) {
    return (
      <NotebookPen
        className={`h-4 w-4 shrink-0 stroke-[2.25] ${muted}`.trim()}
        aria-hidden
      />
    );
  }

  if (needValue) {
    return <Hash className={`h-4 w-4 shrink-0 stroke-[2.25] ${muted}`.trim()} aria-hidden />;
  }

  if (needNotes) {
    return (
      <FileText className={`h-4 w-4 shrink-0 stroke-[2.25] ${muted}`.trim()} aria-hidden />
    );
  }

  return (
    <Circle className={`h-[1.25rem] w-[1.25rem] shrink-0 stroke-[2.25] ${muted}`.trim()} aria-hidden />
  );
}
