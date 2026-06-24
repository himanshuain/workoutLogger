/** Group consecutive sets with the same weight and reps (e.g. four 55×10 → count 4). */
export function groupConsecutiveSets(sets = []) {
  const groups = [];

  for (const set of sets) {
    const weight = Number(set?.weight) || 0;
    const reps = Number(set?.reps) || 0;
    const prev = groups[groups.length - 1];

    if (prev && prev.weight === weight && prev.reps === reps) {
      prev.count += 1;
    } else {
      groups.push({ weight, reps, count: 1 });
    }
  }

  return groups;
}
