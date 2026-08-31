import SwiftUI

struct SettingsView: View {
    @ObservedObject var authStore: NativeAuthStore
    @ObservedObject var workoutStore: WorkoutStore
    @Binding var navConfigJSON: String
    @AppStorage("app_appearance") private var appearanceRaw = AppAppearance.system.rawValue
    @State private var selectedUnit: WeightUnit = .kg
    @State private var cardSize = ExerciseCardPreferences.cardSize
    @State private var navTabs = NavConfig.defaults

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Theme", selection: $appearanceRaw) {
                        ForEach(AppAppearance.allCases) { option in
                            Text(option.label).tag(option.rawValue)
                        }
                    }
                }

                Section("Workout") {
                    Picker("Weight unit", selection: $selectedUnit) {
                        Text("Kilograms (kg)").tag(WeightUnit.kg)
                        Text("Pounds (lb)").tag(WeightUnit.lb)
                    }
                    .onChange(of: selectedUnit) { _, unit in
                        Task { await workoutStore.updateWeightUnit(unit) }
                    }

                    Picker("Exercise card size", selection: $cardSize) {
                        ForEach(ExerciseCardSize.allCases) { size in
                            Label(size.label, systemImage: size.systemImage).tag(size)
                        }
                    }
                    .onChange(of: cardSize) { _, size in
                        ExerciseCardPreferences.cardSize = size
                    }

                    NavigationLink {
                        RoutineEditorView(workoutStore: workoutStore)
                    } label: {
                        Label("Workout splits", systemImage: "list.bullet.rectangle")
                    }

                    NavigationLink {
                        ExerciseLibraryView(workoutStore: workoutStore)
                    } label: {
                        Label("Exercise library", systemImage: "books.vertical.fill")
                    }
                }

                Section("More") {
                    NavigationLink {
                        LifeLogView(workoutStore: workoutStore)
                    } label: {
                        Label("Life log", systemImage: "heart.text.square")
                    }

                    NavigationLink {
                        FoodView(workoutStore: workoutStore)
                    } label: {
                        Label("Food", systemImage: "fork.knife")
                    }

                    NavigationLink {
                        MacroPlannerView(workoutStore: workoutStore)
                    } label: {
                        Label("Macro planner", systemImage: "chart.pie.fill")
                    }
                }

                Section("Account") {
                    if authStore.isSignedIn {
                        Label("Signed in", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                    }
                    Button("Sign out", role: .destructive) {
                        authStore.signOut()
                        workoutStore.clear()
                    }
                }

                Section("About") {
                    LabeledContent("App", value: "Logbook iOS")
                    LabeledContent("Data", value: workoutStore.usesLiveData ? "Live" : "Preview")
                }

                Section("Navigation") {
                    ForEach($navTabs) { $tab in
                        Toggle(tab.label, isOn: $tab.visible)
                    }
                    Text("At least two tabs must stay visible.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button("Save tab layout") {
                        let visible = navTabs.filter(\.visible)
                        guard visible.count >= 2 else { return }
                        navConfigJSON = NavConfig.save(navTabs)
                        HapticFeedback.success()
                    }
                    Button("Reset tabs to default", role: .destructive) {
                        navTabs = NavConfig.defaults
                        navConfigJSON = ""
                    }
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                selectedUnit = workoutStore.weightUnit
                cardSize = ExerciseCardPreferences.cardSize
                navTabs = navConfigJSON.isEmpty ? NavConfig.defaults : NavConfig.load(from: navConfigJSON)
            }
        }
    }
}
