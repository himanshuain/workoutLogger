#!/usr/bin/env node
/**
 * Sync exercise GIFs + muscle metadata → Supabase `exercises`.
 *
 * Primary: ExerciseDB v1 API (https://www.exercisedb.dev) when available.
 * Fallback: ExerciseGymGifsDB static JSON + GIF CDN (jsDelivr) — same hybrid role
 * when the public ExerciseDB API is down.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run sync:exercises
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

loadEnvLocal();

const EXERCISEDB_API = "https://www.exercisedb.dev/api/v1";
const GIFDB_JSON =
  "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json";
const BATCH = 80;

function titleCaseName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Map body part / muscle → app category chips */
function mapBodyPartToCategory(bodyPart) {
  const b = String(bodyPart || "").toLowerCase();
  if (b === "chest") return "chest";
  if (b === "back") return "back";
  if (b === "shoulders" || b === "neck") return "shoulders";
  if (b === "upper arms" || b === "lower arms" || b === "arms" || b === "biceps" || b === "triceps")
    return "arms";
  if (
    b === "upper legs" ||
    b === "lower legs" ||
    b === "legs" ||
    b === "quads" ||
    b === "hamstrings" ||
    b === "calves" ||
    b === "glutes" ||
    b === "abductors" ||
    b === "adductors"
  )
    return "legs";
  if (b === "waist" || b === "abs" || b === "core") return "core";
  if (b === "cardio") return "other";
  return "other";
}

function rowFromExerciseDbApi(item) {
  if (!item?.exerciseId || !item?.name?.trim()) return null;
  const bodyPart = (item.bodyParts && item.bodyParts[0]) || "other";
  const equipmentStr = Array.isArray(item.equipments) ? item.equipments.join(", ") : "";

  return {
    name: titleCaseName(item.name.trim()),
    category: mapBodyPartToCategory(bodyPart),
    is_predefined: true,
    user_id: null,
    external_source: "exercisedb",
    external_id: String(item.exerciseId),
    description: Array.isArray(item.instructions) ? item.instructions.join("\n\n") : null,
    gif_url: item.gifUrl || null,
    image_url: null,
    metadata: {
      exercisedb: {
        targetMuscles: item.targetMuscles || [],
        bodyParts: item.bodyParts || [],
        secondaryMuscles: item.secondaryMuscles || [],
        instructions: item.instructions || [],
        equipments: item.equipments || [],
      },
      equipment_display: equipmentStr || null,
    },
  };
}

function rowFromGifDb(item) {
  if (!item?.id || !item?.name?.trim()) return null;
  const equipmentStr = item.equipment ? String(item.equipment) : "";
  const targetMuscles = item.muscle ? [item.muscle] : [];
  const bodyParts = item.bodyPart ? [item.bodyPart] : [];

  return {
    name: titleCaseName(item.name.trim()),
    category: mapBodyPartToCategory(item.bodyPart || item.muscle),
    is_predefined: true,
    user_id: null,
    external_source: "exercisedb",
    external_id: String(item.id),
    description: Array.isArray(item.instructions) ? item.instructions.join("\n\n") : null,
    gif_url: item.gifUrl || null,
    image_url: null,
    metadata: {
      exercisedb: {
        targetMuscles,
        bodyParts,
        secondaryMuscles: item.secondaryMuscles || [],
        instructions: item.instructions || [],
        equipments: equipmentStr ? [equipmentStr] : [],
      },
      equipment_display: equipmentStr || null,
      gif_source: "ExerciseGymGifsDB",
    },
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "workout-logger-sync/1.0",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function exercisedbApiAvailable() {
  try {
    const page = await fetchJson(`${EXERCISEDB_API}/exercises?limit=1&offset=0`);
    return Array.isArray(page?.data);
  } catch {
    return false;
  }
}

async function syncFromExerciseDbApi(supabase) {
  let nextUrl = `${EXERCISEDB_API}/exercises?limit=100&offset=0`;
  let total = 0;
  let skipped = 0;
  const batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch.splice(0, batch.length);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "external_source,external_id",
    });
    if (error) throw error;
    total += chunk.length;
    process.stdout.write(`\rUpserted ${total} ExerciseDB API exercises…`);
  };

  while (nextUrl) {
    const page = await fetchJson(nextUrl);
    for (const item of page.data || []) {
      const row = rowFromExerciseDbApi(item);
      if (!row) {
        skipped += 1;
        continue;
      }
      batch.push(row);
      if (batch.length >= BATCH) await flush();
    }
    nextUrl = page.metadata?.nextPage || null;
    if (nextUrl) await new Promise(r => setTimeout(r, 80));
  }

  await flush();
  return { total, skipped, source: "ExerciseDB API" };
}

async function syncFromGifDb(supabase) {
  console.warn(
    "ExerciseDB API unavailable (404/down) — using ExerciseGymGifsDB static GIF catalog instead.",
  );

  const payload = await fetchJson(GIFDB_JSON);
  const items = payload.exercises || payload.data || payload;
  if (!Array.isArray(items)) {
    throw new Error("Unexpected ExerciseGymGifsDB JSON shape");
  }

  let total = 0;
  let skipped = 0;
  const batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch.splice(0, batch.length);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "external_source,external_id",
    });
    if (error) throw error;
    total += chunk.length;
    process.stdout.write(`\rUpserted ${total} GIF catalog exercises…`);
  };

  for (const item of items) {
    const row = rowFromGifDb(item);
    if (!row) {
      skipped += 1;
      continue;
    }
    batch.push(row);
    if (batch.length >= BATCH) await flush();
  }

  await flush();
  return { total, skipped, source: "ExerciseGymGifsDB (jsDelivr)" };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const useApi = await exercisedbApiAvailable();
  const result = useApi
    ? await syncFromExerciseDbApi(supabase)
    : await syncFromGifDb(supabase);

  console.log(`\nDone (${result.source}). Upserted ${result.total}, skipped ${result.skipped}.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
