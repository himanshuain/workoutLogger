import SwiftUI

struct ExercisePastSetsDrawerView: View {
    let exerciseName: String
    let weightUnit: WeightUnit
    let analysis: ExerciseSetHistoryAnalysis?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if let analysis {
                    if let streak = analysis.currentStreak {
                        Section("Current streak") {
                            Text("\(WorkoutCalculations.formatWeight(streak.weight, unit: weightUnit)) × \(streak.reps) · \(streak.sessions) sessions")
                                .font(.subheadline.weight(.semibold))
                            Text("Latest: \(streak.latestDate)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let best = analysis.personalBest {
                        Section("Personal best") {
                            Text("\(WorkoutCalculations.formatWeight(best.weight, unit: weightUnit)) × \(best.reps)")
                            Text(best.date).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if let suggestion = analysis.suggestion {
                        Section("Suggestion") {
                            Text(suggestion.message).font(.subheadline)
                        }
                    }
                    Section("Past sessions (\(analysis.totalSessions))") {
                        ForEach(analysis.tableRows) { row in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row.date).font(.subheadline.weight(.semibold))
                                Text(row.setsSummary).font(.caption).foregroundStyle(.secondary)
                                if let routine = row.routineName, !routine.isEmpty {
                                    Text(routine).font(.caption2).foregroundStyle(.tertiary)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "No past sets",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Complete workouts with \(exerciseName) to build history.")
                    )
                }
            }
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
