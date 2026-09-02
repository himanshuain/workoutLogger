import Foundation

enum ExerciseCatalogInfo {
    static func equipment(for exercise: ExerciseDTO) -> String {
        if let display = exercise.metadata?.equipmentDisplay?.trimmingCharacters(in: .whitespacesAndNewlines),
           !display.isEmpty {
            return display
        }
        if let list = exercise.metadata?.exercisedb?.equipments?.filter({ !$0.isEmpty }),
           let first = list.first {
            return list.count == 1 ? first : list.joined(separator: ", ")
        }
        if let category = exercise.category?.trimmingCharacters(in: .whitespacesAndNewlines),
           !category.isEmpty,
           category.lowercased().contains("body") {
            return "Body weight"
        }
        return ""
    }

    static func targetMuscle(for exercise: ExerciseDTO) -> String {
        if let target = exercise.metadata?.exercisedb?.targetMuscles?.first,
           !target.isEmpty {
            return target
        }
        return exercise.category ?? "Other"
    }

    static func secondaryMuscles(for exercise: ExerciseDTO) -> [String] {
        exercise.metadata?.exercisedb?.secondaryMuscles?.filter { !$0.isEmpty } ?? []
    }

    static func instructions(for exercise: ExerciseDTO) -> [String] {
        if let steps = exercise.metadata?.exercisedb?.instructions?.filter({ !$0.isEmpty }),
           !steps.isEmpty {
            return steps
        }
        if let description = exercise.description?.trimmingCharacters(in: .whitespacesAndNewlines),
           !description.isEmpty {
            return [description]
        }
        return []
    }

    static func subtitle(for exercise: ExerciseDTO) -> String {
        let muscle = targetMuscle(for: exercise).capitalized
        let equipment = equipment(for: exercise)
        if equipment.isEmpty {
            return muscle
        }
        return "\(muscle) · \(equipment.capitalized)"
    }

    static func hasAnimation(for exercise: ExerciseDTO) -> Bool {
        if let gif = exercise.gifURL, !gif.isEmpty { return true }
        if let image = exercise.imageURL, !image.isEmpty { return true }
        return false
    }

    static func equipmentTags(for exercise: ExerciseDTO) -> [String] {
        let haystack = "\(equipment(for: exercise)) \(exercise.name)".lowercased()
        var tags: [String] = []
        for chip in ExerciseFilterLogic.equipmentChips where chip.matches(haystack) {
            tags.append(chip.key)
        }
        if tags.isEmpty, !equipment(for: exercise).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            tags.append("other")
        }
        return tags
    }

    static func derivedEquipmentOptions(from exercises: [ExerciseDTO]) -> [ExerciseFilterLogic.EquipmentChip] {
        var counts: [String: Int] = [:]
        for exercise in exercises {
            for tag in equipmentTags(for: exercise) {
                counts[tag, default: 0] += 1
            }
        }
        return ExerciseFilterLogic.equipmentChips
            .filter { counts[$0.key, default: 0] > 0 }
            .sorted {
                let left = counts[$0.key, default: 0]
                let right = counts[$1.key, default: 0]
                if left == right { return $0.label < $1.label }
                return left > right
            }
    }
}
