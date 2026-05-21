import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react";
import {
  ChartLegend,
  ChartLegendItem,
  ChartSection,
  ChartSectionHeader,
  ChartSegmentButton,
  ChartSegmentTrack,
  chartPanelInnerClass,
} from "@/components/charts/ChartChrome";
import { surfaceSelected } from "@/lib/surfaceStyles";
import { cn } from "@/lib/utils";

const Model = dynamic(() => import("react-body-highlighter"), { ssr: false });

const CATEGORY_TO_MUSCLES = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["front-deltoids", "back-deltoids"],
  legs: ["quadriceps", "hamstring", "calves", "gluteal", "adductor", "abductors"],
  arms: ["biceps", "triceps", "forearm"],
  core: ["abs", "obliques"],
};

function normalizeCategory(cat) {
  if (!cat) return null;
  const lower = cat.toLowerCase();
  if (lower.includes("chest")) return "chest";
  if (lower.includes("back") || lower.includes("lat") || lower.includes("trap") || lower.includes("row")) return "back";
  if (lower.includes("shoulder") || lower.includes("delt")) return "shoulders";
  if (lower.includes("leg") || lower.includes("quad") || lower.includes("hamstring") || lower.includes("calf") || lower.includes("calves") || lower.includes("glut") || lower.includes("squat")) return "legs";
  if (lower.includes("arm") || lower.includes("bicep") || lower.includes("tricep") || lower.includes("curl") || lower.includes("forearm")) return "arms";
  if (lower.includes("core") || lower.includes("ab")) return "core";
  return null;
}

function buildExerciseData(exerciseLogsByName) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const muscleFrequency = {};

  if (!exerciseLogsByName || typeof exerciseLogsByName !== "object") return { data: [], counts: {} };

  const categoryCounts = { chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0 };

  for (const [exerciseName, logs] of Object.entries(exerciseLogsByName)) {
    if (!Array.isArray(logs)) continue;

    const weekLogs = logs.filter((l) => l?.date && l.date >= weekAgoStr);
    if (weekLogs.length === 0) continue;

    const cat = normalizeCategory(weekLogs[0]?.category);
    if (!cat) continue;

    categoryCounts[cat] += weekLogs.length;

    const muscles = CATEGORY_TO_MUSCLES[cat] || [];
    muscles.forEach((m) => {
      muscleFrequency[m] = (muscleFrequency[m] || 0) + weekLogs.length;
    });
  }

  const exerciseDataMap = {};
  for (const [exerciseName, logs] of Object.entries(exerciseLogsByName)) {
    if (!Array.isArray(logs)) continue;
    const weekLogs = logs.filter((l) => l?.date && l.date >= weekAgoStr);
    if (weekLogs.length === 0) continue;

    const cat = normalizeCategory(weekLogs[0]?.category);
    if (!cat) continue;
    const muscles = CATEGORY_TO_MUSCLES[cat] || [];

    const freq = Math.min(Math.ceil(weekLogs.length / 3), 3);
    exerciseDataMap[exerciseName] = { name: exerciseName, muscles, frequency: freq };
  }

  return { data: Object.values(exerciseDataMap), counts: categoryCounts };
}

const CATEGORY_LABELS = [
  { key: "chest", label: "Chest", emoji: "🫁" },
  { key: "back", label: "Back", emoji: "🔙" },
  { key: "shoulders", label: "Shoulders", emoji: "💪" },
  { key: "legs", label: "Legs", emoji: "🦵" },
  { key: "arms", label: "Arms", emoji: "💪" },
  { key: "core", label: "Core", emoji: "🎯" },
];

export default function MuscleHeatmap({ exerciseLogsByName = {}, isDarkMode = false }) {
  const [viewSide, setViewSide] = useState("both");

  const { data, counts } = useMemo(
    () => buildExerciseData(exerciseLogsByName),
    [exerciseLogsByName],
  );

  const totalSets = Object.values(counts).reduce((a, b) => a + b, 0);

  const bodyColor = isDarkMode ? "#2a2a2e" : "#cbd5e1";
  const highlightedColors = isDarkMode
    ? ["#fbbf2466", "#fbbf24aa", "#fbbf24"]
    : ["#ef444466", "#ef4444aa", "#ef4444"];

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={Activity}
        label="Muscle Map"
        meta={totalSets > 0 ? `${totalSets} sets this week` : "No data this week"}
        isDarkMode={isDarkMode}
      >
        <ChartSegmentTrack isDarkMode={isDarkMode}>
          {[
            { id: "both", label: "Both" },
            { id: "anterior", label: "Front" },
            { id: "posterior", label: "Back" },
          ].map(v => (
            <ChartSegmentButton
              key={v.id}
              isDarkMode={isDarkMode}
              selected={viewSide === v.id}
              onClick={() => setViewSide(v.id)}
            >
              {v.label}
            </ChartSegmentButton>
          ))}
        </ChartSegmentTrack>
      </ChartSectionHeader>

      <div className="px-3 pb-3">
        {/* Body Models */}
        <div
          className={cn(
            "flex justify-center rounded-card py-1.5 transition-opacity duration-200",
            chartPanelInnerClass(isDarkMode),
          )}
        >
          {(viewSide === "both" || viewSide === "anterior") && (
            <div className={viewSide === "both" ? "flex-1 max-w-[180px]" : "max-w-[220px]"}>
              <Model
                data={data}
                type="anterior"
                bodyColor={bodyColor}
                highlightedColors={highlightedColors}
                style={{ width: "100%", padding: "0" }}
                svgStyle={{ width: "100%", height: "auto" }}
              />
              {viewSide === "both" && (
                <p className={`text-[10px] text-center mt-1 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                  Front
                </p>
              )}
            </div>
          )}
          {(viewSide === "both" || viewSide === "posterior") && (
            <div className={viewSide === "both" ? "flex-1 max-w-[180px]" : "max-w-[220px]"}>
              <Model
                data={data}
                type="posterior"
                bodyColor={bodyColor}
                highlightedColors={highlightedColors}
                style={{ width: "100%", padding: "0" }}
                svgStyle={{ width: "100%", height: "auto" }}
              />
              {viewSide === "both" && (
                <p className={`text-[10px] text-center mt-1 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                  Back
                </p>
              )}
            </div>
          )}
        </div>

        {/* Category legend */}
        <div className="mt-2 grid grid-cols-2 gap-1">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const count = counts[key] || 0;
            const isActive = count > 0;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 rounded-card px-2 py-1.5",
                  isActive
                    ? surfaceSelected(isDarkMode)
                    : chartPanelInnerClass(isDarkMode, "opacity-70"),
                )}
              >
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isActive
                      ? isDarkMode ? "#fbbf24" : "#ef4444"
                      : isDarkMode ? "#3f3f46" : "#cbd5e1",
                  }}
                />
                <span
                  className={cn(
                    "truncate text-[11px] font-medium",
                    isActive
                      ? isDarkMode ? "text-iron-100" : "text-[color:var(--text-primary)]"
                      : "text-metadata",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 tabular-nums text-[11px] font-semibold",
                    isActive
                      ? isDarkMode ? "text-amber-400" : "text-red-600"
                      : "text-metadata",
                  )}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Intensity legend */}
        <ChartLegend isDarkMode={isDarkMode} className="mt-2 justify-start px-0">
          <span className="text-metadata mr-1">Intensity</span>
          {["Low", "Medium", "High"].map((lbl, i) => (
            <ChartLegendItem
              key={lbl}
              label={lbl}
              swatch={
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: highlightedColors[i] }}
                />
              }
            />
          ))}
        </ChartLegend>
      </div>
    </ChartSection>
  );
}
