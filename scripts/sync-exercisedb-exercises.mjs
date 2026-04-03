#!/usr/bin/env node
/**
 * Sync ExerciseDB v1 (https://www.exercisedb.dev/docs) → Supabase `exercises`.
 *
 * Structured metadata + GIF URLs (static.exercisedb.dev). Public API; no key required for listing.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run sync:exercises
 *
 * Conflicts on (external_source, external_id) — re-run to upsert updates.
 */

import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://www.exercisedb.dev/api/v1";
const BATCH = 80;

function titleCaseName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Map ExerciseDB bodyPart → app category chips */
function mapBodyPartToCategory(bodyPart) {
  const b = String(bodyPart || "").toLowerCase();
  if (b === "chest") return "chest";
  if (b === "back") return "back";
  if (b === "shoulders" || b === "neck") return "shoulders";
  if (b === "upper arms" || b === "lower arms") return "arms";
  if (b === "upper legs" || b === "lower legs") return "legs";
  if (b === "waist") return "core";
  if (b === "cardio") return "other";
  return "other";
}

function rowFromExerciseDb(item) {
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let nextUrl = `${API_BASE}/exercises?limit=100&offset=0`;
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
    process.stdout.write(`\rUpserted ${total} ExerciseDB exercises…`);
  };

  while (nextUrl) {
    const page = await fetchJson(nextUrl);
    const rows = page.data || [];
    for (const item of rows) {
      const row = rowFromExerciseDb(item);
      if (!row) {
        skipped += 1;
        continue;
      }
      batch.push(row);
      if (batch.length >= BATCH) await flush();
    }
    nextUrl = page.metadata?.nextPage || null;
    if (nextUrl) await new Promise((r) => setTimeout(r, 80));
  }

  await flush();
  console.log(`\nDone. Upserted ${total}, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
