import SwiftUI

struct LifeLogView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var showManage = false
    @State private var selectedEvent: EventTypeDTO?
    @State private var editingRoute: EditLogRoute?
    @State private var expandedEvents: Set<UUID> = []

    var body: some View {
        List {
            Section {
                ActivityHeatmapView(
                    activeDates: workoutStore.lifeLogHistoryDates,
                    title: "Life log activity"
                )
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }

            Section {
                if workoutStore.eventTypes.isEmpty {
                    Text("Add events to start tracking.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(workoutStore.eventTypes) { event in
                        eventSection(event)
                    }
                }
            } header: {
                HStack {
                    Text("Events")
                    Spacer()
                    Button("Manage") { showManage = true }
                        .font(.caption.weight(.semibold))
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Life log")
        .task {
            if workoutStore.lifeLogHistoryDates.isEmpty {
                await workoutStore.loadFoodAndLifeLogHistory()
            }
        }
        .sheet(isPresented: $showManage) {
            NavigationStack {
                LifeLogManageView(workoutStore: workoutStore)
            }
        }
        .sheet(item: $selectedEvent) { event in
            LifeLogEntrySheet(event: event, workoutStore: workoutStore) { selectedEvent = nil }
        }
        .sheet(item: $editingRoute) { route in
            LifeLogEntrySheet(
                event: route.event,
                existingLog: route.log,
                workoutStore: workoutStore
            ) { editingRoute = nil }
        }
    }

    @ViewBuilder
    private func eventSection(_ event: EventTypeDTO) -> some View {
        let todayLogged = workoutStore.lifeLog(for: event.id) != nil
        let logs = workoutStore.eventLogs(for: event.id)
        let isExpanded = expandedEvents.contains(event.id)

        Section {
            Button {
                if todayLogged {
                    Task { await workoutStore.toggleLifeLog(event.id) }
                    HapticFeedback.light()
                } else {
                    selectedEvent = event
                }
            } label: {
                HStack(spacing: 12) {
                    Text(event.icon ?? "📝").font(.title3)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(event.name).font(.subheadline.weight(.semibold))
                        if let log = workoutStore.lifeLog(for: event.id), let notes = log.notes, !notes.isEmpty {
                            Text(notes).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                    Spacer()
                    Image(systemName: todayLogged ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(todayLogged ? .orange : .secondary)
                }
            }

            if logs.count > 1 {
                Button(isExpanded ? "Hide history" : "Show history (\(logs.count))") {
                    withAnimation(.snappy) {
                        if isExpanded { expandedEvents.remove(event.id) } else { expandedEvents.insert(event.id) }
                    }
                }
                .font(.caption.weight(.semibold))
            }

            if isExpanded {
                ForEach(Array(logs.enumerated()), id: \.element.id) { index, log in
                    if index > 0, let gap = LifeLogGapFormatting.gapDays(between: logs[index - 1].date, and: log.date) {
                        LifeLogGapPillView(gapDays: gap)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                    Button {
                        editingRoute = EditLogRoute(event: event, log: log)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(log.date).font(.caption.weight(.semibold))
                            if let notes = log.notes, !notes.isEmpty {
                                Text(notes).font(.caption).foregroundStyle(.secondary)
                            }
                            if let cost = log.cost {
                                Text("Cost: \(cost.formatted())").font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct EditLogRoute: Identifiable {
    let event: EventTypeDTO
    let log: EventLogDTO
    var id: UUID { log.id }
}
