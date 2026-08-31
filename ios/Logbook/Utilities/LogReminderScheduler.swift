import Foundation
import UIKit
import UserNotifications

enum LogReminderKind: String {
    case habit
    case lifeLog
}

struct LogReminderPreference: Codable, Equatable {
    var enabled = false
    var hour = 9
    var minute = 0

    static func defaultFor(_ kind: LogReminderKind) -> LogReminderPreference {
        var pref = LogReminderPreference()
        if kind == .lifeLog {
            pref.hour = 20
        }
        return pref
    }
}

enum LogReminderPreferences {
    private static func storageKey(_ id: UUID, kind: LogReminderKind) -> String {
        "log_reminder.\(kind.rawValue).\(id.uuidString)"
    }

    static func load(for id: UUID, kind: LogReminderKind) -> LogReminderPreference {
        guard let data = UserDefaults.standard.data(forKey: storageKey(id, kind: kind)),
              let pref = try? JSONDecoder().decode(LogReminderPreference.self, from: data) else {
            return .defaultFor(kind)
        }
        return pref
    }

    static func save(_ preference: LogReminderPreference, for id: UUID, kind: LogReminderKind) {
        guard let data = try? JSONEncoder().encode(preference) else { return }
        UserDefaults.standard.set(data, forKey: storageKey(id, kind: kind))
    }

    static func remove(for id: UUID, kind: LogReminderKind) {
        UserDefaults.standard.removeObject(forKey: storageKey(id, kind: kind))
    }

    static func isEnabled(for id: UUID, kind: LogReminderKind) -> Bool {
        load(for: id, kind: kind).enabled
    }
}

enum LogReminderScheduler {
    static let habitCategoryID = "LOG_HABIT"
    static let lifeLogCategoryID = "LOG_LIFELOG"
    static let logNowActionID = "LOG_NOW"

    static func registerCategories() {
        let logAction = UNNotificationAction(
            identifier: logNowActionID,
            title: "Log now",
            options: [.authenticationRequired]
        )
        let habitCategory = UNNotificationCategory(
            identifier: habitCategoryID,
            actions: [logAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        let lifeLogCategory = UNNotificationCategory(
            identifier: lifeLogCategoryID,
            actions: [logAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([habitCategory, lifeLogCategory])
    }

    static func requestAuthorizationIfNeeded() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .denied:
            return false
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        @unknown default:
            return false
        }
    }

    static func reschedule(habits: [TrackableDTO], events: [EventTypeDTO]) {
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { requests in
            let stale = requests.filter {
                $0.identifier.hasPrefix("habit.") || $0.identifier.hasPrefix("lifelog.")
            }.map(\.identifier)
            center.removePendingNotificationRequests(withIdentifiers: stale)

            for habit in schedulableHabits(from: habits) {
                let pref = LogReminderPreferences.load(for: habit.id, kind: .habit)
                guard pref.enabled else { continue }
                scheduleHabit(habit, hour: pref.hour, minute: pref.minute, center: center)
            }
            for event in events {
                let pref = LogReminderPreferences.load(for: event.id, kind: .lifeLog)
                guard pref.enabled else { continue }
                scheduleLifeLog(event, hour: pref.hour, minute: pref.minute, center: center)
            }
        }
    }

    private static func schedulableHabits(from habits: [TrackableDTO]) -> [TrackableDTO] {
        habits.filter { habit in
            let type = habit.type?.lowercased() ?? ""
            let name = habit.name.lowercased()
            if type.contains("body") || name.contains("body weight") || name == "weight" { return false }
            return true
        }
    }

    private static func scheduleHabit(_ habit: TrackableDTO, hour: Int, minute: Int, center: UNUserNotificationCenter) {
        let weekdays = habit.activeDays?.isEmpty == false ? habit.activeDays! : Array(0..<7)
        for day in weekdays {
            var date = DateComponents()
            date.hour = hour
            date.minute = minute
            date.weekday = day + 1

            let content = UNMutableNotificationContent()
            content.title = "\(habit.icon ?? "✓") \(habit.name)"
            content.body = "Long-press and tap Log now to check this off for today."
            content.sound = .default
            content.categoryIdentifier = habitCategoryID
            content.userInfo = [
                "type": "habit",
                "id": habit.id.uuidString
            ]

            let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
            let id = "habit.\(habit.id.uuidString).\(day)"
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }

    private static func scheduleLifeLog(_ event: EventTypeDTO, hour: Int, minute: Int, center: UNUserNotificationCenter) {
        var date = DateComponents()
        date.hour = hour
        date.minute = minute

        let content = UNMutableNotificationContent()
        content.title = "\(event.icon ?? "📝") \(event.name)"
        content.body = "Long-press and tap Log now to record this for today."
        content.sound = .default
        content.categoryIdentifier = lifeLogCategoryID
        content.userInfo = [
            "type": "lifelog",
            "id": event.id.uuidString
        ]

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let id = "lifelog.\(event.id.uuidString)"
        center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }
}

enum NotificationLogHandler {
    static func handle(_ response: UNNotificationResponse) async {
        guard response.actionIdentifier == LogReminderScheduler.logNowActionID else { return }
        guard let client = NativeSupabaseConfig.fromBundle.map({ SupabaseClient(config: $0) }) else { return }
        guard let accessToken = KeychainTokenStore.read(.accessToken),
              let userID = JWTUserID.extract(from: accessToken) else { return }

        let userInfo = response.notification.request.content.userInfo
        guard let type = userInfo["type"] as? String,
              let idString = userInfo["id"] as? String,
              let itemID = UUID(uuidString: idString) else { return }

        let date = WorkoutDate.todayString()
        let dataService = WorkoutDataService(client: client)

        do {
            switch type {
            case "habit":
                let entries = try await dataService.fetchTrackingEntries(accessToken: accessToken, date: date)
                let existing = entries.first { $0.trackableID == itemID }
                if existing?.isCompleted == true { return }
                _ = try await dataService.toggleTrackingEntry(
                    accessToken: accessToken,
                    userID: userID,
                    trackableID: itemID,
                    date: date,
                    existing: existing,
                    markComplete: true
                )
            case "lifelog":
                let logs = try await dataService.fetchEventLogsRange(
                    accessToken: accessToken,
                    startDate: date,
                    endDate: date
                )
                if logs.contains(where: { $0.eventTypeID == itemID }) { return }
                _ = try await dataService.logLifeEvent(
                    accessToken: accessToken,
                    userID: userID,
                    eventTypeID: itemID,
                    date: date
                )
            default:
                break
            }
        } catch {
            await postConfirmation(title: "Could not log", body: error.localizedDescription)
        }
    }

    @MainActor
    private static func postConfirmation(title: String, body: String) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(request)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        LogReminderScheduler.registerCategories()
        UNUserNotificationCenter.current().delegate = self
        application.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .forEach { $0.backgroundColor = .systemGroupedBackground }
        return true
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task {
            await NotificationLogHandler.handle(response)
            completionHandler()
        }
    }
}
