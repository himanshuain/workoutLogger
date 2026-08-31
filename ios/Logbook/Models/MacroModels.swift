import Foundation

struct MacroTargetsDTO: Codable, Equatable {
    var proteinG: Double
    var carbsG: Double
    var fatG: Double
    var calories: Double

    enum CodingKeys: String, CodingKey {
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case calories
    }

    static let defaults = MacroTargetsDTO(proteinG: 150, carbsG: 200, fatG: 65, calories: 2200)

    init(proteinG: Double, carbsG: Double, fatG: Double, calories: Double) {
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.calories = calories
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        proteinG = (try? container.decode(Double.self, forKey: .proteinG))
            ?? (try? container.decode(String.self, forKey: .proteinG)).flatMap(Double.init)
            ?? Self.defaults.proteinG
        carbsG = (try? container.decode(Double.self, forKey: .carbsG))
            ?? (try? container.decode(String.self, forKey: .carbsG)).flatMap(Double.init)
            ?? Self.defaults.carbsG
        fatG = (try? container.decode(Double.self, forKey: .fatG))
            ?? (try? container.decode(String.self, forKey: .fatG)).flatMap(Double.init)
            ?? Self.defaults.fatG
        calories = (try? container.decode(Double.self, forKey: .calories))
            ?? (try? container.decode(String.self, forKey: .calories)).flatMap(Double.init)
            ?? Self.defaults.calories
    }
}

struct MacroPlanItemDTO: Codable, Identifiable, Equatable {
    let id: String
    var foodItemID: UUID
    var quantity: Double

    enum CodingKeys: String, CodingKey {
        case id
        case foodItemID = "foodItemId"
        case quantity
    }
}

struct MacroMealDTO: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var items: [MacroPlanItemDTO]
}

struct MacroPlansDTO: Codable, Equatable {
    var mealList: [MacroMealDTO]?

    static var defaultPlan: MacroPlansDTO {
        MacroPlansDTO(mealList: [MacroMealDTO(id: UUID().uuidString, name: "Meal 1", items: [])])
    }
}

struct MacroTotals: Equatable {
    var proteinG: Double
    var carbsG: Double
    var fatG: Double
    var calories: Double

    static let zero = MacroTotals(proteinG: 0, carbsG: 0, fatG: 0, calories: 0)

    static func + (lhs: MacroTotals, rhs: MacroTotals) -> MacroTotals {
        MacroTotals(
            proteinG: lhs.proteinG + rhs.proteinG,
            carbsG: lhs.carbsG + rhs.carbsG,
            fatG: lhs.fatG + rhs.fatG,
            calories: lhs.calories + rhs.calories
        )
    }
}
