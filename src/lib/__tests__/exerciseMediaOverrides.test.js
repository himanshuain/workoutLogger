import { describe, it, expect } from "vitest";
import {
  getExerciseMediaOverrideKey,
  getExerciseMediaOverrideUrl,
  buildExerciseMediaOverridesPatch,
  isValidMediaUrl,
  mergeMediaUrlsWithOverride,
} from "@/lib/exerciseMediaOverrides";

describe("exerciseMediaOverrides", () => {
  const exercise = { id: "abc-123", name: "Bench Press" };

  it("keys by exercise id", () => {
    expect(getExerciseMediaOverrideKey(exercise)).toBe("abc-123");
  });

  it("reads and writes override url", () => {
    const overrides = { "abc-123": { media_url: "https://example.com/a.gif" } };
    expect(getExerciseMediaOverrideUrl(exercise, overrides)).toBe("https://example.com/a.gif");
  });

  it("builds patch to set and clear", () => {
    const set = buildExerciseMediaOverridesPatch({}, exercise, "https://example.com/x.jpg");
    expect(set["abc-123"].media_url).toBe("https://example.com/x.jpg");
    const cleared = buildExerciseMediaOverridesPatch(set, exercise, "");
    expect(cleared["abc-123"]).toBeUndefined();
  });

  it("validates http(s) urls", () => {
    expect(isValidMediaUrl("https://cdn.example/img.gif")).toBe(true);
    expect(isValidMediaUrl("ftp://x")).toBe(false);
    expect(isValidMediaUrl("not-a-url")).toBe(false);
  });

  it("prepends override to media list", () => {
    expect(mergeMediaUrlsWithOverride(["https://a"], "https://b")).toEqual([
      "https://b",
      "https://a",
    ]);
  });
});
