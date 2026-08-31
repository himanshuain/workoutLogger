import SwiftUI

private enum ChecklistEditorRoute: Identifiable {
    case addCard
    case editCard(StepCardDTO)

    var id: String {
        switch self {
        case .addCard: "add-card"
        case .editCard(let card): card.id.uuidString
        }
    }
}

private struct ChecklistStepRoute: Identifiable {
    let cardID: UUID
    let step: StepItemDTO?

    var id: String {
        step.map { "\(cardID.uuidString)-\($0.id.uuidString)" } ?? "\(cardID.uuidString)-new"
    }
}

struct ChecklistsView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var editorRoute: ChecklistEditorRoute?
    @State private var stepRoute: ChecklistStepRoute?
    @State private var followCard: StepCardDTO?
    @AppStorage("step_card_checks") private var checksData = "{}"

    private func isChecked(_ id: UUID) -> Bool {
        loadedChecks().contains(id.uuidString)
    }

    private func loadedChecks() -> Set<String> {
        guard let data = checksData.data(using: .utf8),
              let dict = try? JSONDecoder().decode([String: [String]].self, from: data) else { return [] }
        return Set(dict.values.flatMap { $0 })
    }

    var body: some View {
        NavigationStack {
            List {
                if workoutStore.stepCards.isEmpty {
                    ContentUnavailableView(
                        "No checklists",
                        systemImage: "checklist",
                        description: Text("Create a checklist for gym prep, morning routines, and more.")
                    )
                } else {
                    ForEach(workoutStore.stepCards) { card in
                        cardSection(card)
                    }
                    .onMove(perform: workoutStore.reorderStepCards)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Checklists")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add", systemImage: "plus") { editorRoute = .addCard }
                }
            }
            .sheet(item: $editorRoute) { route in
                switch route {
                case .addCard:
                    ChecklistCardEditorSheet(workoutStore: workoutStore, mode: .add) { editorRoute = nil }
                case .editCard(let card):
                    ChecklistCardEditorSheet(workoutStore: workoutStore, mode: .edit(card)) { editorRoute = nil }
                }
            }
            .sheet(item: $stepRoute) { route in
                ChecklistStepEditorSheet(
                    cardID: route.cardID,
                    step: route.step,
                    workoutStore: workoutStore
                ) { stepRoute = nil }
            }
            .fullScreenCover(item: $followCard) { card in
                FollowModeView(
                    card: card,
                    isChecked: isChecked,
                    onToggle: toggleCheck,
                    onClose: { followCard = nil }
                )
            }
        }
    }

    @ViewBuilder
    private func cardSection(_ card: StepCardDTO) -> some View {
        Section {
            ForEach(card.items) { item in
                HStack(spacing: 12) {
                    Button {
                        toggleCheck(item.id)
                    } label: {
                        Image(systemName: isChecked(item.id) ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(isChecked(item.id) ? .green : .secondary)
                    }
                    .buttonStyle(.plain)
                    Button {
                        stepRoute = ChecklistStepRoute(cardID: card.id, step: item)
                    } label: {
                        Text(item.text)
                            .strikethrough(isChecked(item.id))
                            .foregroundStyle(.primary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }
            Button {
                stepRoute = ChecklistStepRoute(cardID: card.id, step: nil)
            } label: {
                Label("Add step", systemImage: "plus.circle")
                    .font(.subheadline)
            }
        } header: {
            HStack {
                Button {
                    editorRoute = .editCard(card)
                } label: {
                    Text("\(card.icon ?? "📋") \(card.name)")
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
                Spacer()
                Button("Follow") { followCard = card }
                    .font(.caption.weight(.semibold))
            }
        }
    }

    private func toggleCheck(_ id: UUID) {
        var map = (try? JSONDecoder().decode([String: [String]].self, from: Data(checksData.utf8))) ?? [:]
        var all = Set(map.values.flatMap { $0 })
        let key = id.uuidString
        if all.contains(key) {
            all.remove(key)
        } else {
            all.insert(key)
        }
        map["global"] = Array(all)
        if let data = try? JSONEncoder().encode(map), let json = String(data: data, encoding: .utf8) {
            checksData = json
        }
    }
}

private struct FollowModeView: View {
    let card: StepCardDTO
    let isChecked: (UUID) -> Bool
    let onToggle: (UUID) -> Void
    let onClose: () -> Void

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(card.items.enumerated()), id: \.element.id) { index, item in
                    Button {
                        onToggle(item.id)
                    } label: {
                        HStack(spacing: 16) {
                            Text("\(index + 1)")
                                .font(.headline)
                                .foregroundStyle(.secondary)
                                .frame(width: 28)
                            Text(item.text)
                                .font(.title3.weight(isChecked(item.id) ? .regular : .semibold))
                                .strikethrough(isChecked(item.id))
                                .multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: isChecked(item.id) ? "checkmark.circle.fill" : "circle")
                                .font(.title2)
                                .foregroundStyle(isChecked(item.id) ? .green : .secondary)
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle(card.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done", action: onClose)
                }
            }
        }
    }
}
