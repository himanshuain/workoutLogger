import { describe, it, expect } from "vitest";
import {
  searchLocalExerciseGifs,
  mergeGifSearchResults,
  searchExerciseGifs,
} from "@/lib/exerciseGifSearch";

describe("exerciseGifSearch", () => {
  const catalog = [
    {
      id: "1",
      name: "Cable Seated Row",
      external_source: "smartworkout",
      gif_url: "https://api.smartworkout.app/asset/image/a.gif",
    },
    {
      id: "2",
      name: "Lat Pulldown",
      external_source: "smartworkout",
      gif_url: "https://api.smartworkout.app/asset/image/b.gif",
    },
    {
      id: "3",
      name: "Bench Press",
      external_source: "exercisedb",
      gif_url: "https://static.exercisedb.dev/media/x.gif",
    },
  ];

  it("finds SmartWorkout exercises by partial name", () => {
    const hits = searchLocalExerciseGifs(catalog, "seated row");
    expect(hits.length).toBe(1);
    expect(hits[0].name).toMatch(/seated row/i);
    expect(hits[0].source).toBe("smartworkout");
    expect(hits[0].gifUrl).toContain("smartworkout.app");
  });

  it("ignores non-SmartWorkout catalog rows", () => {
    const hits = searchLocalExerciseGifs(catalog, "bench press");
    expect(hits).toHaveLength(0);
  });

  it("searchExerciseGifs does not call external APIs", async () => {
    const hits = await searchExerciseGifs("lat", { localExercises: catalog });
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe("Lat Pulldown");
  });

  it("merges local and remote without duplicate URLs", () => {
    const merged = mergeGifSearchResults(
      [{ id: "1", name: "a", gifUrl: "https://x/a.gif", source: "smartworkout" }],
      [{ id: "2", name: "b", gifUrl: "https://x/a.gif", source: "smartworkout" }],
      10,
    );
    expect(merged).toHaveLength(1);
  });
});
