import SwiftUI

/// Small native-style activity indicator (same family as Mail, Settings sync, etc.).
struct NativeActivityIndicator: View {
    var body: some View {
        ProgressView()
            .controlSize(.small)
    }
}

/// Only appears if loading lasts long enough to avoid flicker on fast responses.
struct DelayedNativeActivityIndicator: View {
    let isLoading: Bool
    @State private var isVisible = false

    var body: some View {
        Group {
            if isVisible {
                NativeActivityIndicator()
            }
        }
        .task(id: isLoading) {
            if isLoading {
                try? await Task.sleep(nanoseconds: 400_000_000)
                guard !Task.isCancelled, isLoading else { return }
                isVisible = true
            } else {
                isVisible = false
            }
        }
    }
}

extension View {
    /// Full-screen loading overlay for initial data fetch when content is empty.
    func blockingLoadingOverlay(_ isLoading: Bool, message: String = "Loading your data…") -> some View {
        overlay {
            if isLoading {
                ZStack {
                    Color.black.opacity(0.35)
                        .ignoresSafeArea()
                    VStack(spacing: 14) {
                        ProgressView()
                            .controlSize(.large)
                            .tint(.white)
                        Text(message)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 28)
                    .padding(.vertical, 22)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .transition(.opacity)
                .zIndex(999)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }

    /// Shows a tiny trailing spinner without blocking taps or shifting layout.
    func nativeLoadingOverlay(_ isLoading: Bool) -> some View {
        overlay(alignment: .topTrailing) {
            DelayedNativeActivityIndicator(isLoading: isLoading)
                .padding(.top, 8)
                .padding(.trailing, 16)
                .allowsHitTesting(false)
        }
    }
}

struct HistorySessionSkeleton: View {
    var body: some View {
        List {
            Section {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(.tertiarySystemFill))
                        .frame(height: 18)
                        .redacted(reason: .placeholder)
                }
            }
            Section {
                ForEach(0..<4, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color(.tertiarySystemFill))
                            .frame(height: 16)
                            .frame(maxWidth: 180)
                        ForEach(0..<2, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(.tertiarySystemFill))
                                .frame(height: 12)
                        }
                    }
                    .redacted(reason: .placeholder)
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

struct DateJumpCalendarSheet: View {
    let today: String
    let selectedDate: String
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var pickedDate: Date

    init(today: String, selectedDate: String, onSelect: @escaping (String) -> Void) {
        self.today = today
        self.selectedDate = selectedDate
        self.onSelect = onSelect
        let initial = WorkoutDate.date(from: selectedDate) ?? WorkoutDate.date(from: today) ?? Date()
        _pickedDate = State(initialValue: initial)
    }

    var body: some View {
        NavigationStack {
            DatePicker(
                "Date",
                selection: $pickedDate,
                in: ...maxDate,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .tint(.orange)
            .padding(.horizontal)
            .navigationTitle("Pick a date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .onChange(of: pickedDate) { _, newDate in
                let key = WorkoutDate.string(from: newDate)
                guard key <= today else { return }
                onSelect(key)
                dismiss()
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var maxDate: Date {
        WorkoutDate.date(from: today) ?? Date()
    }
}
