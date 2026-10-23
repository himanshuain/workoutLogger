const MUSCLE_LABELS = {
  CHEST_BIG_SWING_MUSCLE: "Chest",
  CHEST_LOWER: "Lower chest",
  CHEST_MIDDLE: "Chest",
  CHEST_UPPER: "Upper chest",
  SHOULDERS_FRONT_PART: "Front delts",
  SHOULDERS_MIDDLE_PART: "Side delts",
  SHOULDERS_BACK_PART: "Rear delts",
  BACK_LATS: "Lats",
  BACK_TRAPEZIUS_MIDDLE: "Middle trapezius",
  BACK_TRAPEZIUS_LOWER: "Lower trapezius",
  BACK_TERES_MAJOR: "Teres major",
  BACK_TERES_MINOR: "Teres minor",
  BACK_INFRASPINATUS: "Infraspinatus",
  BICEPS_LONG_HEAD: "Biceps",
  BICEPS_SHORT_HEAD: "Biceps",
  BRACHIORADIALIS: "Forearms",
  TRICEPS_LONG_HEAD: "Triceps",
  TRICEPS_SHORT_HEAD: "Triceps",
  ABS_RECTUS: "Abs",
  ABS_OBLIQUE: "Obliques",
  GLUTEUS_MAXIMUS: "Glutes",
  QUADRICEPS: "Quads",
  HAMSTRINGS: "Hamstrings",
};

const BODY_PART_LABEL = {
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  FOREARMS: "Forearms",
  ABS: "Abs",
  LEGS: "Legs",
  GLUTEUS: "Glutes",
};

function bodyPartPrefix(bodyPart) {
  const bp = String(bodyPart || "").toUpperCase();
  if (bp === "GLUTEUS") return "GLUTEUS";
  return bp;
}

function isPrimaryRegionKey(key, bodyPart) {
  const p = bodyPartPrefix(bodyPart);
  if (!p || !key) return false;
  return String(key).startsWith(`${p}_`);
}

function labelForMuscleKey(key) {
  if (MUSCLE_LABELS[key]) return MUSCLE_LABELS[key];
  return String(key)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function primaryMuscleLabel(bodyPart) {
  const bp = String(bodyPart || "").toUpperCase();
  return BODY_PART_LABEL[bp] || bodyPart || "General";
}

/** Comma-separated assisting muscles (SmartWorkout-style subtitle). */
export function stabilizingMusclesSummary(exerciseMuscles, bodyPart, minScore = 15) {
  const seen = new Set();
  const labels = [];

  for (const [key, score] of Object.entries(exerciseMuscles || {})) {
    if (typeof score !== "number" || score < minScore) continue;
    if (isPrimaryRegionKey(key, bodyPart)) continue;
    const label = labelForMuscleKey(key);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  return labels.join(", ");
}

export function detailFromCatalogExercise(exercise) {
  if (!exercise) return null;
  const sw = exercise.metadata?.smartworkout;
  if (exercise.external_source !== "smartworkout" && !sw?.id) return null;

  const instructions = Array.isArray(sw?.instructions) ? sw.instructions.filter(Boolean) : [];

  const exerciseMuscles = sw?.exerciseMuscles || {};
  const bodyPart = sw?.bodyPart || null;
  const libraryPath = sw?.libraryPath || null;

  return {
    name: exercise.name,
    description: (sw?.description || exercise.description || "").trim(),
    instructions,
    tips: Array.isArray(sw?.tips) ? sw.tips : [],
    commonMistakes: Array.isArray(sw?.commonMistakes) ? sw.commonMistakes : [],
    bodyPart,
    primaryMuscle: primaryMuscleLabel(bodyPart),
    stabilizingMuscles: stabilizingMusclesSummary(exerciseMuscles, bodyPart),
    exerciseMuscles,
    libraryPath,
    externalId: exercise.external_id || sw?.id || null,
    needsFetch: instructions.length === 0 && Boolean(libraryPath),
  };
}

export function smartworkoutLibraryUrl(libraryPath, slug) {
  const path = libraryPath || (slug ? `/en/exercise-library/other/${slug}` : null);
  if (!path) return null;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `https://smartworkout.app${normalized}`;
}
