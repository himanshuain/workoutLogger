import { Pencil, Tag, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { formatRelativeFromToday } from "@/lib/bikeLogUtils";

function shortDate(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function listTagChipClass(isDarkMode) {
  return isDarkMode
    ? "bg-lift-primary/20 text-lift-primary ring-1 ring-lift-primary/25"
    : "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
}

function formatCost(cost) {
  if (cost == null || cost === "") return null;
  const n = Number(cost);
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

function MetaLine({ row, isDarkMode }) {
  const costStr = formatCost(row.cost);
  const km = row.odometer_km != null ? `${Number(row.odometer_km).toLocaleString("en-IN")} km` : null;
  if (!costStr && !km) return null;
  return (
    <p className={`text-[11px] font-medium mt-1.5 ${isDarkMode ? "text-lift-primary/90" : "text-amber-700"}`}>
      {[costStr, km].filter(Boolean).join(" · ")}
    </p>
  );
}

export default function BikeLogTimelineRow({
  row,
  isDarkMode,
  showTrackerName,
  onEdit,
  onDelete,
  layout = "list",
}) {
  const title = row.title?.trim() || "";
  const body = row.body?.trim() || "";
  const fallback =
    !title && !body && row.cost != null && row.cost !== "" ? formatCost(row.cost) : null;
  const primary = title || body || fallback || "Entry";

  const isTimeline = layout === "timeline";
  const relativeWhen = formatRelativeFromToday(row.date);

  const dateLine = (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
      <time
        className={`text-[11px] sm:text-xs font-semibold ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
      >
        {shortDate(row.date)}
      </time>
      {relativeWhen ? (
        <span className={`text-[10px] font-medium ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
          · {relativeWhen}
        </span>
      ) : null}
    </div>
  );

  const card = (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "w-full text-left transition-colors rounded-card p-3 sm:p-3.5",
        isDarkMode
          ? "bg-iron-900/90 border border-iron-800/80 active:bg-iron-800"
          : "bg-white border border-slate-200/90 shadow-sm active:bg-slate-50",
        !isTimeline && "flex items-stretch gap-3",
      )}
    >
      {isTimeline ? (
        <>
          <div className="flex items-start justify-between gap-2 mb-1">
            {dateLine}
            {showTrackerName ? (
              <span className={`text-[10px] truncate ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                {row.eventIcon} {row.eventName}
              </span>
            ) : null}
          </div>
          {title && body ? (
            <>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>{title}</p>
              <p
                className={`text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed ${
                  isDarkMode ? "text-iron-300" : "text-slate-600"
                }`}
              >
                {body}
              </p>
            </>
          ) : (
            <p
              className={`text-sm font-medium whitespace-pre-wrap break-words leading-relaxed ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              {primary}
            </p>
          )}
          <MetaLine row={row} isDarkMode={isDarkMode} />
          {row.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {row.tags.map(tag => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold capitalize",
                    listTagChipClass(isDarkMode),
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="shrink-0 w-[4.75rem] sm:w-32 text-left">
            {dateLine}
            {showTrackerName ? (
              <p className={`text-[10px] mt-0.5 truncate ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                {row.eventIcon} {row.eventName}
              </p>
            ) : null}
          </div>
          <div className="flex-1 min-w-0 border-l pl-3 border-surface-subtle/60">
            {title && body ? (
              <>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>{title}</p>
                <p
                  className={`text-sm mt-1 whitespace-pre-wrap break-words ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                >
                  {body}
                </p>
              </>
            ) : (
              <p
                className={`text-sm font-medium whitespace-pre-wrap break-words ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
              >
                {primary}
              </p>
            )}
            <MetaLine row={row} isDarkMode={isDarkMode} />
            {row.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {row.tags.map(tag => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-pill px-2 py-0.5 text-[10px] font-semibold capitalize",
                      listTagChipClass(isDarkMode),
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <span className={`hidden sm:flex shrink-0 self-center p-2 rounded-card ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
            <Pencil className="w-4 h-4" />
          </span>
        </>
      )}
    </button>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
      <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
        <ContextMenuItem onSelect={onEdit} className="gap-2">
          <Pencil className="w-4 h-4" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem onSelect={onEdit} className="gap-2">
          <Tag className="w-4 h-4" />
          Tags & details
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDelete} className="gap-2 text-red-500 focus:text-red-500">
          <Trash2 className="w-4 h-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
