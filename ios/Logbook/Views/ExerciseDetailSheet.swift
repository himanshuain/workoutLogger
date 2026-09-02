import SwiftUI

struct ExerciseDetailSheet: View {
    let exercise: ExerciseDTO
    let mediaURL: URL?
    let weightUnit: WeightUnit
    let personalBest: Double
    let onAddToPlan: () -> Void
    let onDismiss: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ExerciseMediaView(
                        url: mediaURL,
                        symbol: ExerciseMediaResolver.symbol(for: exercise.category),
                        tint: .orange,
                        contentMode: .fit,
                        cornerRadius: 16,
                        playback: .staticThumbnail
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 220)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                    FlowLayout(spacing: 8) {
                        tag(ExerciseCatalogInfo.targetMuscle(for: exercise).capitalized, accent: true)
                        if !ExerciseCatalogInfo.equipment(for: exercise).isEmpty {
                            tag(ExerciseCatalogInfo.equipment(for: exercise).capitalized)
                        }
                        ForEach(ExerciseCatalogInfo.secondaryMuscles(for: exercise), id: \.self) { muscle in
                            tag(muscle.capitalized)
                        }
                    }

                    if personalBest > 0 {
                        Label {
                            Text("Best \(WorkoutCalculations.formatWeight(personalBest, unit: weightUnit))")
                                .font(.subheadline.weight(.semibold))
                        } icon: {
                            Image(systemName: "trophy.fill")
                                .foregroundStyle(.orange)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.orange.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    if let description = exercise.description?.trimmingCharacters(in: .whitespacesAndNewlines),
                       !description.isEmpty {
                        Text(description)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }

                    let instructions = ExerciseCatalogInfo.instructions(for: exercise)
                    if !instructions.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("How to")
                                .font(.headline)
                            ForEach(Array(instructions.enumerated()), id: \.offset) { index, step in
                                HStack(alignment: .top, spacing: 10) {
                                    Text("\(index + 1)")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 22, height: 22)
                                        .background(Color.orange)
                                        .clipShape(Circle())
                                    Text(step)
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }

                    Button {
                        onAddToPlan()
                    } label: {
                        Label("Add to my split", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(exercise.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDismiss()
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func tag(_ text: String, accent: Bool = false) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(accent ? Color.orange.opacity(0.18) : Color(.tertiarySystemFill))
            .foregroundStyle(accent ? Color.orange : .primary)
            .clipShape(Capsule())
    }
}
