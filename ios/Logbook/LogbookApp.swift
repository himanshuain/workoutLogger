import SwiftUI

@main
struct LogbookApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        LogbookTabBarStyle.apply()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
