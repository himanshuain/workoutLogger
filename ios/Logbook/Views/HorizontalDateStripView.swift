import SwiftUI

private struct DateColumnAnchor: Equatable {
    let date: String
    let minX: CGFloat
}

private struct DateColumnAnchorKey: PreferenceKey {
    static var defaultValue: [DateColumnAnchor] = []

    static func reduce(value: inout [DateColumnAnchor], nextValue: () -> [DateColumnAnchor]) {
        value.append(contentsOf: nextValue())
    }
}

struct HorizontalDateStripView: View {
    let today: String
    let selectedDate: String
    let workoutLoggedDates: Set<String>
    let onSelectDate: (String) -> Void

    @State private var pastDaysLoaded = 60
    @State private var showCalendar = false
    @State private var stickyMonthKey = ""
    @State private var scrollViewportWidth: CGFloat = 320

    private let columnWidth: CGFloat = 48

    private var glanceDays: [String] {
        guard let end = WorkoutDate.date(from: today) else { return [today] }
        let calendar = Calendar.current
        return (0..<pastDaysLoaded).reversed().compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: end) else { return nil }
            return WorkoutDate.string(from: date, calendar: calendar)
        }
    }

    private var isViewingToday: Bool { selectedDate == today }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 8) {
                Text(stickyMonthText)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(minWidth: 36, alignment: .leading)

                if !isViewingToday {
                    Text(dayHeaderTitle)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                Button {
                    showCalendar = true
                } label: {
                    Image(systemName: "calendar")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                        .padding(6)
                        .background(Color.orange.opacity(0.12))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Jump to date")

                if !isViewingToday {
                    Button("Today") {
                        onSelectDate(today)
                    }
                    .font(.caption.weight(.semibold))
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .controlSize(.small)
                }
            }
            .padding(.horizontal, 4)

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .bottom, spacing: 8) {
                        ForEach(Array(glanceDays.enumerated()), id: \.element) { index, date in
                            dateColumn(date, index: index)
                                .id(date)
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                }
                .coordinateSpace(name: "dateStripScroll")
                .background(
                    GeometryReader { geo in
                        Color.clear
                            .onAppear { scrollViewportWidth = geo.size.width }
                            .onChange(of: geo.size.width) { _, width in
                                scrollViewportWidth = width
                            }
                    }
                )
                .onAppear {
                    stickyMonthKey = monthKey(selectedDate)
                    scrollToSelected(proxy: proxy, animated: false)
                }
                .onChange(of: selectedDate) { _, newDate in
                    stickyMonthKey = monthKey(newDate)
                    scrollToSelected(proxy: proxy, animated: true)
                }
                .onPreferenceChange(DateColumnAnchorKey.self) { anchors in
                    updateStickyMonth(from: anchors)
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .sheet(isPresented: $showCalendar) {
            DateJumpCalendarSheet(today: today, selectedDate: selectedDate) { date in
                ensureDateVisible(date)
                onSelectDate(date)
            }
        }
    }

    private var stickyMonthText: String {
        let key = stickyMonthKey.isEmpty ? monthKey(selectedDate) : stickyMonthKey
        guard let sample = glanceDays.first(where: { monthKey($0) == key }) ?? Optional(selectedDate),
              let label = monthLabel(for: sample) else { return "" }
        return label.uppercased()
    }

    private func updateStickyMonth(from anchors: [DateColumnAnchor]) {
        let visible = anchors.filter { anchor in
            anchor.minX + columnWidth > 0 && anchor.minX < scrollViewportWidth
        }
        if let leading = visible.min(by: { $0.minX < $1.minX }) {
            stickyMonthKey = monthKey(leading.date)
        } else {
            stickyMonthKey = monthKey(selectedDate)
        }
    }

    private func ensureDateVisible(_ date: String) {
        guard let picked = WorkoutDate.date(from: date),
              let end = WorkoutDate.date(from: today) else { return }
        let days = Calendar.current.dateComponents([.day], from: picked, to: end).day ?? 0
        if days >= pastDaysLoaded {
            pastDaysLoaded = days + 21
        }
    }

    private var dayHeaderTitle: String {
        guard let date = WorkoutDate.date(from: selectedDate) else { return selectedDate }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: date)
    }

    private func dateColumn(_ date: String, index: Int) -> some View {
        let isToday = date == today
        let isSelected = date == selectedDate
        let hasWorkout = workoutLoggedDates.contains(date)

        return VStack(spacing: 4) {
            if isToday {
                Text("Today")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.green)
            } else {
                Color.clear.frame(height: 11)
            }

            Button {
                guard date <= today else { return }
                onSelectDate(date)
            } label: {
                VStack(spacing: 4) {
                    Text(weekdayLetter(for: date))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(isSelected ? .white.opacity(0.85) : .secondary)
                    Text(dayNumber(for: date))
                        .font(.system(size: 16, weight: .semibold))
                        .monospacedDigit()
                    Circle()
                        .fill(hasWorkout ? Color.orange : Color.clear)
                        .frame(width: 5, height: 5)
                }
                .frame(width: columnWidth, height: 58)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            isSelected
                                ? (isToday ? Color.green : Color.blue)
                                : Color(.tertiarySystemFill)
                        )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isToday && !isSelected ? Color.green.opacity(0.5) : Color.clear, lineWidth: 1)
                )
                .foregroundStyle(isSelected ? .white : .primary)
            }
            .buttonStyle(.plain)
            .disabled(date > today)
        }
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: DateColumnAnchorKey.self,
                    value: [DateColumnAnchor(date: date, minX: geo.frame(in: .named("dateStripScroll")).minX)]
                )
            }
        )
    }

    private func scrollToSelected(proxy: ScrollViewProxy, animated: Bool) {
        guard glanceDays.contains(selectedDate) else { return }
        if animated {
            withAnimation(.snappy) {
                proxy.scrollTo(selectedDate, anchor: .center)
            }
        } else {
            proxy.scrollTo(selectedDate, anchor: .center)
        }
    }

    private func monthKey(_ date: String) -> String {
        String(date.prefix(7))
    }

    private func monthLabel(for date: String) -> String? {
        guard let value = WorkoutDate.date(from: date) else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM"
        return formatter.string(from: value)
    }

    private func weekdayLetter(for date: String) -> String {
        guard let value = WorkoutDate.date(from: date) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEEEE"
        return formatter.string(from: value)
    }

    private func dayNumber(for date: String) -> String {
        guard let value = WorkoutDate.date(from: date) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "d"
        return formatter.string(from: value)
    }
}
