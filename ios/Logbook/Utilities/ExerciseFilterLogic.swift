import Foundation

enum ExerciseFilterLogic {
    static let parentCategories = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Full Body"]

    static let subcategories: [String: [String]] = [
        "Legs": ["Quad", "Hamstring", "Glute", "Calf", "Adductor"],
        "Arms": ["Biceps", "Triceps", "Forearm"],
        "Back": ["Lat", "Upper back", "Lower back"],
        "Chest": ["Upper chest", "Lower chest"],
        "Shoulders": ["Front delt", "Side delt", "Rear delt"]
    ]

    static let equipmentOptions = [
        "All", "Body weight", "Dumbbell", "Barbell", "Kettlebell", "Cable", "Machine", "Band"
    ]

    static func matchesSearch(_ exercise: ExerciseDTO, query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return true }
        if exercise.name.lowercased().contains(q) { return true }
        if (exercise.category ?? "").lowercased().contains(q) { return true }
        return false
    }

    static func matchesParent(_ exercise: ExerciseDTO, parent: String?) -> Bool {
        guard let parent, parent != "All" else { return true }
        let category = (exercise.category ?? "").lowercased()
        let parentLower = parent.lowercased()
        if parentLower == "full body" {
            return category.contains("full") || category.contains("compound")
        }
        return category.contains(parentLower.dropLast(parentLower.hasSuffix("s") ? 1 : 0))
            || category.contains(parentLower)
    }

    static func matchesSub(_ exercise: ExerciseDTO, parent: String?, sub: String?) -> Bool {
        guard let sub, !sub.isEmpty else { return true }
        return (exercise.category ?? "").lowercased().contains(sub.lowercased())
    }

    static func matchesEquipment(_ exercise: ExerciseDTO, equipment: String?) -> Bool {
        guard let equipment, equipment != "All" else { return true }
        let value = (exercise.category ?? "").lowercased()
        return value.contains(equipment.lowercased())
    }
}
