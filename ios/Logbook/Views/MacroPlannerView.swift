import SwiftUI

struct MacroPlannerView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var meals: [MacroMealDTO] = []
    @State private var targets = MacroTargetsDTO.defaults
    @State private var isSaving = false

    var body: some View {
        List {
            Section("Daily targets") {
                macroField("Protein (g)", value: $targets.proteinG)
                macroField("Carbs (g)", value: $targets.carbsG)
                macroField("Fat (g)", value: $targets.fatG)
                macroField("Calories", value: $targets.calories)
                Button("Save targets") {
                    Task {
                        isSaving = true
                        await workoutStore.updateMacroTargets(targets)
                        isSaving = false
                    }
                }
                .disabled(isSaving)
            }

            Section {
                let planTotals = MacroCalculations.planTotals(meals: meals, foodItems: workoutStore.foodItems)
                MacroRingsRow(totals: planTotals, targets: targets)
                    .listRowBackground(Color.clear)
            } header: {
                Text("Plan totals")
            }

            ForEach($meals) { $meal in
                Section(meal.name) {
                    ForEach(meal.items) { item in
                        if let food = workoutStore.foodItems.first(where: { $0.id == item.foodItemID }) {
                            HStack {
                                Text(food.icon ?? "🍽️")
                                Text(food.name)
                                Spacer()
                                Text("× \(item.quantity.formatted())")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    Menu("Add food") {
                        ForEach(workoutStore.foodItems) { food in
                            Button(food.name) {
                                meal.items.append(
                                    MacroPlanItemDTO(
                                        id: UUID().uuidString,
                                        foodItemID: food.id,
                                        quantity: 1
                                    )
                                )
                            }
                        }
                    }
                    Button("Log meal to today") {
                        Task { await workoutStore.logMacroMealToToday(meal) }
                    }
                }
            }

            Section {
                Button("Add meal") {
                    meals.append(
                        MacroMealDTO(
                            id: UUID().uuidString,
                            name: "Meal \(meals.count + 1)",
                            items: []
                        )
                    )
                }
                Button("Save plan") {
                    Task {
                        isSaving = true
                        await workoutStore.updateMacroMeals(meals)
                        isSaving = false
                    }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Macro planner")
        .onAppear {
            meals = workoutStore.macroMeals
            targets = workoutStore.macroTargets
        }
        .onChange(of: workoutStore.macroMeals) { _, value in
            meals = value
        }
    }

    private func macroField(_ title: String, value: Binding<Double>) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField(title, value: value, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
        }
    }
}
