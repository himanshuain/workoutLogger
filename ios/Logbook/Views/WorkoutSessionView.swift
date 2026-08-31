import SwiftUI
import UniformTypeIdentifiers

struct WorkoutSessionView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedSplit: Int
    @State private var showExerciseFlow = false
    @State private var flowStartIndex = 0
    @State private var showAddExercise = false
    @State private var showFinishConfirm = false
    @State private var showResetConfirm = false
    @State private var showDeleteSessionConfirm = false
    @State private var cardSize = ExerciseCardPreferences.cardSize
    @State private var isEditingLayout = false
    @State private var draggingExerciseID: UUID?

    private var splits: [NativeSplit] { workoutStore.displaySplits }
    private var split: NativeSplit {
        guard splits.indices.contains(selectedSplit) else {
            return splits.first ?? NativeSplit.preview[0]
        }
        return splits[selectedSplit]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                mutationErrorSection
                reopenBanner
                splitTabs
                if workoutStore.activeSession != nil {
                    compactProgress
                }
                addExerciseButton
                exercisesGrid
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(split.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .fullScreenCover(isPresented: $showExerciseFlow) {
            ExerciseFlowView(
                workoutStore: workoutStore,
                selectedSplit: $selectedSplit,
                startIndex: flowStartIndex
            )
        }
        .sheet(isPresented: $showAddExercise) {
            NavigationStack {
                ExerciseLibraryView(
                    workoutStore: workoutStore,
                    pickerMode: true,
                    onPick: { exercise in
                        Task {
                            await workoutStore.addSessionExtra(exercise: exercise)
                            showAddExercise = false
                        }
                    }
                )
            }
        }
        .confirmationDialog("Finish workout?", isPresented: $showFinishConfirm, titleVisibility: .visible) {
            Button("Finish workout", role: .destructive) {
                Task { await workoutStore.completeActiveWorkout() }
            }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog("Reset workout?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Reset workout", role: .destructive) {
                Task { await workoutStore.resetWorkout() }
            }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog("Delete workout?", isPresented: $showDeleteSessionConfirm, titleVisibility: .visible) {
            Button("Delete workout", role: .destructive) {
                Task {
                    if let session = workoutStore.viewingCompletedSession ?? workoutStore.activeSession {
                        await workoutStore.deleteHistorySession(session.id)
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .sheet(item: $workoutStore.completionSummary) { summary in
            WorkoutCompletionSummaryView(workoutStore: workoutStore, summary: summary) {
                workoutStore.completionSummary = nil
            }
        }
        .onChange(of: cardSize) { _, newValue in
            ExerciseCardPreferences.cardSize = newValue
        }
        .onChange(of: splits.count) { _, count in
            if selectedSplit >= count {
                selectedSplit = max(0, count - 1)
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            SessionOverflowMenu(
                workoutStore: workoutStore,
                session: workoutStore.activeSession ?? workoutStore.viewingCompletedSession,
                onDelete: { showDeleteSessionConfirm = true },
                onEdit: nil,
                onUndoDone: workoutStore.isViewingToday && workoutStore.viewingCompletedSession != nil
                    ? { Task { await workoutStore.reopenViewingDateWorkout() } }
                    : nil,
                onReset: workoutStore.activeSession != nil ? { showResetConfirm = true } : nil
            )
            Menu {
                Picker("Card size", selection: $cardSize) {
                    ForEach(ExerciseCardSize.allCases) { size in
                        Label(size.label, systemImage: size.systemImage).tag(size)
                    }
                }
            } label: {
                Image(systemName: cardSize.systemImage)
            }
            if workoutStore.activeSession != nil {
                Button(isEditingLayout ? "Done" : "Edit") {
                    withAnimation(.snappy) { isEditingLayout.toggle() }
                    HapticFeedback.light()
                }
                .disabled(!workoutStore.canLogSets)
                Button("Finish", systemImage: "checkmark.circle") { showFinishConfirm = true }
            }
        }
    }

    @ViewBuilder
    private var mutationErrorSection: some View {
        if let message = workoutStore.mutationError {
            HStack(alignment: .top, spacing: 8) {
                Text(message).font(.footnote).foregroundStyle(.red)
                Spacer(minLength: 0)
                Button("Dismiss") { workoutStore.clearMutationError() }.font(.caption.weight(.semibold))
            }
            .padding(12)
            .background(Color.red.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    @ViewBuilder
    private var reopenBanner: some View {
        if workoutStore.isViewingCompletedWorkout {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Workout completed")
                        .font(.subheadline.weight(.semibold))
                    Text("Tap an exercise to review or edit sets. Add more from the exercise flow.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                if workoutStore.isViewingToday {
                    Button("Resume") {
                        Task { await workoutStore.reopenViewingDateWorkout() }
                    }
                    .buttonStyle(.bordered)
                    .tint(.orange)
                }
            }
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private var splitTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(splits.enumerated()), id: \.element.id) { index, item in
                    Button {
                        guard !workoutStore.isViewingCompletedWorkout || item.id == split.id else { return }
                        withAnimation(.snappy) { selectedSplit = index }
                        if workoutStore.activeSession != nil {
                            Task {
                                _ = await workoutStore.ensureSessionForRoutine(
                                    routineID: item.id,
                                    routineName: item.name
                                )
                            }
                        }
                    } label: {
                        Text(item.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(selectedSplit == index ? .white : .primary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(selectedSplit == index ? item.color : Color(.secondarySystemGroupedBackground))
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }

    private var compactProgress: some View {
        let loggedSets = split.exercises.reduce(0) { $0 + $1.logs.filter(\.isCompleted).count }
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(split.logged)/\(split.exercises.count) exercises")
                    .font(.subheadline.weight(.medium))
                Spacer()
                Text("\(loggedSets) sets logged")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
            }
            ProgressView(value: split.progress).tint(split.color)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var addExerciseButton: some View {
        Group {
            if workoutStore.activeSession != nil, workoutStore.canLogSets {
                Button {
                    showAddExercise = true
                } label: {
                    Label("Add exercise", systemImage: "plus.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                .tint(.orange)
            }
        }
    }

    private var exercisesGrid: some View {
        VStack(alignment: .leading, spacing: 14) {
            let pinned = split.exercises.filter { $0.isPinned && !$0.isSessionExtra }
            let routine = split.exercises.filter { !$0.isPinned && !$0.isSessionExtra }
            let extras = split.exercises.filter(\.isSessionExtra)

            if !pinned.isEmpty {
                exerciseSection(title: "Pinned", exercises: pinned)
            }
            ForEach(ExerciseAreaGroups.groupExercises(routine)) { group in
                exerciseSection(title: group.label, exercises: group.exercises)
            }
            if !extras.isEmpty {
                exerciseSection(title: "Added today", exercises: extras)
            }
        }
    }

    @ViewBuilder
    private func exerciseSection(title: String?, exercises: [NativeExercise]) -> some View {
        if !exercises.isEmpty {
            if let title {
                Text(title)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
            }
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: cardSize.gridSpacing), count: cardSize.columnCount),
                spacing: cardSize.gridSpacing
            ) {
                ForEach(exercises) { exercise in
                    exerciseCard(exercise)
                }
            }
        }
    }

    private func exerciseCard(_ exercise: NativeExercise) -> some View {
        let resolved = workoutStore.exercise(with: exercise.routineExerciseID) ?? exercise
        return ZStack(alignment: .topTrailing) {
            Button {
                guard !isEditingLayout else { return }
                flowStartIndex = split.exercises.firstIndex { $0.routineExerciseID == resolved.routineExerciseID } ?? 0
                showExerciseFlow = true
            } label: {
                ExerciseTile(
                    exercise: resolved,
                    color: split.color,
                    weightUnit: workoutStore.weightUnit,
                    cardSize: cardSize
                )
            }
            .buttonStyle(.plain)
            .opacity(draggingExerciseID == resolved.routineExerciseID ? 0.45 : 1)
            .contextMenu {
                if resolved.isSessionExtra, workoutStore.canLogSets {
                    Button("Remove from workout", systemImage: "minus.circle", role: .destructive) {
                        Task { await workoutStore.removeSessionExtra(exerciseName: resolved.name) }
                    }
                }
            }

            if isEditingLayout {
                HStack(spacing: 8) {
                    if !resolved.isSessionExtra {
                        Button {
                            Task { await workoutStore.toggleExercisePin(routineID: split.id, routineExerciseID: resolved.routineExerciseID) }
                        } label: {
                            Image(systemName: resolved.isPinned ? "pin.fill" : "pin")
                                .font(.caption.weight(.bold))
                                .frame(width: 30, height: 30)
                                .background(.ultraThinMaterial)
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                    Image(systemName: "line.3.horizontal")
                        .font(.caption.weight(.bold))
                        .frame(width: 30, height: 30)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
                .padding(8)
            }
        }
        .onLongPressGesture {
            guard workoutStore.canLogSets else { return }
            withAnimation(.snappy) { isEditingLayout = true }
        }
        .onDrag {
            guard isEditingLayout, workoutStore.canLogSets else { return NSItemProvider() }
            draggingExerciseID = resolved.routineExerciseID
            return NSItemProvider(object: resolved.routineExerciseID.uuidString as NSString)
        }
        .onDrop(
            of: [UTType.text],
            delegate: ExerciseGridDropDelegate(
                targetID: resolved.routineExerciseID,
                split: split,
                draggingID: $draggingExerciseID,
                onReorder: { ordered in
                    Task { await workoutStore.reorderExercises(routineID: split.id, orderedIDs: ordered) }
                }
            )
        )
    }
}

private struct ExerciseGridDropDelegate: DropDelegate {
    let targetID: UUID
    let split: NativeSplit
    @Binding var draggingID: UUID?
    let onReorder: ([UUID]) -> Void

    func performDrop(info: DropInfo) -> Bool {
        guard let draggingID, draggingID != targetID else { return false }
        let ids = split.exercises.map(\.routineExerciseID)
        guard let from = ids.firstIndex(of: draggingID), let to = ids.firstIndex(of: targetID) else { return false }
        var reordered = ids
        let item = reordered.remove(at: from)
        reordered.insert(item, at: to)
        onReorder(reordered)
        self.draggingID = nil
        return true
    }
}
