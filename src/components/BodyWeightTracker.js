import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { toast } from "sonner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Scale, Plus, TrendingDown, TrendingUp, Minus, Pencil, Trash2 } from "lucide-react";
import {
  ChartBody,
  ChartCollapsibleHeader,
  ChartSection,
  chartPanelInnerClass,
} from "@/components/charts/ChartChrome";
import { cn } from "@/lib/utils";

function MiniLineChart({ data, width = 280, height = 100, isDarkMode }) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const padding = { top: 8, bottom: 18, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - min) / range) * chartH,
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const accentColor = isDarkMode ? "#fbbf24" : "#dc2626";

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#weightGradient)" />
      <path d={pathD} fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          {(i === 0 || i === points.length - 1) && (
            <>
              <circle cx={p.x} cy={p.y} r="4" fill={accentColor} />
              <text
                x={p.x}
                y={padding.top + chartH + 14}
                textAnchor={i === 0 ? "start" : "end"}
                className={`text-[10px] ${isDarkMode ? "fill-iron-500" : "fill-slate-500"}`}
              >
                {p.value}{" "}
              </text>
            </>
          )}
        </g>
      ))}
      {/* Min / Max labels */}
      <text
        x={width - 2}
        y={padding.top + 4}
        textAnchor="end"
        className={`text-[9px] ${isDarkMode ? "fill-iron-600" : "fill-slate-400"}`}
      >
        {max.toFixed(1)}
      </text>
      <text
        x={width - 2}
        y={padding.top + chartH - 2}
        textAnchor="end"
        className={`text-[9px] ${isDarkMode ? "fill-iron-600" : "fill-slate-400"}`}
      >
        {min.toFixed(1)}
      </text>
    </svg>
  );
}

export default function BodyWeightTracker({ isDarkMode }) {
  const { user, trackables, todayEntries, toggleTrackingEntry, toggleTrackingEntryForDate, createTrackable, getTrackingEntries, today } = useWorkout();
  const queryClient = useQueryClient();

  const [showLogModal, setShowLogModal] = useState(false);
  const [logWeight, setLogWeight] = useState("");
  const [logDate, setLogDate] = useState(today);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Find the body weight trackable
  const weightTrackable = useMemo(
    () => trackables.find((t) => t.name === "Body Weight" && t.has_value),
    [trackables],
  );

  // Fetch weight history
  const { data: weightHistory = [] } = useQuery({
    queryKey: ["bodyWeightHistory", user?.id, weightTrackable?.id],
    queryFn: async () => {
      if (!weightTrackable) return [];
      const startDate = "2020-01-01";
      const entries = await getTrackingEntries(startDate, today);
      return entries
        .filter((e) => e.trackable_id === weightTrackable.id && e.is_completed && e.value)
        .map((e) => ({ date: e.date, value: parseFloat(e.value) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user && !!weightTrackable,
  });

  const todayWeight = todayEntries[weightTrackable?.id];

  const stats = useMemo(() => {
    if (weightHistory.length === 0) return null;
    const latest = weightHistory[weightHistory.length - 1];
    const previous = weightHistory.length >= 2 ? weightHistory[weightHistory.length - 2] : null;
    const oldest = weightHistory[0];
    const change = previous ? (latest.value - previous.value).toFixed(1) : null;
    const totalChange = (latest.value - oldest.value).toFixed(1);
    return { latest, previous, oldest, change, totalChange, count: weightHistory.length };
  }, [weightHistory]);

  const handleCreateWeightTrackable = async () => {
    await createTrackable({
      name: "Body Weight",
      type: "health",
      icon: "⚖️",
      color: "#8b5cf6",
      has_value: true,
      value_unit: "kg",
    });
    toast.success("Body weight tracker created");
  };

  const handleLogWeight = async () => {
    if (!logWeight || !weightTrackable) return;
    const value = parseFloat(logWeight);
    if (isNaN(value)) return;

    if (logDate === today) {
      await toggleTrackingEntry(weightTrackable.id, true, value);
    } else {
      await toggleTrackingEntryForDate(weightTrackable.id, logDate, true, value);
    }
    toast.success(`Weight logged: ${value} kg`);
    queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
    setShowLogModal(false);
    setLogWeight("");
    setLogDate(today);
  };

  const handleDeleteEntry = async (entry) => {
    if (!weightTrackable) return;
    if (entry.date === today) {
      await toggleTrackingEntry(weightTrackable.id, false, null);
    } else {
      await toggleTrackingEntryForDate(weightTrackable.id, entry.date, false, null);
    }
    toast.success("Entry deleted");
    queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
    setDeleteConfirm(null);
  };

  const handleEditEntry = (entry) => {
    setLogDate(entry.date);
    setLogWeight(entry.value.toString());
    setShowLogModal(true);
  };

  // No weight trackable yet - show setup card
  if (!weightTrackable) {
    return (
      <div
        className={`rounded-card p-4 border-2 border-dashed ${
          isDarkMode ? "border-iron-700 bg-iron-900/30" : "border-slate-300 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-card flex items-center justify-center ${isDarkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <Scale className={`w-5 h-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>Body Weight</h3>
            <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Track your weight over time</p>
          </div>
        </div>
        <button
          onClick={handleCreateWeightTrackable}
          className={`w-full py-2.5 rounded-card text-sm font-medium ${
            isDarkMode
              ? "bg-purple-500/20 text-purple-300 active:bg-purple-500/30"
              : "bg-purple-100 text-purple-700 active:bg-purple-200"
          }`}
        >
          Enable Weight Tracking
        </button>
      </div>
    );
  }

  const chartData = weightHistory.slice(-30);

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <div className="flex items-start justify-between gap-2 pr-1">
        <ChartCollapsibleHeader
          isDarkMode={isDarkMode}
          icon={Scale}
          label="Body Weight"
          meta={stats ? `${stats.latest.value} kg` : "No data yet"}
          expanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          className="flex-1"
          trailing={
            stats?.change ? (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-0.5 text-[10px] font-semibold",
                  parseFloat(stats.change) < 0
                    ? "text-green-400"
                    : parseFloat(stats.change) > 0
                      ? "text-red-400"
                      : "text-metadata",
                )}
              >
                {parseFloat(stats.change) < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : parseFloat(stats.change) > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {Math.abs(parseFloat(stats.change))} kg
              </span>
            ) : null
          }
        />
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setLogWeight(todayWeight?.value?.toString() || "");
            setLogDate(today);
            setShowLogModal(true);
          }}
          className={cn(
            "mt-3 shrink-0 rounded-card p-2",
            chartPanelInnerClass(isDarkMode, isDarkMode ? "text-iron-400 active:bg-surface-pressed" : "text-[color:var(--text-secondary)]"),
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isExpanded && (
        <ChartBody isDarkMode={isDarkMode}>
          {chartData.length >= 2 ? (
            <div>
              <MiniLineChart data={chartData} width={300} height={100} isDarkMode={isDarkMode} />
              <p className="text-metadata mt-1 text-center">Last {chartData.length} entries</p>
            </div>
          ) : (
            <p className={`py-4 text-center text-sm ${isDarkMode ? "text-iron-600" : "text-[color:var(--text-muted)]"}`}>
              Log at least 2 entries to see the trend
            </p>
          )}

          {stats && (
            <div className="mt-2 flex gap-1.5 border-t border-surface-subtle pt-2">
              <div className={cn("flex-1 rounded-card p-2 text-center", chartPanelInnerClass(isDarkMode))}>
                <p className="text-metadata">Start</p>
                <p className={`font-bold ${isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"}`}>{stats.oldest.value}</p>
              </div>
              <div className={cn("flex-1 rounded-card p-2 text-center", chartPanelInnerClass(isDarkMode))}>
                <p className="text-metadata">Current</p>
                <p className={`font-bold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>{stats.latest.value}</p>
              </div>
              <div className={cn("flex-1 rounded-card p-2 text-center", chartPanelInnerClass(isDarkMode))}>
                <p className="text-metadata">Change</p>
                <p
                  className={`font-bold ${
                    parseFloat(stats.totalChange) < 0
                      ? "text-green-400"
                      : parseFloat(stats.totalChange) > 0
                        ? "text-red-400"
                        : isDarkMode
                          ? "text-iron-200"
                          : "text-[color:var(--text-primary)]"
                  }`}
                >
                  {parseFloat(stats.totalChange) > 0 ? "+" : ""}
                  {stats.totalChange}
                </p>
              </div>
            </div>
          )}

          {weightHistory.length > 0 && (
            <div className="mt-2 border-t border-surface-subtle pt-2">
              <h4 className="text-section-header mb-1">Recent</h4>
              <div className="space-y-1">
                {weightHistory.slice(-5).reverse().map((entry) => (
                  <div key={entry.date} className={`flex items-center py-1.5 px-2 rounded-lg gap-2 ${isDarkMode ? "hover:bg-iron-800/30" : "hover:bg-slate-50"}`}>
                    <span className={`text-xs flex-shrink-0 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                      {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className={`text-sm font-medium flex-1 text-right ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                      {entry.value} kg
                    </span>
                    <button
                      onClick={() => handleEditEntry(entry)}
                      className={`p-1 rounded-md ${isDarkMode ? "text-iron-500 hover:text-iron-300 hover:bg-iron-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(entry)}
                      className={`p-1 rounded-md ${isDarkMode ? "text-iron-500 hover:text-red-400 hover:bg-iron-700" : "text-slate-400 hover:text-red-500 hover:bg-slate-200"}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartBody>
      )}

      {/* Log Weight Modal */}
      <Modal open={showLogModal} onOpenChange={setShowLogModal}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Log Weight</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>Date</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                max={today}
                className={`input-field ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={logWeight}
                onChange={(e) => setLogWeight(e.target.value)}
                placeholder="e.g., 72.5"
                className={`input-field text-center text-2xl font-bold ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowLogModal(false)}
              className={`px-4 py-2.5 rounded-card text-sm font-medium ${isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"}`}
            >
              Cancel
            </button>
            <button
              onClick={handleLogWeight}
              disabled={!logWeight}
              className={`px-6 py-2.5 rounded-card text-sm font-bold ${
                isDarkMode
                  ? "bg-purple-500 text-white disabled:opacity-40"
                  : "bg-purple-600 text-white disabled:opacity-40"
              }`}
            >
              Save
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              Delete the weight entry for {deleteConfirm && new Date(deleteConfirm.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} ({deleteConfirm?.value} kg)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteEntry(deleteConfirm)}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ChartSection>
  );
}
