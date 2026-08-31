import Charts
import SwiftUI

struct ChartTooltipBadge: View {
    let title: String
    let value: String
    var accent: Color = .orange

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(accent)
                .monospacedDigit()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(accent.opacity(0.35), lineWidth: 1)
        )
    }
}

enum ChartScrubSelection {
    static func nearestDate(to date: Date, in dates: [Date]) -> Date? {
        guard !dates.isEmpty else { return nil }
        return dates.min { lhs, rhs in
            abs(lhs.timeIntervalSince(date)) < abs(rhs.timeIntervalSince(date))
        }
    }
}

private enum ChartTooltipPlacement {
    static func point(
        in plotFrame: CGRect,
        x: CGFloat,
        y: CGFloat,
        tooltipHeight: CGFloat = 52
    ) -> CGPoint {
        let clampedX = min(max(plotFrame.minX + x, plotFrame.minX + 56), plotFrame.maxX - 56)
        let preferredY = plotFrame.minY + y - tooltipHeight
        let clampedY = max(plotFrame.minY + tooltipHeight * 0.55, preferredY)
        return CGPoint(x: clampedX, y: clampedY)
    }
}

private struct ChartDateScrubOverlay<Tooltip: View>: View {
    @Binding var selectedDate: Date?
    @Binding var isActive: Bool
    let dates: [Date]
    let accent: Color
    let yValue: (Date) -> Double
    let tooltip: (Date) -> Tooltip
    let proxy: ChartProxy

    var body: some View {
        GeometryReader { geometry in
            if let plotFrame = proxy.plotFrame {
                let frame = geometry[plotFrame]

                Rectangle()
                    .fill(.clear)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                isActive = true
                                let xPosition = value.location.x - frame.origin.x
                                guard xPosition >= 0, xPosition <= frame.width,
                                      let rawDate: Date = proxy.value(atX: xPosition, as: Date.self),
                                      let snapped = ChartScrubSelection.nearestDate(to: rawDate, in: dates) else { return }
                                if selectedDate != snapped {
                                    HapticFeedback.select()
                                }
                                selectedDate = snapped
                            }
                            .onEnded { _ in
                                isActive = false
                                selectedDate = nil
                            }
                    )

                if isActive, let date = selectedDate,
                   let xPos = proxy.position(forX: date),
                   let yPos = proxy.position(forY: yValue(date)) {
                    let placement = ChartTooltipPlacement.point(
                        in: frame,
                        x: xPos,
                        y: yPos
                    )
                    tooltip(date)
                        .fixedSize()
                        .position(placement)
                }
            }
        }
    }
}

private struct ChartCategoryScrubOverlay<Tooltip: View>: View {
    @Binding var selectedLabel: String?
    @Binding var isActive: Bool
    let labels: [String]
    let yValue: (String) -> Double
    let tooltip: (String) -> Tooltip
    let proxy: ChartProxy

    var body: some View {
        GeometryReader { geometry in
            if let plotFrame = proxy.plotFrame {
                let frame = geometry[plotFrame]

                Rectangle()
                    .fill(.clear)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                isActive = true
                                let xPosition = value.location.x - frame.origin.x
                                guard xPosition >= 0, xPosition <= frame.width else { return }

                                let snapped: String? = {
                                    if let rawLabel: String = proxy.value(atX: xPosition, as: String.self),
                                       labels.contains(rawLabel) {
                                        return rawLabel
                                    }
                                    return labels.min { lhs, rhs in
                                        let lhsDistance = abs((proxy.position(forX: lhs) ?? xPosition) - xPosition)
                                        let rhsDistance = abs((proxy.position(forX: rhs) ?? xPosition) - xPosition)
                                        return lhsDistance < rhsDistance
                                    }
                                }()

                                guard let snapped else { return }
                                if selectedLabel != snapped {
                                    HapticFeedback.select()
                                }
                                selectedLabel = snapped
                            }
                            .onEnded { _ in
                                isActive = false
                                selectedLabel = nil
                            }
                    )

                if isActive, let label = selectedLabel,
                   let xPos = proxy.position(forX: label),
                   let yPos = proxy.position(forY: yValue(label)) {
                    let placement = ChartTooltipPlacement.point(
                        in: frame,
                        x: xPos,
                        y: yPos
                    )
                    tooltip(label)
                        .fixedSize()
                        .position(placement)
                }
            }
        }
    }
}

extension View {
    func chartDateScrubTooltip(
        selectedDate: Binding<Date?>,
        isActive: Binding<Bool>,
        dates: [Date],
        accent: Color,
        yValue: @escaping (Date) -> Double,
        tooltip: @escaping (Date) -> ChartTooltipBadge
    ) -> some View {
        chartOverlay { proxy in
            ChartDateScrubOverlay(
                selectedDate: selectedDate,
                isActive: isActive,
                dates: dates,
                accent: accent,
                yValue: yValue,
                tooltip: tooltip,
                proxy: proxy
            )
        }
    }

    func chartCategoryScrubTooltip(
        selectedLabel: Binding<String?>,
        isActive: Binding<Bool>,
        labels: [String],
        yValue: @escaping (String) -> Double,
        tooltip: @escaping (String) -> ChartTooltipBadge
    ) -> some View {
        chartOverlay { proxy in
            ChartCategoryScrubOverlay(
                selectedLabel: selectedLabel,
                isActive: isActive,
                labels: labels,
                yValue: yValue,
                tooltip: tooltip,
                proxy: proxy
            )
        }
    }
}
