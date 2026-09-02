import SwiftUI

struct HistoryDaySheetDate: Identifiable {
    let date: String
    var id: String { date }
}

struct HistoryDayLogsSheet: View {
    let date: String
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedTab: String
    @Environment(\.dismiss) private var dismiss

    private var group: HistoryDayGroup? {
        workoutStore.historyGroups.first { $0.date == date }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let group, !group.sessions.isEmpty || !group.legacyLogs.isEmpty {
                    List {
                        if !group.sessions.isEmpty {
                            Section("Workouts") {
                                ForEach(group.sessions) { session in
                                    HistoryDaySessionBlock(
                                        session: session,
                                        loadedSession: workoutStore.loadedSessions.first { $0.id == session.id },
                                        weightUnit: workoutStore.weightUnit
                                    )
                                }
                            }
                        }

                        if !group.legacyLogs.isEmpty {
                            Section("Legacy logs") {
                                ForEach(group.legacyLogs) { log in
                                    HistoryDayLegacyRow(log: log, weightUnit: workoutStore.weightUnit)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                } else {
                    ContentUnavailableView(
                        "No workouts",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("Nothing was logged on this day.")
                    )
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                if group != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            workoutStore.selectViewingDate(date)
                            selectedTab = NavTabConfig.today.id
                            dismiss()
                        } label: {
                            Label("Open on Today", systemImage: "arrow.up.right.square")
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var navigationTitle: String {
        guard let value = WorkoutDate.date(from: date) else { return date }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        if date == WorkoutDate.todayString() {
            return "Today"
        }
        return formatter.string(from: value)
    }
}

private struct HistoryDaySessionBlock: View {
    let session: HistorySessionItem
    let loadedSession: ActiveSessionDTO?
    let weightUnit: WeightUnit

    private var exerciseGroups: [HistoryDayExerciseGroup] {
        HistoryDayExerciseGroup.build(from: loadedSession, weightUnit: weightUnit)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.routineName ?? "Workout")
                    .font(.headline)
                    .lineLimit(2)
                Text("\(session.exerciseCount) exercises · \(session.setCount) sets")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if exerciseGroups.isEmpty {
                Text("No completed sets")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(exerciseGroups) { group in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(group.name)
                                .font(.subheadline.weight(.semibold))
                            Text(group.setsSummary)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct HistoryDayExerciseGroup: Identifiable {
    let id: String
    let name: String
    let setsSummary: String

    static func build(from session: ActiveSessionDTO?, weightUnit: WeightUnit) -> [HistoryDayExerciseGroup] {
        guard let session else { return [] }
        let completed = (session.setLogs ?? []).filter(\.isCompleted)
        let grouped = Dictionary(grouping: completed) { $0.exerciseName }

        return grouped.keys.sorted().map { name in
            let sets = grouped[name] ?? []
            let sorted = sets.sorted { ($0.setNumber ?? 0) < ($1.setNumber ?? 0) }
            let summary = sorted.map {
                "\(WorkoutCalculations.formatWeight($0.weight, unit: weightUnit)) × \($0.reps)"
            }.joined(separator: "  ·  ")
            return HistoryDayExerciseGroup(id: "\(session.id.uuidString)-\(name)", name: name, setsSummary: summary)
        }
    }
}

private struct HistoryDayLegacyRow: View {
    let log: ExerciseLogDTO
    let weightUnit: WeightUnit

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "clock.arrow.circlepath")
                .foregroundStyle(.secondary)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text(log.exerciseName).font(.headline)
                Text("Legacy · \(WorkoutCalculations.formatWeight(log.weight, unit: weightUnit)) × \(log.reps)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}
