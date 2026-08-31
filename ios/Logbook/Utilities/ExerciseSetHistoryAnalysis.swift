import Foundation

enum ExerciseSetHistoryAnalysisEngine {
    static func dominantSet(_ sets: [ExerciseSetEntry]) -> DominantSet {
        guard !sets.isEmpty else { return DominantSet(weight: 0, reps: 0, occurrences: 0) }

        var counts: [String: Int] = [:]
        for set in sets {
            let key = "\(set.weight)|\(set.reps)"
            counts[key, default: 0] += 1
        }

        var bestKey = ""
        var bestCount = 0
        var bestVolume = 0.0
        for (key, count) in counts {
            let parts = key.split(separator: "|")
            guard parts.count == 2,
                  let weight = Double(parts[0]),
                  let reps = Int(parts[1]) else { continue }
            let volume = weight * Double(reps) * Double(count)
            if count > bestCount || (count == bestCount && volume > bestVolume) {
                bestKey = key
                bestCount = count
                bestVolume = volume
            }
        }

        let parts = bestKey.split(separator: "|")
        let weight = Double(parts.first ?? "0") ?? 0
        let reps = Int(parts.last ?? "0") ?? 0
        return DominantSet(weight: weight, reps: reps, occurrences: bestCount)
    }

    static func sessionVolume(_ sets: [ExerciseSetEntry]) -> Double {
        sets.reduce(0) { $0 + ($1.weight * Double($1.reps)) }
    }

    static func formatSessionSetsSummary(_ sets: [ExerciseSetEntry], unit: WeightUnit) -> String {
        groupConsecutiveSets(sets).map { group in
            let label = "\(WorkoutCalculations.formatWeight(group.weight, unit: unit)) × \(group.reps)"
            return group.count > 1 ? "\(group.count)× \(label)" : label
        }.joined(separator: ", ")
    }

    static func currentStreak(_ entries: [ExerciseSessionEntry]) -> ExerciseStreak? {
        guard let first = entries.first else { return nil }
        let firstDominant = dominantSet(first.sets)
        guard firstDominant.weight > 0 || firstDominant.reps > 0 else { return nil }

        var sessions = 1
        for index in 1..<entries.count {
            let dominant = dominantSet(entries[index].sets)
            guard dominant.weight == firstDominant.weight, dominant.reps == firstDominant.reps else { break }
            sessions += 1
        }

        return ExerciseStreak(
            weight: firstDominant.weight,
            reps: firstDominant.reps,
            sessions: sessions,
            latestDate: first.date
        )
    }

    static func personalBest(_ entries: [ExerciseSessionEntry]) -> ExercisePersonalBest? {
        var best: ExercisePersonalBest?
        for entry in entries {
            for set in entry.sets {
                let volume = set.weight * Double(set.reps)
                if best == nil
                    || set.weight > best!.weight
                    || (set.weight == best!.weight && set.reps > best!.reps)
                    || (set.weight == best!.weight && set.reps == best!.reps && volume > best!.volume) {
                    best = ExercisePersonalBest(weight: set.weight, reps: set.reps, volume: volume, date: entry.date)
                }
            }
        }
        return best
    }

    static func buildProgressSuggestion(_ streak: ExerciseStreak?) -> ProgressSuggestion? {
        guard let streak, streak.sessions >= 3 else { return nil }
        let increment = streak.weight >= 20 ? 2.5 : 1.0
        let nextWeight = streak.weight + increment
        return ProgressSuggestion(
            message: "You've held \(Int(streak.weight)) kg × \(streak.reps) for \(streak.sessions) sessions. Try \(Int(nextWeight)) kg next time.",
            suggestedWeight: nextWeight,
            suggestedReps: streak.reps
        )
    }

    static func analyze(_ entries: [ExerciseSessionEntry], weightUnit: WeightUnit) -> ExerciseSetHistoryAnalysis {
        let sorted = entries.sorted { $0.date > $1.date }
        let rows = sorted.map { session in
            ExerciseHistoryRow(
                id: session.id,
                date: session.date,
                routineName: session.routineName,
                setsSummary: formatSessionSetsSummary(session.sets, unit: weightUnit),
                volume: sessionVolume(session.sets),
                isLegacy: false
            )
        }

        return ExerciseSetHistoryAnalysis(
            tableRows: rows,
            currentStreak: currentStreak(sorted),
            personalBest: personalBest(sorted),
            suggestion: buildProgressSuggestion(currentStreak(sorted)),
            totalSessions: sorted.count
        )
    }

    private static func groupConsecutiveSets(_ sets: [ExerciseSetEntry]) -> [(weight: Double, reps: Int, count: Int)] {
        var groups: [(weight: Double, reps: Int, count: Int)] = []
        for set in sets {
            if var last = groups.last, last.weight == set.weight, last.reps == set.reps {
                last.count += 1
                groups[groups.count - 1] = last
            } else {
                groups.append((set.weight, set.reps, 1))
            }
        }
        return groups
    }
}
