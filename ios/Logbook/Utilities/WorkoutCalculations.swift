import Foundation

enum WorkoutCalculations {
    static func exerciseVolume(logs: [LoggedSet]) -> Double {
        logs.reduce(0) { partial, log in
            guard log.isCompleted else { return partial }
            return partial + (log.weight * Double(log.reps))
        }
    }

    static func splitVolume(exercises: [NativeExercise]) -> Double {
        exercises.reduce(0) { $0 + $1.volume }
    }

    static func loggedExerciseCount(exercises: [NativeExercise]) -> Int {
        exercises.filter(\.isLogged).count
    }

    static func splitProgress(exercises: [NativeExercise]) -> Double {
        guard !exercises.isEmpty else { return 0 }
        return Double(loggedExerciseCount(exercises: exercises)) / Double(exercises.count)
    }

    static func personalBestWeight(logs: [LoggedSet]) -> Double {
        logs.map(\.weight).max() ?? 0
    }

    static func personalBest(from history: ExerciseHistoryDTO?) -> Double {
        history?.personalRecordWeight ?? history?.lastWeight ?? 0
    }

    static func formatWeight(_ value: Double, unit: WeightUnit) -> String {
        let formatted = value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
        switch unit {
        case .kg: return "\(formatted) kg"
        case .lb: return "\(formatted) lb"
        }
    }

    static func weightPills(for unit: WeightUnit) -> [Double] {
        switch unit {
        case .kg:
            var values: [Double] = [0]
            values.append(contentsOf: stride(from: 2.5, through: 120, by: 2.5))
            return values
        case .lb:
            var values: [Double] = [0]
            values.append(contentsOf: stride(from: 5, through: 265, by: 5).map(Double.init))
            return values
        }
    }

    static func repPills() -> [Int] {
        Array(4...30)
    }

    static func normalizeExerciseName(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    }

    static func groupLogsByExerciseName(_ logs: [SetLogDTO]) -> [String: [SetLogDTO]] {
        Dictionary(grouping: logs) { normalizeExerciseName($0.exerciseName) }
    }
}
