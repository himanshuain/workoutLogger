import { groupConsecutiveSets } from "@/lib/groupConsecutiveSets";

/** Most common weight×reps in a session (ties → higher volume). */
export function getDominantSet(sets = []) {
  if (!sets.length) return { weight: 0, reps: 0, occurrences: 0 };

  const counts = new Map();
  for (const set of sets) {
    const weight = Number(set.weight) || 0;
    const reps = Number(set.reps) || 0;
    const key = `${weight}|${reps}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let bestKey = null;
  let bestCount = 0;
  let bestVolume = 0;
  for (const [key, count] of counts) {
    const [weight, reps] = key.split("|").map(Number);
    const volume = weight * reps * count;
    if (count > bestCount || (count === bestCount && volume > bestVolume)) {
      bestKey = key;
      bestCount = count;
      bestVolume = volume;
    }
  }

  const [weight, reps] = bestKey.split("|").map(Number);
  return { weight, reps, occurrences: bestCount };
}

export function formatSessionSetsSummary(sets = []) {
  return groupConsecutiveSets(sets)
    .map(group => {
      const label = `${group.weight} kg × ${group.reps}`;
      return group.count > 1 ? `${group.count}× ${label}` : label;
    })
    .join(", ");
}

export function sessionVolume(sets = []) {
  return sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
}

function dominantMatches(a, b) {
  return a.weight === b.weight && a.reps === b.reps;
}

/** Consecutive sessions (newest first) sharing the same dominant set. */
export function getCurrentStreak(sessionEntries = []) {
  if (!sessionEntries.length) return null;

  const firstDominant = getDominantSet(sessionEntries[0].sets);
  if (!firstDominant.weight && !firstDominant.reps) return null;

  let sessions = 1;
  for (let i = 1; i < sessionEntries.length; i++) {
    const dominant = getDominantSet(sessionEntries[i].sets);
    if (!dominantMatches(dominant, firstDominant)) break;
    sessions += 1;
  }

  return {
    weight: firstDominant.weight,
    reps: firstDominant.reps,
    sessions,
    latestDate: sessionEntries[0].date,
  };
}

/** Longest runs of the same dominant weight×reps across sessions (oldest → newest). */
export function getPlateauRuns(sessionEntries = []) {
  if (!sessionEntries.length) return [];

  const chronological = [...sessionEntries].sort((a, b) => a.date.localeCompare(b.date));
  const runs = [];
  let runStart = 0;

  for (let i = 1; i <= chronological.length; i++) {
    const prevDominant = getDominantSet(chronological[i - 1]?.sets || []);
    const currDominant = getDominantSet(chronological[i]?.sets || []);
    const continues =
      i < chronological.length && dominantMatches(prevDominant, currDominant);

    if (!continues) {
      const endIdx = i - 1;
      const sessionCount = endIdx - runStart + 1;
      const dominant = getDominantSet(chronological[runStart].sets);
      runs.push({
        weight: dominant.weight,
        reps: dominant.reps,
        sessionCount,
        startDate: chronological[runStart].date,
        endDate: chronological[endIdx].date,
      });
      runStart = i;
    }
  }

  return runs.sort((a, b) => b.endDate.localeCompare(a.endDate) || b.sessionCount - a.sessionCount);
}

export function getPersonalBest(sessionEntries = []) {
  let best = null;

  for (const session of sessionEntries) {
    for (const set of session.sets || []) {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      const volume = weight * reps;
      if (
        !best ||
        weight > best.weight ||
        (weight === best.weight && reps > best.reps) ||
        (weight === best.weight && reps === best.reps && volume > best.volume)
      ) {
        best = { weight, reps, volume, date: session.date };
      }
    }
  }

  return best;
}

export function buildProgressSuggestion(currentStreak) {
  if (!currentStreak || currentStreak.sessions < 3) return null;

  const { weight, reps, sessions } = currentStreak;
  const increment = weight >= 40 ? 2.5 : weight >= 20 ? 2.5 : 1;
  const nextWeight = weight + increment;

  return {
    message: `You've held ${weight} kg × ${reps} for ${sessions} sessions. Try ${nextWeight} kg next time.`,
    suggestedWeight: nextWeight,
    suggestedReps: reps,
  };
}

export function analyzeExerciseSetHistory(sessionEntries = []) {
  const sorted = [...sessionEntries].sort((a, b) => b.date.localeCompare(a.date));
  const tableRows = sorted.map(session => ({
    date: session.date,
    routineName: session.routineName || null,
    setsSummary: formatSessionSetsSummary(session.sets),
    volume: sessionVolume(session.sets),
    dominant: getDominantSet(session.sets),
    sets: session.sets,
  }));

  const currentStreak = getCurrentStreak(sorted);
  const plateaus = getPlateauRuns(sorted);
  const personalBest = getPersonalBest(sorted);
  const suggestion = buildProgressSuggestion(currentStreak);

  return {
    tableRows,
    currentStreak,
    plateaus: plateaus.slice(0, 5),
    personalBest,
    suggestion,
    totalSessions: sorted.length,
  };
}
