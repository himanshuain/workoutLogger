import SwiftUI

struct ActivityHeatmapView: View {
    let activeDates: Set<String>
    var weeks: Int = 26
    var activeColor: Color = .orange
    var title: String = "Activity"

    private var grid: [[String?]] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let start = calendar.date(byAdding: .day, value: -(weeks * 7 - 1), to: today) else { return [] }
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

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 3) {
                    ForEach(Array(grid.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: 3) {
                            ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(color(for: day))
                                    .frame(width: 12, height: 12)
                            }
                        }
                    }
                }
            }
            Text("\(activeDates.count) active days")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func color(for day: String?) -> Color {
        guard let day else { return Color(.tertiarySystemFill) }
        return activeDates.contains(day) ? activeColor : Color(.tertiarySystemFill)
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
