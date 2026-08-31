import SwiftUI

private enum TodayPage: String, CaseIterable, Hashable {
    case log = "Log"
    case lifeLog = "Life log"
    case history = "History"
}

struct TodayView: View {
    @ObservedObject var authStore: NativeAuthStore
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var selectedTab: String
    @State private var selectedSplit = 0
    @State private var showFinishConfirm = false
    @State private var navigateToWorkout = false
    @State private var todayPage: TodayPage = .log
    @State private var foodQuantityTarget: FoodItemDTO?
    @State private var habitValueTarget: TrackableDTO?
    @State private var lifeLogTarget: EventTypeDTO?
    @State private var showAddHabit = false
    @State private var isStartingWorkout = false
    @State private var chosenSplitIndex: Int?
    @State private var showResetWorkoutConfirm = false

    private var splits: [NativeSplit] { workoutStore.displaySplits }
    private var split: NativeSplit {
        guard splits.indices.contains(selectedSplit) else {
            return splits.first ?? NativeSplit.preview[0]
        }
        return splits[selectedSplit]
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 16) {
                    dateStrip
                    if authStore.sessionExpired { sessionExpiredBanner }
                    if let message = workoutStore.mutationError { errorBanner(message) }
                    todayPageIndicator
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 12)

                NativeHorizontalPageView(selection: $todayPage, pages: TodayPage.allCases) { page in
                    switch page {
                    case .log:
                        ScrollView {
                            VStack(spacing: 28) {
                                workoutSection
                                habitsSection
                                foodSection
                            }
                            .padding(.horizontal, 20)
                        }
                    case .lifeLog:
                        ScrollView {
                            lifeLogSection
                                .padding(.horizontal, 20)
                        }
                    case .history:
                        ScrollView {
                            HomeWorkoutHistorySection(workoutStore: workoutStore, selectedTab: $selectedTab)
                                .padding(.horizontal, 20)
                        }
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
            .toolbarBackground(.hidden, for: .navigationBar)
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $navigateToWorkout) {
                WorkoutSessionView(workoutStore: workoutStore, selectedSplit: $selectedSplit)
            }
            .confirmationDialog("Mark workout done?", isPresented: $showFinishConfirm, titleVisibility: .visible) {
                Button("Mark done", role: .destructive) {
                    Task { await workoutStore.completeActiveWorkout() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This completes today's workout session.")
            }
            .onChange(of: splits.count) { _, count in
                if selectedSplit >= count { selectedSplit = max(0, count - 1) }
            }
            .onChange(of: workoutStore.viewingDate) { _, _ in
                syncSelectedSplitWithSession()
            }
            .onAppear {
                syncSelectedSplitWithSession()
            }
            .sheet(item: $foodQuantityTarget) { item in
                FoodLogSheet(item: item, workoutStore: workoutStore) { foodQuantityTarget = nil }
            }
            .sheet(item: $habitValueTarget) { habit in
                HabitLogSheet(habit: habit, workoutStore: workoutStore) { habitValueTarget = nil }
            }
            .sheet(item: $lifeLogTarget) { event in
                LifeLogEntrySheet(event: event, workoutStore: workoutStore) { lifeLogTarget = nil }
            }
            .sheet(isPresented: $showAddHabit) {
                HabitEditorSheet(workoutStore: workoutStore, mode: .add) { showAddHabit = false }
            }
        }
    }

    private var todayPageIndicator: some View {
        HStack(spacing: 0) {
            ForEach(TodayPage.allCases, id: \.self) { page in
                Button {
                    todayPage = page
                } label: {
                    Text(page.rawValue)
                        .font(.subheadline.weight(todayPage == page ? .semibold : .regular))
                        .foregroundStyle(todayPage == page ? Color.primary : Color.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            todayPage == page
                                ? Color(.tertiarySystemFill)
                                : Color.clear
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
        }
        .animation(nil, value: todayPage)
    }

    private func syncSelectedSplitWithSession() {
        let session = workoutStore.activeSession ?? workoutStore.viewingCompletedSession
        guard let routineID = session?.routineID,
              let index = splits.firstIndex(where: { $0.id == routineID }) else { return }
        selectedSplit = index
    }

    private func openWorkout() async {
        guard !isStartingWorkout else { return }
        isStartingWorkout = true
        defer { isStartingWorkout = false }

        if workoutStore.activeSession != nil || workoutStore.viewingCompletedSession != nil {
            navigateToWorkout = true
            return
        }
        let ok = await workoutStore.ensureSessionForRoutine(
            routineID: split.id,
            routineName: split.name
        )
        if ok { navigateToWorkout = true }
    }

    private func startSplit(at index: Int) {
        withAnimation(.snappy) {
            chosenSplitIndex = index
            selectedSplit = index
        }
        HapticFeedback.select()
    }

    private func resetSplitChoice() {
        withAnimation(.snappy) {
            chosenSplitIndex = nil
        }
        HapticFeedback.light()
    }

    private var dateStrip: some View {
        HorizontalDateStripView(
            today: WorkoutDate.todayString(),
            selectedDate: workoutStore.viewingDate,
            workoutLoggedDates: workoutStore.workoutLoggedDates,
            onSelectDate: { date in
                workoutStore.selectViewingDate(date)
            }
        )
    }

    private var workoutSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .firstTextBaseline) {
                sectionLabel("Workout")
                Spacer(minLength: 8)
                if workoutStore.activeSession != nil || workoutStore.viewingCompletedSession != nil,
                   !splits.isEmpty {
                    Text("\(split.exercises.count) exercises")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if workoutStore.activeSession != nil {
                workoutStatusCard(
                    icon: "flame.fill",
                    iconColor: .orange,
                    title: "In progress",
                    subtitle: "\(split.logged) of \(split.exercises.count) exercises logged",
                    progress: split.progress,
                    progressColor: split.color
                ) {
                    navigateToWorkout = true
                }
            } else if workoutStore.viewingCompletedSession != nil {
                workoutStatusCard(
                    icon: "checkmark.circle.fill",
                    iconColor: .green,
                    title: "Completed",
                    subtitle: "Tap to review or edit today's session",
                    progress: 1,
                    progressColor: .green
                ) {
                    navigateToWorkout = true
                }

                if workoutStore.isViewingToday {
                    Button {
                        Task { await workoutStore.reopenViewingDateWorkout() }
                    } label: {
                        Label("Resume logging", systemImage: "arrow.clockwise")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                    }
                    .buttonStyle(.bordered)
                    .tint(.orange)
                }
            }

            VStack(spacing: 10) {
                if workoutStore.activeSession != nil {
                    Button {
                        Task { await openWorkout() }
                    } label: {
                        Label("Continue workout", systemImage: "dumbbell.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)

                    Button {
                        showResetWorkoutConfirm = true
                    } label: {
                        Label("Change split", systemImage: "arrow.triangle.2.circlepath")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                    }
                    .buttonStyle(.bordered)
                    .tint(.secondary)
                } else if workoutStore.viewingCompletedSession == nil {
                    if splits.isEmpty {
                        workoutEmptySplitsCard
                    } else if let chosenSplitIndex, splits.indices.contains(chosenSplitIndex) {
                        chosenSplitPanel(for: splits[chosenSplitIndex])
                    } else {
                        splitPickerGrid
                    }
                }

                if workoutStore.activeSession != nil {
                    Button {
                        showFinishConfirm = true
                    } label: {
                        Label("Mark workout done", systemImage: "checkmark.circle.fill")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                    }
                    .buttonStyle(.bordered)
                    .tint(.green)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .confirmationDialog("Change split?", isPresented: $showResetWorkoutConfirm, titleVisibility: .visible) {
            Button("Reset & choose again", role: .destructive) {
                Task {
                    await workoutStore.resetWorkout()
                    resetSplitChoice()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This clears today's in-progress workout so you can pick a different split.")
        }
        .onChange(of: workoutStore.activeSession?.id) { _, newValue in
            if newValue == nil {
                resetSplitChoice()
            }
        }
    }

    private var workoutEmptySplitsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: "square.stack.3d.up")
                .font(.title2)
                .foregroundStyle(.orange)
            Text("No workout splits yet")
                .font(.headline)
            Text("Create Push, Pull, Legs, or any routine you follow.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            NavigationLink {
                RoutineEditorView(workoutStore: workoutStore)
            } label: {
                Label("Create your first split", systemImage: "plus.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.tertiarySystemFill))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var splitPickerGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose a split")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                spacing: 10
            ) {
                ForEach(Array(splits.enumerated()), id: \.element.id) { index, item in
                    splitOptionCard(item, index: index)
                }
            }
        }
    }

    private func splitOptionCard(_ item: NativeSplit, index: Int) -> some View {
        Button {
            startSplit(at: index)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Circle()
                        .fill(item.color)
                        .frame(width: 10, height: 10)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.tertiary)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text("\(item.exercises.count) exercises")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 96, alignment: .leading)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(item.color.opacity(0.22), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private func chosenSplitPanel(for item: NativeSplit) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(item.color.gradient)
                    .frame(width: 5, height: 52)

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.title3.weight(.semibold))
                    Text("\(item.exercises.count) exercises ready")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(item.color)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(item.color.opacity(0.35), lineWidth: 1.5)
            }

            Button {
                Task { await openWorkout() }
            } label: {
                HStack {
                    if isStartingWorkout {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Label("Start \(item.name)", systemImage: "play.fill")
                    }
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
            }
            .buttonStyle(.borderedProminent)
            .tint(item.color)
            .disabled(isStartingWorkout)

            Button {
                resetSplitChoice()
            } label: {
                Label("Choose different split", systemImage: "arrow.uturn.backward")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .tint(.secondary)
        }
    }

    private func workoutStatusCard(
        icon: String,
        iconColor: Color,
        title: String,
        subtitle: String,
        progress: Double,
        progressColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: icon)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(iconColor)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }

                ProgressView(value: min(max(progress, 0), 1))
                    .tint(progressColor)
            }
            .padding(14)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    private var lifeLogSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                sectionLabel("Life log · \(workoutStore.lifeLogCompletedCount)/\(workoutStore.eventTypes.count)")
                Spacer()
                NavigationLink {
                    LifeLogManageView(workoutStore: workoutStore)
                } label: {
                    Text("Manage")
                        .font(.caption.weight(.semibold))
                }
            }

            if workoutStore.eventTypes.isEmpty {
                Text("No life log events yet — tap Manage to add.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(workoutStore.eventTypes) { event in
                        lifeLogPill(event)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var habitsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Button {
                    showAddHabit = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.body)
                }
                sectionLabel("Habits · \(habitsCompletedCount)/\(visibleTrackables.count)")
                Spacer()
                NavigationLink {
                    ManageHabitsView(workoutStore: workoutStore)
                } label: {
                    Text("Manage")
                        .font(.caption.weight(.semibold))
                }
            }

            if visibleTrackables.isEmpty {
                Text("No habits scheduled for this day — tap Manage to add.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(visibleTrackables) { habit in
                        habitPill(habit)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var foodSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                sectionLabel("Food · \(workoutStore.foodLoggedCount) logged")
                Spacer()
                NavigationLink {
                    ManageFoodView(workoutStore: workoutStore)
                } label: {
                    Text("Manage")
                        .font(.caption.weight(.semibold))
                }
            }

            if workoutStore.foodItems.isEmpty {
                Text("No food items yet — tap Manage to add.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                if workoutStore.foodLoggedCount > 0 || workoutStore.macroTargets.calories > 0 {
                    MacroRingsRow(
                        totals: workoutStore.todayMacroTotals,
                        targets: workoutStore.macroTargets
                    )
                }

                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                    spacing: 10
                ) {
                    ForEach(workoutStore.foodItems) { item in
                        foodTile(item)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .tracking(0.6)
    }

    private var visibleTrackables: [TrackableDTO] {
        workoutStore.trackablesForViewingDate()
    }

    private var habitsCompletedCount: Int {
        visibleTrackables.filter { workoutStore.trackingEntries[$0.id]?.isCompleted == true }.count
    }

    private func lifeLogPill(_ event: EventTypeDTO) -> some View {
        let isLogged = workoutStore.lifeLog(for: event.id) != nil
        return Button {
            if isLogged {
                Task { await workoutStore.toggleLifeLog(event.id) }
            } else {
                lifeLogTarget = event
            }
        } label: {
            HStack(spacing: 6) {
                Text(event.icon ?? "📝")
                Text(event.name)
                    .lineLimit(1)
                if isLogged {
                    Text("Logged")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.green)
                }
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isLogged ? Color.blue.opacity(0.16) : Color(.tertiarySystemFill))
            .foregroundStyle(isLogged ? .blue : .primary)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(isLogged ? Color.blue.opacity(0.35) : Color.clear, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func habitPill(_ habit: TrackableDTO) -> some View {
        let isDone = workoutStore.trackingEntries[habit.id]?.isCompleted == true
        let value = workoutStore.trackingEntries[habit.id]?.value
        return Button {
            if habit.hasValue == true {
                habitValueTarget = habit
            } else {
                Task { await workoutStore.toggleHabit(habit.id) }
            }
        } label: {
            HStack(spacing: 6) {
                Text(habit.icon ?? "✓")
                Text(habit.name)
                    .lineLimit(1)
                if let value, isDone {
                    Text("\(formatValue(value))\(habit.valueUnit.map { " \($0)" } ?? "")")
                        .font(.caption.weight(.semibold))
                }
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isDone ? Color.green.opacity(0.18) : Color(.tertiarySystemFill))
            .foregroundStyle(isDone ? .green : .primary)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(isDone ? Color.green.opacity(0.35) : Color.clear, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func foodTile(_ item: FoodItemDTO) -> some View {
        let entry = workoutStore.foodEntries[item.id]
        let isLogged = entry != nil
        return Button {
            if item.logDirectly == true && !isLogged {
                Task { await workoutStore.toggleFood(item.id) }
            } else if isLogged && item.logDirectly == true {
                Task { await workoutStore.toggleFood(item.id) }
            } else {
                foodQuantityTarget = item
            }
        } label: {
            HStack(spacing: 10) {
                Text(item.icon ?? "🍽️").font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    if isLogged, let qty = entry?.quantity {
                        Text("Logged · \(formatValue(qty))")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    } else {
                        Text("Tap to log")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(12)
            .background(isLogged ? Color.green.opacity(0.1) : Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func formatValue(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(value)) : String(format: "%.1f", value)
    }

    @ViewBuilder
    private var sessionExpiredBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text("Session expired — sign in again in Settings.")
                .font(.footnote)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(message).font(.footnote).foregroundStyle(.red)
            Spacer(minLength: 0)
            Button("Dismiss") { workoutStore.clearMutationError() }
                .font(.caption.weight(.semibold))
        }
        .padding(12)
        .background(Color.red.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

/// Simple wrapping layout for habit pills.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
    }
}
