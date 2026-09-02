import Foundation

enum ExerciseMediaResolver {
    static func resolveMediaURL(
        exerciseName: String,
        exerciseID: UUID?,
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO]
    ) -> URL? {
        mediaURL(
            exerciseID: exerciseID,
            exerciseName: exerciseName,
            catalogExercise: catalog.first(where: {
                WorkoutCalculations.normalizeExerciseName($0.name)
                    == WorkoutCalculations.normalizeExerciseName(exerciseName)
            }),
            catalog: catalog,
            overrides: overrides,
            preferStillImage: false
        )
    }

    static func resolveThumbnailURL(
        exercise: ExerciseDTO,
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO]
    ) -> URL? {
        mediaURL(
            exerciseID: exercise.id,
            exerciseName: exercise.name,
            catalogExercise: exercise,
            catalog: catalog,
            overrides: overrides,
            preferStillImage: true
        )
    }

    private static func mediaURL(
        exerciseID: UUID?,
        exerciseName: String,
        catalogExercise: ExerciseDTO?,
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO],
        preferStillImage: Bool
    ) -> URL? {
        if let exerciseID,
           let override = overrides[exerciseID.uuidString],
           let url = URL(string: override.mediaURL) {
            return url
        }

        let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
        let compact = normalized.replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
        for key in ["name:\(normalized)", "name:\(compact)"] {
            if let override = overrides[key], let url = URL(string: override.mediaURL) {
                return url
            }
        }

        if let catalogExercise {
            if let override = overrides[catalogExercise.id.uuidString],
               let url = URL(string: override.mediaURL) {
                return url
            }
            if preferStillImage {
                if let image = catalogExercise.imageURL, let url = URL(string: image) { return url }
                if let gif = catalogExercise.gifURL, let url = URL(string: gif) { return url }
            } else {
                if let gif = catalogExercise.gifURL, let url = URL(string: gif) { return url }
                if let image = catalogExercise.imageURL, let url = URL(string: image) { return url }
            }
        }

        for key in ["name:\(normalized)", "name:\(compact)"] {
            if let override = overrides[key], let url = URL(string: override.mediaURL) {
                return url
            }
        }

        return nil
    }

    static func symbol(for category: String?) -> String {
        switch (category ?? "other").lowercased() {
        case "chest": return "figure.strengthtraining.traditional"
        case "back": return "figure.rowing"
        case "shoulders", "shoulder": return "figure.arms.open"
        case "arms", "biceps", "triceps": return "figure.strengthtraining.functional"
        case "legs", "quads", "hamstrings", "glutes": return "figure.strengthtraining.functional"
        case "core", "abs": return "figure.core.training"
        case "cardio": return "figure.run"
        default: return "dumbbell.fill"
        }
    }

    static func color(from hex: String?) -> ColorComponents {
        guard let hex, let parsed = parseHexColor(hex) else {
            return ColorComponents(red: 0.23, green: 0.51, blue: 0.96)
        }
        return parsed
    }
}

struct ColorComponents {
    let red: Double
    let green: Double
    let blue: Double
}

import SwiftUI

extension Color {
    init(components: ColorComponents) {
        self.init(red: components.red, green: components.green, blue: components.blue)
    }
}

private func parseHexColor(_ hex: String) -> ColorComponents? {
    var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6, let intValue = Int(value, radix: 16) else { return nil }
    let red = Double((intValue >> 16) & 0xFF) / 255
    let green = Double((intValue >> 8) & 0xFF) / 255
    let blue = Double(intValue & 0xFF) / 255
    return ColorComponents(red: red, green: green, blue: blue)
}
