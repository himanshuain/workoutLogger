import { describe, it, expect } from "vitest";
import {
  searchLocalExerciseGifs,
  mergeGifSearchResults,
} from "@/lib/exerciseGifSearch";

describe("exerciseGifSearch", () => {
  const catalog = [
    {
      id: "1",
      name: "Cable Seated Row",
      gif_url: "https://static.exercisedb.dev/media/fUBheHs.gif",
    },
    {
      id: "2",
      name: "Lat Pulldown",
      gif_url: "https://static.exercisedb.dev/media/abc.gif",
    },
    { id: "3", name: "Bench Press", image_url: "https://example.com/bench.jpg" },
  ];

  it("finds local exercises by partial name", () => {
    const hits = searchLocalExerciseGifs(catalog, "seated row");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toMatch(/seated row/i);
    expect(hits[0].gifUrl).toContain(".gif");
  });

  it("merges local and remote without duplicate URLs", () => {
    const merged = mergeGifSearchResults(
      [{ id: "1", name: "a", gifUrl: "https://x/a.gif", source: "local" }],
      [{ id: "2", name: "b", gifUrl: "https://x/a.gif", source: "exercisedb" }],
      10,
    );
    expect(merged).toHaveLength(1);
  });
});
