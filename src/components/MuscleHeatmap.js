import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

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
    <div
      className={`rounded-2xl overflow-hidden ${
        isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? "bg-amber-500/20" : "bg-red-100"
              }`}
            >
              <Activity className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-red-600"}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                Muscle Map
              </h3>
              <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                {totalSets > 0 ? `${totalSets} sets this week` : "No training data this week"}
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className={`flex gap-0.5 p-0.5 rounded-lg ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}>
            {[
              { id: "both", label: "Both" },
              { id: "anterior", label: "Front" },
              { id: "posterior", label: "Back" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewSide(v.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  viewSide === v.id
                    ? isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white"
                    : isDarkMode
                      ? "text-iron-400"
                      : "text-slate-500"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Models */}
        <div
          className={`flex justify-center py-2 transition-opacity duration-200 ${
            isDarkMode ? "bg-iron-800/30" : "bg-slate-50"
          } rounded-xl`}
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

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const count = counts[key] || 0;
            const isActive = count > 0;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  isActive
                    ? isDarkMode
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-red-50 border border-red-200"
                    : isDarkMode
                      ? "bg-iron-800/50"
                      : "bg-slate-50"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? isDarkMode ? "#fbbf24" : "#ef4444"
                      : isDarkMode ? "#3f3f46" : "#cbd5e1",
                  }}
                />
                <span
                  className={`text-xs font-medium truncate ${
                    isActive
                      ? isDarkMode ? "text-iron-100" : "text-slate-800"
                      : isDarkMode ? "text-iron-500" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`text-xs ml-auto shrink-0 tabular-nums ${
                    isActive
                      ? isDarkMode ? "text-amber-400" : "text-red-500"
                      : isDarkMode ? "text-iron-600" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Intensity Legend */}
        <div className={`flex items-center justify-center gap-4 mt-3 pt-3 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
          <span className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>Intensity:</span>
          {["Low", "Medium", "High"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: highlightedColors[i] }}
              />
              <span className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
