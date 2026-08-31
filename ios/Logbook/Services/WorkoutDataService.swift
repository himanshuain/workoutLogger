import Foundation

struct WorkoutDataService {
    let client: SupabaseClient

    func fetchInitData(accessToken: String, today: String) async throws -> InitDataDTO {
        try await client.rpc("get_user_init_data", params: ["p_today": today], accessToken: accessToken)
    }

    func fetchRoutines(accessToken: String) async throws -> [RoutineDTO] {
        let query = "select=*,routine_exercises(id,exercise_id,exercise_name,category,target_sets,order_index,notes,is_pinned)&order=created_at.desc"
        return try await client.get("workout_routines", query: query, accessToken: accessToken)
    }

    func fetchExercises(accessToken: String) async throws -> [ExerciseDTO] {
        try await client.get("exercises", query: "select=id,name,category,gif_url,image_url,external_source,external_id", accessToken: accessToken)
    }

    func createCustomExercise(
        accessToken: String,
        userID: UUID,
        name: String,
        category: String,
        equipment: String?
    ) async throws -> ExerciseDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let category: String
            let isPredefined: Bool
            let metadata: [String: String]

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, category
                case isPredefined = "is_predefined"
                case metadata
            }
        }

        let metadata: [String: String]
        if let equipment, !equipment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            metadata = ["equipment_display": equipment.trimmingCharacters(in: .whitespacesAndNewlines)]
        } else {
            metadata = [:]
        }

        return try await client.insert(
            "exercises",
            value: Insert(userID: userID, name: name, category: category, isPredefined: false, metadata: metadata),
            accessToken: accessToken
        )
    }

    func upsertExerciseMediaOverrides(
        accessToken: String,
        userID: UUID,
        overrides: [String: [String: String]]
    ) async throws -> UserSettingsDTO {
        struct Payload: Encodable {
            let userID: UUID?
            let exerciseMediaOverrides: [String: [String: String]]

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case exerciseMediaOverrides = "exercise_media_overrides"
            }
        }

        let rows: [UserSettingsDTO] = try await client.patch(
            "user_settings",
            query: "user_id=eq.\(userID.uuidString)",
            value: Payload(userID: nil, exerciseMediaOverrides: overrides),
            accessToken: accessToken
        )
        if let row = rows.first { return row }

        return try await client.insert(
            "user_settings",
            value: Payload(userID: userID, exerciseMediaOverrides: overrides),
            accessToken: accessToken
        )
    }

    func fetchActiveSession(accessToken: String, date: String) async throws -> ActiveSessionDTO? {
        let query = "select=*,set_logs(*)&date=eq.\(date)&status=eq.active&order=started_at.desc&limit=1"
        let sessions: [ActiveSessionDTO] = try await client.get("workout_sessions", query: query, accessToken: accessToken)
        return sessions.first
    }

    func fetchCompletedSession(accessToken: String, date: String) async throws -> ActiveSessionDTO? {
        let query = "select=*,set_logs(*)&date=eq.\(date)&status=eq.completed&order=completed_at.desc&limit=1"
        let sessions: [ActiveSessionDTO] = try await client.get("workout_sessions", query: query, accessToken: accessToken)
        return sessions.first
    }

    func fetchSessionsForDate(accessToken: String, date: String) async throws -> [ActiveSessionDTO] {
        let query = "select=*,set_logs(*)&date=eq.\(date)&order=started_at.desc"
        return try await client.get("workout_sessions", query: query, accessToken: accessToken)
    }

    func fetchSession(accessToken: String, sessionID: UUID) async throws -> ActiveSessionDTO? {
        let query = "select=*,set_logs(*)&id=eq.\(sessionID.uuidString)&limit=1"
        let sessions: [ActiveSessionDTO] = try await client.get("workout_sessions", query: query, accessToken: accessToken)
        return sessions.first
    }

    func fetchExerciseHistory(accessToken: String) async throws -> [ExerciseHistoryDTO] {
        try await client.get("exercise_history", query: "select=*", accessToken: accessToken)
    }

    func fetchUserSettings(accessToken: String, userID: UUID) async throws -> UserSettingsDTO? {
        let query = "select=unit,display_name,exercise_media_overrides,macro_targets,macro_plans&user_id=eq.\(userID.uuidString)&limit=1"
        let rows: [UserSettingsDTO] = try await client.get("user_settings", query: query, accessToken: accessToken)
        return rows.first
    }

    func fetchTrackables(accessToken: String) async throws -> [TrackableDTO] {
        try await client.get("trackables", query: "select=*&order=order_index.asc", accessToken: accessToken)
    }

    func fetchFoodItems(accessToken: String) async throws -> [FoodItemDTO] {
        try await client.get("food_items", query: "select=*&order=order_index.asc", accessToken: accessToken)
    }

    func fetchEventTypes(accessToken: String) async throws -> [EventTypeDTO] {
        let query = "select=*,event_logs(id,date,notes,cost,event_type_id)&order=order_index.asc"
        return try await client.get("event_types", query: query, accessToken: accessToken)
    }

    func fetchStepCards(accessToken: String) async throws -> [StepCardDTO] {
        let query = "select=*,step_items(id,text,order_index)&order=order_index.asc"
        return try await client.get("step_cards", query: query, accessToken: accessToken)
    }

    func updateUserSettings(accessToken: String, userID: UUID, unit: String?, displayName: String?) async throws -> UserSettingsDTO {
        struct Patch: Encodable {
            let unit: String?
            let displayName: String?

            enum CodingKeys: String, CodingKey {
                case unit
                case displayName = "display_name"
            }
        }

        let rows: [UserSettingsDTO] = try await client.patch(
            "user_settings",
            query: "user_id=eq.\(userID.uuidString)",
            value: Patch(unit: unit, displayName: displayName),
            accessToken: accessToken
        )
        if let row = rows.first { return row }

        struct Insert: Encodable {
            let userID: UUID
            let unit: String?
            let displayName: String?

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case unit
                case displayName = "display_name"
            }
        }

        return try await client.insert(
            "user_settings",
            value: Insert(userID: userID, unit: unit, displayName: displayName),
            accessToken: accessToken
        )
    }

    /// Reuse today's active session when routine matches; patch routine when switching splits.
    func ensureActiveSession(
        accessToken: String,
        userID: UUID,
        routineID: UUID,
        routineName: String,
        date: String
    ) async throws -> ActiveSessionDTO {
        if let existing = try await fetchActiveSession(accessToken: accessToken, date: date) {
            if existing.routineID == routineID {
                return existing
            }
            return try await updateSessionRoutine(
                accessToken: accessToken,
                sessionID: existing.id,
                routineID: routineID,
                routineName: routineName
            )
        }
        let created = try await createWorkoutSession(
            accessToken: accessToken,
            userID: userID,
            routineID: routineID,
            routineName: routineName,
            date: date
        )
        return created.asActiveSession()
    }

    func updateSessionRoutine(
        accessToken: String,
        sessionID: UUID,
        routineID: UUID,
        routineName: String
    ) async throws -> ActiveSessionDTO {
        struct Payload: Encodable {
            let routineID: UUID
            let routineName: String

            enum CodingKeys: String, CodingKey {
                case routineID = "routine_id"
                case routineName = "routine_name"
            }
        }

        let rows: [WorkoutSessionDTO] = try await client.patch(
            "workout_sessions",
            query: "id=eq.\(sessionID.uuidString)",
            value: Payload(routineID: routineID, routineName: routineName),
            accessToken: accessToken
        )
        guard let updated = rows.first else { throw SupabaseClientError.invalidResponse }
        if let session = try await fetchSession(accessToken: accessToken, sessionID: updated.id) {
            return session
        }
        return updated.asActiveSession()
    }

    func createWorkoutSession(
        accessToken: String,
        userID: UUID,
        routineID: UUID,
        routineName: String,
        date: String
    ) async throws -> WorkoutSessionDTO {
        struct Payload: Encodable {
            let userID: UUID
            let routineID: UUID
            let routineName: String
            let date: String
            let status: String
            let currentExerciseIndex: Int

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case routineID = "routine_id"
                case routineName = "routine_name"
                case date, status
                case currentExerciseIndex = "current_exercise_index"
            }
        }

        return try await client.insert(
            "workout_sessions",
            value: Payload(userID: userID, routineID: routineID, routineName: routineName, date: date, status: "active", currentExerciseIndex: 0),
            accessToken: accessToken
        )
    }

    func insertSetLog(accessToken: String, payload: SetLogInsert) async throws -> SetLogDTO {
        try await client.insert("set_logs", value: payload, accessToken: accessToken)
    }

    func updateSetLog(accessToken: String, id: UUID, payload: SetLogUpdate) async throws -> SetLogDTO {
        let rows: [SetLogDTO] = try await client.patch("set_logs", query: "id=eq.\(id.uuidString)", value: payload, accessToken: accessToken)
        guard let row = rows.first else { throw SupabaseClientError.invalidResponse }
        return row
    }

    func deleteSetLog(accessToken: String, id: UUID) async throws {
        try await client.delete("set_logs", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func completeWorkoutSession(
        accessToken: String,
        userID: UUID,
        sessionID: UUID,
        exerciseHistory: [String: ExerciseHistoryDTO]
    ) async throws {
        struct CompletePayload: Encodable {
            let status: String
            let completedAt: String

            enum CodingKeys: String, CodingKey {
                case status
                case completedAt = "completed_at"
            }
        }

        let completedAt = ISO8601DateFormatter().string(from: Date())
        let _: [WorkoutSessionDTO] = try await client.patch(
            "workout_sessions",
            query: "id=eq.\(sessionID.uuidString)",
            value: CompletePayload(status: "completed", completedAt: completedAt),
            accessToken: accessToken
        )

        guard let session = try await fetchSession(accessToken: accessToken, sessionID: sessionID) else { return }

        let completedLogs = (session.setLogs ?? []).filter(\.isCompleted)
        var aggregates: [String: ExerciseAggregate] = [:]

        for log in completedLogs {
            let key = log.exerciseName
            var entry = aggregates[key] ?? ExerciseAggregate()
            entry.sets += 1
            entry.totalReps += log.reps
            entry.maxWeight = max(entry.maxWeight, log.weight)
            aggregates[key] = entry
        }

        for (exerciseName, data) in aggregates {
            let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
            let existing = exerciseHistory[normalized] ?? exerciseHistory[exerciseName]
            let avgReps = data.sets > 0 ? Int((Double(data.totalReps) / Double(data.sets)).rounded()) : 0
            let payload = ExerciseHistoryUpsert(
                id: existing?.id,
                userID: userID,
                exerciseName: exerciseName,
                lastWeight: data.maxWeight,
                lastReps: avgReps,
                lastSets: data.sets,
                personalRecordWeight: max(data.maxWeight, existing?.personalRecordWeight ?? 0),
                timesPerformed: (existing?.timesPerformed ?? 0) + 1,
                lastPerformedAt: completedAt
            )
            try await upsertExerciseHistory(accessToken: accessToken, payload: payload)
        }
    }

    func resetSessionExerciseLogs(accessToken: String, sessionID: UUID, exerciseName: String) async throws {
        let query = "session_id=eq.\(sessionID.uuidString)&\(PostgRESTQuery.eq("exercise_name", value: exerciseName))"
        try await client.delete("set_logs", query: query, accessToken: accessToken)
    }

    func deleteWorkoutSession(accessToken: String, sessionID: UUID) async throws {
        try await client.delete("set_logs", query: "session_id=eq.\(sessionID.uuidString)", accessToken: accessToken)
        try await client.delete("workout_sessions", query: "id=eq.\(sessionID.uuidString)", accessToken: accessToken)
    }

    func upsertExerciseHistory(accessToken: String, payload: ExerciseHistoryUpsert) async throws {
        if let id = payload.id {
            let _: [ExerciseHistoryDTO] = try await client.patch(
                "exercise_history",
                query: "id=eq.\(id.uuidString)",
                value: payload,
                accessToken: accessToken
            )
        } else {
            let _: ExerciseHistoryDTO = try await client.insert(
                "exercise_history",
                value: payload,
                accessToken: accessToken
            )
        }
    }

    static func setLogInsertPayload(
        session: ActiveSessionDTO,
        userID: UUID,
        exerciseName: String,
        category: String?,
        weight: Double,
        reps: Int,
        exerciseHistory: ExerciseHistoryDTO?
    ) -> SetLogInsert {
        let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
        let rows = (session.setLogs ?? []).filter {
            WorkoutCalculations.normalizeExerciseName($0.exerciseName) == normalized
        }
        let maxNum = rows.compactMap(\.setNumber).max() ?? 0
        let last = rows.max { ($0.setNumber ?? 0) < ($1.setNumber ?? 0) }
        let previousWeight = last?.previousWeight ?? exerciseHistory?.lastWeight ?? weight
        let previousReps = last?.previousReps ?? exerciseHistory?.lastReps ?? reps

        return SetLogInsert(
            userID: userID,
            sessionID: session.id,
            exerciseName: exerciseName,
            category: category,
            setNumber: maxNum + 1,
            weight: weight,
            reps: reps,
            isCompleted: true,
            previousWeight: previousWeight,
            previousReps: previousReps
        )
    }

    func fetchWorkoutSessions(accessToken: String, startDate: String, endDate: String) async throws -> [ActiveSessionDTO] {
        let query = "select=*,set_logs(*)&date=gte.\(startDate)&date=lte.\(endDate)&order=date.desc"
        return try await client.get("workout_sessions", query: query, accessToken: accessToken)
    }

    func fetchTodayCompletedSession(accessToken: String, today: String) async throws -> ActiveSessionDTO? {
        try await fetchCompletedSession(accessToken: accessToken, date: today)
    }

    func fetchExerciseLogs(accessToken: String, startDate: String, endDate: String) async throws -> [ExerciseLogDTO] {
        let query = "select=*&date=gte.\(startDate)&date=lte.\(endDate)&order=date.desc"
        return try await client.get("exercise_logs", query: query, accessToken: accessToken)
    }

    func reopenWorkoutSession(accessToken: String, sessionID: UUID) async throws {
        struct Payload: Encodable {
            let status: String

            enum CodingKeys: String, CodingKey {
                case status
                case completedAt = "completed_at"
            }

            func encode(to encoder: Encoder) throws {
                var container = encoder.container(keyedBy: CodingKeys.self)
                try container.encode(status, forKey: .status)
                try container.encodeNil(forKey: .completedAt)
            }
        }
        let _: [WorkoutSessionDTO] = try await client.patch(
            "workout_sessions",
            query: "id=eq.\(sessionID.uuidString)",
            value: Payload(status: "active"),
            accessToken: accessToken
        )
    }

    func fetchExerciseSetHistory(
        accessToken: String,
        exerciseName: String,
        startDate: String,
        endDate: String,
        excludeSessionID: UUID? = nil
    ) async throws -> [ExerciseSessionEntry] {
        let sessions = try await fetchWorkoutSessions(accessToken: accessToken, startDate: startDate, endDate: endDate)
        var entries: [ExerciseSessionEntry] = []

        let normalizedTarget = WorkoutCalculations.normalizeExerciseName(exerciseName)
        for session in sessions {
            if session.id == excludeSessionID { continue }
            let sets = (session.setLogs ?? [])
                .filter {
                    WorkoutCalculations.normalizeExerciseName($0.exerciseName) == normalizedTarget && $0.isCompleted
                }
                .sorted { ($0.setNumber ?? 0) < ($1.setNumber ?? 0) }
                .map { ExerciseSetEntry(weight: $0.weight, reps: $0.reps) }
            guard !sets.isEmpty else { continue }
            entries.append(
                ExerciseSessionEntry(
                    sessionID: session.id,
                    date: session.date ?? endDate,
                    routineName: session.routineName,
                    sets: sets
                )
            )
        }

        return entries.sorted { $0.date > $1.date }
    }

    static func historyStartDate(lookbackDays: Int = 365, calendar: Calendar = .current) -> String {
        let today = WorkoutDate.todayString(calendar: calendar)
        guard let end = WorkoutDate.date(from: today, calendar: calendar),
              let start = calendar.date(byAdding: .day, value: -lookbackDays, to: end) else {
            return today
        }
        return WorkoutDate.string(from: start, calendar: calendar)
    }

    func fetchTrackingEntries(accessToken: String, date: String) async throws -> [TrackingEntryDTO] {
        let query = "select=*&date=eq.\(date)"
        return try await client.get("tracking_entries", query: query, accessToken: accessToken)
    }

    func fetchTrackingEntriesForTrackable(
        accessToken: String,
        trackableID: UUID,
        limit: Int = 60
    ) async throws -> [TrackingEntryDTO] {
        let query = "select=*&trackable_id=eq.\(trackableID.uuidString)&order=date.desc&limit=\(limit)"
        return try await client.get("tracking_entries", query: query, accessToken: accessToken)
    }

    func fetchFoodEntries(accessToken: String, date: String) async throws -> [FoodEntryDTO] {
        let query = "select=*&date=eq.\(date)"
        return try await client.get("food_entries", query: query, accessToken: accessToken)
    }

    func toggleTrackingEntry(
        accessToken: String,
        userID: UUID,
        trackableID: UUID,
        date: String,
        existing: TrackingEntryDTO?,
        markComplete: Bool
    ) async throws -> TrackingEntryDTO? {
        if let existing {
            if markComplete {
                struct Patch: Encodable {
                    let isCompleted: Bool
                    enum CodingKeys: String, CodingKey { case isCompleted = "is_completed" }
                }
                let rows: [TrackingEntryDTO] = try await client.patch(
                    "tracking_entries",
                    query: "id=eq.\(existing.id.uuidString)",
                    value: Patch(isCompleted: true),
                    accessToken: accessToken
                )
                return rows.first
            } else {
                try await client.delete("tracking_entries", query: "id=eq.\(existing.id.uuidString)", accessToken: accessToken)
                return nil
            }
        }

        guard markComplete else { return nil }

        struct Insert: Encodable {
            let userID: UUID
            let trackableID: UUID
            let date: String
            let isCompleted: Bool

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case trackableID = "trackable_id"
                case date
                case isCompleted = "is_completed"
            }
        }

        return try await client.insert(
            "tracking_entries",
            value: Insert(userID: userID, trackableID: trackableID, date: date, isCompleted: true),
            accessToken: accessToken
        )
    }

    func toggleFoodEntry(
        accessToken: String,
        userID: UUID,
        foodItemID: UUID,
        date: String,
        existing: FoodEntryDTO?
    ) async throws -> FoodEntryDTO? {
        if let existing {
            try await client.delete("food_entries", query: "id=eq.\(existing.id.uuidString)", accessToken: accessToken)
            return nil
        }

        struct Insert: Encodable {
            let userID: UUID
            let foodItemID: UUID
            let date: String
            let quantity: Double
            let isCompleted: Bool

            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case foodItemID = "food_item_id"
                case date, quantity
                case isCompleted = "is_completed"
            }
        }

        return try await client.insert(
            "food_entries",
            value: Insert(userID: userID, foodItemID: foodItemID, date: date, quantity: 1, isCompleted: true),
            accessToken: accessToken
        )
    }

    // MARK: - Life log

    func createEventType(
        accessToken: String,
        userID: UUID,
        name: String,
        icon: String,
        orderIndex: Int,
        needNotes: Bool = false,
        trackGraph: Bool = false,
        color: String? = nil,
        description: String? = nil
    ) async throws -> EventTypeDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let icon: String
            let orderIndex: Int
            let needNotes: Bool
            let trackGraph: Bool
            let color: String?
            let description: String?
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, icon, color, description
                case orderIndex = "order_index"
                case needNotes = "need_notes"
                case trackGraph = "track_graph"
            }
        }
        return try await client.insert(
            "event_types",
            value: Insert(
                userID: userID,
                name: name,
                icon: icon,
                orderIndex: orderIndex,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: description
            ),
            accessToken: accessToken
        )
    }

    func deleteEventType(accessToken: String, id: UUID) async throws {
        try await client.delete("event_types", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func logLifeEvent(
        accessToken: String,
        userID: UUID,
        eventTypeID: UUID,
        date: String,
        notes: String? = nil,
        cost: Double? = nil
    ) async throws -> EventLogDTO {
        struct Insert: Encodable {
            let userID: UUID
            let eventTypeID: UUID
            let date: String
            let notes: String?
            let cost: Double?
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case eventTypeID = "event_type_id"
                case date, notes, cost
            }
        }
        return try await client.insert(
            "event_logs",
            value: Insert(userID: userID, eventTypeID: eventTypeID, date: date, notes: notes, cost: cost),
            accessToken: accessToken
        )
    }

    func deleteEventLog(accessToken: String, logID: UUID) async throws {
        try await client.delete("event_logs", query: "id=eq.\(logID.uuidString)", accessToken: accessToken)
    }

    func updateEventLog(
        accessToken: String,
        logID: UUID,
        notes: String?,
        cost: Double?,
        date: String
    ) async throws -> EventLogDTO {
        struct Patch: Encodable {
            let notes: String?
            let cost: Double?
            let date: String
        }
        let rows: [EventLogDTO] = try await client.patch(
            "event_logs",
            query: "id=eq.\(logID.uuidString)",
            value: Patch(notes: notes, cost: cost, date: date),
            accessToken: accessToken
        )
        guard let row = rows.first else { throw SupabaseClientError.invalidResponse }
        return row
    }

    // MARK: - Habits catalog

    func createTrackable(accessToken: String, userID: UUID, name: String, icon: String, orderIndex: Int) async throws -> TrackableDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let icon: String
            let type: String
            let orderIndex: Int
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, icon, type
                case orderIndex = "order_index"
            }
        }
        return try await client.insert(
            "trackables",
            value: Insert(userID: userID, name: name, icon: icon, type: "habit", orderIndex: orderIndex),
            accessToken: accessToken
        )
    }

    func deleteTrackable(accessToken: String, id: UUID) async throws {
        try await client.delete("trackables", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func updateTrackable(
        accessToken: String,
        id: UUID,
        name: String,
        icon: String,
        hasValue: Bool,
        valueUnit: String?,
        activeDays: [Int]?,
        color: String? = nil
    ) async throws -> TrackableDTO {
        struct Patch: Encodable {
            let name: String
            let icon: String
            let hasValue: Bool
            let valueUnit: String?
            let activeDays: [Int]?
            let color: String?
            enum CodingKeys: String, CodingKey {
                case name, icon, color
                case hasValue = "has_value"
                case valueUnit = "value_unit"
                case activeDays = "active_days"
            }
        }
        let rows: [TrackableDTO] = try await client.patch(
            "trackables",
            query: "id=eq.\(id.uuidString)",
            value: Patch(
                name: name,
                icon: icon,
                hasValue: hasValue,
                valueUnit: valueUnit,
                activeDays: activeDays,
                color: color
            ),
            accessToken: accessToken
        )
        guard let row = rows.first else { throw SupabaseClientError.invalidResponse }
        return row
    }

    // MARK: - Food catalog

    func createFoodItem(
        accessToken: String,
        userID: UUID,
        name: String,
        icon: String,
        orderIndex: Int,
        unit: String? = "serving",
        logDirectly: Bool = false,
        proteinG: Double? = nil,
        carbsG: Double? = nil,
        fatG: Double? = nil,
        calories: Double? = nil,
        color: String? = nil
    ) async throws -> FoodItemDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let icon: String
            let orderIndex: Int
            let unit: String?
            let logDirectly: Bool
            let proteinG: Double?
            let carbsG: Double?
            let fatG: Double?
            let calories: Double?
            let color: String?
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, icon, unit, calories, color
                case orderIndex = "order_index"
                case logDirectly = "log_directly"
                case proteinG = "protein_g"
                case carbsG = "carbs_g"
                case fatG = "fat_g"
            }
        }
        return try await client.insert(
            "food_items",
            value: Insert(
                userID: userID,
                name: name,
                icon: icon,
                orderIndex: orderIndex,
                unit: unit,
                logDirectly: logDirectly,
                proteinG: proteinG,
                carbsG: carbsG,
                fatG: fatG,
                calories: calories,
                color: color
            ),
            accessToken: accessToken
        )
    }

    func deleteFoodItem(accessToken: String, id: UUID) async throws {
        try await client.delete("food_items", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func updateFoodItem(
        accessToken: String,
        id: UUID,
        name: String,
        icon: String,
        unit: String?,
        logDirectly: Bool?,
        proteinG: Double?,
        carbsG: Double?,
        fatG: Double?,
        calories: Double?,
        color: String? = nil
    ) async throws -> FoodItemDTO {
        struct Patch: Encodable {
            let name: String
            let icon: String
            let unit: String?
            let logDirectly: Bool?
            let proteinG: Double?
            let carbsG: Double?
            let fatG: Double?
            let calories: Double?
            let color: String?
            enum CodingKeys: String, CodingKey {
                case name, icon, unit, calories, color
                case logDirectly = "log_directly"
                case proteinG = "protein_g"
                case carbsG = "carbs_g"
                case fatG = "fat_g"
            }
        }
        let rows: [FoodItemDTO] = try await client.patch(
            "food_items",
            query: "id=eq.\(id.uuidString)",
            value: Patch(
                name: name,
                icon: icon,
                unit: unit,
                logDirectly: logDirectly,
                proteinG: proteinG,
                carbsG: carbsG,
                fatG: fatG,
                calories: calories,
                color: color
            ),
            accessToken: accessToken
        )
        guard let row = rows.first else { throw SupabaseClientError.invalidResponse }
        return row
    }

    func updateEventType(
        accessToken: String,
        id: UUID,
        name: String,
        icon: String,
        needNotes: Bool?,
        trackGraph: Bool?,
        color: String? = nil,
        description: String? = nil
    ) async throws {
        struct Patch: Encodable {
            let name: String
            let icon: String
            let needNotes: Bool?
            let trackGraph: Bool?
            let color: String?
            let description: String?
            enum CodingKeys: String, CodingKey {
                case name, icon, color, description
                case needNotes = "need_notes"
                case trackGraph = "track_graph"
            }
        }
        let _: [EventTypeDTO] = try await client.patch(
            "event_types",
            query: "id=eq.\(id.uuidString)",
            value: Patch(
                name: name,
                icon: icon,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: description
            ),
            accessToken: accessToken
        )
    }

    func updateFoodEntryQuantity(accessToken: String, entryID: UUID, quantity: Double) async throws -> FoodEntryDTO? {
        struct Patch: Encodable { let quantity: Double }
        let rows: [FoodEntryDTO] = try await client.patch(
            "food_entries",
            query: "id=eq.\(entryID.uuidString)",
            value: Patch(quantity: quantity),
            accessToken: accessToken
        )
        return rows.first
    }

    func insertFoodEntry(
        accessToken: String,
        userID: UUID,
        foodItemID: UUID,
        date: String,
        quantity: Double
    ) async throws -> FoodEntryDTO {
        struct Insert: Encodable {
            let userID: UUID
            let foodItemID: UUID
            let date: String
            let quantity: Double
            let isCompleted: Bool
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case foodItemID = "food_item_id"
                case date, quantity
                case isCompleted = "is_completed"
            }
        }
        return try await client.insert(
            "food_entries",
            value: Insert(userID: userID, foodItemID: foodItemID, date: date, quantity: quantity, isCompleted: true),
            accessToken: accessToken
        )
    }

    func setTrackingValue(
        accessToken: String,
        userID: UUID,
        trackableID: UUID,
        date: String,
        value: Double,
        existing: TrackingEntryDTO?
    ) async throws -> TrackingEntryDTO {
        if let existing {
            struct Patch: Encodable {
                let isCompleted: Bool
                let value: Double
                enum CodingKeys: String, CodingKey {
                    case isCompleted = "is_completed"
                    case value
                }
            }
            let rows: [TrackingEntryDTO] = try await client.patch(
                "tracking_entries",
                query: "id=eq.\(existing.id.uuidString)",
                value: Patch(isCompleted: true, value: value),
                accessToken: accessToken
            )
            guard let updated = rows.first else { throw SupabaseClientError.invalidResponse }
            return updated
        }

        struct Insert: Encodable {
            let userID: UUID
            let trackableID: UUID
            let date: String
            let isCompleted: Bool
            let value: Double
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case trackableID = "trackable_id"
                case date
                case isCompleted = "is_completed"
                case value
            }
        }
        return try await client.insert(
            "tracking_entries",
            value: Insert(userID: userID, trackableID: trackableID, date: date, isCompleted: true, value: value),
            accessToken: accessToken
        )
    }

    // MARK: - Session extras

    func patchSessionClientMeta(accessToken: String, sessionID: UUID, meta: SessionClientMeta) async throws -> ActiveSessionDTO {
        struct Payload: Encodable {
            let clientMeta: SessionClientMeta
            enum CodingKeys: String, CodingKey { case clientMeta = "client_meta" }
        }
        let rows: [ActiveSessionDTO] = try await client.patch(
            "workout_sessions",
            query: "id=eq.\(sessionID.uuidString)",
            value: Payload(clientMeta: meta),
            accessToken: accessToken
        )
        guard let updated = rows.first else { throw SupabaseClientError.invalidResponse }
        return updated
    }

    // MARK: - Routine editor

    func createRoutine(accessToken: String, userID: UUID, name: String, color: String) async throws -> RoutineDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let color: String
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, color
            }
        }
        return try await client.insert(
            "workout_routines",
            value: Insert(userID: userID, name: name, color: color),
            accessToken: accessToken
        )
    }

    func updateRoutine(accessToken: String, id: UUID, name: String, color: String) async throws {
        struct Patch: Encodable {
            let name: String
            let color: String
        }
        let _: [RoutineDTO] = try await client.patch(
            "workout_routines",
            query: "id=eq.\(id.uuidString)",
            value: Patch(name: name, color: color),
            accessToken: accessToken
        )
    }

    func deleteRoutine(accessToken: String, id: UUID) async throws {
        try await client.delete("workout_routines", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func replaceRoutineExercises(accessToken: String, routineID: UUID, exercises: [RoutineExerciseInput]) async throws {
        struct Params: Encodable {
            let pRoutineID: UUID
            let pExercises: [RoutineExerciseInput]
            enum CodingKeys: String, CodingKey {
                case pRoutineID = "p_routine_id"
                case pExercises = "p_exercises"
            }
        }
        try await client.rpcVoid(
            "replace_routine_exercises",
            body: Params(pRoutineID: routineID, pExercises: exercises),
            accessToken: accessToken
        )
    }

    // MARK: - Step cards

    func createStepCard(accessToken: String, userID: UUID, name: String, icon: String, color: String, orderIndex: Int) async throws -> StepCardDTO {
        struct Insert: Encodable {
            let userID: UUID
            let name: String
            let icon: String
            let color: String
            let orderIndex: Int
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case name, icon, color
                case orderIndex = "order_index"
            }
        }
        return try await client.insert(
            "step_cards",
            value: Insert(userID: userID, name: name, icon: icon, color: color, orderIndex: orderIndex),
            accessToken: accessToken
        )
    }

    func updateStepCard(accessToken: String, id: UUID, name: String, icon: String, color: String) async throws {
        struct Patch: Encodable { let name: String; let icon: String; let color: String }
        let _: [StepCardDTO] = try await client.patch(
            "step_cards",
            query: "id=eq.\(id.uuidString)",
            value: Patch(name: name, icon: icon, color: color),
            accessToken: accessToken
        )
    }

    func deleteStepCard(accessToken: String, id: UUID) async throws {
        try await client.delete("step_cards", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func reorderStepCards(accessToken: String, cards: [StepCardDTO]) async throws {
        for (index, card) in cards.enumerated() {
            struct Patch: Encodable { let orderIndex: Int; enum CodingKeys: String, CodingKey { case orderIndex = "order_index" } }
            let _: [StepCardDTO] = try await client.patch(
                "step_cards",
                query: "id=eq.\(card.id.uuidString)",
                value: Patch(orderIndex: index),
                accessToken: accessToken
            )
        }
    }

    func createStepItem(accessToken: String, userID: UUID, cardID: UUID, text: String, orderIndex: Int) async throws -> StepItemDTO {
        struct Insert: Encodable {
            let userID: UUID
            let cardID: UUID
            let text: String
            let orderIndex: Int
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case cardID = "card_id"
                case text
                case orderIndex = "order_index"
            }
        }
        return try await client.insert(
            "step_items",
            value: Insert(userID: userID, cardID: cardID, text: text, orderIndex: orderIndex),
            accessToken: accessToken
        )
    }

    func updateStepItem(accessToken: String, id: UUID, text: String) async throws {
        struct Patch: Encodable { let text: String }
        let _: [StepItemDTO] = try await client.patch(
            "step_items",
            query: "id=eq.\(id.uuidString)",
            value: Patch(text: text),
            accessToken: accessToken
        )
    }

    func deleteStepItem(accessToken: String, id: UUID) async throws {
        try await client.delete("step_items", query: "id=eq.\(id.uuidString)", accessToken: accessToken)
    }

    func reorderStepItems(accessToken: String, cardID: UUID, items: [StepItemDTO]) async throws {
        for (index, item) in items.enumerated() {
            struct Patch: Encodable { let orderIndex: Int; enum CodingKeys: String, CodingKey { case orderIndex = "order_index" } }
            let _: [StepItemDTO] = try await client.patch(
                "step_items",
                query: "id=eq.\(item.id.uuidString)",
                value: Patch(orderIndex: index),
                accessToken: accessToken
            )
        }
    }

    // MARK: - Macro settings

    func updateMacroTargets(accessToken: String, userID: UUID, targets: MacroTargetsDTO) async throws -> UserSettingsDTO {
        struct Patch: Encodable {
            let macroTargets: MacroTargetsDTO
            enum CodingKeys: String, CodingKey { case macroTargets = "macro_targets" }
        }
        let rows: [UserSettingsDTO] = try await client.patch(
            "user_settings",
            query: "user_id=eq.\(userID.uuidString)",
            value: Patch(macroTargets: targets),
            accessToken: accessToken
        )
        if let row = rows.first { return row }
        struct Insert: Encodable {
            let userID: UUID
            let macroTargets: MacroTargetsDTO
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case macroTargets = "macro_targets"
            }
        }
        return try await client.insert(
            "user_settings",
            value: Insert(userID: userID, macroTargets: targets),
            accessToken: accessToken
        )
    }

    func updateMacroPlans(accessToken: String, userID: UUID, plans: MacroPlansDTO) async throws -> UserSettingsDTO {
        struct Patch: Encodable {
            let macroPlans: MacroPlansDTO
            enum CodingKeys: String, CodingKey { case macroPlans = "macro_plans" }
        }
        let rows: [UserSettingsDTO] = try await client.patch(
            "user_settings",
            query: "user_id=eq.\(userID.uuidString)",
            value: Patch(macroPlans: plans),
            accessToken: accessToken
        )
        if let row = rows.first { return row }
        struct Insert: Encodable {
            let userID: UUID
            let macroPlans: MacroPlansDTO
            enum CodingKeys: String, CodingKey {
                case userID = "user_id"
                case macroPlans = "macro_plans"
            }
        }
        return try await client.insert(
            "user_settings",
            value: Insert(userID: userID, macroPlans: plans),
            accessToken: accessToken
        )
    }

    func fetchFoodEntriesRange(accessToken: String, startDate: String, endDate: String) async throws -> [FoodEntryDTO] {
        let query = "select=*&date=gte.\(startDate)&date=lte.\(endDate)&order=date.desc"
        return try await client.get("food_entries", query: query, accessToken: accessToken)
    }

    func fetchEventLogsRange(accessToken: String, startDate: String, endDate: String) async throws -> [EventLogDTO] {
        let query = "select=id,date,notes,cost,event_type_id&date=gte.\(startDate)&date=lte.\(endDate)&order=date.desc"
        return try await client.get("event_logs", query: query, accessToken: accessToken)
    }
}

private struct ExerciseAggregate {
    var sets = 0
    var totalReps = 0
    var maxWeight = 0.0
}

struct SetLogInsert: Encodable {
    let userID: UUID
    let sessionID: UUID
    let exerciseName: String
    let category: String?
    let setNumber: Int
    let weight: Double
    let reps: Int
    let isCompleted: Bool
    let previousWeight: Double
    let previousReps: Int

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case sessionID = "session_id"
        case exerciseName = "exercise_name"
        case category
        case setNumber = "set_number"
        case weight, reps
        case isCompleted = "is_completed"
        case previousWeight = "previous_weight"
        case previousReps = "previous_reps"
    }
}

struct SetLogUpdate: Encodable {
    let weight: Double?
    let reps: Int?
    let isCompleted: Bool?

    enum CodingKeys: String, CodingKey {
        case weight, reps
        case isCompleted = "is_completed"
    }
}

struct ExerciseHistoryUpsert: Encodable {
    let id: UUID?
    let userID: UUID
    let exerciseName: String
    let lastWeight: Double
    let lastReps: Int
    let lastSets: Int
    let personalRecordWeight: Double
    let timesPerformed: Int
    let lastPerformedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case exerciseName = "exercise_name"
        case lastWeight = "last_weight"
        case lastReps = "last_reps"
        case lastSets = "last_sets"
        case personalRecordWeight = "personal_record_weight"
        case timesPerformed = "times_performed"
        case lastPerformedAt = "last_performed_at"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(id, forKey: .id)
        try container.encode(userID, forKey: .userID)
        try container.encode(exerciseName, forKey: .exerciseName)
        try container.encode(lastWeight, forKey: .lastWeight)
        try container.encode(lastReps, forKey: .lastReps)
        try container.encode(lastSets, forKey: .lastSets)
        try container.encode(personalRecordWeight, forKey: .personalRecordWeight)
        try container.encode(timesPerformed, forKey: .timesPerformed)
        try container.encode(lastPerformedAt, forKey: .lastPerformedAt)
    }
}

enum WorkoutDate {
    static func todayString(calendar: Calendar = .current) -> String {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

private extension WorkoutSessionDTO {
    func asActiveSession() -> ActiveSessionDTO {
        ActiveSessionDTO(id: id, routineID: routineID, routineName: routineName, date: date, status: status, setLogs: nil)
    }
}
