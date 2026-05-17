/**
 * Parent body-part chips (top row) + optional sub-filters (second row).
 * Leg subchips prefer ExerciseDB metadata (target / secondary muscles) via a normalized
 * taxonomy; legacy rows without exercisedb muscles use narrow name patterns only.
 */

export const PARENT_CHIPS = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Full Body"];

/**
 * ExerciseDB emits mixed strings (Title Case synonyms, anatomical names, broad regions).
 * We map those to coarse leg buckets before applying subchip rules.
 *
 * Buckets:
 * - `quad` — knee extensors / quadriceps group
 * - `hamstring` — posterior thigh (hip extensors/knee flexors that are ham-dominant)
 * - `calf`
 * - `adductor` / `abductor`
 * - `glutes`
 */
/** @typedef {'quad' | 'hamstring' | 'calf' | 'adductor' | 'abductor' | 'glutes'} LegBucket */

const NON_QUAD_PRIMARY_BUCKETS = new Set(["hamstring", "calf", "adductor", "abductor", "glutes"]);

/**
 * Map one API muscle label to zero or more leg buckets (multi-label avoids missing edge-case strings).
 * @param {string} raw
 * @returns {LegBucket[]}
 */
export function exercisedbMuscleToLegBuckets(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return [];

  const out = [];

  const push = (...buckets) => {
    for (const b of buckets) {
      if (b && !out.includes(b)) out.push(b);
    }
  };

  // Quadriceps — treat rectus femoris as quad even though it crosses the hip (knee-extension line).
  if (
    /\bquadriceps\b/.test(s) ||
    /\bquads?\b/.test(s) ||
    /\bquad\b/.test(s) ||
    s.includes("rectus femoris") ||
    s.includes("vastus") ||
    s.includes("vmo") ||
    s.includes("tear drop") // informal VMO cue
  ) {
    push("quad");
  }

  // Hamstrings + direct heads
  if (
    /\bhamstring/.test(s) ||
    s.includes("biceps femoris") ||
    s.includes("semitendinosus") ||
    s.includes("semimembranosus")
  ) {
    push("hamstring");
  }

  // Calves
  if (
    /\bcalves?\b/.test(s) ||
    s.includes("gastrocnemius") ||
    s.includes("soleus")
  ) {
    push("calf");
  }

  // Glutes — match "gluteus …" explicitly; \bglute\b would not hit "gluteus".
  if (
    /\bgluteus\b/.test(s) ||
    /\bglutes\b/.test(s) ||
    /\bglute\b/.test(s) ||
    s.includes("hip extensor")
  ) {
    push("glutes");
  }

  // Adductors / inner thigh
  if (
    /\badductor/.test(s) ||
    /\binner thigh\b/.test(s) ||
    s.includes("gracilis") ||
    s.includes("hip adduct")
  ) {
    push("adductor");
  }

  // Abductors — include tensor fasciae latae (often labeled with lateral hip/thigh drills)
  if (
    /\babductor/.test(s) ||
    s.includes("gluteus medius") ||
    /\bouter thigh\b/.test(s) ||
    s.includes("tensor fasciae latae") ||
    /\btfl\b/.test(s)
  ) {
    push("abductor");
  }

  return out;
}

/**
 * @param {string[]} muscles
 * @returns {Set<LegBucket>}
 */
function legBucketSetFromMuscles(muscles) {
  const set = new Set();
  for (const m of muscles || []) {
    for (const b of exercisedbMuscleToLegBuckets(m)) set.add(b);
  }
  return set;
}

/**
 * @typedef {{ label: string, match: string[] }} SubCategoryDef
 * @type {Record<string, SubCategoryDef[]>}
 */
export const SUBCATEGORY_DEFS = {
  Arms: [
    { label: "Biceps", match: ["biceps", "bicep"] },
    { label: "Triceps", match: ["triceps", "tricep"] },
    { label: "Forearms", match: ["forearms", "forearm", "brachialis", "brachioradialis"] },
  ],
  Core: [
    { label: "Abs", match: ["abs", "abdominals", "rectus abdominis", "abdominal"] },
    { label: "Obliques", match: ["obliques", "oblique"] },
    { label: "Lower Back", match: ["lower back", "lumbar", "spinal erectors", "erector spinae"] },
  ],
  Legs: [
    {
      label: "Quads",
      // Used for non-metadata parents elsewhere; legs subchip uses taxonomy + narrow legacy names.
      match: [
        "quads",
        "quadriceps",
        "quad",
        "rectus femoris",
        "vastus lateralis",
        "vastus medialis",
        "vastus intermedius",
        "vastus",
      ],
    },
    {
      label: "Hamstrings",
      match: [
        "hamstrings",
        "hamstring",
        "biceps femoris",
        "semitendinosus",
        "semimembranosus",
      ],
    },
    { label: "Calves", match: ["calves", "calf", "gastrocnemius", "soleus"] },
    { label: "Adductors", match: ["adductors", "adductor", "inner thigh"] },
    { label: "Abductors", match: ["abductors", "abductor", "gluteus medius"] },
  ],
  Back: [
    { label: "Lats", match: ["latissimus", "lats"] },
    { label: "Traps", match: ["traps", "trapezius"] },
    { label: "Upper Back", match: ["upper back", "rhomboids", "rear delt", "posterior deltoid"] },
    { label: "Lower Back", match: ["lower back", "lumbar", "erector", "spinae"] },
  ],
  Chest: [
    { label: "Upper Chest", match: ["upper chest", "clavicular", "upper pectoral"] },
    { label: "Mid / General", match: ["pectorals", "chest", "pecs", "sternal", "mid chest", "pectoralis"] },
    { label: "Serratus", match: ["serratus", "scapula"] },
  ],
  Shoulders: [
    { label: "Front Delts", match: ["anterior deltoid", "front delt"] },
    { label: "Side Delts", match: ["lateral deltoid", "side delt", "medial deltoid"] },
    { label: "Rear Delts", match: ["posterior deltoid", "rear delt"] },
    { label: "General", match: ["delts", "shoulders", "shoulder", "deltoid"] },
  ],
};

export function getSubcategoriesForParent(parentChip) {
  if (!parentChip || parentChip === "Full Body") return [];
  return SUBCATEGORY_DEFS[parentChip] || [];
}

/** @returns {{ all: Set<LegBucket>, primary: Set<LegBucket>, secondary: Set<LegBucket> }} */
function bucketSetsFromExerciseDb(tm, sm) {
  const primary = legBucketSetFromMuscles(tm);
  const secondary = legBucketSetFromMuscles(sm);
  const all = new Set(primary);
  for (const b of secondary) all.add(b);
  return { all, primary, secondary };
}

/**
 * ExerciseDB-informed leg match: union of targets ∪ secondaries is bucketed once.
 *
 * Rules (Quads / Hamstrings):
 * - Hamstrings: match if hamstring bucket appears in targets OR secondaries (no name bleed).
 * - Quads (conservative): match if quad is a primary target, OR quad appears in secondaries AND
 *   primary buckets are not "non-quad leg only" (that pattern is hip-dominant / ham curls; those
 *   only match Quads if secondaries explicitly list quads — e.g. some compound classifications).
 *
 * Other leg subchips: simple bucket presence on the union set.
 *
 * @param {string[]} targetMuscles
 * @param {string[]} secondaryMuscles
 * @param {string} label
 */
function legSubchipMetadataMatch(targetMuscles, secondaryMuscles, label) {
  const { all, primary, secondary } = bucketSetsFromExerciseDb(targetMuscles, secondaryMuscles);

  if (label === "Hamstrings") {
    return all.has("hamstring");
  }

  if (label === "Quads") {
    const primaryHasQuad = primary.has("quad");
    const secondaryHasQuad = secondary.has("quad");
    const primaryNonQuadLegOnly =
      primary.size > 0 &&
      !primary.has("quad") &&
      [...primary].every(b => NON_QUAD_PRIMARY_BUCKETS.has(b));

    return primaryHasQuad || (secondaryHasQuad && !primaryNonQuadLegOnly);
  }

  if (label === "Calves") return all.has("calf");
  if (label === "Adductors") return all.has("adductor");
  if (label === "Abductors") return all.has("abductor");

  return false;
}

/**
 * Rows without exercisedb muscles (legacy seed): Quads/Hamstrings use tight exercise-name regexes so
 * "Roman Chair …" Core work never matches hamstrings via broad substring rules.
 *
 * Other leg subs still use substring checks on name only (no exercisedb blob).
 */
function legacyLegSubchipMatch(lowerName, subLabel, def) {
  if (subLabel === "Quads") {
    return (
      /\bleg\s+extension\b/.test(lowerName) ||
      /\bsissy\s+squat\b/.test(lowerName) ||
      /\bcyclist\s+squat\b/.test(lowerName) ||
      /\bbelt\s+squat\b/.test(lowerName)
    );
  }
  if (subLabel === "Hamstrings") {
    return (
      /\b(lying\s+)?leg\s+curl\b/.test(lowerName) ||
      /\bseated\s+leg\s+curl\b/.test(lowerName) ||
      /\bstanding\s+leg\s+curl\b/.test(lowerName) ||
      /\binverse\s+leg\s+curl\b/.test(lowerName) ||
      /\bham(?:string)?\s+curl\b/.test(lowerName) ||
      /\bglute[\s-]?ham\s+(?:raise|developer)\b/.test(lowerName) ||
      /\bnordic\b/.test(lowerName)
    );
  }
  return def.match.some(kw => {
    const k = kw.toLowerCase().trim();
    return !!k && lowerName.includes(k);
  });
}

/**
 * @param {object} exercise — row from `exercises` with optional metadata.exercisedb
 * @param {string|null} parentChip — e.g. "Arms"
 * @param {string|null} subLabel — e.g. "Biceps"; null = no extra muscle filter
 */
export function exerciseMatchesSubFilter(exercise, parentChip, subLabel) {
  if (!subLabel || !parentChip || parentChip === "Full Body") return true;
  const defs = SUBCATEGORY_DEFS[parentChip];
  const def = defs?.find(d => d.label === subLabel);
  if (!def) return true;

  if (parentChip === "Legs") {
    const edb = exercise.metadata?.exercisedb;
    const tm = Array.isArray(edb?.targetMuscles) ? edb.targetMuscles : [];
    const sm = Array.isArray(edb?.secondaryMuscles) ? edb.secondaryMuscles : [];
    const nameLc = (exercise.name || "").toLowerCase();

    const hasMuscleArrays = tm.length > 0 || sm.length > 0;

    // Metadata-first whenever API lists muscles; bucket labels we do not recognise fall back to name.
    if (hasMuscleArrays) {
      const { all } = bucketSetsFromExerciseDb(tm, sm);
      if (all.size > 0) {
        return legSubchipMetadataMatch(tm, sm, subLabel);
      }
    }

    return legacyLegSubchipMatch(nameLc, subLabel, def);
  }

  const edb = exercise.metadata?.exercisedb;
  const tm = Array.isArray(edb?.targetMuscles) ? edb.targetMuscles : [];
  const sm = Array.isArray(edb?.secondaryMuscles) ? edb.secondaryMuscles : [];
  const name = (exercise.name || "").toLowerCase();
  const blob = [...tm, ...sm, name].join(" ").toLowerCase();

  return def.match.some(kw => {
    const k = kw.toLowerCase().trim();
    if (!k) return false;
    if (blob.includes(k)) return true;
    return [...tm, ...sm].some(m => String(m).toLowerCase().includes(k));
  });
}
