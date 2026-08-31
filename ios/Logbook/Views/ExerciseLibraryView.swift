import SwiftUI

struct ExerciseLibraryView: View {
    @ObservedObject var workoutStore: WorkoutStore
    var pickerMode = false
    var onPick: ((ExerciseDTO) -> Void)?
    @State private var searchText = ""
    @State private var parentFilter: String?
    @State private var subFilter: String?
    @State private var equipmentFilter = "All"
    @State private var showCustomExerciseForm = false
    @State private var mediaEditTarget: ExerciseDTO?
    @Environment(\.dismiss) private var dismiss

    private var filteredExercises: [ExerciseDTO] {
        workoutStore.libraryExercises.filter { exercise in
            ExerciseFilterLogic.matchesSearch(exercise, query: searchText)
                && ExerciseFilterLogic.matchesParent(exercise, parent: parentFilter)
                && ExerciseFilterLogic.matchesSub(exercise, parent: parentFilter, sub: subFilter)
                && ExerciseFilterLogic.matchesEquipment(exercise, equipment: equipmentFilter)
        }.prefix(80).map { $0 }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
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
                filterChipRow(
                    items: ExerciseFilterLogic.equipmentOptions,
                    selection: $equipmentFilter
                )
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)

            if filteredExercises.isEmpty {
                ContentUnavailableView(
                    searchText.isEmpty && parentFilter == nil && equipmentFilter == "All"
                        ? "No exercises"
                        : "No results",
                    systemImage: "dumbbell.fill",
                    description: Text("Try different filters or search terms.")
                )
                .padding(.top, 48)
            } else {
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                    ],
                    spacing: 14
                ) {
                    ForEach(filteredExercises) { exercise in
                        if pickerMode {
                            Button {
                                onPick?(exercise)
                                HapticFeedback.light()
                            } label: {
                                LibraryExerciseTile(exercise: exercise, mediaURL: workoutStore.mediaURL(for: exercise))
                            }
                            .buttonStyle(.plain)
                        } else {
                            LibraryExerciseTile(exercise: exercise, mediaURL: workoutStore.mediaURL(for: exercise))
                                .contextMenu {
                                    Button("Set media URL", systemImage: "photo") {
                                        mediaEditTarget = exercise
                                    }
                                }
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(pickerMode ? "Add exercise" : "Exercise library")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if pickerMode {
                    Button("Cancel") { dismiss() }
                } else {
                    Button {
                        showCustomExerciseForm = true
                    } label: {
                        Label("Custom exercise", systemImage: "plus.circle.fill")
                    }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search exercises")
        .refreshable { await workoutStore.refresh() }
        .sheet(isPresented: $showCustomExerciseForm) {
            NavigationStack {
                CustomExerciseForm(workoutStore: workoutStore) { created in
                    showCustomExerciseForm = false
                    if pickerMode { onPick?(created) }
                }
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

            Text(exercise.category ?? "Other")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

private struct CustomExerciseForm: View {
    @ObservedObject var workoutStore: WorkoutStore
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
                ForEach(ExerciseFilterLogic.equipmentOptions.filter { $0 != "All" }, id: \.self) { Text($0).tag($0) }
            }
        }
        .navigationTitle("Custom exercise")
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
