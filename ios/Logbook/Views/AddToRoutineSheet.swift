import SwiftUI

struct AddToRoutineSheet: View {
    @ObservedObject var workoutStore: WorkoutStore
    let exercise: ExerciseDTO
    let onDone: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isSaving = false
    @State private var feedbackMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if workoutStore.displaySplits.isEmpty {
                    ContentUnavailableView(
                        "No splits yet",
                        systemImage: "square.stack.3d.up.slash",
                        description: Text("Create a workout split first, then add exercises from the library.")
                    )
                } else {
                    List(workoutStore.displaySplits) { split in
                        Button {
                            Task { await add(to: split) }
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(split.color)
                                    .frame(width: 12, height: 12)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(split.name)
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(.primary)
                                    Text("\(split.exercises.filter { !$0.isSessionExtra }.count) exercises")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if split.exercises.contains(where: {
                                    $0.exerciseID == exercise.id
                                        || WorkoutCalculations.normalizeExerciseName($0.name)
                                            == WorkoutCalculations.normalizeExerciseName(exercise.name)
                                }) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.orange)
                                }
                            }
                        }
                        .disabled(isSaving)
                    }
                }
            }
            .navigationTitle("Add to split")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDone()
                        dismiss()
                    }
                }
            }
            .alert("Added", isPresented: Binding(
                get: { feedbackMessage != nil },
                set: { if !$0 { feedbackMessage = nil } }
            )) {
                Button("OK", role: .cancel) {
                    onDone()
                    dismiss()
                }
            } message: {
                Text(feedbackMessage ?? "")
            }
        }
    }

    private func add(to split: NativeSplit) async {
        isSaving = true
        defer { isSaving = false }
        let added = await workoutStore.appendExerciseToRoutine(routineID: split.id, exercise: exercise)
        if added {
            HapticFeedback.success()
            feedbackMessage = "\(exercise.name) was added to \(split.name)."
        } else {
            HapticFeedback.medium()
            feedbackMessage = "\(exercise.name) is already in \(split.name)."
        }
    }
}
