import SwiftUI
import UIKit

enum LogbookTabBarStyle {
    static func apply() {
        applyTabBar()
        applyNavigationBar()
    }

    private static func applyTabBar() {
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.shadowColor = UIColor.separator.withAlphaComponent(0.18)

        let stacked = appearance.stackedLayoutAppearance
        let normalFont = UIFont.systemFont(ofSize: 10, weight: .medium)
        let selectedFont = UIFont.systemFont(ofSize: 10, weight: .semibold)
        stacked.normal.titleTextAttributes = [.font: normalFont]
        stacked.selected.titleTextAttributes = [.font: selectedFont]

        let tabBar = UITabBar.appearance()
        tabBar.standardAppearance = appearance
        tabBar.scrollEdgeAppearance = appearance
        tabBar.tintColor = UIColor.systemOrange
        tabBar.unselectedItemTintColor = UIColor.secondaryLabel
        tabBar.isTranslucent = true
    }

    private static func applyNavigationBar() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.shadowColor = UIColor.separator.withAlphaComponent(0.12)

        let navigationBar = UINavigationBar.appearance()
        navigationBar.standardAppearance = appearance
        navigationBar.compactAppearance = appearance
        navigationBar.scrollEdgeAppearance = appearance
    }
}

struct LogbookTabItemLabel: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label {
            Text(title)
        } icon: {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .regular))
        }
    }
}
