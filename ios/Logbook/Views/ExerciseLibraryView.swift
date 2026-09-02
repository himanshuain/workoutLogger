import SwiftUI

private enum LibraryViewMode: String {
    case list
    case grid
}

struct ExerciseLibraryView: View {
    @ObservedObject var workoutStore: WorkoutStore
    var pickerMode = false
    var onPick: ((ExerciseDTO) -> Void)?

    @State private var searchText = ""
    @State private var parentFilter: String?
    @State private var subFilter: String?
    @State private var equipmentKey: String?
    @State private var shownCount = 40
    @State private var viewMode: LibraryViewMode = .list
    @State private var showCustomExerciseForm = false
    @State private var detailExercise: ExerciseDTO?
    @State private var planExercise: ExerciseDTO?
    @State private var mediaEditTarget: ExerciseDTO?
    @Environment(\.dismiss) private var dismiss

    private var baseFiltered: [ExerciseDTO] {
        workoutStore.libraryExercises.filter { exercise in
            ExerciseFilterLogic.matchesSearch(exercise, query: searchText)
                && ExerciseFilterLogic.matchesParent(exercise, parent: parentFilter)
                && ExerciseFilterLogic.matchesSub(exercise, parent: parentFilter, sub: subFilter)
        }
    }

    private var equipmentOptions: [ExerciseFilterLogic.EquipmentChip] {
        ExerciseCatalogInfo.derivedEquipmentOptions(from: baseFiltered)
    }

    private var filteredExercises: [ExerciseDTO] {
        baseFiltered.filter { ExerciseFilterLogic.matchesEquipmentKey($0, key: equipmentKey) }
    }

    private var displayedExercises: [ExerciseDTO] {
        Array(filteredExercises.prefix(shownCount))
    }

    private var animatedCount: Int {
        workoutStore.libraryExercises.filter(ExerciseCatalogInfo.hasAnimation).count
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if !pickerMode {
                    headerSection
                }

                filterSection

                if filteredExercises.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty && parentFilter == nil && equipmentKey == nil
                            ? "No exercises"
                            : "No match",
                        systemImage: "magnifyingglass",
                        description: Text("Try different filters or search terms.")
                    )
                    .padding(.top, 48)
                } else if viewMode == .list {
                    listContent
                } else {
                    gridContent
                }
            }
            .padding(.bottom, 24)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(pickerMode ? "Add exercise" : "Exercises")
        .navigationBarTitleDisplayMode(pickerMode ? .inline : .large)
        .toolbar { toolbarContent }
        .searchable(text: $searchText, prompt: "Search exercises")
        .onChange(of: searchText) { _, _ in shownCount = 40 }
        .onChange(of: parentFilter) { _, _ in resetPaginationAndEquipment() }
        .onChange(of: subFilter) { _, _ in shownCount = 40 }
        .onChange(of: equipmentKey) { _, _ in shownCount = 40 }
        .refreshable { await workoutStore.refresh() }
        .sheet(isPresented: $showCustomExerciseForm) {
            NavigationStack {
                CustomExerciseForm(workoutStore: workoutStore, initialName: searchText) { created in
                    showCustomExerciseForm = false
                    if pickerMode { onPick?(created) }
                }
            }
        }
        .sheet(item: $detailExercise) { exercise in
            let history = workoutStore.history(for: exercise.name)
            let best = max(history?.personalRecordWeight ?? 0, history?.lastWeight ?? 0)
            ExerciseDetailSheet(
                exercise: exercise,
                mediaURL: workoutStore.mediaURL(for: exercise),
                weightUnit: workoutStore.weightUnit,
                personalBest: best,
                onAddToPlan: {
                    detailExercise = nil
                    planExercise = exercise
                },
                onDismiss: { detailExercise = nil }
            )
        }
        .sheet(item: $planExercise) { exercise in
            AddToRoutineSheet(workoutStore: workoutStore, exercise: exercise) {
                planExercise = nil
            }
        }
        .sheet(item: $mediaEditTarget) { exercise in
            NavigationStack {
                ExerciseMediaEditSheet(exercise: exercise, workoutStore: workoutStore) {
                    mediaEditTarget = nil
                }
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            if pickerMode {
                Button("Cancel") { dismiss() }
            } else {
                HStack(spacing: 12) {
                    Button {
                        viewMode = viewMode == .list ? .grid : .list
                        HapticFeedback.select()
                    } label: {
                        Image(systemName: viewMode == .list ? "square.grid.2x2" : "list.bullet")
                    }
                    Button {
                        showCustomExerciseForm = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(workoutStore.libraryExercises.count) exercises")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if animatedCount > 0 {
                Text("\(animatedCount) with animations")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var filterSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            filterChipRow(
                items: ["All"] + ExerciseFilterLogic.parentCategories,
                selection: Binding(
                    get: { parentFilter ?? "All" },
                    set: { value in
                        parentFilter = value == "All" ? nil : value
                        subFilter = nil
                        HapticFeedback.select()
                    }
                )
            )

            if let parent = parentFilter, let subs = ExerciseFilterLogic.subcategories[parent] {
                filterChipRow(
                    items: ["All"] + subs,
                    selection: Binding(
                        get: { subFilter ?? "All" },
                        set: { value in
                            subFilter = value == "All" ? nil : value
                            HapticFeedback.select()
                        }
                    )
                )
            }

            if equipmentOptions.count > 1 {
                equipmentChipRow
            }
        }
        .padding(.horizontal, 16)
    }

    private var equipmentChipRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                equipmentChipButton(label: "Any equipment", key: nil)
                ForEach(equipmentOptions, id: \.key) { chip in
                    equipmentChipButton(label: chip.label, key: chip.key)
                }
            }
        }
    }

    private func equipmentChipButton(label: String, key: String?) -> some View {
        Button {
            equipmentKey = key
            shownCount = 40
            HapticFeedback.select()
        } label: {
            Text(label)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(equipmentKey == key ? Color.orange : Color(.tertiarySystemFill))
                .foregroundStyle(equipmentKey == key ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var listContent: some View {
        LazyVStack(spacing: 8) {
            if !pickerMode {
                createCustomRow
            }

            ForEach(displayedExercises) { exercise in
                if pickerMode {
                    Button {
                        onPick?(exercise)
                        HapticFeedback.light()
                    } label: {
                        LibraryExerciseRow(
                            exercise: exercise,
                            mediaURL: workoutStore.mediaURL(for: exercise),
                            personalBest: personalBest(for: exercise),
                            weightUnit: workoutStore.weightUnit,
                            showsPlanButton: false
                        )
                    }
                    .buttonStyle(.plain)
                } else {
                    LibraryExerciseRow(
                        exercise: exercise,
                        mediaURL: workoutStore.mediaURL(for: exercise),
                        personalBest: personalBest(for: exercise),
                        weightUnit: workoutStore.weightUnit,
                        showsPlanButton: true,
                        onTap: { detailExercise = exercise },
                        onPlan: { planExercise = exercise }
                    )
                    .contextMenu {
                        Button("Set media URL", systemImage: "photo") {
                            mediaEditTarget = exercise
                        }
                    }
                }
            }

            if displayedExercises.count < filteredExercises.count {
                Button("Show more") {
                    shownCount += 40
                    HapticFeedback.light()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.orange)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
        }
        .padding(.horizontal, 16)
    }

    private var gridContent: some View {
        VStack(spacing: 14) {
            if !pickerMode {
                createCustomRow
            }

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                ],
                spacing: 14
            ) {
                ForEach(displayedExercises) { exercise in
                    if pickerMode {
                        Button {
                            onPick?(exercise)
                            HapticFeedback.light()
                        } label: {
                            LibraryExerciseTile(
                                exercise: exercise,
                                mediaURL: workoutStore.mediaURL(for: exercise)
                            )
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button {
                            detailExercise = exercise
                        } label: {
                            LibraryExerciseTile(
                                exercise: exercise,
                                mediaURL: workoutStore.mediaURL(for: exercise)
                            )
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("Set media URL", systemImage: "photo") {
                                mediaEditTarget = exercise
                            }
                            Button("Add to split", systemImage: "plus") {
                                planExercise = exercise
                            }
                        }
                    }
                }
            }

            if displayedExercises.count < filteredExercises.count {
                Button("Show more") {
                    shownCount += 40
                    HapticFeedback.light()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.orange)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
        }
        .padding(.horizontal, 16)
    }

    private var createCustomRow: some View {
        Button {
            showCustomExerciseForm = true
            HapticFeedback.light()
        } label: {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(Color.orange.opacity(0.15))
                    .frame(width: 50, height: 50)
                    .overlay {
                        Image(systemName: "sparkles")
                            .font(.title3)
                            .foregroundStyle(.orange)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Create your own exercise")
                        .font(.body)
                        .foregroundStyle(.primary)
                    Text("Name + body part, no animation")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func personalBest(for exercise: ExerciseDTO) -> Double {
        let history = workoutStore.history(for: exercise.name)
        return max(history?.personalRecordWeight ?? 0, history?.lastWeight ?? 0)
    }

    private func resetPaginationAndEquipment() {
        shownCount = 40
        if let equipmentKey,
           !equipmentOptions.contains(where: { $0.key == equipmentKey }) {
            self.equipmentKey = nil
        }
    }

    private func filterChipRow(items: [String], selection: Binding<String>) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    Button {
                        selection.wrappedValue = item
                    } label: {
                        Text(item)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(selection.wrappedValue == item ? Color.orange : Color(.tertiarySystemFill))
                            .foregroundStyle(selection.wrappedValue == item ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct LibraryExerciseRow: View {
    let exercise: ExerciseDTO
    let mediaURL: URL?
    let personalBest: Double
    let weightUnit: WeightUnit
    var showsPlanButton = true
    var onTap: (() -> Void)?
    var onPlan: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            Button(action: { onTap?() }) {
                HStack(spacing: 12) {
                    ExerciseMediaView(
                        url: mediaURL,
                        symbol: ExerciseMediaResolver.symbol(for: exercise.category),
                        tint: .orange,
                        cornerRadius: 9
                    )
                    .frame(width: 50, height: 50)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(exercise.name)
                            .font(.body)
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text(ExerciseCatalogInfo.subtitle(for: exercise))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 0)

                    if personalBest > 0 {
                        Text(WorkoutCalculations.formatWeight(personalBest, unit: weightUnit))
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange.opacity(0.15))
                            .foregroundStyle(.orange)
                            .clipShape(Capsule())
                    }
                }
            }
            .buttonStyle(.plain)

            if showsPlanButton {
                Button {
                    onPlan?()
                } label: {
                    Label("Plan", systemImage: "plus")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(Color.orange.opacity(0.15))
                        .foregroundStyle(.orange)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(minHeight: 60)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct LibraryExerciseTile: View {
    let exercise: ExerciseDTO
    let mediaURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ExerciseMediaView(
                url: mediaURL,
                symbol: ExerciseMediaResolver.symbol(for: exercise.category),
                tint: .orange,
                cornerRadius: 12
            )
            .frame(height: 96)

            Text(exercise.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            Text(ExerciseCatalogInfo.subtitle(for: exercise))
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

private struct CustomExerciseForm: View {
    @ObservedObject var workoutStore: WorkoutStore
    var initialName = ""
    let onCreated: (ExerciseDTO) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var category = "Chest"
    @State private var equipment = "Dumbbell"

    var body: some View {
        Form {
            TextField("Name", text: $name)
            Picker("Category", selection: $category) {
                ForEach(ExerciseFilterLogic.parentCategories, id: \.self) { Text($0).tag($0) }
            }
            Picker("Equipment", selection: $equipment) {
                ForEach(ExerciseFilterLogic.equipmentOptions.filter { $0 != "All" && $0 != "Other" }, id: \.self) { Text($0).tag($0) }
            }
        }
        .navigationTitle("Custom exercise")
        .onAppear {
            if name.isEmpty, !initialName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                name = initialName.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Create") {
                    Task {
                        if let created = await workoutStore.createCustomExercise(
                            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                            category: category,
                            equipment: equipment
                        ) {
                            onCreated(created)
                            dismiss()
                        }
                    }
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }
}

private struct ExerciseMediaEditSheet: View {
    let exercise: ExerciseDTO
    @ObservedObject var workoutStore: WorkoutStore
    let onDone: () -> Void
    @State private var mediaURL = ""

    var body: some View {
        Form {
            TextField("Media URL", text: $mediaURL)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
        }
        .navigationTitle(exercise.name)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDone) }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Save") {
                    Task {
                        await workoutStore.setExerciseMediaOverride(exercise: exercise, mediaURL: mediaURL)
                        onDone()
                    }
                }
            }
        }
        .onAppear {
            if let url = workoutStore.mediaURL(for: exercise) {
                mediaURL = url.absoluteString
            }
        }
    }
}
