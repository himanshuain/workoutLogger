import { exerciseMediaUrl } from "@/lib/exerciseMedia";

export function normalizeExerciseName(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Legacy SQL seed rows without an external catalog source. */
export function isLegacySeedExercise(exercise) {
  return Boolean(exercise?.is_predefined && !exercise?.external_source);
}

function catalogRichnessScore(exercise) {
  let s = 0;
  if (exercise.gif_url) s += 400;
  else if (exercise.image_url) s += 200;

  const eapi = exercise.metadata?.exerciseapi;
  if (eapi?.videos?.length) s += 180;
  else if (eapi?.images?.length) s += 60;

  const descLen = exercise.description?.trim().length ?? 0;
  if (descLen > 80) s += 60;
  else if (descLen > 0) s += 20;

  if (exercise.external_source === "exercisedb") s += 40;
  else if (exercise.external_source === "exerciseapi") s += 35;
  else if (exercise.external_source === "wger") s += 8;
  else if (exercise.external_source) s += 5;

  if (eapi?.keywords?.length) s += 10;
  if (eapi?.variations?.length) s += 5;

  return s;
}

function mergeLosersMetadata(winner, loser) {
  if (!loser?.metadata || typeof loser.metadata !== "object") return winner;
  const merged = { ...(winner.metadata || {}) };
  for (const [key, val] of Object.entries(loser.metadata)) {
    if (merged[key] == null) merged[key] = val;
  }
  const aliases = new Set([...(merged._catalogAliases || []), loser.name].filter(Boolean));
  if (aliases.size) merged._catalogAliases = [...aliases];
  return { ...winner, metadata: merged };
}

/** True when a generic seed name is covered by a richer catalog row. */
export function isSeedCoveredByCatalog(seed, catalog) {
  const ns = normalizeExerciseName(seed.name);
  if (!ns) return false;

  for (const c of catalog) {
    if (c.id === seed.id || isLegacySeedExercise(c)) continue;
    const nc = normalizeExerciseName(c.name);
    if (nc === ns) return true;
    if (ns.length >= 5 && nc.includes(ns) && exerciseMediaUrl(c)) return true;
    if (nc.length >= 5 && ns.includes(nc) && exerciseMediaUrl(c)) return true;
  }
  return false;
}

/**
 * One row per normalized display name — keep richest entry (GIF + exerciseapi metadata).
 */
export function dedupeExercisesForPicker(exercises) {
  if (!exercises?.length) return [];

  const bestByName = new Map();

  for (const ex of exercises) {
    const key = normalizeExerciseName(ex.name);
    if (!key) continue;

    const prev = bestByName.get(key);
    if (!prev) {
      bestByName.set(key, ex);
      continue;
    }

    // User-created exercises win over catalog rows with the same name.
    const exIsUser = Boolean(ex.user_id);
    const prevIsUser = Boolean(prev.user_id);
    if (exIsUser && !prevIsUser) {
      bestByName.set(key, mergeLosersMetadata(ex, prev));
      continue;
    }
    if (prevIsUser && !exIsUser) {
      bestByName.set(key, mergeLosersMetadata(prev, ex));
      continue;
    }

    const diff = catalogRichnessScore(ex) - catalogRichnessScore(prev);
    if (diff > 0) {
      bestByName.set(key, mergeLosersMetadata(ex, prev));
    } else if (diff === 0) {
      const exMedia = exerciseMediaUrl(ex);
      const prevMedia = exerciseMediaUrl(prev);
      if (exMedia && !prevMedia) {
        bestByName.set(key, mergeLosersMetadata(ex, prev));
      } else if (ex.external_source === "exercisedb" && prev.external_source === "wger") {
        bestByName.set(key, mergeLosersMetadata(ex, prev));
      } else {
        bestByName.set(key, mergeLosersMetadata(prev, ex));
      }
    } else {
      bestByName.set(key, mergeLosersMetadata(prev, ex));
    }
  }

  return Array.from(bestByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Search blob: name, muscles, keywords, variations, equipment. */
export function exerciseSearchBlob(exercise) {
  if (!exercise) return "";
  const parts = [exercise.name, exercise.category];
  const edb = exercise.metadata?.exercisedb;
  const eapi = exercise.metadata?.exerciseapi;

  if (edb) {
    parts.push(...(edb.targetMuscles || []), ...(edb.secondaryMuscles || []), ...(edb.bodyParts || []));
    parts.push(...(edb.equipments || []));
  }
  if (eapi) {
    parts.push(...(eapi.keywords || []), ...(eapi.variations || []));
    parts.push(...(eapi.primaryMuscles || []), ...(eapi.secondaryMuscles || []));
    parts.push(eapi.equipment, eapi.overview, eapi.level, eapi.mechanic);
  }
  if (exercise.metadata?.equipment_display) parts.push(exercise.metadata.equipment_display);
  if (Array.isArray(exercise.metadata?._catalogAliases)) {
    parts.push(...exercise.metadata._catalogAliases);
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function exerciseMatchesSearch(exercise, term) {
  const t = String(term || "").trim().toLowerCase();
  if (!t) return true;
  return exerciseSearchBlob(exercise).includes(t);
}

/** Final catalog for pickers: dedupe + drop legacy seeds superseded by catalog media. */
export function prepareExerciseCatalog(exercises) {
  const deduped = dedupeExercisesForPicker(exercises || []);
  return deduped.filter(ex => {
    if (!isLegacySeedExercise(ex)) return true;
    return !isSeedCoveredByCatalog(ex, deduped);
  });
}

/** Map variation label → catalog exercise (exact normalized name). */
export function buildExerciseCatalogByName(exercises) {
  const map = new Map();
  for (const ex of exercises || []) {
    const key = normalizeExerciseName(ex.name);
    if (key && !map.has(key)) map.set(key, ex);
  }
  return map;
}

export function resolveCatalogVariations(exercise, catalogByName) {
  const labels = exercise?.metadata?.exerciseapi?.variations;
  if (!Array.isArray(labels) || !catalogByName) return [];

  const out = [];
  const seen = new Set();
  for (const label of labels) {
    const key = normalizeExerciseName(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const match = catalogByName.get(key);
    out.push({ label, exercise: match || null });
  }
  return out;
}
