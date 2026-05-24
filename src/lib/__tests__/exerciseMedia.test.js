import { describe, it, expect } from "vitest";
import { exerciseImageUnoptimized, googleImagesSearchUrl } from "@/lib/exerciseMedia";

describe("exerciseImageUnoptimized", () => {
  it("allows user-pasted hosts without next.config entry", () => {
    expect(
      exerciseImageUnoptimized(
        "https://liftmanual.com/wp-content/uploads/2023/04/cable-kneeling-one-arm-lat-pulldown.jpg",
      ),
    ).toBe(true);
  });

  it("still unoptimizes gifs and wger", () => {
    expect(exerciseImageUnoptimized("https://wger.de/media/foo.jpg")).toBe(true);
    expect(exerciseImageUnoptimized("https://cdn.example/demo.gif")).toBe(true);
  });

  it("appends gif to google images search query", () => {
    const url = googleImagesSearchUrl("Lat Pulldown");
    expect(url).toContain(encodeURIComponent("Lat Pulldown gif"));
    expect(googleImagesSearchUrl("Bench Press gif")).toContain(encodeURIComponent("Bench Press gif"));
  });
});
