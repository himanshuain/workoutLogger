import Foundation

struct NativeSupabaseConfig {
    let url: URL
    let anonKey: String

    static var fromBundle: NativeSupabaseConfig? {
        guard
            let rawURL = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: rawURL),
            let anonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            !anonKey.isEmpty
        else { return nil }
        return NativeSupabaseConfig(url: url, anonKey: anonKey)
    }
}

enum SupabaseClientError: LocalizedError {
    case missingConfiguration
    case invalidResponse
    case requestFailed(String)
    case unauthorized
    case sessionExpired

    var errorDescription: String? {
        switch self {
        case .missingConfiguration: return "Supabase is not configured for the native app."
        case .invalidResponse: return "The server returned an invalid response."
        case .requestFailed(let message): return message
        case .unauthorized: return "Your session is no longer valid. Please sign in again."
        case .sessionExpired: return "Your session has expired. Please sign in again."
        }
    }
}

struct SupabaseClient {
    let config: NativeSupabaseConfig
    private let session: URLSession
    var onUnauthorized: (() async throws -> String?)?

    init(config: NativeSupabaseConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func signIn(email: String, password: String) async throws -> NativeAuthSession {
        var request = URLRequest(url: config.url.appendingPathComponent("auth/v1/token"))
        request.url = URL(string: request.url!.absoluteString + "?grant_type=password")
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(["email": email, "password": password])
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response, data: data)
        return try JSONDecoder.supabase.decode(NativeAuthSession.self, from: data)
    }

    func refreshSession(refreshToken: String) async throws -> NativeAuthSession {
        var request = URLRequest(url: config.url.appendingPathComponent("auth/v1/token"))
        request.url = URL(string: request.url!.absoluteString + "?grant_type=refresh_token")
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(["refresh_token": refreshToken])
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response, data: data)
        return try JSONDecoder.supabase.decode(NativeAuthSession.self, from: data)
    }

    func signOut(refreshToken: String?) async {
        guard let refreshToken else { return }
        var request = URLRequest(url: config.url.appendingPathComponent("auth/v1/logout"))
        request.httpMethod = "POST"
        request.httpBody = try? JSONEncoder.supabase.encode(["refresh_token": refreshToken])
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        _ = try? await session.data(for: request)
    }

    func signUp(email: String, password: String) async throws -> NativeAuthSession? {
        var request = URLRequest(url: config.url.appendingPathComponent("auth/v1/signup"))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(["email": email, "password": password])
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response, data: data)
        if let session = try? JSONDecoder.supabase.decode(NativeAuthSession.self, from: data),
           !session.accessToken.isEmpty {
            return session
        }
        return nil
    }

    func resetPassword(email: String) async throws {
        var request = URLRequest(url: config.url.appendingPathComponent("auth/v1/recover"))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(["email": email])
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response, data: data)
    }

    func rpc<T: Decodable>(_ function: String, params: [String: String], accessToken: String) async throws -> T {
        var request = URLRequest(url: config.url.appendingPathComponent("rest/v1/rpc/\(function)"))
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: params)
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let data = try await performAuthenticatedRequest(&request, accessToken: accessToken)
        return try JSONDecoder.supabase.decode(T.self, from: data)
    }

    func rpcVoid(_ function: String, body: some Encodable, accessToken: String) async throws {
        var request = URLRequest(url: config.url.appendingPathComponent("rest/v1/rpc/\(function)"))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(body)
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let data = try await performAuthenticatedRequest(&request, accessToken: accessToken)
        if data.isEmpty { return }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let message = json["message"] as? String,
           let code = json["code"] as? String {
            throw SupabaseClientError.requestFailed("{\"code\":\"\(code)\",\"message\":\"\(message)\"}")
        }
    }

    func get<T: Decodable>(_ table: String, query: String = "", accessToken: String) async throws -> [T] {
        var components = URLComponents(url: config.url.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)
        components?.percentEncodedQuery = query
        guard let url = components?.url else { throw SupabaseClientError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let data = try await performAuthenticatedRequest(&request, accessToken: accessToken)
        return try JSONDecoder.supabase.decode([T].self, from: data)
    }

    func insert<T: Encodable, R: Decodable>(_ table: String, value: T, accessToken: String) async throws -> R {
        var request = URLRequest(url: config.url.appendingPathComponent("rest/v1/\(table)"))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.supabase.encode(value)
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")

        let data = try await performAuthenticatedRequest(&request, accessToken: accessToken)
        return try JSONDecoder.supabase.decode([R].self, from: data).first ?? { throw SupabaseClientError.invalidResponse }()
    }

    func patch<T: Encodable, R: Decodable>(_ table: String, query: String, value: T, accessToken: String) async throws -> [R] {
        var components = URLComponents(url: config.url.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)
        components?.percentEncodedQuery = query
        guard let url = components?.url else { throw SupabaseClientError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.httpBody = try JSONEncoder.supabase.encode(value)
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")

        let data = try await performAuthenticatedRequest(&request, accessToken: accessToken)
        return try JSONDecoder.supabase.decode([R].self, from: data)
    }

    func delete(_ table: String, query: String, accessToken: String) async throws {
        var components = URLComponents(url: config.url.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)
        components?.percentEncodedQuery = query
        guard let url = components?.url else { throw SupabaseClientError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")

        _ = try await performAuthenticatedRequest(&request, accessToken: accessToken)
    }

    private func performAuthenticatedRequest(_ request: inout URLRequest, accessToken: String) async throws -> Data {
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: request)

        if let http = response as? HTTPURLResponse, http.statusCode == 401, let onUnauthorized {
            if let refreshed = try await onUnauthorized() {
                request.setValue("Bearer \(refreshed)", forHTTPHeaderField: "Authorization")
                let (retryData, retryResponse) = try await session.data(for: request)
                try validate(retryResponse, data: retryData)
                return retryData
            }
            throw SupabaseClientError.sessionExpired
        }

        try validate(response, data: data)
        return data
    }

    private func validate(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw SupabaseClientError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 { throw SupabaseClientError.unauthorized }
            let message = String(data: data, encoding: .utf8) ?? "Request failed (\(http.statusCode))."
            throw SupabaseClientError.requestFailed(message)
        }
    }
}

struct NativeAuthSession: Codable {
    let accessToken: String
    let refreshToken: String?
    let user: NativeUser?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct NativeUser: Codable, Identifiable {
    let id: UUID
    let email: String?
}

struct InitDataDTO: Decodable {
    let exercises: [ExerciseDTO]?
    let userSettings: UserSettingsDTO?
    let exerciseHistory: [ExerciseHistoryDTO]?
    let routines: [RoutineDTO]?
    let activeSession: ActiveSessionDTO?
    let trackables: [TrackableDTO]?
    let todayEntries: [TrackingEntryDTO]?
    let foodItems: [FoodItemDTO]?
    let todayFoodEntries: [FoodEntryDTO]?
    let eventTypes: [EventTypeDTO]?
    let stepCards: [StepCardDTO]?

    enum CodingKeys: String, CodingKey {
        case exercises
        case userSettings = "user_settings"
        case exerciseHistory = "exercise_history"
        case routines
        case activeSession = "active_session"
        case trackables
        case todayEntries = "today_entries"
        case foodItems = "food_items"
        case todayFoodEntries = "today_food_entries"
        case eventTypes = "event_types"
        case stepCards = "step_cards"
    }

    init(
        exercises: [ExerciseDTO]?,
        userSettings: UserSettingsDTO?,
        exerciseHistory: [ExerciseHistoryDTO]?,
        routines: [RoutineDTO]?,
        activeSession: ActiveSessionDTO?,
        trackables: [TrackableDTO]? = nil,
        todayEntries: [TrackingEntryDTO]? = nil,
        foodItems: [FoodItemDTO]? = nil,
        todayFoodEntries: [FoodEntryDTO]? = nil,
        eventTypes: [EventTypeDTO]? = nil,
        stepCards: [StepCardDTO]? = nil
    ) {
        self.exercises = exercises
        self.userSettings = userSettings
        self.exerciseHistory = exerciseHistory
        self.routines = routines
        self.activeSession = activeSession
        self.trackables = trackables
        self.todayEntries = todayEntries
        self.foodItems = foodItems
        self.todayFoodEntries = todayFoodEntries
        self.eventTypes = eventTypes
        self.stepCards = stepCards
    }
}

struct TrackableDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let name: String
    let type: String?
    let icon: String?
    let color: String?
    let hasValue: Bool?
    let valueUnit: String?
    let orderIndex: Int?
    let activeDays: [Int]?

    enum CodingKeys: String, CodingKey {
        case id, name, type, icon, color
        case hasValue = "has_value"
        case valueUnit = "value_unit"
        case orderIndex = "order_index"
        case activeDays = "active_days"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        color = try container.decodeIfPresent(String.self, forKey: .color)
        hasValue = try container.decodeIfPresent(Bool.self, forKey: .hasValue)
        valueUnit = try container.decodeIfPresent(String.self, forKey: .valueUnit)
        orderIndex = try container.decodeIfPresent(Int.self, forKey: .orderIndex)
        if let days = try? container.decodeIfPresent([Int].self, forKey: .activeDays) {
            activeDays = days
        } else if let days = try? container.decodeIfPresent([String].self, forKey: .activeDays) {
            activeDays = days.compactMap { Int($0) }
        } else {
            activeDays = nil
        }
    }
}

struct TrackingEntryDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let trackableID: UUID
    let date: String
    let isCompleted: Bool
    let value: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case trackableID = "trackable_id"
        case date
        case isCompleted = "is_completed"
        case value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        trackableID = try container.decode(UUID.self, forKey: .trackableID)
        if let dateString = try? container.decode(String.self, forKey: .date) {
            date = String(dateString.prefix(10))
        } else {
            date = WorkoutDate.todayString()
        }
        isCompleted = try container.decodeIfPresent(Bool.self, forKey: .isCompleted) ?? false
        if let v = try? container.decodeIfPresent(Double.self, forKey: .value) {
            value = v
        } else if let s = try? container.decodeIfPresent(String.self, forKey: .value), let v = Double(s) {
            value = v
        } else {
            value = nil
        }
    }
}

struct FoodItemDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let name: String
    let icon: String?
    let color: String?
    let unit: String?
    let orderIndex: Int?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let calories: Double?
    let logDirectly: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, icon, color, unit
        case orderIndex = "order_index"
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case calories
        case logDirectly = "log_directly"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        color = try container.decodeIfPresent(String.self, forKey: .color)
        unit = try container.decodeIfPresent(String.self, forKey: .unit)
        orderIndex = try container.decodeIfPresent(Int.self, forKey: .orderIndex)
        proteinG = try container.decodeLossyDoubleIfPresent(forKey: .proteinG)
        carbsG = try container.decodeLossyDoubleIfPresent(forKey: .carbsG)
        fatG = try container.decodeLossyDoubleIfPresent(forKey: .fatG)
        calories = try container.decodeLossyDoubleIfPresent(forKey: .calories)
        logDirectly = try container.decodeIfPresent(Bool.self, forKey: .logDirectly)
    }
}

struct FoodEntryDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let foodItemID: UUID
    let date: String
    let quantity: Double?
    let isCompleted: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case foodItemID = "food_item_id"
        case date, quantity
        case isCompleted = "is_completed"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        foodItemID = try container.decode(UUID.self, forKey: .foodItemID)
        if let dateString = try? container.decode(String.self, forKey: .date) {
            date = String(dateString.prefix(10))
        } else {
            date = WorkoutDate.todayString()
        }
        quantity = try container.decodeLossyDoubleIfPresent(forKey: .quantity)
        isCompleted = try container.decodeIfPresent(Bool.self, forKey: .isCompleted) ?? true
    }
}

struct EventLogDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let date: String
    let notes: String?
    let cost: Double?
    let eventTypeID: UUID?

    init(id: UUID, date: String, notes: String?, cost: Double?, eventTypeID: UUID?) {
        self.id = id
        self.date = date
        self.notes = notes
        self.cost = cost
        self.eventTypeID = eventTypeID
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        if let dateString = try? container.decode(String.self, forKey: .date) {
            date = String(dateString.prefix(10))
        } else {
            date = WorkoutDate.todayString()
        }
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        cost = try container.decodeLossyDoubleIfPresent(forKey: .cost)
        eventTypeID = try container.decodeIfPresent(UUID.self, forKey: .eventTypeID)
    }

    enum CodingKeys: String, CodingKey {
        case id, date, notes, cost
        case eventTypeID = "event_type_id"
    }
}

struct EventTypeDTO: Codable, Identifiable, Equatable {
    let id: UUID
    let name: String
    let icon: String?
    let color: String?
    let description: String?
    let orderIndex: Int?
    let needNotes: Bool?
    let trackGraph: Bool?
    let eventLogs: [EventLogDTO]?

    enum CodingKeys: String, CodingKey {
        case id, name, icon, color, description
        case orderIndex = "order_index"
        case needNotes = "need_notes"
        case trackGraph = "track_graph"
        case eventLogs = "event_logs"
    }
}

struct SessionExtraDTO: Codable, Equatable {
    let localID: UUID?
    let exerciseID: UUID?
    let exerciseName: String
    let category: String?
    let imageURL: String?
    let addedToday: Bool?

    enum CodingKeys: String, CodingKey {
        case localID = "local_id"
        case exerciseID = "exercise_id"
        case exerciseName = "exercise_name"
        case category
        case imageURL = "image_url"
        case addedToday = "added_today"
    }

    init(
        localID: UUID = UUID(),
        exerciseID: UUID?,
        exerciseName: String,
        category: String?,
        imageURL: String?,
        addedToday: Bool = true
    ) {
        self.localID = localID
        self.exerciseID = exerciseID
        self.exerciseName = exerciseName
        self.category = category
        self.imageURL = imageURL
        self.addedToday = addedToday
    }
}

struct SessionClientMeta: Codable, Equatable {
    let extras: [SessionExtraDTO]?
    let exerciseDone: [String: Bool]?

    enum CodingKeys: String, CodingKey {
        case extras
        case exerciseDone = "exercise_done"
    }

    init(extras: [SessionExtraDTO] = [], exerciseDone: [String: Bool] = [:]) {
        self.extras = extras
        self.exerciseDone = exerciseDone
    }
}

struct RoutineExerciseInput: Encodable {
    let exerciseID: UUID?
    let exerciseName: String
    let category: String
    let targetSets: Int
    let notes: String?
    let isPinned: Bool

    enum CodingKeys: String, CodingKey {
        case exerciseID = "exercise_id"
        case exerciseName = "exercise_name"
        case category
        case targetSets = "target_sets"
        case notes
        case isPinned = "is_pinned"
    }
}

struct UserSettingsDTO: Decodable {
    let unit: String?
    let displayName: String?
    let exerciseMediaOverrides: [String: JSONValue]?
    let macroTargets: MacroTargetsDTO?
    let macroPlans: MacroPlansDTO?

    enum CodingKeys: String, CodingKey {
        case unit
        case displayName = "display_name"
        case exerciseMediaOverrides = "exercise_media_overrides"
        case macroTargets = "macro_targets"
        case macroPlans = "macro_plans"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        unit = try container.decodeIfPresent(String.self, forKey: .unit)
        displayName = try container.decodeIfPresent(String.self, forKey: .displayName)
        exerciseMediaOverrides = try container.decodeIfPresent([String: JSONValue].self, forKey: .exerciseMediaOverrides)
        macroTargets = try? container.decode(MacroTargetsDTO.self, forKey: .macroTargets)
        macroPlans = try? container.decode(MacroPlansDTO.self, forKey: .macroPlans)
    }
}

struct ExerciseMediaOverrideDTO {
    let mediaURL: String
}

struct RoutineDTO: Codable, Identifiable {
    let id: UUID
    let name: String
    let color: String?
    let routineExercises: [RoutineExerciseDTO]?

    enum CodingKeys: String, CodingKey {
        case id, name, color
        case routineExercises = "routine_exercises"
    }
}

struct RoutineExerciseDTO: Codable, Identifiable {
    let id: UUID
    let exerciseID: UUID?
    let exerciseName: String
    let category: String?
    let targetSets: Int?
    let orderIndex: Int?
    let notes: String?
    let isPinned: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case exerciseID = "exercise_id"
        case exerciseName = "exercise_name"
        case category
        case targetSets = "target_sets"
        case orderIndex = "order_index"
        case notes
        case isPinned = "is_pinned"
    }
}

struct ExerciseDTO: Codable, Identifiable {
    let id: UUID
    let name: String
    let category: String?
    let gifURL: String?
    let imageURL: String?
    let externalSource: String?
    let externalID: String?

    enum CodingKeys: String, CodingKey {
        case id, name, category
        case gifURL = "gif_url"
        case imageURL = "image_url"
        case externalSource = "external_source"
        case externalID = "external_id"
    }
}

struct ExerciseHistoryDTO: Codable, Identifiable {
    let id: UUID
    let exerciseID: UUID?
    let exerciseName: String
    let lastWeight: Double?
    let lastReps: Int?
    let personalRecordWeight: Double?
    let timesPerformed: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case exerciseID = "exercise_id"
        case exerciseName = "exercise_name"
        case lastWeight = "last_weight"
        case lastReps = "last_reps"
        case personalRecordWeight = "personal_record_weight"
        case timesPerformed = "times_performed"
    }

    init(
        id: UUID,
        exerciseID: UUID?,
        exerciseName: String,
        lastWeight: Double?,
        lastReps: Int?,
        personalRecordWeight: Double?,
        timesPerformed: Int?
    ) {
        self.id = id
        self.exerciseID = exerciseID
        self.exerciseName = exerciseName
        self.lastWeight = lastWeight
        self.lastReps = lastReps
        self.personalRecordWeight = personalRecordWeight
        self.timesPerformed = timesPerformed
    }
}

struct ActiveSessionDTO: Codable, Identifiable {
    let id: UUID
    let routineID: UUID?
    let routineName: String?
    let date: String?
    let status: String?
    let setLogs: [SetLogDTO]?
    let clientMeta: SessionClientMeta?

    enum CodingKeys: String, CodingKey {
        case id
        case routineID = "routine_id"
        case routineName = "routine_name"
        case date, status
        case setLogs = "set_logs"
        case clientMeta = "client_meta"
    }

    init(
        id: UUID,
        routineID: UUID?,
        routineName: String?,
        date: String?,
        status: String?,
        setLogs: [SetLogDTO]?,
        clientMeta: SessionClientMeta? = nil
    ) {
        self.id = id
        self.routineID = routineID
        self.routineName = routineName
        self.date = date
        self.status = status
        self.setLogs = setLogs
        self.clientMeta = clientMeta
    }
}

struct SetLogDTO: Codable, Identifiable {
    let id: UUID
    let sessionID: UUID?
    let exerciseName: String
    let category: String?
    let setNumber: Int?
    let weight: Double
    let reps: Int
    let isCompleted: Bool
    let previousWeight: Double?
    let previousReps: Int?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case sessionID = "session_id"
        case exerciseName = "exercise_name"
        case category
        case setNumber = "set_number"
        case weight, reps
        case isCompleted = "is_completed"
        case previousWeight = "previous_weight"
        case previousReps = "previous_reps"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        sessionID = try container.decodeIfPresent(UUID.self, forKey: .sessionID)
        exerciseName = try container.decode(String.self, forKey: .exerciseName)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        setNumber = try container.decodeIfPresent(Int.self, forKey: .setNumber)
        weight = try container.decodeLossyDouble(forKey: .weight)
        reps = try container.decode(Int.self, forKey: .reps)
        isCompleted = try container.decodeIfPresent(Bool.self, forKey: .isCompleted) ?? false
        previousWeight = try container.decodeLossyDoubleIfPresent(forKey: .previousWeight)
        previousReps = try container.decodeIfPresent(Int.self, forKey: .previousReps)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
    }
}

struct WorkoutSessionDTO: Codable, Identifiable {
    let id: UUID
    let routineID: UUID?
    let routineName: String?
    let date: String?
    let status: String?
}

enum JSONValue: Decodable {
    case string(String)
    case number(Double)
    case object([String: JSONValue])
    case array([JSONValue])
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .null
        }
    }
}

private extension KeyedDecodingContainer where Key: CodingKey {
    func decodeLossyDouble(forKey key: Key) throws -> Double {
        if let value = try? decode(Double.self, forKey: key) { return value }
        if let value = try? decode(String.self, forKey: key), let parsed = Double(value) { return parsed }
        return 0
    }

    func decodeLossyDoubleIfPresent(forKey key: Key) throws -> Double? {
        guard contains(key), !(try decodeNil(forKey: key)) else { return nil }
        return try decodeLossyDouble(forKey: key)
    }
}

private extension JSONDecoder {
    static var supabase: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let date = ISO8601DateFormatter.fractional.date(from: value) { return date }
            if let date = ISO8601DateFormatter().date(from: value) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(value)")
        }
        return decoder
    }
}

private extension JSONEncoder {
    static var supabase: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

private extension ISO8601DateFormatter {
    static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
