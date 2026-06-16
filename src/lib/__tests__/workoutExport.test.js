import { describe, it, expect } from "vitest";
import {
  buildWorkoutExportPayload,
  exportFilename,
  formatSetsInline,
  getExportBounds,
  getExportRangeLabel,
  getMonthBounds,
  formatMonthLabel,
  resolveExportPresetId,
  formatExportPeriodLabel,
  formatMonthSpanLabel,
} from "@/lib/workoutExport";

describe("workoutExport", () => {
  it("builds payload from completed session sets", () => {
    const payload = buildWorkoutExportPayload({
      unit: "kg",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      presetId: "this_year",
      sessions: [
        {
          id: "s1",
          date: "2026-05-01",
          status: "completed",
          routine_name: "Push",
          set_logs: [
            { exercise_name: "Bench Press", category: "chest", set_number: 1, weight: 60, reps: 10, is_completed: true },
            { exercise_name: "Bench Press", category: "chest", set_number: 2, weight: 65, reps: 8, is_completed: true },
          ],
        },
        {
          id: "s2",
          date: "2026-05-02",
          status: "active",
          routine_name: "Pull",
          set_logs: [{ exercise_name: "Row", set_number: 1, weight: 40, reps: 12, is_completed: true }],
        },
      ],
      legacyLogs: [
        { date: "2026-04-01", exercise_name: "Squat", weight: 100, reps: 5, sets: 3 },
      ],
    });

    expect(payload.summary.workout_days).toBe(2);
    expect(payload.summary.total_sets).toBe(5);
    expect(payload.range.preset).toBe("this_year");
    expect(payload.presetId).toBe("this_year");
    expect(payload.workouts[0].date).toBe("2026-05-01");
    expect(payload.workouts[0].sessions[0].exercises[0].sets).toHaveLength(2);
  });

  it("computes month bounds", () => {
    expect(getMonthBounds("2026-02")).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(formatMonthLabel("2026-06")).toBe("June 2026");
  });

  it("computes export bounds for presets", () => {
    expect(getExportBounds("this_month", "2026-06-16")).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-16",
    });
    expect(getExportBounds("last_month", "2026-06-16")).toEqual({
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(getExportBounds("last_3_months", "2026-06-16")).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-06-16",
    });
    expect(getExportBounds("this_year", "2026-06-16")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-06-16",
    });
    expect(getExportBounds("all_time", "2026-06-16").endDate).toBe("2026-06-16");
  });

  it("handles year boundary for last month preset", () => {
    expect(getExportBounds("last_month", "2026-01-10")).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
  });

  it("formats inline sets and filenames", () => {
    expect(formatSetsInline(
      [{ weight: 60, reps: 10 }, { weight: 65, reps: 8 }],
      "kg",
    )).toBe("60 kg×10 · 65 kg×8");
    expect(exportFilename("workout-history", "pdf", { presetId: "last_3_months" }))
      .toBe("workout-history-last_3_months.pdf");
    expect(getExportRangeLabel("this_year")).toBe("This year");
    expect(resolveExportPresetId({ presetId: "last_month" })).toBe("last_month");
    expect(resolveExportPresetId({ range: { preset: "all_time" } })).toBe("all_time");
    expect(formatMonthSpanLabel("2026-04-01", "2026-06-16")).toBe("April – June 2026");
    expect(formatMonthSpanLabel("2026-06-01", "2026-06-16")).toBe("June 2026");
    expect(formatExportPeriodLabel({
      presetId: "last_3_months",
      range: { start: "2026-04-01", end: "2026-06-16", preset: "last_3_months" },
      workouts: [],
    })).toBe("Last 3 months · April – June 2026");
  });
});
