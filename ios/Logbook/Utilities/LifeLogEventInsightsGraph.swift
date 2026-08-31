import Charts
import SwiftUI

enum LifeLogGraphData {
    struct Point: Identifiable {
        let id: String
        let date: Date
        let dateLabel: String
        let value: Double
    }

    static func logValue(_ log: EventLogDTO) -> Double? {
        if let cost = log.cost { return cost }
        guard let notes = log.notes?.trimmingCharacters(in: .whitespacesAndNewlines),
              !notes.isEmpty,
              let value = Double(notes) else { return nil }
        return value
    }

    static func valuePoints(from logs: [EventLogDTO]) -> [Point] {
        logs.compactMap { log in
            guard let value = logValue(log),
                  let date = WorkoutDate.date(from: log.date) else { return nil }
            return Point(
                id: log.id.uuidString,
                date: date,
                dateLabel: WorkoutDate.displayLabel(for: log.date),
                value: value
            )
        }
        .sorted { $0.date < $1.date }
        .suffix(20)
        .map { $0 }
    }

    static func gapPoints(from logs: [EventLogDTO]) -> [Point] {
        let sorted = logs.sorted { $0.date < $1.date }.suffix(20)
        guard sorted.count >= 2 else { return [] }

        var points: [Point] = []
        var previous: EventLogDTO?
        for log in sorted {
            if let previous,
               let gap = LifeLogGapFormatting.gapDays(between: log.date, and: previous.date),
               let date = WorkoutDate.date(from: log.date) {
                points.append(
                    Point(
                        id: "\(log.id.uuidString)-gap",
                        date: date,
                        dateLabel: WorkoutDate.displayLabel(for: log.date),
                        value: Double(gap)
                    )
                )
            }
            previous = log
        }
        return points
    }

    static func yDomain(for points: [Point]) -> ClosedRange<Double> {
        guard let minValue = points.map(\.value).min(),
              let maxValue = points.map(\.value).max() else {
            return 0...10
        }
        if minValue == maxValue {
            let padding = max(1, minValue * 0.08)
            return max(0, minValue - padding)...(maxValue + padding)
        }
        let padding = max(1, (maxValue - minValue) * 0.14)
        return max(0, minValue - padding)...(maxValue + padding)
    }
}

struct LifeLogEventInsightsGraph: View {
    let event: EventTypeDTO
    let logs: [EventLogDTO]
    @Binding var selectedDate: Date?
    @Binding var isChartActive: Bool

    private var accent: Color {
        event.color.map { Color(hex: $0) } ?? .orange
    }

    var body: some View {
        if event.trackGraph == true, logs.count >= 2 {
            let valuePoints = LifeLogGraphData.valuePoints(from: logs)
            if valuePoints.count >= 2 {
                chartSection(
                    title: "Value trend",
                    suffix: "",
                    points: valuePoints
                )
            } else {
                let gapPoints = LifeLogGraphData.gapPoints(from: logs)
                if !gapPoints.isEmpty {
                    chartSection(
                        title: "Days between logs",
                        suffix: "d",
                        points: gapPoints
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func chartSection(
        title: String,
        suffix: String,
        points: [LifeLogGraphData.Point]
    ) -> some View {
        let yDomain = LifeLogGraphData.yDomain(for: points)
        let selectedPoint = isChartActive
            ? points.min { lhs, rhs in
                guard let selectedDate else { return false }
                return abs(lhs.date.timeIntervalSince(selectedDate)) < abs(rhs.date.timeIntervalSince(selectedDate))
            }
            : nil

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                if let latest = points.last {
                    Text("\(formatted(latest.value))\(suffix)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(accent)
                        .monospacedDigit()
                }
            }

            Chart {
                ForEach(points) { point in
                    AreaMark(
                        x: .value("Date", point.date),
                        yStart: .value("Baseline", yDomain.lowerBound),
                        yEnd: .value("Value", point.value)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [accent.opacity(0.28), accent.opacity(0.04)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .interpolationMethod(.linear)

                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(accent)
                    .lineStyle(StrokeStyle(lineWidth: 2.5))
                    .interpolationMethod(.linear)

                    PointMark(
                        x: .value("Date", point.date),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(accent)
                    .symbolSize(selectedPoint?.id == point.id ? 90 : 36)
                }

                if let selectedPoint {
                    RuleMark(x: .value("Date", selectedPoint.date))
                        .foregroundStyle(accent.opacity(0.45))
                        .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                }
            }
            .chartDateScrubTooltip(
                selectedDate: $selectedDate,
                isActive: $isChartActive,
                dates: points.map(\.date),
                accent: accent,
                yValue: { date in
                    points.min { lhs, rhs in
                        abs(lhs.date.timeIntervalSince(date)) < abs(rhs.date.timeIntervalSince(date))
                    }?.value ?? 0
                },
                tooltip: { date in
                    let point = points.min { lhs, rhs in
                        abs(lhs.date.timeIntervalSince(date)) < abs(rhs.date.timeIntervalSince(date))
                    }
                    return ChartTooltipBadge(
                        title: point?.dateLabel ?? "",
                        value: point.map { "\(formatted($0.value))\(suffix)" } ?? "",
                        accent: accent
                    )
                }
            )
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: min(points.count, 4))) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .font(.caption2)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { value in
                    AxisValueLabel {
                        if let number = value.as(Double.self) {
                            Text("\(formatted(number))\(suffix)")
                                .font(.caption2)
                        }
                    }
                }
            }
            .chartYScale(domain: yDomain)
            .frame(height: 168)
        }
        .padding(12)
        .background(Color(.tertiarySystemFill))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func formatted(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}

struct LifeLogHistoryTimelineView: View {
    let logs: [EventLogDTO]
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(logs.enumerated()), id: \.element.id) { index, log in
                if index > 0,
                   let gap = LifeLogGapFormatting.gapDays(between: logs[index - 1].date, and: log.date) {
                    HStack(spacing: 12) {
                        timelineRail(isGap: true)
                        LifeLogGapPillView(gapDays: gap)
                            .padding(.vertical, 4)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    timelineRail(isLast: index == logs.count - 1, highlight: index == 0)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(WorkoutDate.displayLabel(for: log.date))
                            .font(.subheadline.weight(.semibold))
                        if let value = LifeLogGraphData.logValue(log) {
                            Text(formattedValue(value))
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(accent)
                                .monospacedDigit()
                        }
                        if let notes = log.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .background(index == 0 ? accent.opacity(0.10) : Color(.tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
    }

    @ViewBuilder
    private func timelineRail(isLast: Bool = false, highlight: Bool = false, isGap: Bool = false) -> some View {
        VStack(spacing: 0) {
            Circle()
                .fill(isGap ? Color.secondary.opacity(0.35) : (highlight ? accent : accent.opacity(0.55)))
                .frame(width: isGap ? 6 : 10, height: isGap ? 6 : 10)
            if !isLast && !isGap {
                Rectangle()
                    .fill(Color.secondary.opacity(0.22))
                    .frame(width: 2)
                    .frame(maxHeight: .infinity)
            }
        }
        .frame(width: 16)
        .padding(.top, isGap ? 10 : 14)
    }

    private func formattedValue(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}
