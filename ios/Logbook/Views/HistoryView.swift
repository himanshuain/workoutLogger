import SwiftUI

struct HistoryView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedTab: String
    @State private var deleteTarget: HistorySessionItem?

    var body: some View {
        NavigationStack {
            Group {
                if workoutStore.isLoadingHistory && workoutStore.historyGroups.isEmpty {
                    HistoryListSkeleton()
                } else if workoutStore.historyGroups.isEmpty {
                    ContentUnavailableView(
                        "No history yet",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Completed workouts will appear here.")
                    )
                } else {
                    historyList
                }
            }
            .navigationTitle("History")
            .blockingLoadingOverlay(
                workoutStore.isLoadingHistory && workoutStore.historyGroups.isEmpty,
                message: "Loading history…"
            )
            .task {
                if workoutStore.historyGroups.isEmpty {
                    await workoutStore.loadHistory()
                }
            }
            .confirmationDialog(
                "Delete this workout?",
                isPresented: Binding(
                    get: { deleteTarget != nil },
                    set: { if !$0 { deleteTarget = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete workout", role: .destructive) {
                    if let id = deleteTarget?.id {
                        Task { await workoutStore.deleteHistorySession(id) }
                    }
                    deleteTarget = nil
                }
                Button("Cancel", role: .cancel) { deleteTarget = nil }
            }
        }
    }

    private var historyList: some View {
        List {
            ForEach(workoutStore.historyGroups) { group in
                Section {
                    ForEach(group.sessions) { session in
                        NavigationLink {
                            HistorySessionDetailView(sessionID: session.id, workoutStore: workoutStore)
                        } label: {
                            HistorySessionRow(session: session, weightUnit: workoutStore.weightUnit)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                deleteTarget = session
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .swipeActions(edge: .leading, allowsFullSwipe: true) {
                            Button {
                                workoutStore.selectViewingDate(session.date)
                                selectedTab = NavTabConfig.today.id
                            } label: {
                                Label("Open on Today", systemImage: "arrow.up.right.square")
                            }
                            .tint(.orange)
                        }
                    }

                    ForEach(group.legacyLogs) { log in
                        LegacyLogRow(log: log, weightUnit: workoutStore.weightUnit)
                            .swipeActions(edge: .leading) {
                                Button {
                                    workoutStore.selectViewingDate(log.date)
                                    selectedTab = NavTabConfig.today.id
                                } label: {
                                    Label("Open on Today", systemImage: "arrow.up.right.square")
                                }
                                .tint(.orange)
                            }
                    }
                } header: {
                    HistorySectionHeader(date: group.date)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct HistoryListSkeleton: View {
    var body: some View {
        List {
            ForEach(0..<5, id: \.self) { _ in
                Section {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(.tertiarySystemFill))
                        .frame(height: 72)
                        .redacted(reason: .placeholder)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct HistorySectionHeader: View {
    let date: String

    var body: some View {
        Group {
            if let subtitle = relativeSubtitle {
                VStack(alignment: .leading, spacing: 2) {
                    Text(primaryTitle)
                        .font(.subheadline.weight(.semibold))
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text(primaryTitle)
                    .font(.subheadline.weight(.semibold))
            }
        }
        .textCase(nil)
        .padding(.bottom, 2)
    }

    private var primaryTitle: String {
        switch relativeKind {
        case .today:
            return "Today"
        case .yesterday:
            return "Yesterday"
        case .daysAgo(let count):
            return "\(count) days ago"
        case .fullDate:
            return formattedDate
        }
    }

    private var relativeSubtitle: String? {
        switch relativeKind {
        case .today, .yesterday, .daysAgo:
            return formattedDate
        case .fullDate:
            return nil
        }
    }

    private enum RelativeKind {
        case today
        case yesterday
        case daysAgo(Int)
        case fullDate
    }

    private var relativeKind: RelativeKind {
        let today = WorkoutDate.todayString()
        if date == today { return .today }
        guard let d = WorkoutDate.date(from: date), let t = WorkoutDate.date(from: today) else {
            return .fullDate
        }
        let days = Calendar.current.dateComponents([.day], from: d, to: t).day ?? 0
        switch days {
        case 1: return .yesterday
        case 2...6: return .daysAgo(days)
        default: return .fullDate
        }
    }

    private var formattedDate: String {
        guard let d = WorkoutDate.date(from: date) else { return date }
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d, yyyy"
        return f.string(from: d)
    }
}

private struct HistorySessionRow: View {
    let session: HistorySessionItem
    let weightUnit: WeightUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(session.routineName ?? "Workout")
                .font(.headline)
                .lineLimit(2)
            Text("\(session.exerciseCount) exercises · \(session.setCount) sets")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct LegacyLogRow: View {
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
