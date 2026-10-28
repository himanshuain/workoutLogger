import {
  cacheExerciseMediaAfterLoad,
  getCachedExerciseMediaSrc,
  preloadExerciseMedia,
} from "@/lib/exerciseMediaCache";

describe("exerciseMediaCache", () => {
  it("returns original url until a blob copy exists", () => {
    const url = "https://api.smartworkout.app/asset/image/test.gif";
    expect(getCachedExerciseMediaSrc(url)).toBe(url);
    expect(getCachedExerciseMediaSrc("data:image/gif;base64,abc")).toBe("data:image/gif;base64,abc");
  });

  it("dedupes preload calls without throwing", () => {
    expect(() => {
      preloadExerciseMedia(null);
      preloadExerciseMedia("");
      cacheExerciseMediaAfterLoad("data:image/png;base64,xx");
    }).not.toThrow();
  });
});
