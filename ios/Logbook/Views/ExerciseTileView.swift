import SwiftUI

struct ExerciseTile: View {
    let exercise: NativeExercise
    let color: Color
    let weightUnit: WeightUnit
    let cardSize: ExerciseCardSize

    var body: some View {
        VStack(alignment: .leading, spacing: cardSize.textSpacing) {
            ZStack(alignment: .topTrailing) {
                ExerciseMediaView(
                    url: exercise.mediaURL,
                    symbol: exercise.symbol,
                    tint: color,
                    cornerRadius: cardSize.mediaCornerRadius
                )

                if exercise.isLogged {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: cardSize.badgeSize))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, .green)
                        .shadow(color: .black.opacity(0.15), radius: 2, y: 1)
                        .padding(6)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name)
                    .font(cardSize.titleFont)
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, minHeight: cardSize.titleHeight, alignment: .topLeading)

                Text(subtitle)
                    .font(cardSize.subtitleFont)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    private var subtitle: String {
        if let latest = exercise.latest {
            return WorkoutCalculations.formatWeight(latest.weight, unit: weightUnit) + " × \(latest.reps)"
        }
        return "Not logged"
    }
}
