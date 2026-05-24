import { describe, it, expect } from "vitest";
import {
  getExerciseMediaOverrideKey,
  getExerciseMediaOverrideKeys,
  getExerciseMediaOverrideUrl,
  getExerciseMediaOverrideByName,
  buildExerciseMediaOverridesPatch,
  isValidMediaUrl,
  mergeMediaUrlsWithOverride,
} from "@/lib/exerciseMediaOverrides";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";

describe("exerciseMediaOverrides", () => {
  const exercise = { id: "abc-123", name: "Bench Press" };

  it("keys by exercise id and normalized name", () => {
    expect(getExerciseMediaOverrideKeys(exercise)).toEqual([
      "abc-123",
      "name:bench press",
      "name:benchpress",
    ]);
    expect(getExerciseMediaOverrideKey(exercise)).toBe("abc-123");
  });

  it("reads override by id or name key", () => {
    expect(
      getExerciseMediaOverrideUrl(exercise, { "name:bench press": { media_url: "https://example.com/a.gif" } }),
    ).toBe("https://example.com/a.gif");
    expect(getExerciseMediaOverrideByName("Bench Press", { "name:bench press": { media_url: "https://x.gif" } })).toBe(
      "https://x.gif",
    );
  });

  it("Face Pull matches override saved as Facepull via compact name key", () => {
    const saved = { id: "custom-id", name: "Facepull" };
    const patch = buildExerciseMediaOverridesPatch({}, saved, "https://example.com/fp.gif");
    expect(patch["name:facepull"]).toBeTruthy();
    const catalogRow = { id: "seed-id", name: "Face Pull" };
    expect(getExerciseMediaOverrideUrl(catalogRow, patch)).toBe("https://example.com/fp.gif");
  });

  it("writes patch under id and name keys", () => {
    const set = buildExerciseMediaOverridesPatch({}, exercise, "https://example.com/x.jpg");
    expect(set["abc-123"].media_url).toBe("https://example.com/x.jpg");
    expect(set["name:bench press"].media_url).toBe("https://example.com/x.jpg");
    const cleared = buildExerciseMediaOverridesPatch(set, exercise, "");
    expect(cleared["abc-123"]).toBeUndefined();
    expect(cleared["name:bench press"]).toBeUndefined();
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

  it("resolveExerciseMediaUrl uses name override when catalog id differs", () => {
    const exercises = [{ id: "other-id", name: "Bench Press", gif_url: "https://catalog.gif" }];
    const overrides = { "name:bench press": { media_url: "https://custom.gif" } };
    expect(resolveExerciseMediaUrl(exercises, "Bench Press", overrides)).toBe("https://custom.gif");
  });
});
