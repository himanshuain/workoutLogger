import SwiftUI

/// GitHub-style calendar heatmap showing workout days over time.
struct ActivityHeatmapView: View {
    let activeDates: Set<String>
    var weeks: Int = 26
    var activeColor: Color = .orange
    var title: String = "Workout activity"
    var selectedDate: String?
    var onDateSelected: ((String) -> Void)?

    private let cellSize: CGFloat = 13
    private let cellSpacing: CGFloat = 3
    private let weekdayColumnWidth: CGFloat = 18

    private var calendar: Calendar { Calendar.current }

    /// Weeks as columns, days as rows — aligned to calendar week boundaries.
    private var grid: [[String?]] {
        let today = calendar.startOfDay(for: Date())
        guard let rawStart = calendar.date(byAdding: .day, value: -(weeks * 7 - 1), to: today) else { return [] }

        let weekday = calendar.component(.weekday, from: rawStart)
        let firstWeekday = calendar.firstWeekday
        let daysFromWeekStart = (weekday - firstWeekday + 7) % 7
        guard let start = calendar.date(byAdding: .day, value: -daysFromWeekStart, to: rawStart) else { return [] }

        var days: [String?] = []
        var cursor = start
        while cursor <= today {
            days.append(WorkoutDate.string(from: cursor))
            cursor = calendar.date(byAdding: .day, value: 1, to: cursor) ?? cursor.addingTimeInterval(86400)
        }
        let pad = (7 - (days.count % 7)) % 7
        if pad > 0 { days.append(contentsOf: Array(repeating: nil, count: pad)) }

        return stride(from: 0, to: days.count, by: 7).map { index in
            Array(days[index..<min(index + 7, days.count)])
        }
    }

    private var monthLabelSpans: [(label: String, weekCount: Int)] {
        var spans: [(label: String, weekCount: Int)] = []
        var previousMonth: Int?
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"

        for week in grid {
            guard let firstDay = week.compactMap({ $0 }).first,
                  let date = WorkoutDate.date(from: firstDay) else {
                if var last = spans.popLast() {
                    last.weekCount += 1
                    spans.append(last)
                } else {
                    spans.append(("", 1))
                }
                continue
            }
            let month = calendar.component(.month, from: date)
            if month != previousMonth {
                spans.append((formatter.string(from: date), 1))
                previousMonth = month
            } else if var last = spans.popLast() {
                last.weekCount += 1
                spans.append(last)
            } else {
                spans.append(("", 1))
            }
        }
        return spans
    }

    private var activeInRange: Int {
        let allDays = grid.flatMap { $0 }.compactMap { $0 }
        return allDays.filter { activeDates.contains($0) }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3.bold())

            HStack(alignment: .top, spacing: 8) {
                weekdayLabelColumn

                ScrollViewReader { proxy in
                    ScrollView(.horizontal, showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 5) {
                            monthLabelRow

                            HStack(alignment: .top, spacing: cellSpacing) {
                                ForEach(Array(grid.enumerated()), id: \.offset) { weekIndex, week in
                                    VStack(spacing: cellSpacing) {
                                        ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                                            dayCell(for: day)
                                        }
                                    }
                                    .id(weekIndex)
                                }
                            }
                        }
                        .padding(.trailing, 4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .onAppear {
                        if let lastWeek = grid.indices.last {
                            proxy.scrollTo(lastWeek, anchor: .trailing)
                        }
                    }
                }
            }

            HStack {
                Text("\(activeInRange) workout days")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                heatmapLegend
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var weekdayLabelColumn: some View {
        VStack(spacing: cellSpacing) {
            Color.clear.frame(width: weekdayColumnWidth, height: 16)
            ForEach(0..<7, id: \.self) { row in
                Text(weekdayLabel(forRow: row))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: weekdayColumnWidth, height: cellSize, alignment: .trailing)
            }
        }
    }

    private var monthLabelRow: some View {
        HStack(alignment: .bottom, spacing: cellSpacing) {
            ForEach(Array(monthLabelSpans.enumerated()), id: \.offset) { _, span in
                let spanWidth = CGFloat(span.weekCount) * cellSize + CGFloat(max(0, span.weekCount - 1)) * cellSpacing
                Text(span.label)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: max(spanWidth, span.label.isEmpty ? cellSize : 0), height: 16, alignment: .leading)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
        }
    }

    private var heatmapLegend: some View {
        HStack(spacing: 4) {
            Text("Less")
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
            ForEach([0.0, 0.35, 0.7, 1.0], id: \.self) { level in
                RoundedRectangle(cornerRadius: 2)
                    .fill(legendColor(level: level))
                    .frame(width: 10, height: 10)
            }
            Text("More")
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
        }
    }

    private func legendColor(level: Double) -> Color {
        if level <= 0 { return Color(.tertiarySystemFill) }
        return activeColor.opacity(0.35 + level * 0.65)
    }

    private func weekdayLabel(forRow row: Int) -> String {
        let symbols = calendar.veryShortWeekdaySymbols
        let first = calendar.firstWeekday - 1
        let index = (first + row) % 7
        let symbol = symbols[index]
        // Show Mon / Wed / Fri only to save space
        switch index {
        case 1, 3, 5: return String(symbol.prefix(1))
        default: return " "
        }
    }

    private func color(for day: String?) -> Color {
        guard let day else { return Color.clear }
        return activeDates.contains(day) ? activeColor : Color(.tertiarySystemFill)
    }

    @ViewBuilder
    private func dayCell(for day: String?) -> some View {
        let cell = RoundedRectangle(cornerRadius: 3)
            .fill(color(for: day))
            .overlay {
                if let day, selectedDate == day {
                    RoundedRectangle(cornerRadius: 3)
                        .strokeBorder(Color.primary, lineWidth: 1.5)
                }
            }
            .frame(width: cellSize, height: cellSize)

        if let day, let onDateSelected {
            Button {
                onDateSelected(day)
            } label: {
                cell
            }
            .buttonStyle(.plain)
            .accessibilityLabel(accessibilityLabel(for: day))
            .accessibilityAddTraits(.isButton)
        } else {
            cell
                .accessibilityHidden(day == nil)
        }
    }

    private func accessibilityLabel(for day: String) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        let dateLabel = WorkoutDate.date(from: day).map { formatter.string(from: $0) } ?? day
        if activeDates.contains(day) {
            return "\(dateLabel), workout logged"
        }
        return "\(dateLabel), no workout"
    }
}

struct MacroRingView: View {
    let label: String
    let value: Double
    let target: Double
    let color: Color

    private var progress: Double {
        guard target > 0 else { return 0 }
        return min(value / target, 1)
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(Color(.tertiarySystemFill), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(value))")
                    .font(.caption.bold().monospacedDigit())
            }
            .frame(width: 64, height: 64)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("/ \(Int(target))")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }
}

struct MacroRingsRow: View {
    let totals: MacroTotals
    let targets: MacroTargetsDTO

    var body: some View {
        HStack(spacing: 12) {
            MacroRingView(label: "Protein", value: totals.proteinG, target: targets.proteinG, color: .red)
            MacroRingView(label: "Carbs", value: totals.carbsG, target: targets.carbsG, color: .blue)
            MacroRingView(label: "Fat", value: totals.fatG, target: targets.fatG, color: .yellow)
            MacroRingView(label: "Cal", value: totals.calories, target: targets.calories, color: .orange)
        }
        .frame(maxWidth: .infinity)
    }
}
