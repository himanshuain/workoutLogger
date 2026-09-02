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

    struct EquipmentChip {
        let key: String
        let label: String
        let matches: (String) -> Bool
    }

    static let equipmentChips: [EquipmentChip] = [
        EquipmentChip(key: "bodyweight", label: "Body weight", matches: { $0.range(of: #"\b(bodyweight|body\s*weight|calisthenics|\bbw\b)"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "dumbbell", label: "Dumbbell", matches: { $0.range(of: #"\b(dumbbell|dumbbells|pair\s+of\s+dumbbells)\b"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "barbell", label: "Barbell", matches: { $0.range(of: #"\b(barbell|olympic\s+bar|ez\s*bar(bar)?|trap\s+bar)\b"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "kettlebell", label: "Kettlebell", matches: { $0.range(of: #"\b(kettlebell|kb)\b"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "cable", label: "Cable", matches: { $0.range(of: #"\b(cross[\s_-]?over)?\bcable|cable\s+motion\b"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "machine", label: "Machine", matches: { $0.range(of: #"\b(machine|plate\s*loaded|\blever\b|\bsmith\b|leg\s+press|leg\s+extension|chest\s+press|hack\s+squat|lat\s+pulldown|row\s+machine|pec\s+deck|glute\s+ham|ghd|leg\s+curl)\b"#, options: .regularExpression) != nil }),
        EquipmentChip(key: "band", label: "Band", matches: { $0.range(of: #"\b(resistance\s+)?band|mini\s*bands?|\bloops?\b|\btrx\b|\bsuspension\b"#, options: .regularExpression) != nil })
    ]

    static let equipmentOptions = ["All"] + equipmentChips.map(\.label) + ["Other"]

    static func matchesSearch(_ exercise: ExerciseDTO, query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return true }
        if exercise.name.lowercased().contains(q) { return true }
        if (exercise.category ?? "").lowercased().contains(q) { return true }
        if ExerciseCatalogInfo.equipment(for: exercise).lowercased().contains(q) { return true }
        if ExerciseCatalogInfo.targetMuscle(for: exercise).lowercased().contains(q) { return true }
        for muscle in ExerciseCatalogInfo.secondaryMuscles(for: exercise) where muscle.lowercased().contains(q) {
            return true
        }
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
        if equipment == "Other" {
            return ExerciseCatalogInfo.equipmentTags(for: exercise).contains("other")
        }
        if let chip = equipmentChips.first(where: { $0.label == equipment }) {
            return ExerciseCatalogInfo.equipmentTags(for: exercise).contains(chip.key)
        }
        let value = ExerciseCatalogInfo.equipment(for: exercise).lowercased()
        return value.contains(equipment.lowercased())
    }

    static func matchesEquipmentKey(_ exercise: ExerciseDTO, key: String?) -> Bool {
        guard let key, !key.isEmpty else { return true }
        return ExerciseCatalogInfo.equipmentTags(for: exercise).contains(key)
    }
}
