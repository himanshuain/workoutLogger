import Foundation

struct SessionExerciseGroup: Identifiable {
    var id: String { name }
    let name: String
    let category: String?
    let sets: [SetLogDTO]
}

enum SessionLogGrouping {
    static func completedLogs(in session: ActiveSessionDTO) -> [SetLogDTO] {
        (session.setLogs ?? []).filter(\.isCompleted)
    }

    static func totalVolume(in session: ActiveSessionDTO) -> Double {
        completedLogs(in: session).reduce(0) { $0 + ($1.weight * Double($1.reps)) }
    }

    static func groupVolume(_ sets: [SetLogDTO]) -> Double {
        sets.reduce(0) { $0 + ($1.weight * Double($1.reps)) }
    }

    static func sortedSets(_ sets: [SetLogDTO]) -> [SetLogDTO] {
        sets.sorted { lhs, rhs in
            switch (lhs.createdAt, rhs.createdAt) {
            case let (l?, r?):
                if l != r { return l < r }
            case (nil, _?):
                return false
            case (_?, nil):
                return true
            default:
                break
            }
            let lNum = lhs.setNumber ?? Int.max
            let rNum = rhs.setNumber ?? Int.max
            if lNum != rNum { return lNum < rNum }
            return lhs.id.uuidString < rhs.id.uuidString
        }
    }

    static func groups(in session: ActiveSessionDTO) -> [SessionExerciseGroup] {
        let logs = completedLogs(in: session)
        let grouped = Dictionary(grouping: logs) {
            WorkoutCalculations.normalizeExerciseName($0.exerciseName)
        }
        return grouped.keys.sorted().compactMap { key in
            guard let raw = grouped[key] else { return nil }
            let sets = sortedSets(raw)
            return SessionExerciseGroup(
                name: sets.first?.exerciseName ?? key,
                category: sets.first?.category,
                sets: sets
            )
        }
    }
}
