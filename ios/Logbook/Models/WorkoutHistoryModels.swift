import Foundation

struct ProfileStats: Equatable {
    var workoutStreak: Int
    var workoutsThisMonth: Int
    var weeklyWorkouts: Int
    var totalSets: Int
    var personalBestCount: Int

    static let empty = ProfileStats(
        workoutStreak: 0,
        workoutsThisMonth: 0,
        weeklyWorkouts: 0,
        totalSets: 0,
        personalBestCount: 0
    )
}

struct WorkoutCompletionSummary: Identifiable, Equatable {
    let id: UUID
    let routineName: String
    let exerciseCount: Int
    let setCount: Int
    let volume: Double
    let date: String
}

struct ExerciseSetEntry: Equatable {
    let weight: Double
    let reps: Int
}

struct ExerciseSessionEntry: Equatable, Identifiable {
    var id: String { "\(sessionID.uuidString)-\(date)" }
    let sessionID: UUID
    let date: String
    let routineName: String?
    let sets: [ExerciseSetEntry]
}

struct ExerciseHistoryRow: Identifiable, Equatable {
    let id: String
    let date: String
    let routineName: String?
    let setsSummary: String
    let volume: Double
    let isLegacy: Bool
}

struct HistoryDayGroup: Identifiable, Equatable {
    var id: String { date }
    let date: String
    let sessions: [HistorySessionItem]
    let legacyLogs: [ExerciseLogDTO]
}

struct HistorySessionItem: Identifiable, Equatable {
    let id: UUID
    let routineName: String?
    let date: String
    let setCount: Int
    let exerciseCount: Int
    let volume: Double
    let status: String?
}

struct WorkoutWeekPoint: Identifiable, Equatable {
    let id: String
    let label: String
    let count: Int
}

struct ExerciseOverloadPoint: Identifiable, Equatable {
    let id: String
    let date: String
    let exerciseName: String
    let areaCategory: String
    let topWeight: Double
    let topReps: Int
}

struct ExerciseLogDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let exerciseID: UUID?
    let exerciseName: String
    let date: String
    let weight: Double
    let reps: Int
    let sets: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case exerciseID = "exercise_id"
        case exerciseName = "exercise_name"
        case date, weight, reps, sets
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        exerciseID = try container.decodeIfPresent(UUID.self, forKey: .exerciseID)
        exerciseName = try container.decode(String.self, forKey: .exerciseName)
        date = try container.decode(String.self, forKey: .date)
        if let value = try? container.decode(Double.self, forKey: .weight) {
            weight = value
        } else if let value = try? container.decode(String.self, forKey: .weight), let parsed = Double(value) {
            weight = parsed
        } else {
            weight = 0
        }
        reps = try container.decode(Int.self, forKey: .reps)
        sets = try container.decodeIfPresent(Int.self, forKey: .sets)
    }
}

struct DominantSet: Equatable {
    let weight: Double
    let reps: Int
    let occurrences: Int
}

struct ExerciseStreak: Equatable {
    let weight: Double
    let reps: Int
    let sessions: Int
    let latestDate: String
}

struct ExercisePersonalBest: Equatable {
    let weight: Double
    let reps: Int
    let volume: Double
    let date: String
}

struct ProgressSuggestion: Equatable {
    let message: String
    let suggestedWeight: Double
    let suggestedReps: Int
}

struct ExerciseSetHistoryAnalysis: Equatable {
    let tableRows: [ExerciseHistoryRow]
    let currentStreak: ExerciseStreak?
    let personalBest: ExercisePersonalBest?
    let suggestion: ProgressSuggestion?
    let totalSessions: Int
}
