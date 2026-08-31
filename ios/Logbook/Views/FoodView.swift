import SwiftUI

struct FoodView: View {
    @ObservedObject var workoutStore: WorkoutStore
    @State private var showManage = false
    @State private var quantityTarget: FoodItemDTO?

    var body: some View {
        List {
            Section {
                ActivityHeatmapView(
                    activeDates: workoutStore.foodHistoryDates,
                    activeColor: .green,
                    title: "Food tracking"
                )
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }

            Section {
                MacroRingsRow(totals: workoutStore.todayMacroTotals, targets: workoutStore.macroTargets)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
            } header: {
                Text("Today's macros")
            }

            Section {
                if workoutStore.foodItems.isEmpty {
                    Text("Add food items to start logging.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(workoutStore.foodItems) { item in
                        foodRow(item)
                    }
                }
            } header: {
                HStack {
                    Text("Food")
                    Spacer()
                    Button("Manage") { showManage = true }
                        .font(.caption.weight(.semibold))
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Food")
        .task {
            if workoutStore.foodHistoryDates.isEmpty {
                await workoutStore.loadFoodAndLifeLogHistory()
            }
        }
        .sheet(isPresented: $showManage) {
            NavigationStack {
                ManageFoodView(workoutStore: workoutStore)
            }
        }
        .sheet(item: $quantityTarget) { item in
            FoodLogSheet(item: item, workoutStore: workoutStore) { quantityTarget = nil }
        }
    }

    private func foodRow(_ item: FoodItemDTO) -> some View {
        let entry = workoutStore.foodEntries[item.id]
        let logged = entry != nil
        return Button {
            if item.logDirectly == true {
                Task { await workoutStore.toggleFood(item.id) }
            } else {
                quantityTarget = item
            }
        } label: {
            HStack(spacing: 12) {
                Text(item.icon ?? "🍽️").font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name).font(.subheadline.weight(.semibold))
                    if let entry, let qty = entry.quantity {
                        Text("\(qty.formatted()) \(item.unit ?? "serving")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if item.logDirectly == true {
                        Text("One-tap log")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if logged {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                }
            }
        }
    }
}
