import Charts
import SwiftUI

private struct BodyWeightPoint: Identifiable {
    let id: String
    let entryID: UUID?
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
    @Binding var selectedTab: String
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
    @State private var showBodyWeightLog = false
    @State private var selectedActivityDate: HistoryDaySheetDate?
    @AppStorage("body_weight_goal") private var goalWeight: Double = 0

    private let bodyWeightAccent = Color(red: 0.22, green: 0.86, blue: 0.42)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ActivityHeatmapView(
                        activeDates: workoutStore.workoutLoggedDates,
                        title: "Workout activity",
                        selectedDate: selectedActivityDate?.date,
                        onDateSelected: { date in
                            selectedActivityDate = HistoryDaySheetDate(date: date)
                            HapticFeedback.light()
                        }
                    )
                    workoutTrendSection
                    progressiveOverloadSection
                    bodyWeightSection
                    recentHistorySection
                    exportSection
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .task {
                if workoutStore.historyGroups.isEmpty {
                    await workoutStore.loadHistory()
                }
                await loadBodyWeightHistory()
            }
            .blockingLoadingOverlay(
                workoutStore.isLoadingHistory && workoutStore.exerciseOverloadPoints.isEmpty,
                message: "Loading dashboard…"
            )
            .sheet(item: $selectedActivityDate) { selection in
                HistoryDayLogsSheet(
                    date: selection.date,
                    workoutStore: workoutStore,
                    selectedTab: $selectedTab
                )
            }
            .sheet(item: $exportDocument) { document in
                ShareSheet(items: [document.url])
            }
            .sheet(isPresented: $showBodyWeightLog) {
                BodyWeightLogSheet(
                    workoutStore: workoutStore,
                    recentEntries: bodyWeightHistory.compactMap { point in
                        guard let entryID = point.entryID else { return nil }
                        return BodyWeightHistoryEntry(
                            id: entryID,
                            date: point.id,
                            value: point.value,
                            dateLabel: point.dateLabel
                        )
                    },
                    onDismiss: {
                        showBodyWeightLog = false
                        Task { await loadBodyWeightHistory() }
                    },
                    onChanged: {
                        Task { await loadBodyWeightHistory() }
                    }
                )
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
                entryID: row.id,
                date: date,
                dateLabel: WorkoutDate.displayLabel(for: row.date),
                value: row.value
            )
        }
        .sorted { $0.date < $1.date }
        isLoadingBodyWeight = false
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

                    CollapsiblePillRow(
                        items: exercises,
                        selected: selectedOverloadExercise,
                        collapsedLimit: 5
                    ) { name in
                        selectedOverloadExercise = name
                        selectedOverloadDate = nil
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
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .center, spacing: 8) {
                    Text("Body weight")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Spacer(minLength: 8)
                    if goalWeight > 0 {
                        Label {
                            Text(formattedBodyWeight(goalWeight))
                                .font(.caption.weight(.semibold))
                        } icon: {
                            Image(systemName: "target")
                                .font(.caption)
                        }
                        .foregroundStyle(.yellow)
                    }
                    Button {
                        showBodyWeightLog = true
                    } label: {
                        Label("Log", systemImage: "plus")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(bodyWeightAccent)
                    }
                    .buttonStyle(.plain)
                }

                if isLoadingBodyWeight {
                    HStack(spacing: 8) {
                        NativeActivityIndicator()
                        Text("Loading…")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else if bodyWeightHistory.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("—")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(.secondary)
                        Text("Tap Log to record your first weigh-in.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } else if let latest = bodyWeightHistory.last {
                    HStack(alignment: .firstTextBaseline) {
                        Text(WorkoutCalculations.formatWeight(latest.value, unit: workoutStore.weightUnit))
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .monospacedDigit()
                        Spacer()
                        Text(latest.dateLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if goalWeight > 0 {
                        goalSubtitle(current: latest.value)
                    }

                    bodyWeightChart
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    @ViewBuilder
    private var bodyWeightChart: some View {
        let yDomain = bodyWeightYDomain
        let selectedPoint = isBodyWeightChartActive
            ? selectedChartPoint(in: bodyWeightHistory, date: selectedBodyWeightDate)
            : nil

        Chart {
            if goalWeight > 0 {
                RuleMark(y: .value("Goal", goalWeight))
                    .foregroundStyle(Color.yellow.opacity(0.85))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                    .annotation(position: .top, alignment: .trailing) {
                        Text(formattedBodyWeight(goalWeight))
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.yellow)
                    }
            }

            ForEach(bodyWeightHistory) { point in
                AreaMark(
                    x: .value("Date", point.date),
                    yStart: .value("Baseline", yDomain.lowerBound),
                    yEnd: .value("Weight", point.value)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [bodyWeightAccent.opacity(0.28), bodyWeightAccent.opacity(0.03)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .interpolationMethod(.linear)

                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Weight", point.value)
                )
                .foregroundStyle(bodyWeightAccent)
                .lineStyle(StrokeStyle(lineWidth: 3))

                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Weight", point.value)
                )
                .foregroundStyle(bodyWeightAccent)
                .symbolSize(selectedPoint?.id == point.id ? 110 : 44)
            }

            if let selectedPoint {
                RuleMark(x: .value("Date", selectedPoint.date))
                    .foregroundStyle(bodyWeightAccent.opacity(0.45))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            }
        }
        .chartDateScrubTooltip(
            selectedDate: $selectedBodyWeightDate,
            isActive: $isBodyWeightChartActive,
            dates: bodyWeightHistory.map(\.date),
            accent: bodyWeightAccent,
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
                    accent: bodyWeightAccent
                )
            }
        )
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
                AxisValueLabel {
                    if let weight = value.as(Double.self) {
                        Text(WorkoutCalculations.formatWeight(weight, unit: workoutStore.weightUnit))
                    }
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: min(bodyWeightHistory.count, 5))) { _ in
                AxisValueLabel(format: .dateTime.month(.abbreviated).day())
            }
        }
        .chartYScale(domain: yDomain)
        .frame(height: 180)
        .padding(.top, 4)
    }

    @ViewBuilder
    private func goalSubtitle(current: Double) -> some View {
        let delta = goalWeight - current
        let formattedDelta = WorkoutCalculations.formatWeight(abs(delta), unit: workoutStore.weightUnit)
        let direction = delta > 0 ? "to gain" : delta < 0 ? "to lose" : "at goal"
        HStack(spacing: 6) {
            Image(systemName: "target")
                .font(.caption)
            Text("Goal \(formattedBodyWeight(goalWeight)) · \(formattedDelta) \(direction)")
                .font(.caption.weight(.semibold))
        }
        .foregroundStyle(.yellow)
    }

    private func formattedBodyWeight(_ value: Double) -> String {
        WorkoutCalculations.formatWeight(value, unit: workoutStore.weightUnit)
    }

    private var bodyWeightYDomain: ClosedRange<Double> {
        var values = bodyWeightHistory.map(\.value)
        if goalWeight > 0 { values.append(goalWeight) }
        guard let minWeight = values.min(),
              let maxWeight = values.max() else {
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

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
