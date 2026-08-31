import Charts
import SwiftUI

private struct BodyWeightPoint: Identifiable {
    let id: String
    let date: Date
    let dateLabel: String
    let value: Double
}

private struct ExportDocument: Identifiable {
    let id = UUID()
    let url: URL
}

struct WorkoutProgressView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var bodyWeightHistory: [BodyWeightPoint] = []
    @State private var isLoadingBodyWeight = false
    @State private var exportDocument: ExportDocument?
    @State private var exportError: String?
    @State private var selectedOverloadArea: String?
    @State private var selectedOverloadExercise: String?
    @State private var selectedOverloadDate: Date?
    @State private var selectedBodyWeightDate: Date?
    @State private var selectedWeekLabel: String?
    @State private var isOverloadChartActive = false
    @State private var isBodyWeightChartActive = false
    @State private var isWeekChartActive = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statsSection
                    macroSection
                    ActivityHeatmapView(activeDates: workoutStore.workoutLoggedDates, title: "Workout activity")
                    workoutTrendSection
                    progressiveOverloadSection
                    bodyWeightSection
                    recentHistorySection
                    exportSection
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .task {
                if workoutStore.historyGroups.isEmpty {
                    await workoutStore.loadHistory()
                }
                await loadBodyWeightHistory()
                if workoutStore.foodHistoryDates.isEmpty {
                    await workoutStore.loadFoodAndLifeLogHistory()
                }
            }
            .blockingLoadingOverlay(
                workoutStore.isLoadingHistory && workoutStore.exerciseOverloadPoints.isEmpty,
                message: "Loading dashboard…"
            )
            .sheet(item: $exportDocument) { document in
                ShareSheet(items: [document.url])
            }
            .alert("Export failed", isPresented: Binding(
                get: { exportError != nil },
                set: { if !$0 { exportError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(exportError ?? "")
            }
        }
    }

    private func loadBodyWeightHistory() async {
        isLoadingBodyWeight = true
        let rows = await workoutStore.fetchBodyWeightHistory()
        bodyWeightHistory = rows.compactMap { row in
            guard let date = WorkoutDate.date(from: row.date) else { return nil }
            return BodyWeightPoint(
                id: row.date,
                date: date,
                dateLabel: WorkoutDate.displayLabel(for: row.date),
                value: row.value
            )
        }
        .sorted { $0.date < $1.date }
        isLoadingBodyWeight = false
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Overview").font(.title3.bold())
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ProgressStatCard(
                    value: "\(workoutStore.profileStats.workoutStreak)",
                    label: "Day streak",
                    icon: "flame.fill"
                )
                ProgressStatCard(
                    value: "\(workoutStore.profileStats.workoutsThisMonth)",
                    label: "This month",
                    icon: "calendar"
                )
                ProgressStatCard(
                    value: "\(workoutStore.profileStats.weeklyWorkouts)",
                    label: "This week",
                    icon: "figure.strengthtraining.traditional"
                )
                ProgressStatCard(
                    value: "\(workoutStore.profileStats.personalBestCount)",
                    label: "Personal bests",
                    icon: "trophy.fill"
                )
            }
        }
    }

    private var macroSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's macros").font(.title3.bold())
                Spacer()
                NavigationLink("Planner") {
                    MacroPlannerView(workoutStore: workoutStore)
                }
                .font(.subheadline.weight(.semibold))
            }
            MacroRingsRow(totals: workoutStore.todayMacroTotals, targets: workoutStore.macroTargets)
                .padding(14)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private var workoutTrendSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weekly workouts").font(.title3.bold())
            if workoutStore.workoutTrend.allSatisfy({ $0.count == 0 }) {
                Text("Complete workouts to see your weekly trend.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                Chart(workoutStore.workoutTrend) { point in
                    BarMark(
                        x: .value("Week", point.label),
                        y: .value("Workouts", point.count)
                    )
                    .foregroundStyle(
                        (isWeekChartActive && selectedWeekLabel == point.label ? Color.orange : Color.orange.opacity(0.55)).gradient
                    )
                    .cornerRadius(4)
                }
                .chartCategoryScrubTooltip(
                    selectedLabel: $selectedWeekLabel,
                    isActive: $isWeekChartActive,
                    labels: workoutStore.workoutTrend.map(\.label),
                    yValue: { label in
                        Double(workoutStore.workoutTrend.first(where: { $0.label == label })?.count ?? 0)
                    },
                    tooltip: { label in
                        let count = workoutStore.workoutTrend.first(where: { $0.label == label })?.count ?? 0
                        return ChartTooltipBadge(
                            title: label,
                            value: count == 1 ? "1 workout" : "\(count) workouts",
                            accent: .orange
                        )
                    }
                )
                .chartYAxisLabel("Workouts")
                .frame(height: 220)
                .padding(14)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private var progressiveOverloadSection: some View {
        let areaCounts = overloadAreaCounts
        let exercises = filteredOverloadExercises
        let chartPoints = selectedOverloadChartPoints

        return VStack(alignment: .leading, spacing: 12) {
            Text("Progressive overload").font(.title3.bold())
            Text("Top weight per session for one exercise at a time.")
                .font(.caption)
                .foregroundStyle(.secondary)

            if areaCounts.isEmpty {
                Text("Complete workouts to track strength progress over time.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                Text("Muscle group")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)

                FlowLayout(spacing: 8) {
                    areaFilterPill(title: "All", isSelected: selectedOverloadArea == nil) {
                        selectedOverloadArea = nil
                        selectedOverloadExercise = defaultExercise(for: nil)
                    }
                    ForEach(ExerciseAreaGroups.order.filter { areaCounts[$0, default: 0] > 0 }, id: \.self) { area in
                        areaFilterPill(
                            title: ExerciseAreaGroups.labels[area] ?? area.capitalized,
                            isSelected: selectedOverloadArea == area
                        ) {
                            selectedOverloadArea = area
                            selectedOverloadExercise = defaultExercise(for: area)
                        }
                    }
                }

                if let selectedOverloadExercise, !chartPoints.isEmpty {
                    let selectedPoint = isOverloadChartActive
                        ? selectedChartPoint(in: chartPoints, date: selectedOverloadDate)
                        : nil

                    Chart {
                        ForEach(chartPoints) { point in
                            LineMark(
                                x: .value("Date", point.chartDate),
                                y: .value("Weight", point.topWeight)
                            )
                            .foregroundStyle(Color.orange.gradient)
                            .lineStyle(StrokeStyle(lineWidth: 3))

                            PointMark(
                                x: .value("Date", point.chartDate),
                                y: .value("Weight", point.topWeight)
                            )
                            .foregroundStyle(Color.orange)
                            .symbolSize(selectedPoint?.id == point.id ? 100 : 36)
                        }

                        if let selectedPoint {
                            RuleMark(x: .value("Date", selectedPoint.chartDate))
                                .foregroundStyle(Color.orange.opacity(0.45))
                                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                        }
                    }
                    .chartDateScrubTooltip(
                        selectedDate: $selectedOverloadDate,
                        isActive: $isOverloadChartActive,
                        dates: chartPoints.map(\.chartDate),
                        accent: .orange,
                        yValue: { date in
                            selectedChartPoint(in: chartPoints, date: date)?.topWeight ?? 0
                        },
                        tooltip: { date in
                            let point = selectedChartPoint(in: chartPoints, date: date)
                            return ChartTooltipBadge(
                                title: point?.dateLabel ?? "",
                                value: point.map {
                                    "\(WorkoutCalculations.formatWeight($0.topWeight, unit: workoutStore.weightUnit)) × \($0.topReps) reps"
                                } ?? "",
                                accent: .orange
                            )
                        }
                    )
                    .chartYAxisLabel(workoutStore.weightUnit.rawValue)
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: min(chartPoints.count, 5))) { value in
                            AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
                            AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        }
                    }
                    .chartYAxis {
                        AxisMarks(position: .leading) { value in
                            AxisGridLine()
                            AxisValueLabel {
                                if let weight = value.as(Double.self) {
                                    Text(WorkoutCalculations.formatWeight(weight, unit: workoutStore.weightUnit))
                                }
                            }
                        }
                    }
                    .chartYScale(domain: overloadYDomain(for: chartPoints))
                    .frame(height: 240)

                    if let latest = chartPoints.last {
                        Text("Latest: \(WorkoutCalculations.formatWeight(latest.topWeight, unit: workoutStore.weightUnit)) × \(latest.topReps) · \(latest.dateLabel)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.orange)
                    }
                } else {
                    Text("Choose an exercise below.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                }

                if !exercises.isEmpty {
                    Text("Exercise")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    FlowLayout(spacing: 8) {
                        ForEach(exercises, id: \.self) { name in
                            let isSelected = selectedOverloadExercise == name
                            Button {
                                selectedOverloadExercise = name
                                selectedOverloadDate = nil
                            } label: {
                                Text(name)
                                    .font(.caption.weight(.semibold))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color.orange : Color(.tertiarySystemFill))
                                    .foregroundStyle(isSelected ? .white : .primary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onAppear {
            if selectedOverloadExercise == nil {
                selectedOverloadExercise = defaultExercise(for: selectedOverloadArea)
            }
        }
        .onChange(of: workoutStore.exerciseOverloadPoints.count) { _, _ in
            if selectedOverloadExercise == nil
                || !filteredOverloadExercises.contains(selectedOverloadExercise ?? "") {
                selectedOverloadExercise = defaultExercise(for: selectedOverloadArea)
                selectedOverloadDate = nil
            }
        }
        .onChange(of: selectedOverloadArea) { _, _ in
            selectedOverloadDate = nil
        }
    }

    private func selectedChartPoint<T: Identifiable>(
        in points: [T],
        date: Date?,
        chartDate: KeyPath<T, Date>
    ) -> T? {
        guard let date else { return nil }
        return points.min { lhs, rhs in
            abs(lhs[keyPath: chartDate].timeIntervalSince(date))
                < abs(rhs[keyPath: chartDate].timeIntervalSince(date))
        }
    }

    private func selectedChartPoint(in points: [OverloadChartPoint], date: Date?) -> OverloadChartPoint? {
        selectedChartPoint(in: points, date: date, chartDate: \.chartDate)
    }

    private func selectedChartPoint(in points: [BodyWeightPoint], date: Date?) -> BodyWeightPoint? {
        selectedChartPoint(in: points, date: date, chartDate: \.date)
    }

    private struct OverloadChartPoint: Identifiable {
        let id: String
        let chartDate: Date
        let dateLabel: String
        let topWeight: Double
        let topReps: Int
    }

    private var overloadAreaCounts: [String: Int] {
        Dictionary(
            grouping: workoutStore.exerciseOverloadPoints,
            by: \.areaCategory
        )
        .mapValues { Set($0.map(\.exerciseName)).count }
    }

    private var filteredOverloadExercises: [String] {
        let points = workoutStore.exerciseOverloadPoints
        let scoped = selectedOverloadArea.map { area in
            points.filter { $0.areaCategory == area }
        } ?? points

        return Array(Set(scoped.map(\.exerciseName)))
            .sorted { lhs, rhs in
                let lhsCount = scoped.filter { $0.exerciseName == lhs }.count
                let rhsCount = scoped.filter { $0.exerciseName == rhs }.count
                if lhsCount == rhsCount { return lhs.localizedCaseInsensitiveCompare(rhs) == .orderedAscending }
                return lhsCount > rhsCount
            }
    }

    private var selectedOverloadChartPoints: [OverloadChartPoint] {
        guard let exercise = selectedOverloadExercise else { return [] }
        return workoutStore.exerciseOverloadPoints
            .filter { $0.exerciseName == exercise }
            .compactMap { point in
                guard let date = WorkoutDate.date(from: point.date) else { return nil }
                return OverloadChartPoint(
                    id: point.id,
                    chartDate: date,
                    dateLabel: WorkoutDate.displayLabel(for: point.date),
                    topWeight: point.topWeight,
                    topReps: point.topReps
                )
            }
            .sorted { $0.chartDate < $1.chartDate }
    }

    private func defaultExercise(for area: String?) -> String? {
        let points = workoutStore.exerciseOverloadPoints
        let scoped = area.map { selected in points.filter { $0.areaCategory == selected } } ?? points
        return Array(Set(scoped.map(\.exerciseName)))
            .sorted { lhs, rhs in
                let lhsCount = scoped.filter { $0.exerciseName == lhs }.count
                let rhsCount = scoped.filter { $0.exerciseName == rhs }.count
                if lhsCount == rhsCount { return lhs.localizedCaseInsensitiveCompare(rhs) == .orderedAscending }
                return lhsCount > rhsCount
            }
            .first
    }

    private func overloadYDomain(for points: [OverloadChartPoint]) -> ClosedRange<Double> {
        guard let minWeight = points.map(\.topWeight).min(),
              let maxWeight = points.map(\.topWeight).max() else {
            return 0...100
        }
        if minWeight == maxWeight {
            let padding = max(2.5, minWeight * 0.05)
            return max(0, minWeight - padding)...(maxWeight + padding)
        }
        let padding = max(2.5, (maxWeight - minWeight) * 0.12)
        return max(0, minWeight - padding)...(maxWeight + padding)
    }

    private func areaFilterPill(
        title: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color.orange : Color(.tertiarySystemFill))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var bodyWeightSection: some View {
        if workoutStore.bodyWeightTrackable != nil {
            VStack(alignment: .leading, spacing: 12) {
                Text("Body weight").font(.title3.bold())
                if isLoadingBodyWeight {
                    HStack(spacing: 8) {
                        NativeActivityIndicator()
                        Text("Loading…")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                } else if bodyWeightHistory.isEmpty {
                    Text("Log body weight from Today to see your trend.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    let yDomain = bodyWeightYDomain
                    let selectedPoint = isBodyWeightChartActive
                        ? selectedChartPoint(in: bodyWeightHistory, date: selectedBodyWeightDate)
                        : nil

                    Chart {
                        ForEach(bodyWeightHistory) { point in
                            AreaMark(
                                x: .value("Date", point.date),
                                yStart: .value("Baseline", yDomain.lowerBound),
                                yEnd: .value("Weight", point.value)
                            )
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.blue.opacity(0.28), Color.blue.opacity(0.04)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .interpolationMethod(.linear)

                            LineMark(
                                x: .value("Date", point.date),
                                y: .value("Weight", point.value)
                            )
                            .foregroundStyle(Color.blue)
                            .lineStyle(StrokeStyle(lineWidth: 3))

                            PointMark(
                                x: .value("Date", point.date),
                                y: .value("Weight", point.value)
                            )
                            .foregroundStyle(Color.blue)
                            .symbolSize(selectedPoint?.id == point.id ? 100 : 40)
                        }

                        if let selectedPoint {
                            RuleMark(x: .value("Date", selectedPoint.date))
                                .foregroundStyle(Color.blue.opacity(0.45))
                                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                        }
                    }
                    .chartDateScrubTooltip(
                        selectedDate: $selectedBodyWeightDate,
                        isActive: $isBodyWeightChartActive,
                        dates: bodyWeightHistory.map(\.date),
                        accent: .blue,
                        yValue: { date in
                            selectedChartPoint(in: bodyWeightHistory, date: date)?.value ?? 0
                        },
                        tooltip: { date in
                            let point = selectedChartPoint(in: bodyWeightHistory, date: date)
                            return ChartTooltipBadge(
                                title: point?.dateLabel ?? "",
                                value: point.map {
                                    WorkoutCalculations.formatWeight($0.value, unit: workoutStore.weightUnit)
                                } ?? "",
                                accent: .blue
                            )
                        }
                    )
                    .chartYAxisLabel(workoutStore.weightUnit.rawValue)
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: min(bodyWeightHistory.count, 6))) { _ in
                            AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
                            AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        }
                    }
                    .chartYAxis {
                        AxisMarks(position: .leading) { value in
                            AxisGridLine()
                            AxisValueLabel {
                                if let weight = value.as(Double.self) {
                                    Text(WorkoutCalculations.formatWeight(weight, unit: workoutStore.weightUnit))
                                }
                            }
                        }
                    }
                    .chartYScale(domain: yDomain)
                    .frame(height: 240)
                    .padding(14)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    if let latest = bodyWeightHistory.last {
                        Text("Latest: \(WorkoutCalculations.formatWeight(latest.value, unit: workoutStore.weightUnit)) · \(latest.dateLabel)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.blue)
                    }
                }
            }
        }
    }

    private var bodyWeightYDomain: ClosedRange<Double> {
        guard let minWeight = bodyWeightHistory.map(\.value).min(),
              let maxWeight = bodyWeightHistory.map(\.value).max() else {
            return 0...100
        }
        if minWeight == maxWeight {
            let padding = max(1, minWeight * 0.02)
            return max(0, minWeight - padding)...(maxWeight + padding)
        }
        let padding = max(1, (maxWeight - minWeight) * 0.15)
        return max(0, minWeight - padding)...(maxWeight + padding)
    }

    private var recentHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent workouts").font(.title3.bold())
            if workoutStore.historyGroups.isEmpty {
                Text("Complete workouts to see progress here.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(workoutStore.historyGroups.prefix(8)) { group in
                    ForEach(group.sessions.prefix(3)) { session in
                        NavigationLink {
                            HistorySessionDetailView(sessionID: session.id, workoutStore: workoutStore)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(session.routineName ?? "Workout")
                                        .font(.headline)
                                    Text(group.date)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("\(session.setCount) sets · \(session.exerciseCount) exercises")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.orange)
                                    .monospacedDigit()
                            }
                            .padding(12)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var exportSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Export").font(.title3.bold())
            Button {
                do {
                    exportDocument = ExportDocument(
                        url: try WorkoutHistoryPDFExporter.export(
                            groups: workoutStore.historyGroups,
                            weightUnit: workoutStore.weightUnit
                        )
                    )
                } catch {
                    exportError = error.localizedDescription
                }
            } label: {
                Label("Export workout history PDF", systemImage: "doc.richtext")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)
        }
    }
}

private struct ProgressStatCard: View {
    let value: String
    let label: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon).foregroundStyle(.orange)
            Text(value).font(.title3.bold().monospacedDigit())
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
