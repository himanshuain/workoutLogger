import XCTest
@testable import Logbook

final class WorkoutCalculationsTests: XCTestCase {
    func testExerciseVolumeCountsOnlyCompletedSets() {
        let logs = [
            LoggedSet(weight: 100, reps: 10, date: "Today", isCompleted: true),
            LoggedSet(weight: 50, reps: 8, date: "Today", isCompleted: false)
        ]
        XCTAssertEqual(WorkoutCalculations.exerciseVolume(logs: logs), 1000)
    }

    func testSplitProgress() {
        let exercises = [
            NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "A", category: "chest", symbol: "dumbbell.fill", mediaURL: nil, logs: [LoggedSet(weight: 10, reps: 5, date: "Today")]),
            NativeExercise(routineExerciseID: UUID(), exerciseID: nil, name: "B", category: "back", symbol: "dumbbell.fill", mediaURL: nil, logs: [])
        ]
        XCTAssertEqual(WorkoutCalculations.splitProgress(exercises: exercises), 0.5, accuracy: 0.001)
    }

    func testPersonalBestFromHistory() {
        let history = ExerciseHistoryDTO(
            id: UUID(),
            exerciseID: nil,
            exerciseName: "Bench Press",
            lastWeight: 80,
            lastReps: 8,
            personalRecordWeight: 100,
            timesPerformed: 3
        )
        XCTAssertEqual(WorkoutCalculations.personalBest(from: history), 100)
    }

    func testNormalizeExerciseName() {
        XCTAssertEqual(WorkoutCalculations.normalizeExerciseName("  Bench   Press "), "bench press")
    }

    func testFormatWeightKgAndLb() {
        XCTAssertEqual(WorkoutCalculations.formatWeight(20, unit: .kg), "20 kg")
        XCTAssertEqual(WorkoutCalculations.formatWeight(45, unit: .lb), "45 lb")
    }

    func testWeightPillsIncludeBarForKg() {
        XCTAssertTrue(WorkoutCalculations.weightPills(for: .kg).contains(0))
        XCTAssertTrue(WorkoutCalculations.weightPills(for: .lb).contains(0))
    }
}