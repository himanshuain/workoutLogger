#!/usr/bin/env node
/**
 * Sync exerciseapi.dev → Supabase `exercises` (hybrid with ExerciseDB).
 *
 * - Upserts rows with external_source = "exerciseapi"
 * - When an ExerciseDB row exists with the same normalized name, merges metadata
 *   into that row instead of creating a duplicate
 *
 * Env:
 *   EXERCISEAPI_API_KEY  (or EXERCISEAPI_KEY)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run sync:exercises:exerciseapi
 *
 * @see https://exerciseapi.dev/llms.txt
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

loadEnvLocal();

const API_BASE = "https://api.exerciseapi.dev/v1";
const CDN_BASE = "https://cdn.exerciseapi.dev/v1/";
const BATCH = 40;
const PAGE_LIMIT = 20;
const MAX_OFFSET = 480;
const REQUEST_DELAY_MS = 110;

const CATEGORIES = [
  "strength",
  "yoga",
  "mobility",
  "physical_therapy",
  "stretching",
  "pilates",
  "calisthenics",
  "plyometrics",
  "conditioning",
  "olympic_weightlifting",
  "powerlifting",
  "strongman",
];

function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mapCategory(category) {
  const c = String(category || "").toLowerCase();
  if (c === "strength" || c === "powerlifting" || c === "olympic_weightlifting" || c === "strongman")
    return "other";
  if (c === "yoga" || c === "pilates" || c === "stretching" || c === "mobility" || c === "physical_therapy")
    return "core";
  if (c === "calisthenics" || c === "plyometrics" || c === "conditioning") return "other";
  return "other";
}

function cdnImageUrl(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;
  const trimmed = relativePath.trim().replace(/^\//, "");
  return trimmed ? `${CDN_BASE}${trimmed}` : null;
}

function pickImageUrl(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  for (const rel of images) {
    const url = cdnImageUrl(rel);
    if (url) return url;
  }
  const videos = Array.isArray(item.videos) ? item.videos : [];
  const poster = videos[0]?.url;
  return typeof poster === "string" && poster.trim() ? poster.trim() : null;
}

function exerciseApiMetadata(item) {
  return {
    exerciseapi: {
      id: item.id,
      keywords: item.keywords || [],
      primaryMuscles: item.primaryMuscles || [],
      secondaryMuscles: item.secondaryMuscles || [],
      equipment: item.equipment || null,
      force: item.force || null,
      level: item.level || null,
      mechanic: item.mechanic || null,
      category: item.category || null,
      instructions: item.instructions || [],
      exerciseTips: item.exerciseTips || [],
      commonMistakes: item.commonMistakes || [],
      safetyInfo: item.safetyInfo || null,
      overview: item.overview || null,
      variations: item.variations || [],
      images: item.images || [],
      videos: item.videos || [],
    },
  };
}

function rowFromExerciseApi(item) {
  if (!item?.id || !item?.name?.trim()) return null;
  const imageUrl = pickImageUrl(item);
  const overview = typeof item.overview === "string" ? item.overview.trim() : "";

  return {
    name: item.name.trim(),
    category: mapCategory(item.category),
    is_predefined: true,
    user_id: null,
    external_source: "exerciseapi",
    external_id: String(item.id),
    description: overview || null,
    gif_url: null,
    image_url: imageUrl,
    metadata: exerciseApiMetadata(item),
  };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchPage(apiKey, category, offset) {
  const url = new URL(`${API_BASE}/exercises`);
  url.searchParams.set("category", category);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "workout-logger-sync/1.0",
      },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") || "60");
      console.warn(`Rate limited — waiting ${retryAfter}s…`);
      await sleep(retryAfter * 1000);
      continue;
    }

    const body = await res.json();
    if (!res.ok) {
      const msg = body?.error?.message || res.statusText;
      throw new Error(`HTTP ${res.status} ${category}@${offset}: ${msg}`);
    }
    return body;
  }
  throw new Error(`Rate limit retries exhausted for ${category}@${offset}`);
}

async function main() {
  const apiKey = process.env.EXERCISEAPI_API_KEY || process.env.EXERCISEAPI_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    console.error("Missing EXERCISEAPI_API_KEY (get one at https://exerciseapi.dev/dashboard)");
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: existingRows, error: loadErr } = await supabase
    .from("exercises")
    .select("id,name,external_source,gif_url,image_url,description,metadata");

  if (loadErr) throw loadErr;

  const exercisedbByName = new Map();
  for (const row of existingRows || []) {
    if (row.external_source === "exercisedb") {
      exercisedbByName.set(normalizeName(row.name), row);
    }
  }

  let mergedIntoExercisedb = 0;
  let upserted = 0;
  let skipped = 0;
  const batch = [];
  const seenIds = new Set();

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch.splice(0, batch.length);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "external_source,external_id",
    });
    if (error) throw error;
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted} exerciseapi rows…`);
  };

  const mergeIntoExercisedb = async (edbRow, item) => {
    const meta = exerciseApiMetadata(item);
    const nextMeta = {
      ...(edbRow.metadata && typeof edbRow.metadata === "object" ? edbRow.metadata : {}),
      ...meta,
    };
    const overview = typeof item.overview === "string" ? item.overview.trim() : "";
    const imageUrl = pickImageUrl(item);

    const { error } = await supabase
      .from("exercises")
      .update({
        metadata: nextMeta,
        description: edbRow.description?.trim()?.length > 40 ? edbRow.description : overview || edbRow.description,
        image_url: edbRow.image_url || imageUrl,
      })
      .eq("id", edbRow.id);

    if (error) throw error;
    mergedIntoExercisedb += 1;
  };

  for (const category of CATEGORIES) {
    for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE_LIMIT) {
      const page = await fetchPage(apiKey, category, offset);
      const rows = page.data || [];
      if (!rows.length) break;

      for (const item of rows) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const edbSibling = exercisedbByName.get(normalizeName(item.name));
        if (edbSibling) {
          await mergeIntoExercisedb(edbSibling, item);
          edbSibling.metadata = {
            ...(edbSibling.metadata || {}),
            ...exerciseApiMetadata(item),
          };
          continue;
        }

        const row = rowFromExerciseApi(item);
        if (!row) {
          skipped += 1;
          continue;
        }
        batch.push(row);
        if (batch.length >= BATCH) await flush();
      }

      if (rows.length < PAGE_LIMIT) break;
      await sleep(REQUEST_DELAY_MS);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  await flush();

  console.log(
    `\nDone. Upserted ${upserted} exerciseapi rows, merged ${mergedIntoExercisedb} into ExerciseDB, skipped ${skipped}.`,
  );
  console.log(`Unique exercises fetched: ${seenIds.size}.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
