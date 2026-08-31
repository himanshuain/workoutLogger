import Foundation

enum MacroCalculations {
    static func targets(from settings: UserSettingsDTO?) -> MacroTargetsDTO {
        settings?.macroTargets ?? .defaults
    }

    static func mealPlan(from settings: UserSettingsDTO?) -> [MacroMealDTO] {
        let meals = settings?.macroPlans?.mealList ?? []
        if meals.isEmpty {
            return MacroPlansDTO.defaultPlan.mealList ?? []
        }
        return meals.map { meal in
            MacroMealDTO(
                id: meal.id,
                name: meal.name,
                items: meal.items.map {
                    MacroPlanItemDTO(id: $0.id, foodItemID: $0.foodItemID, quantity: $0.quantity)
                }
            )
        }
    }

    static func macros(for item: FoodItemDTO, quantity: Double) -> MacroTotals {
        let q = quantity
        return MacroTotals(
            proteinG: (item.proteinG ?? 0) * q,
            carbsG: (item.carbsG ?? 0) * q,
            fatG: (item.fatG ?? 0) * q,
            calories: (item.calories ?? 0) * q
        )
    }

    static func todayTotals(foodItems: [FoodItemDTO], entries: [UUID: FoodEntryDTO], date: String) -> MacroTotals {
        let itemsByID = Dictionary(uniqueKeysWithValues: foodItems.map { ($0.id, $0) })
        return entries.values
            .filter { $0.date == date }
            .reduce(into: .zero) { partial, entry in
                guard let item = itemsByID[entry.foodItemID] else { return }
                partial = partial + macros(for: item, quantity: entry.quantity ?? 1)
            }
    }

    static func planTotals(meals: [MacroMealDTO], foodItems: [FoodItemDTO]) -> MacroTotals {
        let itemsByID = Dictionary(uniqueKeysWithValues: foodItems.map { ($0.id, $0) })
        return meals.flatMap(\.items).reduce(into: .zero) { partial, row in
            guard let item = itemsByID[row.foodItemID] else { return }
            partial = partial + macros(for: item, quantity: row.quantity)
        }
    }
}
