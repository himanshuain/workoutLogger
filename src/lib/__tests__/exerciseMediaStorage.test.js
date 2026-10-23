import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: path => ({
          data: {
            publicUrl: `https://example.supabase.co/storage/v1/object/public/workoutlogger/${path}`,
          },
        }),
      }),
    },
  },
}));

import {
  buildExerciseMediaStoragePath,
  parseExerciseMediaStoragePath,
  isExerciseMediaStorageUrl,
} from "@/lib/exerciseMediaStorage";

describe("exerciseMediaStorage", () => {
  const userId = "11111111-2222-3333-4444-555555555555";
  const exercise = { id: "abc-123", name: "Bench Press" };

  it("builds a per-user storage path", () => {
    expect(buildExerciseMediaStoragePath(userId, exercise)).toBe(
      `exercise-media/${userId}/abc-123.gif`,
    );
  });

  it("parses public storage URLs", () => {
    const url = `https://xyz.supabase.co/storage/v1/object/public/workoutlogger/exercise-media/${userId}/abc-123.gif`;
    expect(parseExerciseMediaStoragePath(url)).toBe(`exercise-media/${userId}/abc-123.gif`);
    expect(isExerciseMediaStorageUrl(url)).toBe(true);
  });
});
