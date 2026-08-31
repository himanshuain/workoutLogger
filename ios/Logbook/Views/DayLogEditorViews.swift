import SwiftUI

// MARK: - Shared primitives

enum DayLogEmojiPresets {
    static let habits = ["✓", "💪", "🏃", "🧘", "💧", "📖", "🛏️", "💊", "🚶", "🎯", "⚡", "🌅"]
    static let food = ["🍽️", "🥚", "🥤", "🍗", "🥩", "🐟", "🥛", "🍌", "🥜", "🍚", "🥦", "💊"]
    static let lifeLog = ["📝", "💇", "🚗", "🏥", "✈️", "🛒", "💰", "📞", "🎉", "🧹", "🔧", "📅"]
    static let checklists = ["📋", "🏋️", "☀️", "🥤", "🧘", "🎒", "🍳", "🛒", "🧹", "💼", "🎯", "🌙"]

    static let cardColors = [
        "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
        "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4"
    ]
}

struct EmojiPickerGrid: View {
    let emojis: [String]
    @Binding var selection: String
    var columns: Int = 6

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: columns), spacing: 8) {
            ForEach(emojis, id: \.self) { emoji in
                Button {
                    selection = emoji
                } label: {
                    Text(emoji)
                        .font(.title2)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(selection == emoji ? Color.orange.opacity(0.2) : Color(.tertiarySystemFill))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selection == emoji ? Color.orange : Color.clear, lineWidth: 2)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct ColorSwatchPicker: View {
    @Binding var selection: String
    let colors: [String]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 10) {
            ForEach(colors, id: \.self) { hex in
                Button {
                    selection = hex
                } label: {
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(height: 36)
                        .overlay(
                            Circle()
                                .stroke(selection == hex ? Color.primary : Color.clear, lineWidth: 3)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct ChipPickerRow: View {
    let options: [String]
    @Binding var selection: String
    var allowCustom: Bool = false
    @Binding var customText: String

    init(options: [String], selection: Binding<String>, allowCustom: Bool = false, customText: Binding<String> = .constant("")) {
        self.options = options
        _selection = selection
        self.allowCustom = allowCustom
        _customText = customText
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(options, id: \.self) { option in
                        Button {
                            selection = option
                            if allowCustom { customText = option }
                        } label: {
                            Text(option)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(selection == option ? .white : .primary)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(selection == option ? Color.orange : Color(.tertiarySystemFill))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            if allowCustom {
                TextField("Custom", text: $customText)
                    .textInputAutocapitalization(.never)
                    .onChange(of: customText) { _, newValue in
                        selection = newValue
                    }
            }
        }
    }
}

private enum DayLogUnitPresets {
    static let habits = ["min", "kg", "L", "steps", "hrs", "reps", "km"]
    static let food = ["serving", "g", "oz", "cup", "ml", "slice", "scoop"]
    static let foodQuantities: [Double] = [0.5, 1, 1.5, 2, 3, 4, 6, 8]
}

private func estimatedCalories(protein: Double?, carbs: Double?, fat: Double?) -> Double? {
    let p = protein ?? 0
    let c = carbs ?? 0
    let f = fat ?? 0
    guard p + c + f > 0 else { return nil }
    return (p * 4) + (c * 4) + (f * 9)
}

struct EditorHeroHeader: View {
    let emoji: String
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(spacing: 8) {
            Text(emoji)
                .font(.system(size: 52))
                .frame(width: 88, height: 88)
                .background(Color(.tertiarySystemFill))
                .clipShape(RoundedRectangle(cornerRadius: 20))
            Text(title.isEmpty ? "Untitled" : title)
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}

struct EditorIdentitySection: View {
    let emojis: [String]
    @Binding var icon: String
    @Binding var name: String
    var namePlaceholder = "Name"
    var subtitle: String?

    var body: some View {
        Section {
            HStack(alignment: .center, spacing: 12) {
                Text(icon)
                    .font(.title2)
                    .frame(width: 48, height: 48)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 4) {
                    TextField(namePlaceholder, text: $name)
                        .font(.body.weight(.semibold))
                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(emojis, id: \.self) { emoji in
                        Button {
                            icon = emoji
                        } label: {
                            Text(emoji)
                                .font(.title3)
                                .frame(width: 40, height: 40)
                                .background(icon == emoji ? Color.orange.opacity(0.2) : Color(.tertiarySystemFill))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(icon == emoji ? Color.orange : Color.clear, lineWidth: 2)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 8, trailing: 16))
        }
    }
}

struct EditorReminderSection: View {
    @Binding var enabled: Bool
    @Binding var reminderTime: Date
    var activeDays: Set<Int>?
    var onChanged: () -> Void

    private static let weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        Section {
            Toggle(isOn: $enabled) {
                Label("Reminder", systemImage: "bell")
            }
            .onChange(of: enabled) { _, _ in onChanged() }

            if enabled {
                DatePicker("Time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                    .onChange(of: reminderTime) { _, _ in onChanged() }

                VStack(alignment: .leading, spacing: 8) {
                    Text(scheduleSummary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 8, trailing: 16))
            }
        } header: {
            Text("Notification")
        } footer: {
            Text("Long-press the notification and tap Log now to log for that day.")
                .font(.caption)
        }
    }

    private var scheduleSummary: String {
        let time = Self.formattedTime(reminderTime)
        guard let activeDays else {
            return "Every day at \(time)"
        }
        if activeDays.isEmpty {
            return "Every day at \(time)"
        }
        let labels = activeDays.sorted().compactMap { Self.weekdayLabels.indices.contains($0) ? Self.weekdayLabels[$0] : nil }
        return "\(labels.joined(separator: ", ")) at \(time)"
    }

    private static func formattedTime(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }
}

private func reminderDate(hour: Int, minute: Int) -> Date {
    Calendar.current.date(from: DateComponents(hour: hour, minute: minute)) ?? Date()
}

private func saveReminderPreference(
    enabled: Bool,
    reminderTime: Date,
    for id: UUID,
    kind: LogReminderKind,
    workoutStore: WorkoutStore
) async {
    let parts = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
    let pref = LogReminderPreference(
        enabled: enabled,
        hour: parts.hour ?? 9,
        minute: parts.minute ?? 0
    )
    LogReminderPreferences.save(pref, for: id, kind: kind)
    if enabled {
        _ = await LogReminderScheduler.requestAuthorizationIfNeeded()
    }
    await MainActor.run {
        workoutStore.syncLogReminders()
    }
}

struct ManageCatalogRow: View {
    let emoji: String
    let title: String
    var subtitle: String?
    var trailing: String?
    var showsReminderBell = false

    var body: some View {
        HStack(spacing: 12) {
            Text(emoji)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(Color(.tertiarySystemFill))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.medium)).foregroundStyle(.primary)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
            }
            Spacer(minLength: 0)
            if showsReminderBell {
                Image(systemName: "bell.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .accessibilityLabel("Reminder on")
            }
            if let trailing {
                Text(trailing)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .contentShape(Rectangle())
    }
}

struct WeekdayToggleRow: View {
    @Binding var selectedDays: Set<Int>
    private let labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { day in
                let isOn = selectedDays.contains(day)
                Button {
                    if isOn { selectedDays.remove(day) } else { selectedDays.insert(day) }
                } label: {
                    Text(labels[day])
                        .font(.caption2.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(isOn ? Color.orange : Color(.tertiarySystemFill))
                        .foregroundStyle(isOn ? .white : .primary)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct QuantityStepperCard: View {
    @Binding var value: Double
    let unit: String
    var range: ClosedRange<Double> = 0.25...20
    var step: Double = 0.25

    var body: some View {
        VStack(spacing: 16) {
            Text(formatted(value))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()
            Text(unit)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(spacing: 20) {
                Button {
                    value = max(range.lowerBound, value - step)
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(.orange)
                }
                .disabled(value <= range.lowerBound)
                Button {
                    value = min(range.upperBound, value + step)
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(.orange)
                }
                .disabled(value >= range.upperBound)
            }
        }
        .padding(.vertical, 8)
    }

    private func formatted(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(value)) : String(format: "%.2f", value)
    }
}

private func formattedQuantity(_ value: Double) -> String {
    value.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(value)) : String(format: "%.1f", value)
}

// MARK: - Habit editor

struct HabitEditorSheet: View {
    enum Mode {
        case add
        case edit(TrackableDTO)
    }

    @ObservedObject var workoutStore: WorkoutStore
    let mode: Mode
    let onDismiss: () -> Void

    @State private var name = ""
    @State private var icon = "✓"
    @State private var color = DayLogEmojiPresets.cardColors[5]
    @State private var hasValue = false
    @State private var valueUnit = "min"
    @State private var selectedDays: Set<Int> = []
    @State private var reminderEnabled = false
    @State private var reminderTime = reminderDate(hour: 9, minute: 0)
    @State private var isSaving = false

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    var body: some View {
        NavigationStack {
            Form {
                EditorIdentitySection(
                    emojis: DayLogEmojiPresets.habits,
                    icon: $icon,
                    name: $name,
                    namePlaceholder: "Habit name",
                    subtitle: hasValue ? "Tracks \(valueUnit.isEmpty ? "a value" : valueUnit)" : "Simple check-off"
                )

                Section("Details") {
                    Toggle("Track a numeric value", isOn: $hasValue)
                    if hasValue {
                        ChipPickerRow(
                            options: DayLogUnitPresets.habits,
                            selection: $valueUnit,
                            allowCustom: true,
                            customText: $valueUnit
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    }
                }

                Section("Color") {
                    ColorSwatchPicker(selection: $color, colors: DayLogEmojiPresets.cardColors)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }

                Section {
                    Text("Leave all days off to show this habit every day on Today.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    WeekdayToggleRow(selectedDays: $selectedDays)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                } header: {
                    Text("Show on Today")
                } footer: {
                    Text("This habit only appears on the Today page on the days you select.")
                        .font(.caption)
                }

                EditorReminderSection(
                    enabled: $reminderEnabled,
                    reminderTime: $reminderTime,
                    activeDays: selectedDays
                ) {
                    guard case .edit(let habit) = mode else { return }
                    Task {
                        await saveReminderPreference(
                            enabled: reminderEnabled,
                            reminderTime: reminderTime,
                            for: habit.id,
                            kind: .habit,
                            workoutStore: workoutStore
                        )
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit habit" : "New habit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel", action: onDismiss)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditing ? "Save" : "Add") {
                        Task { await save() }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
                if isEditing, case .edit(let habit) = mode {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Delete habit", role: .destructive) {
                            Task {
                                await workoutStore.deleteHabit(habit.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.large])
        .onAppear { applyMode() }
    }

    private func applyMode() {
        guard case .edit(let habit) = mode else { return }
        name = habit.name
        icon = habit.icon ?? "✓"
        color = habit.color ?? DayLogEmojiPresets.cardColors[5]
        hasValue = habit.hasValue == true
        valueUnit = habit.valueUnit ?? "min"
        selectedDays = Set(habit.activeDays ?? [])
        let pref = LogReminderPreferences.load(for: habit.id, kind: .habit)
        reminderEnabled = pref.enabled
        reminderTime = reminderDate(hour: pref.hour, minute: pref.minute)
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let days = selectedDays.isEmpty ? nil : Array(selectedDays).sorted()
        let itemID: UUID?
        switch mode {
        case .add:
            itemID = await workoutStore.createHabit(
                name: trimmed,
                icon: icon,
                hasValue: hasValue,
                valueUnit: valueUnit.isEmpty ? nil : valueUnit,
                activeDays: days,
                color: color
            )
        case .edit(let habit):
            itemID = habit.id
            await workoutStore.updateHabit(
                habit.id,
                name: trimmed,
                icon: icon,
                hasValue: hasValue,
                valueUnit: valueUnit.isEmpty ? nil : valueUnit,
                activeDays: days,
                color: color
            )
        }
        if let itemID {
            await saveReminderPreference(
                enabled: reminderEnabled,
                reminderTime: reminderTime,
                for: itemID,
                kind: .habit,
                workoutStore: workoutStore
            )
        }
        onDismiss()
    }
}

// MARK: - Food item editor

struct FoodItemEditorSheet: View {
    enum Mode {
        case add
        case edit(FoodItemDTO)
    }

    @ObservedObject var workoutStore: WorkoutStore
    let mode: Mode
    let onDismiss: () -> Void

    @State private var name = ""
    @State private var icon = "🍽️"
    @State private var color = DayLogEmojiPresets.cardColors[0]
    @State private var unit = "serving"
    @State private var logDirectly = false
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var calories = ""
    @State private var autoCalories = true
    @State private var isSaving = false

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    var body: some View {
        NavigationStack {
            Form {
                EditorIdentitySection(
                    emojis: DayLogEmojiPresets.food,
                    icon: $icon,
                    name: $name,
                    namePlaceholder: "Food name",
                    subtitle: unit
                )

                Section("Details") {
                    ChipPickerRow(
                        options: DayLogUnitPresets.food,
                        selection: $unit,
                        allowCustom: true,
                        customText: $unit
                    )
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    Toggle("One-tap log (no quantity sheet)", isOn: $logDirectly)
                }

                Section("Color") {
                    ColorSwatchPicker(selection: $color, colors: DayLogEmojiPresets.cardColors)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }

                Section("Macros per unit (optional)") {
                    TextField("Protein (g)", text: $protein).keyboardType(.decimalPad)
                        .onChange(of: protein) { _, _ in syncAutoCalories() }
                    TextField("Carbs (g)", text: $carbs).keyboardType(.decimalPad)
                        .onChange(of: carbs) { _, _ in syncAutoCalories() }
                    TextField("Fat (g)", text: $fat).keyboardType(.decimalPad)
                        .onChange(of: fat) { _, _ in syncAutoCalories() }
                    Toggle("Auto-calculate calories", isOn: $autoCalories)
                    TextField("Calories", text: $calories)
                        .keyboardType(.decimalPad)
                        .disabled(autoCalories)
                }
            }
            .navigationTitle(isEditing ? "Edit food" : "New food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditing ? "Save" : "Add") { Task { await save() } }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
                if isEditing, case .edit(let item) = mode {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Delete food item", role: .destructive) {
                            Task {
                                await workoutStore.deleteFoodItem(item.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.large])
        .onAppear { applyMode() }
    }

    private func applyMode() {
        guard case .edit(let item) = mode else { return }
        name = item.name
        icon = item.icon ?? "🍽️"
        color = item.color ?? DayLogEmojiPresets.cardColors[0]
        unit = item.unit ?? "serving"
        logDirectly = item.logDirectly == true
        protein = item.proteinG.map { formattedQuantity($0) } ?? ""
        carbs = item.carbsG.map { formattedQuantity($0) } ?? ""
        fat = item.fatG.map { formattedQuantity($0) } ?? ""
        calories = item.calories.map { formattedQuantity($0) } ?? ""
        autoCalories = item.calories == nil
    }

    private func syncAutoCalories() {
        guard autoCalories else { return }
        if let estimate = estimatedCalories(protein: Double(protein), carbs: Double(carbs), fat: Double(fat)) {
            calories = formattedQuantity(estimate)
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = FoodItemEditorPayload(
            name: trimmed,
            icon: icon,
            unit: unit.isEmpty ? "serving" : unit,
            logDirectly: logDirectly,
            proteinG: Double(protein),
            carbsG: Double(carbs),
            fatG: Double(fat),
            calories: Double(calories),
            color: color
        )
        switch mode {
        case .add:
            await workoutStore.createFoodItem(payload: payload)
        case .edit(let item):
            await workoutStore.updateFoodItem(item.id, payload: payload)
        }
        onDismiss()
    }
}

struct FoodItemEditorPayload {
    let name: String
    let icon: String
    let unit: String
    let logDirectly: Bool
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let calories: Double?
    let color: String?
}

// MARK: - Life log event editor

struct LifeLogEventEditorSheet: View {
    enum Mode {
        case add
        case edit(EventTypeDTO)
    }

    @ObservedObject var workoutStore: WorkoutStore
    let mode: Mode
    let onDismiss: () -> Void

    @State private var name = ""
    @State private var icon = "📝"
    @State private var color = DayLogEmojiPresets.cardColors[2]
    @State private var description = ""
    @State private var needNotes = false
    @State private var trackGraph = false
    @State private var reminderEnabled = false
    @State private var reminderTime = reminderDate(hour: 20, minute: 0)
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                EditorIdentitySection(
                    emojis: DayLogEmojiPresets.lifeLog,
                    icon: $icon,
                    name: $name,
                    namePlaceholder: "Event name",
                    subtitle: needNotes ? "Prompts for notes when logging" : "Quick one-tap logging"
                )

                Section("Details") {
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                    Toggle("Require notes when logging", isOn: $needNotes)
                    Toggle("Show graph in history", isOn: $trackGraph)
                }

                Section("Color") {
                    ColorSwatchPicker(selection: $color, colors: DayLogEmojiPresets.cardColors)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }

                EditorReminderSection(
                    enabled: $reminderEnabled,
                    reminderTime: $reminderTime,
                    activeDays: nil
                ) {
                    guard case .edit(let event) = mode else { return }
                    Task {
                        await saveReminderPreference(
                            enabled: reminderEnabled,
                            reminderTime: reminderTime,
                            for: event.id,
                            kind: .lifeLog,
                            workoutStore: workoutStore
                        )
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit event" : "New event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditing ? "Save" : "Add") { Task { await save() } }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
                if isEditing, case .edit(let event) = mode {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Delete event", role: .destructive) {
                            Task {
                                await workoutStore.deleteLifeLogEvent(event.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear { applyMode() }
    }

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private func applyMode() {
        guard case .edit(let event) = mode else { return }
        name = event.name
        icon = event.icon ?? "📝"
        color = event.color ?? DayLogEmojiPresets.cardColors[2]
        description = event.description ?? ""
        needNotes = event.needNotes == true
        trackGraph = event.trackGraph == true
        let pref = LogReminderPreferences.load(for: event.id, kind: .lifeLog)
        reminderEnabled = pref.enabled
        reminderTime = reminderDate(hour: pref.hour, minute: pref.minute)
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let itemID: UUID?
        switch mode {
        case .add:
            itemID = await workoutStore.createLifeLogEvent(
                name: trimmed,
                icon: icon,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: trimmedDescription.isEmpty ? nil : trimmedDescription
            )
        case .edit(let event):
            itemID = event.id
            await workoutStore.updateLifeLogEvent(
                event.id,
                name: trimmed,
                icon: icon,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: trimmedDescription.isEmpty ? nil : trimmedDescription
            )
        }
        if let itemID {
            await saveReminderPreference(
                enabled: reminderEnabled,
                reminderTime: reminderTime,
                for: itemID,
                kind: .lifeLog,
                workoutStore: workoutStore
            )
        }
        onDismiss()
    }
}

// MARK: - Logging sheets

struct FoodLogSheet: View {
    let item: FoodItemDTO
    @ObservedObject var workoutStore: WorkoutStore
    let onDismiss: () -> Void

    @State private var quantity = 1.0
    @State private var isSaving = false

    private var existingEntry: FoodEntryDTO? { workoutStore.foodEntries[item.id] }
    private var macros: MacroTotals { MacroCalculations.macros(for: item, quantity: quantity) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    EditorHeroHeader(
                        emoji: item.icon ?? "🍽️",
                        title: item.name,
                        subtitle: existingEntry == nil ? "Log for today" : "Update today's log"
                    )
                    .listRowBackground(Color.clear)
                }

                Section {
                    QuantityStepperCard(
                        value: $quantity,
                        unit: item.unit ?? "serving",
                        range: 0.25...50,
                        step: item.logDirectly == true ? 1 : 0.25
                    )
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(DayLogUnitPresets.foodQuantities, id: \.self) { preset in
                                Button {
                                    quantity = preset
                                } label: {
                                    Text(formattedQuantity(preset))
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(quantity == preset ? .white : .primary)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 10)
                                        .background(quantity == preset ? Color.orange : Color(.tertiarySystemFill))
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 8, trailing: 16))
                } header: {
                    Text("Quantity")
                }

                if (item.calories ?? 0) > 0 || (item.proteinG ?? 0) > 0 {
                    Section("This serving") {
                        LabeledContent("Protein") { Text("\(Int(macros.proteinG)) g").monospacedDigit() }
                        LabeledContent("Carbs") { Text("\(Int(macros.carbsG)) g").monospacedDigit() }
                        LabeledContent("Fat") { Text("\(Int(macros.fatG)) g").monospacedDigit() }
                        LabeledContent("Calories") { Text("\(Int(macros.calories))").monospacedDigit() }
                    }
                }
            }
            .navigationTitle("Log food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { Task { await save() } }
                        .disabled(isSaving)
                }
                if existingEntry != nil {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Remove log", role: .destructive) {
                            Task {
                                await workoutStore.toggleFood(item.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            quantity = existingEntry?.quantity ?? 1
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        await workoutStore.updateFoodQuantity(item.id, quantity: quantity)
        onDismiss()
    }
}

struct HabitLogSheet: View {
    let habit: TrackableDTO
    @ObservedObject var workoutStore: WorkoutStore
    let onDismiss: () -> Void

    @State private var value = 1.0
    @State private var isSaving = false

    private var existing: TrackingEntryDTO? { workoutStore.trackingEntries[habit.id] }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    EditorHeroHeader(
                        emoji: habit.icon ?? "✓",
                        title: habit.name,
                        subtitle: habit.valueUnit
                    )
                    .listRowBackground(Color.clear)
                }

                Section {
                    QuantityStepperCard(
                        value: $value,
                        unit: habit.valueUnit ?? "count",
                        range: 0...999,
                        step: 1
                    )
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Log habit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { Task { await save() } }.disabled(isSaving)
                }
                if existing?.isCompleted == true {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Clear log", role: .destructive) {
                            Task {
                                await workoutStore.toggleHabit(habit.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear { value = existing?.value ?? 1 }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        await workoutStore.setHabitValue(habit.id, value: value)
        onDismiss()
    }
}

struct LifeLogEntrySheet: View {
    let event: EventTypeDTO
    var existingLog: EventLogDTO?
    @ObservedObject var workoutStore: WorkoutStore
    let onDismiss: () -> Void

    @State private var notes = ""
    @State private var cost = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    EditorHeroHeader(
                        emoji: event.icon ?? "📝",
                        title: event.name,
                        subtitle: existingLog == nil ? "Log for today" : "Edit entry"
                    )
                    .listRowBackground(Color.clear)
                }

                if event.needNotes == true {
                    Section("Notes") {
                        TextField("What happened?", text: $notes, axis: .vertical)
                            .lineLimit(3...8)
                    }
                } else {
                    Section {
                        TextField("Notes (optional)", text: $notes, axis: .vertical)
                            .lineLimit(2...6)
                    }
                }

                Section("Cost (optional)") {
                    TextField("Amount", text: $cost)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle(existingLog == nil ? "Log event" : "Edit log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(existingLog == nil ? "Log" : "Save") { Task { await save() } }
                        .disabled(isSaving || (event.needNotes == true && notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            notes = existingLog?.notes ?? ""
            if let existingCost = existingLog?.cost {
                cost = existingCost.truncatingRemainder(dividingBy: 1) == 0
                    ? String(Int(existingCost))
                    : String(existingCost)
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedCost = cost.trimmingCharacters(in: .whitespacesAndNewlines)
        if let existingLog {
            await workoutStore.updateLifeLogEntry(
                existingLog.id,
                eventTypeID: event.id,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                cost: trimmedCost.isEmpty ? nil : Double(trimmedCost),
                date: existingLog.date
            )
        } else {
            await workoutStore.logLifeLog(
                event.id,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                cost: trimmedCost.isEmpty ? nil : Double(trimmedCost)
            )
        }
        HapticFeedback.success()
        onDismiss()
    }
}

// MARK: - Checklist editors

struct ChecklistCardEditorSheet: View {
    enum Mode {
        case add
        case edit(StepCardDTO)
    }

    @ObservedObject var workoutStore: WorkoutStore
    let mode: Mode
    let onDismiss: () -> Void

    @State private var name = ""
    @State private var icon = "📋"
    @State private var color = "#3b82f6"
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                EditorIdentitySection(
                    emojis: DayLogEmojiPresets.checklists,
                    icon: $icon,
                    name: $name,
                    namePlaceholder: "Checklist name",
                    subtitle: "\(stepCount) steps"
                )

                Section("Accent color") {
                    ColorSwatchPicker(selection: $color, colors: DayLogEmojiPresets.cardColors)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }
            }
            .navigationTitle(isEditing ? "Edit checklist" : "New checklist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditing ? "Save" : "Create") { Task { await save() } }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
                if isEditing, case .edit(let card) = mode {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Delete checklist", role: .destructive) {
                            Task {
                                await workoutStore.deleteStepCard(card.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear { applyMode() }
    }

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private var stepCount: Int {
        if case .edit(let card) = mode { return card.items.count }
        return 0
    }

    private func applyMode() {
        guard case .edit(let card) = mode else { return }
        name = card.name
        icon = card.icon ?? "📋"
        color = card.color ?? "#3b82f6"
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        switch mode {
        case .add:
            await workoutStore.createStepCard(name: trimmed, icon: icon, color: color)
        case .edit(let card):
            await workoutStore.updateStepCard(card.id, name: trimmed, icon: icon, color: color)
        }
        onDismiss()
    }
}

struct ChecklistStepEditorSheet: View {
    let cardID: UUID
    let step: StepItemDTO?
    @ObservedObject var workoutStore: WorkoutStore
    let onDismiss: () -> Void

    @State private var text = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Step") {
                    TextField("What to do", text: $text, axis: .vertical)
                        .lineLimit(2...6)
                }
            }
            .navigationTitle(step == nil ? "New step" : "Edit step")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel", action: onDismiss) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { Task { await save() } }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
                if let step {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Delete step", role: .destructive) {
                            Task {
                                await workoutStore.deleteStepItem(cardID: cardID, itemID: step.id)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear {
            text = step?.text ?? ""
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let step {
            await workoutStore.updateStepItem(cardID: cardID, itemID: step.id, text: trimmed)
        } else {
            await workoutStore.addStepItem(cardID: cardID, text: trimmed)
        }
        onDismiss()
    }
}
