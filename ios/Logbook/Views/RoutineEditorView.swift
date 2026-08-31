import SwiftUI
import UIKit

private struct RoutineExerciseEditItem: Identifiable, Equatable {
    let id: UUID
    var exerciseID: UUID?
    var name: String
    var category: String
    var mediaURL: URL?
    var symbol: String
    var targetSets: Int
    var notes: String
    var isPinned: Bool
}

private struct RoutineEditTarget: Identifiable {
    let id: UUID
    var name: String
    var color: Color
    var exercises: [RoutineExerciseEditItem]
}

private struct ExportDocument: Identifiable {
    let id = UUID()
    let url: URL
}

struct RoutineEditorView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var newRoutineName = ""
    @State private var newRoutineColor = Color(hex: "#f97316")
    @State private var editTarget: RoutineEditTarget?
    @State private var exportDocument: ExportDocument?
    @State private var exportError: String?
    @State private var isCreatingSplit = false

    private let splitColorPresets: [Color] = [
        Color(hex: "#f97316"),
        Color(hex: "#3b82f6"),
        Color(hex: "#22c55e"),
        Color(hex: "#a855f7"),
        Color(hex: "#ef4444"),
        Color(hex: "#14b8a6"),
    ]

    private var trimmedNewRoutineName: String {
        newRoutineName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                addSplitCard

                VStack(alignment: .leading, spacing: 12) {
                    Text("Your splits")
                        .font(.title3.weight(.semibold))

                    if workoutStore.displaySplits.isEmpty {
                        ContentUnavailableView(
                            "No splits yet",
                            systemImage: "square.stack.3d.up.slash",
                            description: Text("Create one above to start building your program.")
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(workoutStore.displaySplits) { routine in
                                splitListCard(routine)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Workout splits")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    exportSplits()
                } label: {
                    Label("Export", systemImage: "square.and.arrow.up")
                }
                .disabled(workoutStore.displaySplits.isEmpty)
            }
        }
        .alert("Export failed", isPresented: Binding(
            get: { exportError != nil },
            set: { if !$0 { exportError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(exportError ?? "")
        }
        .sheet(item: $exportDocument) { document in
            ShareSheet(activityItems: [document.url])
        }
        .sheet(item: $editTarget) { target in
            NavigationStack {
                RoutineDetailEditorView(workoutStore: workoutStore, target: target) {
                    editTarget = nil
                }
            }
        }
    }

    private var addSplitCard: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Circle()
                    .fill(.white.opacity(0.25))
                    .frame(width: 36, height: 36)
                    .overlay {
                        Image(systemName: "plus")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(trimmedNewRoutineName.isEmpty ? "New split" : trimmedNewRoutineName)
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Add to your rotation")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.82))
                }

                Spacer(minLength: 0)

                Circle()
                    .fill(.white.opacity(0.22))
                    .frame(width: 14, height: 14)
                    .overlay {
                        Circle()
                            .fill(newRoutineColor)
                            .frame(width: 10, height: 10)
                    }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(newRoutineColor.gradient)

            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Split name")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    TextField("Push, Pull, Legs…", text: $newRoutineName)
                        .font(.body.weight(.medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 13)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .textInputAutocapitalization(.words)
                        .submitLabel(.done)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Accent color")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    FlowLayout(spacing: 10) {
                        ForEach(Array(splitColorPresets.enumerated()), id: \.offset) { _, color in
                            Button {
                                newRoutineColor = color
                                HapticFeedback.select()
                            } label: {
                                Circle()
                                    .fill(color)
                                    .frame(width: 32, height: 32)
                                    .overlay {
                                        if colorsMatch(newRoutineColor, color) {
                                            Image(systemName: "checkmark")
                                                .font(.caption2.weight(.bold))
                                                .foregroundStyle(.white)
                                        }
                                    }
                                    .overlay {
                                        Circle()
                                            .strokeBorder(Color.primary.opacity(colorsMatch(newRoutineColor, color) ? 0.35 : 0), lineWidth: 2)
                                            .padding(-4)
                                    }
                            }
                            .buttonStyle(.plain)
                        }

                        ColorPicker("Custom color", selection: $newRoutineColor, supportsOpacity: false)
                            .labelsHidden()
                            .frame(width: 32, height: 32)
                    }
                }

                Button {
                    Task { await createSplit() }
                } label: {
                    HStack {
                        Spacer()
                        if isCreatingSplit {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Label("Create & add exercises", systemImage: "arrow.right.circle.fill")
                                .font(.subheadline.weight(.semibold))
                        }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .background(newRoutineColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(trimmedNewRoutineName.isEmpty || isCreatingSplit)
                .opacity(trimmedNewRoutineName.isEmpty ? 0.55 : 1)
            }
            .padding(18)
            .background(Color(.secondarySystemGroupedBackground))
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 6)
    }

    private func splitListCard(_ routine: NativeSplit) -> some View {
        Button {
            editTarget = RoutineEditTarget(
                id: routine.id,
                name: routine.name,
                color: routine.color,
                exercises: routine.exercises.filter { !$0.isSessionExtra }.map {
                    RoutineExerciseEditItem(
                        id: $0.routineExerciseID,
                        exerciseID: $0.exerciseID,
                        name: $0.name,
                        category: $0.category,
                        mediaURL: $0.mediaURL,
                        symbol: $0.symbol,
                        targetSets: $0.targetSets,
                        notes: $0.notes ?? "",
                        isPinned: $0.isPinned
                    )
                }
            )
        } label: {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(routine.color.gradient)
                    .frame(width: 5, height: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text(routine.name)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("\(routine.exercises.count) exercises")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button(role: .destructive) {
                Task { await workoutStore.deleteRoutine(id: routine.id) }
            } label: {
                Label("Delete split", systemImage: "trash")
            }
        }
    }

    private func exportSplits() {
        do {
            exportDocument = ExportDocument(url: try SplitPDFExporter.export(splits: workoutStore.displaySplits))
        } catch {
            exportError = error.localizedDescription
        }
    }

    private func createSplit() async {
        guard !trimmedNewRoutineName.isEmpty else { return }
        isCreatingSplit = true
        defer { isCreatingSplit = false }

        let colorHex = newRoutineColor.toHex()
        guard let createdID = await workoutStore.createRoutine(name: trimmedNewRoutineName, color: colorHex) else {
            return
        }
        newRoutineName = ""

        guard let routine = workoutStore.displaySplits.first(where: { $0.id == createdID }) else { return }
        editTarget = RoutineEditTarget(
            id: routine.id,
            name: routine.name,
            color: routine.color,
            exercises: []
        )
    }

    private func colorsMatch(_ lhs: Color, _ rhs: Color) -> Bool {
        lhs.toHex() == rhs.toHex()
    }
}

private struct RoutineDetailEditorView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State var target: RoutineEditTarget
    @State private var showAddExercise = false
    @State private var previewExercise: RoutineExerciseEditItem?
    let onDone: () -> Void

    private var saveDisabled: Bool {
        target.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        List {
            Section("Split") {
                TextField("Name", text: $target.name)
                ColorPicker("Color", selection: $target.color, supportsOpacity: false)
            }

            Section {
                if target.exercises.isEmpty {
                    Text("No exercises yet").foregroundStyle(.secondary)
                } else {
                    ForEach($target.exercises) { $exercise in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                Button {
                                    previewExercise = exercise
                                } label: {
                                    ExerciseMediaView(
                                        url: exercise.mediaURL,
                                        symbol: exercise.symbol,
                                        tint: target.color,
                                        contentMode: .fit,
                                        cornerRadius: 8
                                    )
                                    .frame(width: 52, height: 52)
                                }
                                .buttonStyle(.plain)

                                Button {
                                    exercise.isPinned.toggle()
                                } label: {
                                    Image(systemName: exercise.isPinned ? "pin.fill" : "pin")
                                        .foregroundStyle(exercise.isPinned ? .orange : .secondary)
                                }
                                .buttonStyle(.plain)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(exercise.name).font(.subheadline.weight(.semibold))
                                    Text(exercise.category.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Stepper("\(exercise.targetSets) sets", value: $exercise.targetSets, in: 1...12)
                                    .font(.caption)
                                    .fixedSize()
                            }
                            TextField("Notes", text: Binding(
                                get: { exercise.notes },
                                set: { exercise.notes = String($0.prefix(500)) }
                            ), axis: .vertical)
                            .font(.footnote)
                        }
                    }
                    .onMove { source, destination in
                        target.exercises.move(fromOffsets: source, toOffset: destination)
                    }
                    .onDelete { indexSet in
                        target.exercises.remove(atOffsets: indexSet)
                    }
                }

                Button {
                    showAddExercise = true
                } label: {
                    Label("Add exercise", systemImage: "plus.circle.fill")
                }
            } header: {
                Text("Exercises in split")
            } footer: {
                Text("Pinned exercises appear first in workouts. Drag rows to set the order within each group.")
            }
        }
        .navigationTitle("Edit split")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                EditButton()
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Save") {
                    Task {
                        await workoutStore.updateRoutine(
                            id: target.id,
                            name: target.name,
                            color: target.color.toHex()
                        )
                        await workoutStore.replaceRoutineExercises(
                            routineID: target.id,
                            exercises: payload()
                        )
                        onDone()
                    }
                }
                .disabled(saveDisabled)
                Button("Done", action: onDone)
            }
        }
        .sheet(isPresented: $showAddExercise) {
            NavigationStack {
                List(workoutStore.libraryExercises) { exercise in
                    Button {
                        append(exercise)
                        showAddExercise = false
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(exercise.name).foregroundStyle(.primary)
                                Text((exercise.category ?? "other").capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if target.exercises.contains(where: { $0.exerciseID == exercise.id || $0.name == exercise.name }) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(.orange)
                            }
                        }
                    }
                }
                .navigationTitle("Add exercise")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { showAddExercise = false }
                    }
                }
            }
        }
        .sheet(item: $previewExercise) { exercise in
            NavigationStack {
                VStack(spacing: 18) {
                    ExerciseMediaView(
                        url: exercise.mediaURL,
                        symbol: exercise.symbol,
                        tint: target.color,
                        contentMode: .fit,
                        cornerRadius: 14
                    )
                    .frame(maxWidth: 320)
                    Text(exercise.name)
                        .font(.headline)
                        .multilineTextAlignment(.center)
                    Text(exercise.category.capitalized)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(24)
                .navigationTitle("Preview")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { previewExercise = nil }
                    }
                }
            }
        }
    }

    private func append(_ exercise: ExerciseDTO) {
        guard !target.exercises.contains(where: { $0.exerciseID == exercise.id || $0.name == exercise.name }) else { return }
        target.exercises.append(
            RoutineExerciseEditItem(
                id: UUID(),
                exerciseID: exercise.id,
                name: exercise.name,
                category: exercise.category ?? "other",
                mediaURL: mediaURL(for: exercise),
                symbol: ExerciseMediaResolver.symbol(for: exercise.category),
                targetSets: 3,
                notes: "",
                isPinned: false
            )
        )
    }

    private func payload() -> [RoutineExerciseInput] {
        target.exercises.map {
            RoutineExerciseInput(
                exerciseID: $0.exerciseID,
                exerciseName: $0.name,
                category: $0.category,
                targetSets: $0.targetSets,
                notes: $0.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0.notes,
                isPinned: $0.isPinned
            )
        }
    }

    private func mediaURL(for exercise: ExerciseDTO) -> URL? {
        if let gif = exercise.gifURL, let url = URL(string: gif) { return url }
        if let image = exercise.imageURL, let url = URL(string: image) { return url }
        return nil
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

private enum SplitPDFExporter {
    static func export(splits: [NativeSplit]) throws -> URL {
        let format = UIGraphicsPDFRendererFormat()
        let metadata = [
            kCGPDFContextCreator: "Logbook iOS",
            kCGPDFContextTitle: "Workout Splits"
        ]
        format.documentInfo = metadata as [String: Any]

        let page = CGRect(x: 0, y: 0, width: 612, height: 792)
        let renderer = UIGraphicsPDFRenderer(bounds: page, format: format)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("workout-splits-\(WorkoutDate.todayString()).pdf")
        try renderer.writePDF(to: url) { context in
            context.beginPage()
            var y: CGFloat = 40
            draw("Workout Splits", at: CGPoint(x: 40, y: y), font: .boldSystemFont(ofSize: 24))
            y += 34
            let exerciseCount = splits.reduce(0) { $0 + $1.exercises.filter { !$0.isSessionExtra }.count }
            draw("\(splits.count) splits · \(exerciseCount) exercises", at: CGPoint(x: 40, y: y), font: .systemFont(ofSize: 12), color: .secondaryLabel)
            y += 30

            for split in splits {
                let routineExercises = split.exercises.filter { !$0.isSessionExtra }
                if y > page.height - 110 {
                    context.beginPage()
                    y = 40
                }
                draw(split.name, at: CGPoint(x: 40, y: y), font: .boldSystemFont(ofSize: 16))
                draw("\(routineExercises.count) exercises", at: CGPoint(x: 440, y: y + 2), font: .systemFont(ofSize: 11), color: .secondaryLabel)
                y += 24

                if routineExercises.isEmpty {
                    draw("No exercises in this split.", at: CGPoint(x: 56, y: y), font: .italicSystemFont(ofSize: 11), color: .secondaryLabel)
                    y += 22
                } else {
                    for exercise in routineExercises {
                        if y > page.height - 56 {
                            context.beginPage()
                            y = 40
                        }
                        let pin = exercise.isPinned ? "Pin · " : ""
                        let title = "\(pin)\(exercise.name)"
                        draw(title, at: CGPoint(x: 56, y: y), font: .systemFont(ofSize: 12, weight: .semibold))
                        draw("\(exercise.targetSets) sets · \(exercise.category.capitalized)", at: CGPoint(x: 360, y: y), font: .systemFont(ofSize: 10), color: .secondaryLabel)
                        y += 15
                        if let notes = exercise.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
                            draw(notes, in: CGRect(x: 72, y: y, width: 480, height: 30), font: .systemFont(ofSize: 10), color: .secondaryLabel)
                            y += 26
                        }
                        y += 6
                    }
                }
                y += 12
            }
        }
        return url
    }

    private static func draw(_ text: String, at point: CGPoint, font: UIFont, color: UIColor = .label) {
        let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
        text.draw(at: point, withAttributes: attributes)
    }

    private static func draw(_ text: String, in rect: CGRect, font: UIFont, color: UIColor = .label) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byWordWrapping
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color,
            .paragraphStyle: paragraph
        ]
        text.draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], attributes: attributes, context: nil)
    }
}
