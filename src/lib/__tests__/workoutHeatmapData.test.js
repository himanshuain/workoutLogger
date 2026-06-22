import { describe, it, expect } from "vitest";
import { buildWorkoutHeatmapFromSessions, buildWorkoutSplitsByDate } from "@/lib/workoutHeatmapData";

describe("buildWorkoutHeatmapFromSessions", () => {
  it("includes only completed sessions", () => {
    const data = buildWorkoutHeatmapFromSessions([
      {
        date: "2026-05-20",
        status: "active",
        set_logs: [{ is_completed: true }, { is_completed: true }],
      },
      {
        date: "2026-05-21",
        status: "completed",
        set_logs: [{ is_completed: true }, { is_completed: true }],
      },
    ]);
    expect(data).toEqual([{ date: "2026-05-21", count: 2 }]);
  });

  it("counts mark-done days with no sets as 1", () => {
    const data = buildWorkoutHeatmapFromSessions([
      { date: "2026-05-22", status: "completed", set_logs: [] },
    ]);
    expect(data).toEqual([{ date: "2026-05-22", count: 1 }]);
  });

  it("ignores incomplete sets on completed sessions", () => {
    const data = buildWorkoutHeatmapFromSessions([
      {
        date: "2026-05-23",
        status: "completed",
        set_logs: [{ is_completed: true }, { is_completed: false }],
      },
    ]);
    expect(data).toEqual([{ date: "2026-05-23", count: 1 }]);
  });
});

describe("buildWorkoutSplitsByDate", () => {
  it("maps completed sessions to split names by date", () => {
    const splits = buildWorkoutSplitsByDate([
      { date: "2026-06-01", status: "completed", routine_name: "Push" },
      { date: "2026-06-01", status: "completed", routine_name: "Pull" },
      { date: "2026-06-02", status: "completed", routine_name: "Push" },
      { date: "2026-06-03", status: "active", routine_name: "Legs" },
      { date: "2026-06-04", status: "completed", routine_name: "" },
    ]);
    expect(splits).toEqual({
      "2026-06-01": ["Push", "Pull"],
      "2026-06-02": ["Push"],
      "2026-06-04": ["Workout"],
    });
  });
});
