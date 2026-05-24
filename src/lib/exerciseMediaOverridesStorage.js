import {
  cacheLocalExerciseMediaOverrides,
  readLocalExerciseMediaOverrides,
} from "@/lib/userPrefsMigration";

export function isExerciseMediaOverridesMap(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Local first, then server — server wins on duplicate keys. */
export function mergeExerciseMediaOverrides(local, server) {
  const a = isExerciseMediaOverridesMap(local) ? local : {};
  const b = isExerciseMediaOverridesMap(server) ? server : {};
  return { ...a, ...b };
}

export function hasExerciseMediaOverrides(map) {
  return isExerciseMediaOverridesMap(map) && Object.keys(map).length > 0;
}

/**
 * Merge localStorage + Supabase overrides; cache merged result locally.
 * @returns {{ merged: object, needsServerBackfill: boolean }}
 */
export function reconcileExerciseMediaOverrides(userId, serverOverrides) {
  if (typeof window === "undefined") {
    const merged = isExerciseMediaOverridesMap(serverOverrides) ? serverOverrides : {};
    return { merged, needsServerBackfill: false };
  }

  const local = readLocalExerciseMediaOverrides(userId);
  const merged = mergeExerciseMediaOverrides(local, serverOverrides);

  if (hasExerciseMediaOverrides(merged)) {
    cacheLocalExerciseMediaOverrides(userId, merged);
  }

  const serverEmpty = !hasExerciseMediaOverrides(serverOverrides);
  const localHad = hasExerciseMediaOverrides(local);
  const needsServerBackfill = serverEmpty && localHad;

  return { merged, needsServerBackfill };
}
