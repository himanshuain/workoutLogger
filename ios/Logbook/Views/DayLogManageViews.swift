import SwiftUI

private enum HabitEditorRoute: Identifiable {
    case add
    case edit(TrackableDTO)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let habit): habit.id.uuidString
        }
    }
}

private enum FoodEditorRoute: Identifiable {
    case add
    case edit(FoodItemDTO)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let item): item.id.uuidString
        }
    }
}

private enum LifeLogEditorRoute: Identifiable {
    case add
    case edit(EventTypeDTO)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let event): event.id.uuidString
        }
    }
}

struct ManageHabitsView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var editorRoute: HabitEditorRoute?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            if workoutStore.trackables.isEmpty {
                ContentUnavailableView(
                    "No habits yet",
                    systemImage: "checkmark.circle",
                    description: Text("Tap + to create your first habit.")
                )
            } else {
                ForEach(workoutStore.trackables) { habit in
                    Button {
                        editorRoute = .edit(habit)
                    } label: {
                        ManageCatalogRow(
                            emoji: habit.icon ?? "✓",
                            title: habit.name,
                            subtitle: habitSubtitle(habit),
                            showsReminderBell: LogReminderPreferences.isEnabled(for: habit.id, kind: .habit)
                        )
                    }
                    .buttonStyle(.plain)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        Task { await workoutStore.deleteHabit(workoutStore.trackables[index].id) }
                    }
                }
            }
        }
        .navigationTitle("Manage habits")
        .navigationBarTitleDisplayMode(.inline)
        .tabNavigationBarStyle()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Add", systemImage: "plus") { editorRoute = .add }
            }
            ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
        }
        .sheet(item: $editorRoute) { route in
            switch route {
            case .add:
                HabitEditorSheet(workoutStore: workoutStore, mode: .add) { editorRoute = nil }
            case .edit(let habit):
                HabitEditorSheet(workoutStore: workoutStore, mode: .edit(habit)) { editorRoute = nil }
            }
        }
    }

    private func habitSubtitle(_ habit: TrackableDTO) -> String? {
        var parts: [String] = []
        if habit.hasValue == true {
            parts.append(habit.valueUnit.map { "Tracks \($0)" } ?? "Tracks a value")
        } else {
            parts.append("Check-off")
        }
        if let days = habit.activeDays, !days.isEmpty {
            parts.append("Today: \(activeDaysLabel(days))")
        }
        return parts.joined(separator: " · ")
    }

    private func activeDaysLabel(_ days: [Int]) -> String {
        let labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return days.sorted().compactMap { labels.indices.contains($0) ? labels[$0] : nil }.joined(separator: ", ")
    }
}

struct ManageFoodView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var editorRoute: FoodEditorRoute?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            if workoutStore.foodItems.isEmpty {
                ContentUnavailableView(
                    "No food items",
                    systemImage: "fork.knife",
                    description: Text("Tap + to add foods you log regularly.")
                )
            } else {
                ForEach(workoutStore.foodItems) { item in
                    Button { editorRoute = .edit(item) } label: {
                        ManageCatalogRow(
                            emoji: item.icon ?? "🍽️",
                            title: item.name,
                            subtitle: foodSubtitle(item),
                            trailing: item.logDirectly == true ? "1-tap" : nil
                        )
                    }
                    .buttonStyle(.plain)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        Task { await workoutStore.deleteFoodItem(workoutStore.foodItems[index].id) }
                    }
                }
            }
        }
        .navigationTitle("Manage food")
        .navigationBarTitleDisplayMode(.inline)
        .tabNavigationBarStyle()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Add", systemImage: "plus") { editorRoute = .add }
            }
            ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
        }
        .sheet(item: $editorRoute) { route in
            switch route {
            case .add:
                FoodItemEditorSheet(workoutStore: workoutStore, mode: .add) { editorRoute = nil }
            case .edit(let item):
                FoodItemEditorSheet(workoutStore: workoutStore, mode: .edit(item)) { editorRoute = nil }
            }
        }
    }

    private func foodSubtitle(_ item: FoodItemDTO) -> String? {
        var parts = [item.unit ?? "serving"]
        if let calories = item.calories, calories > 0 {
            parts.append("\(Int(calories)) cal")
        }
        if let protein = item.proteinG, protein > 0 {
            parts.append("\(Int(protein))g protein")
        }
        return parts.joined(separator: " · ")
    }
}

struct LifeLogManageView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var editorRoute: LifeLogEditorRoute?
    @State private var expandedEventIDs: Set<UUID> = []
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if workoutStore.eventTypes.isEmpty {
                    ContentUnavailableView(
                        "No events",
                        systemImage: "note.text",
                        description: Text("Tap + to track life events like haircuts or errands.")
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 48)
                } else {
                    ForEach(workoutStore.eventTypes) { event in
                        LifeLogManageEventCard(
                            workoutStore: workoutStore,
                            event: event,
                            logs: workoutStore.eventLogs(for: event.id),
                            isExpanded: expandedBinding(for: event.id),
                            onEdit: { editorRoute = .edit(event) }
                        )
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 8)
        }
        .scrollContentBackground(.hidden)
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Life log")
        .navigationBarTitleDisplayMode(.inline)
        .tabNavigationBarStyle()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Add", systemImage: "plus") { editorRoute = .add }
            }
            ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
        }
        .task {
            await workoutStore.reloadLifeLogCatalog()
        }
        .sheet(item: $editorRoute) { route in
            switch route {
            case .add:
                LifeLogEventEditorSheet(workoutStore: workoutStore, mode: .add) {
                    editorRoute = nil
                    Task { await workoutStore.reloadLifeLogCatalog() }
                }
            case .edit(let event):
                LifeLogEventEditorSheet(workoutStore: workoutStore, mode: .edit(event)) {
                    editorRoute = nil
                    Task { await workoutStore.reloadLifeLogCatalog() }
                }
            }
        }
    }

    private func expandedBinding(for id: UUID) -> Binding<Bool> {
        Binding(
            get: { expandedEventIDs.contains(id) },
            set: { isExpanded in
                withAnimation(.snappy) {
                    if isExpanded {
                        expandedEventIDs.insert(id)
                    } else {
                        expandedEventIDs.remove(id)
                    }
                }
            }
        )
    }
}

private struct LifeLogManageEventCard: View {
    @ObservedObject var workoutStore: WorkoutStore
    let event: EventTypeDTO
    let logs: [EventLogDTO]
    @Binding var isExpanded: Bool
    let onEdit: () -> Void
    @State private var selectedChartDate: Date?
    @State private var isChartActive = false

    private var accent: Color {
        event.color.map { Color(hex: $0) } ?? .orange
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Button {
                    isExpanded.toggle()
                    HapticFeedback.select()
                } label: {
                    HStack(spacing: 12) {
                        Text(event.icon ?? "📝")
                            .font(.title3)
                            .frame(width: 36, height: 36)
                            .background(accent.opacity(0.14))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                        VStack(alignment: .leading, spacing: 3) {
                            Text(event.name)
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Text(eventSubtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer(minLength: 0)

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.tertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: onEdit) {
                    Image(systemName: "square.and.pencil")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 36, height: 36)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            if isExpanded {
                VStack(alignment: .leading, spacing: 14) {
                    if logs.isEmpty {
                        Text("No history yet — log this from Today.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        LifeLogEventInsightsGraph(
                            event: event,
                            logs: logs,
                            selectedDate: $selectedChartDate,
                            isChartActive: $isChartActive
                        )

                        Text("History")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)

                        LifeLogHistoryTimelineView(logs: logs, accent: accent)
                    }
                }
                .padding(.top, 14)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .contextMenu {
            Button(role: .destructive) {
                Task { await workoutStore.deleteLifeLogEvent(event.id) }
            } label: {
                Label("Delete event", systemImage: "trash")
            }
        }
    }

    private var eventSubtitle: String {
        var parts: [String] = []
        parts.append("\(logs.count) log\(logs.count == 1 ? "" : "s")")
        if event.trackGraph == true { parts.append("Graph") }
        return parts.joined(separator: " · ")
    }
}
