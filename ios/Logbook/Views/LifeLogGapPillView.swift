import SwiftUI

struct LifeLogGapPillView: View {
    let gapDays: Int
    @State private var tierIndex = 0

    private var tiers: [String] {
        LifeLogGapFormatting.tierLabels(for: gapDays)
    }

    var body: some View {
        if let label = tiers[safe: tierIndex] ?? tiers.first {
            Button {
                guard tiers.count > 1 else { return }
                tierIndex = (tierIndex + 1) % tiers.count
                HapticFeedback.light()
            } label: {
                Text(label)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(tiers.count <= 1)
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
