import Foundation

struct NavTabConfig: Codable, Identifiable, Equatable {
    var id: String
    var label: String
    var visible: Bool

    static let today = NavTabConfig(id: "today", label: "Today", visible: true)
    static let history = NavTabConfig(id: "history", label: "History", visible: true)
    static let checklists = NavTabConfig(id: "checklists", label: "Checklists", visible: true)
    static let dashboard = NavTabConfig(id: "dashboard", label: "Dashboard", visible: true)
    static let settings = NavTabConfig(id: "settings", label: "Settings", visible: true)

    var systemImage: String {
        switch id {
        case "today": "sun.max.fill"
        case "history": "clock.arrow.circlepath"
        case "checklists": "checklist"
        case "dashboard": "chart.bar.fill"
        case "settings": "gearshape.fill"
        default: "circle"
        }
    }
}

enum NavConfig {
    static let defaults: [NavTabConfig] = [
        .today, .history, .checklists, .dashboard, .settings
    ]

    static func load(from json: String) -> [NavTabConfig] {
        guard let data = json.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([NavTabConfig].self, from: data),
              decoded.filter(\.visible).count >= 2 else {
            return defaults
        }
        return mergeWithDefaults(decoded)
    }

    static func save(_ tabs: [NavTabConfig]) -> String {
        let normalized = normalize(tabs)
        guard let data = try? JSONEncoder().encode(normalized) else { return "" }
        return String(data: data, encoding: .utf8) ?? ""
    }

    static func decode(from settings: UserSettingsDTO?) -> [NavTabConfig] {
        defaults
    }

    private static func mergeWithDefaults(_ saved: [NavTabConfig]) -> [NavTabConfig] {
        var ordered: [NavTabConfig] = []
        var seen = Set<String>()

        for tab in saved where defaults.contains(where: { $0.id == tab.id }) {
            ordered.append(tab)
            seen.insert(tab.id)
        }
        for tab in defaults where !seen.contains(tab.id) {
            ordered.append(tab)
        }
        return normalize(ordered)
    }

    /// Settings must stay visible so users cannot lock themselves out of the app.
    private static func normalize(_ tabs: [NavTabConfig]) -> [NavTabConfig] {
        tabs.map { tab in
            guard tab.id == NavTabConfig.settings.id else { return tab }
            var settingsTab = tab
            settingsTab.visible = true
            return settingsTab
        }
    }
}
