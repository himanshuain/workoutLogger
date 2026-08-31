import SwiftUI

struct ExerciseFlowView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedSplit: Int
    let startIndex: Int

    @Environment(\.dismiss) private var dismiss
    @State private var currentIndex: Int
    @State private var showPastDrawer = false
    @State private var pastAnalysis: ExerciseSetHistoryAnalysis?
    @State private var isLoadingPast = false

    init(workoutStore: WorkoutStore, selectedSplit: Binding<Int>, startIndex: Int) {
        self.workoutStore = workoutStore
        _selectedSplit = selectedSplit
        self.startIndex = startIndex
        _currentIndex = State(initialValue: startIndex)
    }

    private var split: NativeSplit {
        let splits = workoutStore.displaySplits
        guard splits.indices.contains(selectedSplit) else {
            return splits.first ?? NativeSplit.preview[0]
        }
        return splits[selectedSplit]
    }

    var body: some View {
        NavigationStack {
            TabView(selection: $currentIndex) {
                ForEach(Array(split.exercises.indices), id: \.self) { index in
                    exercisePage(at: index)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .background(Color(.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(resolvedExercise(at: currentIndex).name)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                        Text("\(currentIndex + 1) of \(split.exercises.count)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    if !resolvedExercise(at: currentIndex).logs.isEmpty {
                        Button("Reset", role: .destructive) {
                            Task {
                                await workoutStore.resetExercise(
                                    named: resolvedExercise(at: currentIndex).name
                                )
                            }
                        }
                        .font(.caption)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 12) {
                        Button {
                            Task { await loadPastAnalysis() }
                        } label: {
                            Image(systemName: "clock.arrow.circlepath")
                        }
                        .disabled(isLoadingPast)
                        Button("Done") { dismiss() }
                    }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                flowNavigationBar
            }
            .sheet(isPresented: $showPastDrawer) {
                ExercisePastSetsDrawerView(
                    exerciseName: resolvedExercise(at: currentIndex).name,
                    weightUnit: workoutStore.weightUnit,
                    analysis: pastAnalysis
                )
            }
        }
    }

    private func loadPastAnalysis() async {
        isLoadingPast = true
        defer { isLoadingPast = false }
        pastAnalysis = await workoutStore.exerciseSetHistory(for: resolvedExercise(at: currentIndex).name)
        showPastDrawer = true
        HapticFeedback.light()
    }

    private var flowNavigationBar: some View {
        HStack(spacing: 16) {
            Button {
                goToPrevious()
            } label: {
                Label("Previous", systemImage: "chevron.left")
                    .font(.subheadline.weight(.semibold))
            }
            .disabled(currentIndex <= 0)

            Spacer()

            HStack(spacing: 6) {
                Image(systemName: "hand.draw")
                    .font(.caption2)
                Text("Swipe or use arrows")
                    .font(.caption2)
            }
            .foregroundStyle(.tertiary)

            Spacer()

            Button {
                goToNext()
            } label: {
                Label("Next", systemImage: "chevron.right")
                    .font(.subheadline.weight(.semibold))
                    .labelStyle(.titleAndIcon)
            }
            .disabled(currentIndex >= split.exercises.count - 1)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.bar)
    }

    private func goToPrevious() {
        guard currentIndex > 0 else { return }
        withAnimation(.snappy) {
            currentIndex -= 1
        }
    }

    private func goToNext() {
        guard currentIndex < split.exercises.count - 1 else { return }
        withAnimation(.snappy) {
            currentIndex += 1
        }
    }

    @ViewBuilder
    private func exercisePage(at index: Int) -> some View {
        let exercise = resolvedExercise(at: index)
        ExerciseDetailPage(
            exercise: exercise,
            weightUnit: workoutStore.weightUnit,
            history: workoutStore.history(for: exercise.name),
            canLogSets: workoutStore.canLogSets,
            mutationError: workoutStore.mutationError,
            loadAnalysis: { await workoutStore.exerciseSetHistory(for: exercise.name) },
            onDeleteSet: { setID in await workoutStore.deleteSet(setID) },
            onUpdateSet: { setID, weight, reps in
                await workoutStore.updateSet(id: setID, weight: weight, reps: reps)
            },
            onResetExercise: { await workoutStore.resetExercise(named: exercise.name) },
            onLog: { weight, reps in
                await log(exercise, weight: weight, reps: reps)
            },
            embeddedInFlow: true
        )
    }

    private func resolvedExercise(at index: Int) -> NativeExercise {
        guard split.exercises.indices.contains(index) else {
            return split.exercises.first ?? NativeSplit.preview[0].exercises[0]
        }
        let fallback = split.exercises[index]
        return workoutStore.exercise(with: fallback.routineExerciseID) ?? fallback
    }

    private func log(_ exercise: NativeExercise, weight: Double, reps: Int) async {
        await workoutStore.logSet(
            routineExerciseID: exercise.routineExerciseID,
            routineID: split.id,
            routineName: split.name,
            exerciseName: exercise.name,
            category: exercise.category,
            weight: weight,
            reps: reps
        )
    }
}
