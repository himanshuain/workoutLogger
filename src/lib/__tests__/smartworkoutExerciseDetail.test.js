import {
  primaryMuscleLabel,
  stabilizingMusclesSummary,
  detailFromCatalogExercise,
} from "@/lib/smartworkoutExerciseDetail";

describe("smartworkoutExerciseDetail", () => {
  it("labels primary muscle from body part", () => {
    expect(primaryMuscleLabel("CHEST")).toBe("Chest");
    expect(primaryMuscleLabel("BACK")).toBe("Back");
  });

  it("summarizes assisting muscles for chest fly", () => {
    const summary = stabilizingMusclesSummary(
      {
        CHEST_MIDDLE: 100,
        CHEST_LOWER: 70,
        SHOULDERS_FRONT_PART: 20,
      },
      "CHEST",
    );
    expect(summary).toBe("Front delts");
  });

  it("reads instructions from catalog metadata", () => {
    const ex = {
      name: "Cable Lat Pulldown",
      external_source: "smartworkout",
      external_id: "x",
      metadata: {
        smartworkout: {
          id: "x",
          bodyPart: "BACK",
          libraryPath: "/en/exercise-library/back/cable-lat-pulldown",
          instructions: ["Step one", "Step two"],
          exerciseMuscles: { BACK_LATS: 100, BICEPS_LONG_HEAD: 10 },
        },
      },
    };
    const d = detailFromCatalogExercise(ex);
    expect(d.instructions).toHaveLength(2);
    expect(d.primaryMuscle).toBe("Back");
    expect(d.needsFetch).toBe(false);
  });
});
