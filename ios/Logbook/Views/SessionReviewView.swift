import SwiftUI

/// Shared editable session review — history detail, post-workout summary, etc.
struct SessionReviewView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var session: ActiveSessionDTO?
    let sessionID: UUID
    var showsReopen: Bool = true
    var onDone: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var editingSet: SetLogDTO?
    @State private var editWeight = 20.0
    @State private var editReps = 10
    @State private var showReopenConfirm = false

    var body: some View {
        List {
            if let session {
                summarySection(session)
                exerciseSections(session)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(session?.routineName ?? "Workout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if let onDone {
                    Button("Done", action: onDone)
                } else if showsReopen, session?.status == "completed" {
                    Button("Resume") { showReopenConfirm = true }
                }
            }
        }
        .confirmationDialog("Resume logging?", isPresented: $showReopenConfirm, titleVisibility: .visible) {
            Button("Resume") {
                Task {
                    if await workoutStore.reopenHistorySession(sessionID) {
                        dismiss()
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Marks this workout active so you can keep adding sets from Today.")
        }
        .sheet(item: $editingSet) { set in
            editSetSheet(set)
        }
    }

    @ViewBuilder
    private func summarySection(_ session: ActiveSessionDTO) -> some View {
        Section {
            let groups = SessionLogGrouping.groups(in: session)
            let sets = SessionLogGrouping.completedLogs(in: session)
            Text("\(groups.count) exercises · \(sets.count) sets")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let date = session.date {
                LabeledContent("Date") {
                    Text(formatLongDate(date))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private func exerciseSections(_ session: ActiveSessionDTO) -> some View {
        ForEach(SessionLogGrouping.groups(in: session)) { group in
            Section {
                ForEach(Array(group.sets.enumerated()), id: \.element.id) { index, log in
                    HStack(spacing: 12) {
                        Text("\(index + 1)")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                            .frame(width: 22, height: 22)
                            .background(Color(.tertiarySystemFill))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        Text("\(WorkoutCalculations.formatWeight(log.weight, unit: workoutStore.weightUnit)) × \(log.reps)")
                            .font(.subheadline.weight(.semibold))
                            .monospacedDigit()
                        Spacer(minLength: 0)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task {
                                if let updated = await workoutStore.deleteSetInHistorySession(log.id, sessionID: sessionID) {
                                    self.session = updated
                                }
                            }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            editingSet = log
                            editWeight = log.weight
                            editReps = log.reps
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        .tint(.orange)
                    }
                }
            } header: {
                HStack(alignment: .top, spacing: 12) {
                    ExerciseMediaView(
                        url: workoutStore.mediaURL(forExerciseName: group.name),
                        symbol: ExerciseMediaResolver.symbol(for: group.category),
                        tint: .orange,
                        cornerRadius: 10
                    )
                    .frame(width: 52, height: 52)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(group.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text("\(group.sets.count) sets")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .textCase(nil)
                .padding(.bottom, 4)
            }
        }
    }

    private func editSetSheet(_ set: SetLogDTO) -> some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Edit set").font(.title2.bold())
                PillScroll(values: WorkoutCalculations.weightPills(for: workoutStore.weightUnit), selection: $editWeight) {
                    $0 == 0 ? "Bar" : WorkoutCalculations.formatWeight($0, unit: workoutStore.weightUnit)
                }
                PillScroll(
                    values: WorkoutCalculations.repPills().map(Double.init),
                    selection: Binding(get: { Double(editReps) }, set: { editReps = Int($0) })
                ) { "\(Int($0))" }
                Button("Save changes") {
                    Task {
                        if let updated = await workoutStore.updateSetInHistorySession(
                            set.id,
                            sessionID: sessionID,
                            weight: editWeight,
                            reps: editReps
                        ) {
                            session = updated
                        }
                        editingSet = nil
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                Spacer()
            }
            .padding(20)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { editingSet = nil }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func formatLongDate(_ value: String) -> String {
        guard let date = WorkoutDate.date(from: value) else { return value }
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}
