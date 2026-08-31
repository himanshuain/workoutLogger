import SwiftUI

struct HomeWorkoutHistorySection: View {
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedTab: String
    @State private var expandedSessionID: UUID?
    @State private var deleteTarget: ActiveSessionDTO?

    private var recentSessions: [ActiveSessionDTO] {
        Array(workoutStore.loadedSessions.filter { $0.status == "completed" }.prefix(5))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Workout history", systemImage: "clock.arrow.circlepath")
                    .font(.headline)
                Spacer()
                Button("View all") { selectedTab = NavTabConfig.history.id }
                    .font(.subheadline.weight(.semibold))
            }

            if recentSessions.isEmpty {
                Text("Complete workouts to see recent sessions here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(recentSessions) { session in
                    sessionCard(session)
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .confirmationDialog("Delete this workout?", isPresented: Binding(
            get: { deleteTarget != nil },
            set: { if !$0 { deleteTarget = nil } }
        ), titleVisibility: .visible) {
            Button("Delete workout", role: .destructive) {
                if let id = deleteTarget?.id {
                    Task { await workoutStore.deleteHistorySession(id) }
                }
                deleteTarget = nil
            }
            Button("Cancel", role: .cancel) { deleteTarget = nil }
        }
    }

    @ViewBuilder
    private func sessionCard(_ session: ActiveSessionDTO) -> some View {
        let isExpanded = expandedSessionID == session.id
        let groups = SessionLogGrouping.groups(in: session)
        let sets = SessionLogGrouping.completedLogs(in: session)

        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.snappy) {
                    expandedSessionID = isExpanded ? nil : session.id
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(session.routineName ?? "Workout")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(dateLabel(session.date))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    SessionOverflowMenu(
                        workoutStore: workoutStore,
                        session: session,
                        onDelete: { deleteTarget = session },
                        onEdit: nil,
                        onUndoDone: session.date == WorkoutDate.todayString()
                            ? { Task { await workoutStore.reopenViewingDateWorkout() } }
                            : nil,
                        onReset: nil
                    )
                    Text("\(groups.count) exercises · \(sets.count) sets")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                        .monospacedDigit()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(12)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Divider()
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(groups.count) exercises · \(sets.count) sets")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 12)
                        .padding(.top, 8)
                    ForEach(groups.prefix(4)) { group in
                        HStack(spacing: 8) {
                            ExerciseMediaView(
                                url: workoutStore.mediaURL(forExerciseName: group.name),
                                symbol: ExerciseMediaResolver.symbol(for: group.category),
                                tint: .orange,
                                cornerRadius: 6
                            )
                            .frame(width: 32, height: 32)
                            Text(group.name)
                                .font(.caption.weight(.medium))
                                .lineLimit(1)
                            Spacer()
                            Text("\(group.sets.count) sets")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 12)
                    }
                    NavigationLink {
                        HistorySessionDetailView(sessionID: session.id, workoutStore: workoutStore)
                    } label: {
                        Text("Open details")
                            .font(.caption.weight(.semibold))
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 10)
                }
            }
        }
        .background(Color(.tertiarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func dateLabel(_ value: String?) -> String {
        guard let value, let date = WorkoutDate.date(from: value) else { return value ?? "" }
        if value == WorkoutDate.todayString() { return "Today" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return formatter.string(from: date)
    }
}
