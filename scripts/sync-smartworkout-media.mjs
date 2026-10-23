#!/usr/bin/env node
/**
 * Import SmartWorkout's public exercise library into Supabase `exercises`.
 *
 * Fetches each English exercise page, reads __NEXT_DATA__ (GIF at image.uri),
 * upserts by (external_source, external_id) — no name matching to legacy catalog.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Run: npm run sync:exercises:smartworkout   (or npm run sync:exercises:all)
 *      npm run sync:exercises:smartworkout -- --dry-run --limit 20
 *
 * Re-run without --limit after SmartWorkout updates the library (~1k pages).
 *
 * @see https://smartworkout.app/en/exercise-library
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import {
  fetchSmartworkoutExerciseRecord,
  listSmartworkoutExercisePageUrls,
  rowFromSmartworkoutRecord,
} from "./lib/smartworkoutLibrary.mjs";

loadEnvLocal();

const CONCURRENCY = 5;
const DELAY_MS = 120;
const UPSERT_BATCH = 60;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : null;
  return {
    dryRun,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
  };
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  if (dryRun) {
    console.log("DRY RUN — nothing is written to Supabase. Omit --dry-run to upsert.\n");
  }
  if (limit) {
    console.warn(`Only processing first ${limit} sitemap URLs. Omit --limit for the full library.\n`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log("Listing SmartWorkout exercise pages…");
  let pageUrls = await listSmartworkoutExercisePageUrls();
  if (limit) pageUrls = pageUrls.slice(0, limit);
  console.log(`Fetching ${pageUrls.length} pages (concurrency ${CONCURRENCY})…`);

  const records = [];
  let fetchErrors = 0;
  await mapPool(pageUrls, CONCURRENCY, async pageUrl => {
    try {
      const rec = await fetchSmartworkoutExerciseRecord(pageUrl);
      if (rec) records.push(rec);
    } catch (e) {
      fetchErrors += 1;
      console.warn(`Skip ${pageUrl}: ${e.message}`);
    }
  });

  console.log(`Parsed ${records.length} exercises (${fetchErrors} fetch errors).`);

  const rows = [];
  let skipped = 0;
  for (const rec of records) {
    const row = rowFromSmartworkoutRecord(rec);
    if (!row) {
      skipped += 1;
      continue;
    }
    rows.push(row);
  }

  if (dryRun) {
    console.log(`Would upsert ${rows.length} rows (skipped ${skipped} incomplete). Sample:`);
    for (const row of rows.slice(0, 5)) {
      console.log(`  ${row.name} (${row.category}) → ${row.gif_url}`);
    }
    return;
  }

  let upserted = 0;
  const batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch.splice(0, batch.length);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "external_source,external_id",
    });
    if (error) throw error;
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted} / ${rows.length}…`);
  };

  for (const row of rows) {
    batch.push(row);
    if (batch.length >= UPSERT_BATCH) await flush();
  }
  await flush();

  console.log(
    `\nDone. Upserted ${upserted} SmartWorkout exercises (${fetchErrors} page errors, ${skipped} skipped).`,
  );
  console.log("Reload the app (hard refresh). The exercise picker uses SmartWorkout when those rows exist.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
