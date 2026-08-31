import Foundation

enum ExerciseAreaGroups {
    static let order = ["chest", "back", "shoulders", "arms", "legs", "core", "other"]

    static let labels: [String: String] = [
        "chest": "Chest",
        "back": "Back",
        "shoulders": "Shoulders",
        "arms": "Arms & triceps",
        "legs": "Legs",
        "core": "Core",
        "other": "Other"
    ]

    static func normalizeAreaCategory(_ category: String?) -> String {
        let c = (category ?? "other").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if order.contains(c) { return c }
        if c.contains("triceps") || c.contains("biceps") || c == "arm" { return "arms" }
        if c.contains("shoulder") { return "shoulders" }
        if c.contains("leg") || c.contains("quad") || c.contains("hamstring") || c.contains("calf") { return "legs" }
        if c.contains("chest") || c.contains("pec") { return "chest" }
        if c.contains("back") || c.contains("lat") { return "back" }
        if c.contains("core") || c.contains("abs") || c.contains("ab") { return "core" }
        return "other"
    }

    struct AreaGroup: Identifiable {
        let area: String
        let label: String
        let exercises: [NativeExercise]
        var id: String { area }
    }

    static func groupExercises(_ exercises: [NativeExercise]) -> [AreaGroup] {
        var buckets: [String: [NativeExercise]] = [:]
        for exercise in exercises {
            let area = normalizeAreaCategory(exercise.category)
            buckets[area, default: []].append(exercise)
        }
        var groups: [AreaGroup] = []
        for area in order {
            guard let items = buckets[area], !items.isEmpty else { continue }
            groups.append(AreaGroup(area: area, label: labels[area] ?? area, exercises: items))
            buckets.removeValue(forKey: area)
        }
        for (area, items) in buckets where !items.isEmpty {
            groups.append(AreaGroup(area: area, label: labels[area] ?? area.capitalized, exercises: items))
        }
        return groups
    }
}
