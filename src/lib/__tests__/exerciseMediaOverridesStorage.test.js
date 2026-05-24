import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mergeExerciseMediaOverrides,
  reconcileExerciseMediaOverrides,
} from "@/lib/exerciseMediaOverridesStorage";

describe("exerciseMediaOverridesStorage", () => {
  beforeEach(() => {
    const store = {};
    const ls = {
      getItem(key) {
        return store[key] ?? null;
      },
      setItem(key, value) {
        store[key] = value;
      },
    };
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("window", { localStorage: ls });
  });

  it("merges local then server with server winning on conflicts", () => {
    expect(
      mergeExerciseMediaOverrides(
        { "name:bench press": { media_url: "https://local.gif" } },
        { "name:bench press": { media_url: "https://server.gif" } },
      ),
    ).toEqual({ "name:bench press": { media_url: "https://server.gif" } });
  });

  it("reconciles from localStorage when server is empty", () => {
    localStorage.setItem(
      "wl_exercise_media_overrides_user-1",
      JSON.stringify({ "name:squat": { media_url: "https://saved.gif" } }),
    );

    const { merged, needsServerBackfill } = reconcileExerciseMediaOverrides("user-1", {});
    expect(merged).toEqual({ "name:squat": { media_url: "https://saved.gif" } });
    expect(needsServerBackfill).toBe(true);
  });
});
