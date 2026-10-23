import { describe, it, expect } from "vitest";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";

describe("resolveExerciseMediaUrl", () => {
  it("matches catalog by exercise_id when routine name differs", () => {
    const exercises = [
      {
        id: "sw-1",
        name: "Seated Cable Chest Press",
        gif_url: "https://example.com/g.gif",
      },
    ];
    const url = resolveExerciseMediaUrl(
      exercises,
      "Cable Seated Chest Press",
      {},
      "sw-1",
    );
    expect(url).toBe("https://example.com/g.gif");
  });

  it("matches by loose word order when id is missing", () => {
    const exercises = [
      {
        id: "sw-2",
        name: "Seated Cable Chest Press",
        gif_url: "https://example.com/g2.gif",
      },
    ];
    const url = resolveExerciseMediaUrl(exercises, "Cable Seated Chest Press", {});
    expect(url).toBe("https://example.com/g2.gif");
  });
});
