import { describe, expect, it } from "vitest";
import {
  analyzeExerciseSetHistory,
  getCurrentStreak,
  getPlateauRuns,
} from "@/lib/exerciseSetHistoryAnalysis";

const sessions = [
  {
    date: "2026-06-22",
    routineName: "Back",
    sets: [
      { weight: 55, reps: 10 },
      { weight: 55, reps: 10 },
      { weight: 55, reps: 8 },
    ],
  },
  {
    date: "2026-06-15",
    routineName: "Back",
    sets: [
      { weight: 55, reps: 10 },
      { weight: 55, reps: 10 },
    ],
  },
  {
    date: "2026-06-01",
    routineName: "Back",
    sets: [{ weight: 55, reps: 10 }],
  },
];

describe("exerciseSetHistoryAnalysis", () => {
  it("detects current streak at dominant weight×reps", () => {
    expect(getCurrentStreak(sessions)).toEqual({
      weight: 55,
      reps: 10,
      sessions: 3,
      latestDate: "2026-06-22",
    });
  });

  it("finds plateau runs across history, newest first", () => {
    const runs = getPlateauRuns(sessions);
    expect(runs[0]).toMatchObject({
      weight: 55,
      reps: 10,
      sessionCount: 3,
      startDate: "2026-06-01",
      endDate: "2026-06-22",
    });
  });

  it("sorts plateau runs by most recent end date", () => {
    const multi = [
      ...sessions,
      {
        date: "2026-05-01",
        routineName: "Back",
        sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }],
      },
      {
        date: "2026-04-15",
        routineName: "Back",
        sets: [{ weight: 50, reps: 10 }],
      },
    ];
    const runs = getPlateauRuns(multi);
    expect(runs[0].endDate).toBe("2026-06-22");
    expect(runs[1].endDate).toBe("2026-05-01");
  });

  it("builds table rows and overload suggestion", () => {
    const analysis = analyzeExerciseSetHistory(sessions);
    expect(analysis.totalSessions).toBe(3);
    expect(analysis.tableRows[0].setsSummary).toContain("55 kg × 10");
    expect(analysis.personalBest).toMatchObject({ weight: 55, reps: 10 });
    expect(analysis.suggestion?.suggestedWeight).toBe(57.5);
  });
});
