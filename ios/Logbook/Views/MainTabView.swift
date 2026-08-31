import SwiftUI

struct MainTabView: View {
    @ObservedObject var authStore: NativeAuthStore
    @ObservedObject var workoutStore: WorkoutStore
    @AppStorage("nav_tabs_config") private var navConfigJSON = ""
    @State private var selectedTab = NavTabConfig.today.id

    private var visibleTabs: [NavTabConfig] {
        let tabs = navConfigJSON.isEmpty ? NavConfig.defaults : NavConfig.load(from: navConfigJSON)
        return tabs.filter(\.visible)
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(visibleTabs) { tab in
                tabRoot(for: tab)
                    .tag(tab.id)
                    .tabItem {
                        LogbookTabItemLabel(title: tab.label, systemImage: tab.systemImage)
                    }
            }
        }
        .tint(.orange)
        .background(Color(.systemGroupedBackground))
        .onAppear {
            LogbookTabBarStyle.apply()
            ensureValidSelection()
        }
        .onChange(of: navConfigJSON) { _, _ in
            ensureValidSelection()
        }
        .blockingLoadingOverlay(workoutStore.loadState == .loading)
    }

    @ViewBuilder
    private func tabRoot(for tab: NavTabConfig) -> some View {
        switch tab.id {
        case NavTabConfig.today.id:
            TodayView(
                authStore: authStore,
                workoutStore: workoutStore,
                selectedTab: $selectedTab
            )
        case NavTabConfig.history.id:
            HistoryView(workoutStore: workoutStore, selectedTab: $selectedTab)
        case NavTabConfig.checklists.id:
            ChecklistsView(workoutStore: workoutStore)
        case NavTabConfig.dashboard.id:
            WorkoutProgressView(workoutStore: workoutStore)
        case NavTabConfig.settings.id:
            SettingsView(
                authStore: authStore,
                workoutStore: workoutStore,
                navConfigJSON: $navConfigJSON
            )
        default:
            EmptyView()
        }
    }

    private func ensureValidSelection() {
        if !visibleTabs.contains(where: { $0.id == selectedTab }) {
            selectedTab = visibleTabs.first?.id ?? NavTabConfig.today.id
        }
    }
}
