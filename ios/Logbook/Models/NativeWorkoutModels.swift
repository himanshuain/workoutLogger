import SwiftUI

struct LoggedSet: Identifiable, Equatable {
    let id: UUID
    var weight: Double
    var reps: Int
    var date: String
    var isCompleted: Bool

    init(id: UUID = UUID(), weight: Double, reps: Int, date: String, isCompleted: Bool = true) {
        self.id = id
        self.weight = weight
        self.reps = reps
        self.date = date
        self.isCompleted = isCompleted
    }
}

struct NativeExercise: Identifiable, Equatable {
    let routineExerciseID: UUID
    let exerciseID: UUID?
    let name: String
    let category: String
    let symbol: String
    var mediaURL: URL?
    var logs: [LoggedSet]
    var targetSets: Int = 3
    var notes: String? = nil
    var isPinned: Bool = false
    var isSessionExtra: Bool = false

    var id: UUID { routineExerciseID }

    var latest: LoggedSet? { logs.first }
    var bestWeight: Double { logs.map(\.weight).max() ?? 0 }
    var volume: Double { WorkoutCalculations.exerciseVolume(logs: logs) }
    var isLogged: Bool { !logs.isEmpty }
}

struct NativeSplit: Identifiable, Equatable {
    let id: UUID
    let name: String
    let color: Color
    let colorHex: String
    var exercises: [NativeExercise]

    var volume: Double { WorkoutCalculations.splitVolume(exercises: exercises) }
    var logged: Int { WorkoutCalculations.loggedExerciseCount(exercises: exercises) }
    var progress: Double { WorkoutCalculations.splitProgress(exercises: exercises) }
}

enum WeightUnit: String, Codable {
    case kg
    case lb
}

extension NativeSplit {
    static let preview: [NativeSplit] = [
        NativeSplit(
            id: UUID(),
            name: "Push",
            color: .orange,
            colorHex: "#f97316",
            exercises: [
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Bench Press", category: "Chest", symbol: "figure.strengthtraining.traditional", mediaURL: nil, logs: [LoggedSet(weight: 70, reps: 8, date: "Jun 20")]),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Shoulder Press", category: "Shoulders", symbol: "figure.arms.open", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Tricep Pushdown", category: "Arms", symbol: "figure.strengthtraining.functional", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Lateral Raise", category: "Shoulders", symbol: "figure.mind.and.body", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Chest Fly", category: "Chest", symbol: "figure.wave", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Dips", category: "Arms", symbol: "figure.climbing", mediaURL: nil, logs: [])
            ]
        ),
        NativeSplit(
            id: UUID(),
            name: "Pull",
            color: .blue,
            colorHex: "#3b82f6",
            exercises: [
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Lat Pulldown", category: "Back", symbol: "figure.rowing", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Seated Row", category: "Back", symbol: "arrow.left.and.right", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Bicep Curl", category: "Arms", symbol: "figure.strengthtraining.traditional", mediaURL: nil, logs: [])
            ]
        ),
        NativeSplit(
            id: UUID(),
            name: "Legs",
            color: .green,
            colorHex: "#22c55e",
            exercises: [
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Squat", category: "Legs", symbol: "figure.strengthtraining.functional", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Leg Press", category: "Legs", symbol: "dumbbell.fill", mediaURL: nil, logs: []),
                NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "Calf Raise", category: "Calf", symbol: "figure.walk", mediaURL: nil, logs: [])
            ]
        )
    ]
}
