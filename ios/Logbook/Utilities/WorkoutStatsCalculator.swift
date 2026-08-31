import Foundation

enum WorkoutStatsCalculator {
    static func computeProfileStats(
        sessions: [ActiveSessionDTO],
        exerciseHistory: [String: ExerciseHistoryDTO],
        calendar: Calendar = .current
    ) -> ProfileStats {
        let completed = sessions.filter { $0.status == "completed" }
        let today = WorkoutDate.todayString(calendar: calendar)
        let monthPrefix = String(today.prefix(7))

        let workoutsThisMonth = completed.filter { ($0.date ?? "").hasPrefix(monthPrefix) }.count
        let weeklyWorkouts = weeklyWorkouts(for: completed, today: today, calendar: calendar)
        let totalSets = completed.flatMap { $0.setLogs ?? [] }.filter(\.isCompleted).count
        let personalBestCount = exerciseHistory.values.filter { ($0.personalRecordWeight ?? 0) > 0 }.count
        let streak = workoutStreak(completed: completed, today: today, calendar: calendar)

        return ProfileStats(
            workoutStreak: streak,
            workoutsThisMonth: workoutsThisMonth,
            weeklyWorkouts: weeklyWorkouts,
            totalSets: totalSets,
            personalBestCount: personalBestCount
        )
    }

    static func completionSummary(from session: ActiveSessionDTO) -> WorkoutCompletionSummary {
        let logs = (session.setLogs ?? []).filter(\.isCompleted)
        let exercises = Set(logs.map { WorkoutCalculations.normalizeExerciseName($0.exerciseName) })
        let volume = logs.reduce(0.0) { $0 + ($1.weight * Double($1.reps)) }

        return WorkoutCompletionSummary(
            id: session.id,
            routineName: session.routineName ?? "Workout",
            exerciseCount: exercises.count,
            setCount: logs.count,
            volume: volume,
            date: session.date ?? WorkoutDate.todayString()
        )
    }

    static func groupHistory(
        sessions: [ActiveSessionDTO],
        legacyLogs: [ExerciseLogDTO]
    ) -> [HistoryDayGroup] {
        var map: [String: (sessions: [HistorySessionItem], legacy: [ExerciseLogDTO])] = [:]

        for session in sessions where session.status == "completed" {
            guard let date = session.date else { continue }
            let logs = (session.setLogs ?? []).filter(\.isCompleted)
            let exercises = Set(logs.map { WorkoutCalculations.normalizeExerciseName($0.exerciseName) })
            let volume = logs.reduce(0.0) { $0 + ($1.weight * Double($1.reps)) }
            let item = HistorySessionItem(
                id: session.id,
                routineName: session.routineName,
                date: date,
                setCount: logs.count,
                exerciseCount: exercises.count,
                volume: volume,
                status: session.status
            )
            var bucket = map[date] ?? (sessions: [], legacy: [])
            bucket.sessions.append(item)
            map[date] = bucket
        }

        for log in legacyLogs {
            var bucket = map[log.date] ?? (sessions: [], legacy: [])
            bucket.legacy.append(log)
            map[log.date] = bucket
        }

        return map.keys.sorted(by: >).map { date in
            let bucket = map[date]!
            return HistoryDayGroup(date: date, sessions: bucket.sessions, legacyLogs: bucket.legacy)
        }
    }

    private static func weeklyWorkouts(
        for sessions: [ActiveSessionDTO],
        today: String,
        calendar: Calendar
    ) -> Int {
        guard let end = dateFromString(today, calendar: calendar),
              let start = calendar.date(byAdding: .day, value: -6, to: end) else { return 0 }

        let startString = WorkoutDate.string(from: start, calendar: calendar)
        let dates = Set(
            sessions.compactMap { session -> String? in
                guard let date = session.date, date >= startString, date <= today else { return nil }
                return date
            }
        )
        return dates.count
    }

    private static func workoutStreak(
        completed: [ActiveSessionDTO],
        today: String,
        calendar: Calendar
    ) -> Int {
        let dates = Set(completed.compactMap(\.date))
        guard let todayDate = dateFromString(today, calendar: calendar) else { return 0 }

        var cursor = todayDate
        if !dates.contains(today), let yesterday = calendar.date(byAdding: .day, value: -1, to: todayDate) {
            cursor = yesterday
        }

        var streak = 0
        while dates.contains(WorkoutDate.string(from: cursor, calendar: calendar)) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = previous
        }
        return streak
    }

    static func weeklyWorkoutTrend(
        sessions: [ActiveSessionDTO],
        weeks: Int = 8,
        calendar: Calendar = .current
    ) -> [WorkoutWeekPoint] {
        let today = WorkoutDate.todayString(calendar: calendar)
        guard let end = WorkoutDate.date(from: today, calendar: calendar) else { return [] }

        let completed = sessions.filter { $0.status == "completed" }
        var points: [WorkoutWeekPoint] = []

        for offset in stride(from: weeks - 1, through: 0, by: -1) {
            guard let weekStart = calendar.date(byAdding: .day, value: -(offset * 7 + 6), to: end),
                  let weekEnd = calendar.date(byAdding: .day, value: -(offset * 7), to: end) else { continue }

            let startString = WorkoutDate.string(from: weekStart, calendar: calendar)
            let endString = WorkoutDate.string(from: weekEnd, calendar: calendar)
            let dates = Set(
                completed.compactMap { session -> String? in
                    guard let date = session.date, date >= startString, date <= endString else { return nil }
                    return date
                }
            )

            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            let label = formatter.string(from: weekEnd)
            points.append(WorkoutWeekPoint(id: endString, label: label, count: dates.count))
        }

        return points
    }

    static func exerciseOverloadTimeline(sessions: [ActiveSessionDTO]) -> [ExerciseOverloadPoint] {
        var points: [ExerciseOverloadPoint] = []

        for session in sessions where session.status == "completed" {
            guard let date = session.date else { continue }
            var bestByExercise: [String: (weight: Double, reps: Int, category: String?)] = [:]

            for log in session.setLogs ?? [] where log.isCompleted {
                let name = log.exerciseName
                let existing = bestByExercise[name]
                if existing == nil
                    || log.weight > existing!.weight
                    || (log.weight == existing!.weight && log.reps > existing!.reps) {
                    bestByExercise[name] = (log.weight, log.reps, log.category)
                }
            }

            for (name, best) in bestByExercise {
                points.append(ExerciseOverloadPoint(
                    id: "\(date)-\(name)",
                    date: date,
                    exerciseName: name,
                    areaCategory: ExerciseAreaGroups.normalizeAreaCategory(best.category),
                    topWeight: best.weight,
                    topReps: best.reps
                ))
            }
        }

        return points.sorted { $0.date < $1.date }
    }

    private static func dateFromString(_ value: String, calendar: Calendar) -> Date? {
        WorkoutDate.date(from: value, calendar: calendar)
    }
}

extension WorkoutDate {
    static func displayLabel(for isoDate: String, today: String? = nil) -> String {
        let todayValue = today ?? todayString()
        if isoDate == todayValue { return "Today" }
        guard let date = date(from: isoDate) else { return isoDate }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    static func string(from date: Date, calendar: Calendar = .current) -> String {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func date(from string: String, calendar: Calendar = .current) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: string)
    }
}
