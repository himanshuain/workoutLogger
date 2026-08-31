import Combine
import Foundation

@MainActor
final class WorkoutStore: ObservableObject {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded
        case empty
        case error(String)
    }

    @Published private(set) var loadState: LoadState = .idle
    @Published private(set) var splits: [NativeSplit] = []
    @Published private(set) var usesLiveData = false
    @Published private(set) var weightUnit: WeightUnit = .kg
    @Published private(set) var userDisplayName: String?
    @Published private(set) var activeSession: ActiveSessionDTO?
    @Published private(set) var exerciseHistory: [String: ExerciseHistoryDTO] = [:]
    @Published private(set) var catalog: [ExerciseDTO] = []
    @Published private(set) var isRefreshing = false
    @Published private(set) var isLoadingDay = false
    @Published private(set) var isLoadingHistory = false
    @Published var mutationError: String?
    @Published private(set) var profileStats: ProfileStats = .empty
    @Published private(set) var historyGroups: [HistoryDayGroup] = []
    @Published private(set) var viewingCompletedSession: ActiveSessionDTO?
    @Published var completionSummary: WorkoutCompletionSummary?
    @Published var viewingDate: String = WorkoutDate.todayString()
    @Published private(set) var workoutLoggedDates: Set<String> = []
    @Published private(set) var loadedSessions: [ActiveSessionDTO] = []
    @Published private(set) var trackables: [TrackableDTO] = []
    @Published private(set) var trackingEntries: [UUID: TrackingEntryDTO] = [:]
    @Published private(set) var foodItems: [FoodItemDTO] = []
    @Published private(set) var foodEntries: [UUID: FoodEntryDTO] = [:]
    @Published private(set) var eventTypes: [EventTypeDTO] = []
    @Published private(set) var stepCards: [StepCardDTO] = []
    @Published private(set) var macroTargets: MacroTargetsDTO = .defaults
    @Published private(set) var macroMeals: [MacroMealDTO] = MacroPlansDTO.defaultPlan.mealList ?? []
    @Published private(set) var foodHistoryDates: Set<String> = []
    @Published private(set) var lifeLogHistoryDates: Set<String> = []
    @Published private(set) var cachedWorkoutTrend: [WorkoutWeekPoint] = []
    @Published private(set) var cachedExerciseOverloadPoints: [ExerciseOverloadPoint] = []
    @Published private(set) var cachedTopExerciseProgress: [(name: String, bestWeight: Double, bestReps: Int, sessions: Int)] = []

    private var historyCacheValid = false
    private var heatmapCacheValid = false
    private var dateSelectionTask: Task<Void, Never>?
    private var lifeLogsByDate: [String: [UUID: EventLogDTO]] = [:]

    var habitsCompletedCount: Int {
        trackables.filter { trackingEntries[$0.id]?.isCompleted == true }.count
    }

    var foodLoggedCount: Int {
        foodEntries.count
    }

    var lifeLogCompletedCount: Int {
        eventTypes.filter { lifeLog(for: $0.id) != nil }.count
    }

    func lifeLog(for eventTypeID: UUID) -> EventLogDTO? {
        lifeLogsByDate[viewingDate]?[eventTypeID]
    }

    func eventLogs(for eventTypeID: UUID) -> [EventLogDTO] {
        guard let eventType = eventTypes.first(where: { $0.id == eventTypeID }) else { return [] }
        return (eventType.eventLogs ?? []).sorted { $0.date > $1.date }
    }

    func trackablesForViewingDate() -> [TrackableDTO] {
        guard let date = WorkoutDate.date(from: viewingDate) else { return trackables }
        let dayIndex = Calendar.current.component(.weekday, from: date) - 1
        return trackables.filter { trackable in
            if trackable.name == "Body Weight" { return false }
            guard let days = trackable.activeDays, !days.isEmpty else { return true }
            return days.contains(dayIndex)
        }
    }

    var bodyWeightTrackable: TrackableDTO? {
        trackables.first { trackable in
            let type = trackable.type?.lowercased() ?? ""
            let name = trackable.name.lowercased()
            return type.contains("body") || name.contains("body weight") || name == "weight"
        }
    }

    var displaySplits: [NativeSplit] {
        usesLiveData ? splits : NativeSplit.preview
    }

    var isViewingToday: Bool {
        viewingDate == WorkoutDate.todayString()
    }

    var canLogSets: Bool {
        if activeSession?.status == "active" { return true }
        return viewingCompletedSession != nil
    }

    var isViewingCompletedWorkout: Bool {
        activeSession == nil && viewingCompletedSession != nil
    }

    private var sessionForMutations: ActiveSessionDTO? {
        activeSession ?? viewingCompletedSession
    }

    private var sessionForDisplay: ActiveSessionDTO? {
        activeSession ?? viewingCompletedSession
    }

    private var dataService: WorkoutDataService?
    private var supabaseClient: SupabaseClient?
    private var accessToken: String?
    private var userID: UUID?
    private var tokenProvider: (() async throws -> String)?
    private var routineDTOs: [RoutineDTO] = []
    private var mediaOverrides: [String: ExerciseMediaOverrideDTO] = [:]

    init(client: SupabaseClient? = NativeSupabaseConfig.fromBundle.map { SupabaseClient(config: $0) }) {
        supabaseClient = client
        dataService = client.map(WorkoutDataService.init)
    }

    func bind(
        accessToken: String?,
        userID: UUID?,
        tokenProvider: (() async throws -> String)? = nil,
        refreshProvider: (() async throws -> String?)? = nil
    ) async {
        self.accessToken = accessToken
        self.userID = userID
        self.tokenProvider = tokenProvider
        if var client = supabaseClient {
            client.onUnauthorized = {
                if let refreshProvider {
                    return try await refreshProvider()
                }
                guard let tokenProvider else { return nil }
                return try await tokenProvider()
            }
            supabaseClient = client
            dataService = WorkoutDataService(client: client)
        }
        if accessToken == nil {
            clear()
            return
        }
        await refresh()
    }

    private func resolvedAccessToken() async throws -> String {
        if let tokenProvider {
            let token = try await tokenProvider()
            accessToken = token
            return token
        }
        guard let accessToken else { throw SupabaseClientError.unauthorized }
        return accessToken
    }

    func refresh() async {
        guard let dataService else {
            loadState = .error(SupabaseClientError.missingConfiguration.localizedDescription)
            return
        }

        let today = WorkoutDate.todayString()
        if viewingDate > today {
            viewingDate = today
        }

        if case .loaded = loadState {
            // Background refresh — keep existing content on screen.
        } else if case .empty = loadState {
            // Keep empty state visible while retrying.
        } else {
            loadState = .loading
        }
        isRefreshing = true
        defer {
            isRefreshing = false
        }
        historyCacheValid = false
        do {
            let accessToken = try await resolvedAccessToken()
            let initData = try await dataService.fetchInitData(accessToken: accessToken, today: today)
            apply(initData)
            if isViewingToday {
                activeSession = initData.activeSession
                viewingCompletedSession = try await dataService.fetchCompletedSession(
                    accessToken: accessToken,
                    date: viewingDate
                )
            } else {
                await loadSessionForViewingDate()
            }
            remapSplits()
            await loadHistory()
            await loadDayLogData()
        } catch {
            if let authError = error as? SupabaseClientError {
                switch authError {
                case .sessionExpired, .unauthorized:
                    loadState = .error(authError.localizedDescription)
                    return
                default:
                    break
                }
            }
            do {
                let accessToken = try await resolvedAccessToken()
                try await refreshFallback(accessToken: accessToken, dataService: dataService)
                await loadSessionForViewingDate()
                remapSplits()
                await loadHistory(force: true)
                await loadDayLogData()
            } catch {
                if usesLiveData {
                    loadState = .error(error.localizedDescription)
                } else {
                    loadState = .error(error.localizedDescription)
                    usesLiveData = false
                }
            }
        }
    }

    func refreshForeground() async {
        guard loadState == .loaded, let dataService else {
            await refresh()
            return
        }
        do {
            let accessToken = try await resolvedAccessToken()
            if isViewingToday {
                activeSession = try await dataService.fetchActiveSession(accessToken: accessToken, date: viewingDate)
                viewingCompletedSession = try await dataService.fetchCompletedSession(
                    accessToken: accessToken,
                    date: viewingDate
                )
                async let habits = dataService.fetchTrackingEntries(accessToken: accessToken, date: viewingDate)
                async let food = dataService.fetchFoodEntries(accessToken: accessToken, date: viewingDate)
                applyDayLogEntries(tracking: try await habits, food: try await food)
            }
            remapSplits()
        } catch {
            mutationError = Self.userFacingError(error)
        }
    }

    func selectViewingDate(_ date: String) {
        let today = WorkoutDate.todayString()
        guard date <= today else { return }
        viewingDate = date
        dateSelectionTask?.cancel()
        dateSelectionTask = Task {
            await loadSessionForViewingDate()
            remapSplits()
            await loadDayLogData()
        }
    }

    func loadDayLogData() async {
        guard let dataService else { return }
        do {
            let accessToken = try await resolvedAccessToken()
            async let habits = dataService.fetchTrackingEntries(accessToken: accessToken, date: viewingDate)
            async let food = dataService.fetchFoodEntries(accessToken: accessToken, date: viewingDate)
            applyDayLogEntries(tracking: try await habits, food: try await food)
        } catch {
            mutationError = Self.userFacingError(error)
        }
    }

    func toggleHabit(_ trackableID: UUID) async {
        guard let dataService, let userID else { return }
        let existing = trackingEntries[trackableID]
        let markComplete = existing?.isCompleted != true
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let result = try await dataService.toggleTrackingEntry(
                accessToken: accessToken,
                userID: userID,
                trackableID: trackableID,
                date: viewingDate,
                existing: existing,
                markComplete: markComplete
            )
            if let result {
                trackingEntries[trackableID] = result
            } else {
                trackingEntries.removeValue(forKey: trackableID)
            }
        }
    }

    func toggleFood(_ foodItemID: UUID) async {
        guard let dataService, let userID else { return }
        let existing = foodEntries[foodItemID]
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let result = try await dataService.toggleFoodEntry(
                accessToken: accessToken,
                userID: userID,
                foodItemID: foodItemID,
                date: viewingDate,
                existing: existing
            )
            if let result {
                foodEntries[foodItemID] = result
            } else {
                foodEntries.removeValue(forKey: foodItemID)
            }
        }
    }

    func toggleLifeLog(_ eventTypeID: UUID) async {
        guard let dataService, let userID else { return }
        if let existing = lifeLog(for: eventTypeID) {
            await mutate {
                let accessToken = try await self.resolvedAccessToken()
                try await dataService.deleteEventLog(accessToken: accessToken, logID: existing.id)
                self.removeLifeLog(existing, eventTypeID: eventTypeID)
            }
        } else {
            await mutate {
                let accessToken = try await self.resolvedAccessToken()
                let log = try await dataService.logLifeEvent(
                    accessToken: accessToken,
                    userID: userID,
                    eventTypeID: eventTypeID,
                    date: viewingDate
                )
                self.insertLifeLog(log, eventTypeID: eventTypeID)
            }
        }
    }

    func createLifeLogEvent(
        name: String,
        icon: String,
        needNotes: Bool = false,
        trackGraph: Bool = false,
        color: String? = nil,
        description: String? = nil
    ) async -> UUID? {
        guard let dataService, let userID else { return nil }
        var createdID: UUID?
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let created = try await dataService.createEventType(
                accessToken: accessToken,
                userID: userID,
                name: name,
                icon: icon,
                orderIndex: eventTypes.count,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: description
            )
            createdID = created.id
            eventTypes.append(EventTypeDTO(
                id: created.id,
                name: created.name,
                icon: created.icon,
                color: created.color,
                description: created.description,
                orderIndex: created.orderIndex,
                needNotes: created.needNotes,
                trackGraph: created.trackGraph,
                eventLogs: []
            ))
            syncLogReminders()
        }
        return createdID
    }

    func deleteLifeLogEvent(_ id: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteEventType(accessToken: accessToken, id: id)
            eventTypes.removeAll { $0.id == id }
            LogReminderPreferences.remove(for: id, kind: .lifeLog)
            syncLogReminders()
        }
    }

    func createHabit(
        name: String,
        icon: String,
        hasValue: Bool = false,
        valueUnit: String? = nil,
        activeDays: [Int]? = nil,
        color: String? = nil
    ) async -> UUID? {
        guard let dataService, let userID else { return nil }
        var createdID: UUID?
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            var created = try await dataService.createTrackable(
                accessToken: accessToken,
                userID: userID,
                name: name,
                icon: icon,
                orderIndex: trackables.count
            )
            if hasValue || valueUnit != nil || activeDays != nil || color != nil {
                created = try await dataService.updateTrackable(
                    accessToken: accessToken,
                    id: created.id,
                    name: name,
                    icon: icon,
                    hasValue: hasValue,
                    valueUnit: valueUnit,
                    activeDays: activeDays,
                    color: color
                )
            }
            createdID = created.id
            trackables.append(created)
            syncLogReminders()
        }
        return createdID
    }

    func deleteHabit(_ id: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteTrackable(accessToken: accessToken, id: id)
            trackables.removeAll { $0.id == id }
            trackingEntries.removeValue(forKey: id)
            LogReminderPreferences.remove(for: id, kind: .habit)
            syncLogReminders()
        }
    }

    func createFoodItem(name: String, icon: String) async {
        await createFoodItem(payload: FoodItemEditorPayload(
            name: name,
            icon: icon,
            unit: "serving",
            logDirectly: false,
            proteinG: nil,
            carbsG: nil,
            fatG: nil,
            calories: nil,
            color: nil
        ))
    }

    func createFoodItem(payload: FoodItemEditorPayload) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let created = try await dataService.createFoodItem(
                accessToken: accessToken,
                userID: userID,
                name: payload.name,
                icon: payload.icon,
                orderIndex: foodItems.count,
                unit: payload.unit,
                logDirectly: payload.logDirectly,
                proteinG: payload.proteinG,
                carbsG: payload.carbsG,
                fatG: payload.fatG,
                calories: payload.calories,
                color: payload.color
            )
            foodItems.append(created)
        }
    }

    func deleteFoodItem(_ id: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteFoodItem(accessToken: accessToken, id: id)
            foodItems.removeAll { $0.id == id }
            foodEntries.removeValue(forKey: id)
        }
    }

    func addSessionExtra(exercise: ExerciseDTO) async {
        guard let dataService, let session = activeSession else { return }
        let normalized = WorkoutCalculations.normalizeExerciseName(exercise.name)
        let existingNames = (session.clientMeta?.extras ?? []).map {
            WorkoutCalculations.normalizeExerciseName($0.exerciseName)
        }
        guard !existingNames.contains(normalized) else { return }

        let extra = SessionExtraDTO(
            localID: WorkoutMapper.stableExtraID(for: exercise.name),
            exerciseID: exercise.id,
            exerciseName: exercise.name,
            category: exercise.category,
            imageURL: exercise.gifURL ?? exercise.imageURL
        )
        var extras = session.clientMeta?.extras ?? []
        extras.append(extra)
        let meta = SessionClientMeta(extras: extras, exerciseDone: session.clientMeta?.exerciseDone ?? [:])

        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            var updated = try await dataService.patchSessionClientMeta(
                accessToken: accessToken,
                sessionID: session.id,
                meta: meta
            )
            if updated.setLogs == nil {
                updated = ActiveSessionDTO(
                    id: updated.id,
                    routineID: updated.routineID,
                    routineName: updated.routineName,
                    date: updated.date,
                    status: updated.status,
                    setLogs: session.setLogs,
                    clientMeta: updated.clientMeta
                )
            }
            activeSession = updated
            remapSplits()
        }
    }

    func removeSessionExtra(exerciseName: String) async {
        guard let dataService, let session = activeSession else { return }
        let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
        var extras = session.clientMeta?.extras ?? []
        extras.removeAll { WorkoutCalculations.normalizeExerciseName($0.exerciseName) == normalized }
        let meta = SessionClientMeta(extras: extras, exerciseDone: session.clientMeta?.exerciseDone ?? [:])

        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            var updated = try await dataService.patchSessionClientMeta(
                accessToken: accessToken,
                sessionID: session.id,
                meta: meta
            )
            if updated.setLogs == nil {
                updated = ActiveSessionDTO(
                    id: updated.id,
                    routineID: updated.routineID,
                    routineName: updated.routineName,
                    date: updated.date,
                    status: updated.status,
                    setLogs: session.setLogs,
                    clientMeta: updated.clientMeta
                )
            }
            activeSession = updated
            remapSplits()
        }
    }

    func logLifeLog(_ eventTypeID: UUID, notes: String?, cost: Double?) async {
        guard let dataService, let userID else { return }
        if let existing = lifeLog(for: eventTypeID), notes == nil, cost == nil {
            await toggleLifeLog(eventTypeID)
            return
        }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            if let existing = lifeLog(for: eventTypeID) {
                try await dataService.deleteEventLog(accessToken: accessToken, logID: existing.id)
                removeLifeLog(existing, eventTypeID: eventTypeID)
            }
            let log = try await dataService.logLifeEvent(
                accessToken: accessToken,
                userID: userID,
                eventTypeID: eventTypeID,
                date: viewingDate,
                notes: notes,
                cost: cost
            )
            insertLifeLog(log, eventTypeID: eventTypeID)
        }
    }

    func undoWorkoutDone() async {
        await reopenViewingDateWorkout()
    }

    func updateHabit(
        _ id: UUID,
        name: String,
        icon: String,
        hasValue: Bool,
        valueUnit: String?,
        activeDays: [Int]?,
        color: String? = nil
    ) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let updated = try await dataService.updateTrackable(
                accessToken: accessToken,
                id: id,
                name: name,
                icon: icon,
                hasValue: hasValue,
                valueUnit: valueUnit,
                activeDays: activeDays,
                color: color
            )
            if let index = trackables.firstIndex(where: { $0.id == id }) {
                trackables[index] = updated
            }
            syncLogReminders()
        }
    }

    func updateFood(_ id: UUID, name: String, icon: String, unit: String?) async {
        await updateFoodItem(id, payload: FoodItemEditorPayload(
            name: name,
            icon: icon,
            unit: unit ?? "serving",
            logDirectly: foodItems.first(where: { $0.id == id })?.logDirectly == true,
            proteinG: foodItems.first(where: { $0.id == id })?.proteinG,
            carbsG: foodItems.first(where: { $0.id == id })?.carbsG,
            fatG: foodItems.first(where: { $0.id == id })?.fatG,
            calories: foodItems.first(where: { $0.id == id })?.calories,
            color: foodItems.first(where: { $0.id == id })?.color
        ))
    }

    func updateFoodItem(_ id: UUID, payload: FoodItemEditorPayload) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let updated = try await dataService.updateFoodItem(
                accessToken: accessToken,
                id: id,
                name: payload.name,
                icon: payload.icon,
                unit: payload.unit,
                logDirectly: payload.logDirectly,
                proteinG: payload.proteinG,
                carbsG: payload.carbsG,
                fatG: payload.fatG,
                calories: payload.calories,
                color: payload.color
            )
            if let index = foodItems.firstIndex(where: { $0.id == id }) {
                foodItems[index] = updated
            }
        }
    }

    func updateLifeLogEvent(
        _ id: UUID,
        name: String,
        icon: String,
        needNotes: Bool = false,
        trackGraph: Bool = false,
        color: String? = nil,
        description: String? = nil
    ) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.updateEventType(
                accessToken: accessToken,
                id: id,
                name: name,
                icon: icon,
                needNotes: needNotes,
                trackGraph: trackGraph,
                color: color,
                description: description
            )
            if let index = eventTypes.firstIndex(where: { $0.id == id }) {
                let existing = eventTypes[index]
                eventTypes[index] = EventTypeDTO(
                    id: existing.id,
                    name: name,
                    icon: icon,
                    color: color ?? existing.color,
                    description: description ?? existing.description,
                    orderIndex: existing.orderIndex,
                    needNotes: needNotes,
                    trackGraph: trackGraph,
                    eventLogs: existing.eventLogs
                )
            }
            syncLogReminders()
        }
    }

    func reloadLifeLogCatalog() async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            eventTypes = try await dataService.fetchEventTypes(accessToken: accessToken)
                .sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
            rebuildLifeLogIndex()
        }
    }

    func fetchBodyWeightHistory() async -> [(date: String, value: Double)] {
        guard let dataService, let trackable = bodyWeightTrackable else { return [] }
        do {
            let accessToken = try await resolvedAccessToken()
            let rows = try await dataService.fetchTrackingEntriesForTrackable(
                accessToken: accessToken,
                trackableID: trackable.id,
                limit: 60
            )
            return rows.compactMap { entry in
                guard let value = entry.value else { return nil }
                return (entry.date, value)
            }.sorted { $0.date < $1.date }
        } catch {
            return []
        }
    }

    func createRoutine(name: String, color: String) async -> UUID? {
        guard let dataService, let userID else { return nil }
        var createdID: UUID?
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let created = try await dataService.createRoutine(
                accessToken: accessToken,
                userID: userID,
                name: name,
                color: color
            )
            createdID = created.id
            await refresh()
        }
        return createdID
    }

    func updateRoutine(id: UUID, name: String, color: String) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.updateRoutine(accessToken: accessToken, id: id, name: name, color: color)
            await refresh()
        }
    }

    func deleteRoutine(id: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteRoutine(accessToken: accessToken, id: id)
            await refresh()
        }
    }

    func replaceRoutineExercises(routineID: UUID, exerciseNames: [String]) async {
        guard dataService != nil else { return }
        let inputs = exerciseNames.compactMap { name -> RoutineExerciseInput? in
            guard let dto = catalog.first(where: {
                WorkoutCalculations.normalizeExerciseName($0.name) == WorkoutCalculations.normalizeExerciseName(name)
            }) else { return nil }
            return RoutineExerciseInput(
                exerciseID: dto.id,
                exerciseName: dto.name,
                category: dto.category ?? "other",
                targetSets: 3,
                notes: nil,
                isPinned: false
            )
        }
        await replaceRoutineExercises(routineID: routineID, exercises: inputs)
    }

    func replaceRoutineExercises(routineID: UUID, exercises: [RoutineExerciseInput]) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.replaceRoutineExercises(
                accessToken: accessToken,
                routineID: routineID,
                exercises: exercises
            )
            await refresh()
        }
    }

    func reorderExercises(routineID: UUID, orderedIDs: [UUID]) async {
        guard usesLiveData, let dataService, let splitIndex = splits.firstIndex(where: { $0.id == routineID }) else { return }
        let snapshot = captureMutationSnapshot()
        let current = splits[splitIndex].exercises
        let byID = Dictionary(uniqueKeysWithValues: current.map { ($0.routineExerciseID, $0) })
        let ordered = orderedIDs.compactMap { byID[$0] }
        guard ordered.count == current.count else { return }
        splits[splitIndex].exercises = ordered

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.replaceRoutineExercises(
                accessToken: accessToken,
                routineID: routineID,
                exercises: Self.inputs(from: ordered.filter { !$0.isSessionExtra })
            )
            await refresh()
        }
    }

    func toggleExercisePin(routineID: UUID, routineExerciseID: UUID) async {
        guard usesLiveData, let dataService, let splitIndex = splits.firstIndex(where: { $0.id == routineID }),
              let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: { $0.routineExerciseID == routineExerciseID }),
              !splits[splitIndex].exercises[exerciseIndex].isSessionExtra else { return }
        let snapshot = captureMutationSnapshot()
        splits[splitIndex].exercises[exerciseIndex].isPinned.toggle()
        splits[splitIndex].exercises = Self.sortedForDisplay(splits[splitIndex].exercises)

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.replaceRoutineExercises(
                accessToken: accessToken,
                routineID: routineID,
                exercises: Self.inputs(from: splits[splitIndex].exercises.filter { !$0.isSessionExtra })
            )
            await refresh()
        }
    }

    private func insertLifeLog(_ log: EventLogDTO, eventTypeID: UUID) {
        eventTypes = eventTypes.map { event in
            guard event.id == eventTypeID else { return event }
            var logs = event.eventLogs ?? []
            logs.removeAll { $0.date == log.date }
            logs.insert(log, at: 0)
            return EventTypeDTO(
                id: event.id,
                name: event.name,
                icon: event.icon,
                color: event.color,
                description: event.description,
                orderIndex: event.orderIndex,
                needNotes: event.needNotes,
                trackGraph: event.trackGraph,
                eventLogs: logs
            )
        }
        rebuildLifeLogIndex()
    }

    private func removeLifeLog(_ log: EventLogDTO, eventTypeID: UUID) {
        eventTypes = eventTypes.map { event in
            guard event.id == eventTypeID else { return event }
            let logs = (event.eventLogs ?? []).filter { $0.id != log.id }
            return EventTypeDTO(
                id: event.id,
                name: event.name,
                icon: event.icon,
                color: event.color,
                description: event.description,
                orderIndex: event.orderIndex,
                needNotes: event.needNotes,
                trackGraph: event.trackGraph,
                eventLogs: logs
            )
        }
        rebuildLifeLogIndex()
    }

    func ensureSessionForRoutine(routineID: UUID, routineName: String) async -> Bool {
        guard let dataService, let userID else { return false }
        if isViewingCompletedWorkout {
            remapSplits()
            return true
        }
        do {
            let accessToken = try await resolvedAccessToken()
            activeSession = try await dataService.ensureActiveSession(
                accessToken: accessToken,
                userID: userID,
                routineID: routineID,
                routineName: routineName,
                date: viewingDate
            )
            viewingCompletedSession = nil
            remapSplits()
            return true
        } catch {
            mutationError = Self.userFacingError(error)
            return false
        }
    }

    func loadHistory(force: Bool = false) async {
        guard let dataService else { return }
        guard force || !historyCacheValid else { return }
        isLoadingHistory = true
        defer { isLoadingHistory = false }
        let today = WorkoutDate.todayString()
        let startDate = WorkoutDataService.historyStartDate()

        do {
            let accessToken = try await resolvedAccessToken()
            async let sessions = dataService.fetchWorkoutSessions(
                accessToken: accessToken,
                startDate: startDate,
                endDate: today
            )
            async let legacy = dataService.fetchExerciseLogs(
                accessToken: accessToken,
                startDate: startDate,
                endDate: today
            )
            let loadedSessions = try await sessions
            let loadedLegacy = try await legacy
            let historySnapshot = exerciseHistory
            let processed = await Task.detached(priority: .userInitiated) {
                Self.processHistory(
                    sessions: loadedSessions,
                    legacyLogs: loadedLegacy,
                    exerciseHistory: historySnapshot
                )
            }.value
            self.loadedSessions = processed.sessions
            historyGroups = processed.groups
            workoutLoggedDates = processed.loggedDates
            profileStats = processed.stats
            cachedWorkoutTrend = processed.workoutTrend
            cachedExerciseOverloadPoints = processed.overloadPoints
            cachedTopExerciseProgress = processed.topExercises
            historyCacheValid = true
        } catch {
            mutationError = Self.userFacingError(error)
        }
    }

    nonisolated private static func processHistory(
        sessions: [ActiveSessionDTO],
        legacyLogs: [ExerciseLogDTO],
        exerciseHistory: [String: ExerciseHistoryDTO]
    ) -> (
        sessions: [ActiveSessionDTO],
        groups: [HistoryDayGroup],
        loggedDates: Set<String>,
        stats: ProfileStats,
        workoutTrend: [WorkoutWeekPoint],
        overloadPoints: [ExerciseOverloadPoint],
        topExercises: [(name: String, bestWeight: Double, bestReps: Int, sessions: Int)]
    ) {
        let groups = WorkoutStatsCalculator.groupHistory(sessions: sessions, legacyLogs: legacyLogs)
        let loggedDates = Set(sessions.filter { $0.status == "completed" }.compactMap(\.date))
        let stats = WorkoutStatsCalculator.computeProfileStats(sessions: sessions, exerciseHistory: exerciseHistory)
        let workoutTrend = WorkoutStatsCalculator.weeklyWorkoutTrend(sessions: sessions)
        let overloadPoints = WorkoutStatsCalculator.exerciseOverloadTimeline(sessions: sessions)
        var progressStats: [String: (sessions: Set<String>, bestWeight: Double, bestReps: Int)] = [:]
        for session in sessions where session.status == "completed" {
            guard let date = session.date else { continue }
            for log in session.setLogs ?? [] where log.isCompleted {
                let key = log.exerciseName
                var row = progressStats[key] ?? (Set<String>(), 0, 0)
                row.sessions.insert(date)
                if log.weight > row.bestWeight || (log.weight == row.bestWeight && log.reps > row.bestReps) {
                    row.bestWeight = log.weight
                    row.bestReps = log.reps
                }
                progressStats[key] = row
            }
        }
        let topExercises = progressStats
            .map { (name: $0.key, bestWeight: $0.value.bestWeight, bestReps: $0.value.bestReps, sessions: $0.value.sessions.count) }
            .sorted { lhs, rhs in
                if lhs.sessions == rhs.sessions {
                    return lhs.bestWeight > rhs.bestWeight
                }
                return lhs.sessions > rhs.sessions
            }
            .prefix(8)
            .map { $0 }
        return (sessions, groups, loggedDates, stats, workoutTrend, overloadPoints, topExercises)
    }

    func exerciseSetHistory(for exerciseName: String) async -> ExerciseSetHistoryAnalysis? {
        guard let dataService else { return nil }
        let today = WorkoutDate.todayString()
        let startDate = WorkoutDataService.historyStartDate()
        do {
            let accessToken = try await resolvedAccessToken()
            let entries = try await dataService.fetchExerciseSetHistory(
                accessToken: accessToken,
                exerciseName: exerciseName,
                startDate: startDate,
                endDate: today,
                excludeSessionID: activeSession?.id
            )
            return ExerciseSetHistoryAnalysisEngine.analyze(entries, weightUnit: weightUnit)
        } catch {
            mutationError = error.localizedDescription
            return nil
        }
    }

    func clear() {
        splits = []
        usesLiveData = false
        loadState = .idle
        activeSession = nil
        exerciseHistory = [:]
        catalog = []
        userDisplayName = nil
        weightUnit = .kg
        accessToken = nil
        userID = nil
        tokenProvider = nil
        mutationError = nil
        profileStats = .empty
        historyGroups = []
        viewingCompletedSession = nil
        completionSummary = nil
        viewingDate = WorkoutDate.todayString()
        workoutLoggedDates = []
        loadedSessions = []
        trackables = []
        trackingEntries = [:]
        foodItems = []
        foodEntries = [:]
        eventTypes = []
        stepCards = []
        macroTargets = .defaults
        macroMeals = MacroPlansDTO.defaultPlan.mealList ?? []
        foodHistoryDates = []
        lifeLogHistoryDates = []
        cachedWorkoutTrend = []
        cachedExerciseOverloadPoints = []
        cachedTopExerciseProgress = []
        historyCacheValid = false
        heatmapCacheValid = false
        lifeLogsByDate = [:]
        dateSelectionTask?.cancel()
        dateSelectionTask = nil
        routineDTOs = []
        mediaOverrides = [:]
    }

    func clearMutationError() {
        mutationError = nil
    }

    func exercise(named name: String, in splitIndex: Int) -> NativeExercise? {
        guard displaySplits.indices.contains(splitIndex) else { return nil }
        let normalized = WorkoutCalculations.normalizeExerciseName(name)
        return displaySplits[splitIndex].exercises.first {
            WorkoutCalculations.normalizeExerciseName($0.name) == normalized
        }
    }

    func history(for exerciseName: String) -> ExerciseHistoryDTO? {
        exerciseHistory[WorkoutCalculations.normalizeExerciseName(exerciseName)]
    }

    func logSet(
        routineExerciseID: UUID,
        routineID: UUID,
        routineName: String,
        exerciseName: String,
        category: String,
        weight: Double,
        reps: Int
    ) async {
        guard let dataService else {
            mutationError = SupabaseClientError.missingConfiguration.localizedDescription
            return
        }
        guard userID != nil else {
            mutationError = SupabaseClientError.unauthorized.localizedDescription
            return
        }
        guard usesLiveData else {
            applyLocalLog(routineExerciseID: routineExerciseID, weight: weight, reps: reps)
            return
        }
        guard canLogSets else {
            mutationError = "No workout session available."
            return
        }

        let optimisticID = UUID()
        let snapshot = captureMutationSnapshot()
        applyOptimisticLog(
            routineExerciseID: routineExerciseID,
            setID: optimisticID,
            weight: weight,
            reps: reps
        )

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            guard let userID = self.userID else { throw SupabaseClientError.unauthorized }
            let session: ActiveSessionDTO
            if isViewingCompletedWorkout, let completed = viewingCompletedSession {
                session = try await dataService.fetchSession(accessToken: accessToken, sessionID: completed.id) ?? completed
            } else {
                session = try await dataService.ensureActiveSession(
                    accessToken: accessToken,
                    userID: userID,
                    routineID: routineID,
                    routineName: routineName,
                    date: viewingDate
                )
                activeSession = session
            }
            if session.setLogs == nil,
               let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: session.id) {
                applyRefreshedSession(refreshed)
            }
            let workingSession = sessionForMutations ?? session
            let hist = history(for: exerciseName)
            let payload = WorkoutDataService.setLogInsertPayload(
                session: workingSession,
                userID: userID,
                exerciseName: exerciseName,
                category: category,
                weight: weight,
                reps: reps,
                exerciseHistory: hist
            )
            _ = try await dataService.insertSetLog(accessToken: accessToken, payload: payload)
            if let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: workingSession.id) {
                applyRefreshedSession(refreshed)
            }
            remapSplits()
            await loadHistory()
            await loadDayLogData()
        }
    }

    func updateSet(id: UUID, weight: Double, reps: Int) async {
        guard let dataService else {
            mutationError = SupabaseClientError.missingConfiguration.localizedDescription
            return
        }
        let snapshot = captureMutationSnapshot()
        applyOptimisticSetUpdate(setID: id, weight: weight, reps: reps)

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            _ = try await dataService.updateSetLog(
                accessToken: accessToken,
                id: id,
                payload: SetLogUpdate(weight: weight, reps: reps, isCompleted: true)
            )
            if let sessionID = sessionForMutations?.id,
               let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID) {
                applyRefreshedSession(refreshed)
            }
            remapSplits()
        }
    }

    func deleteSet(_ setID: UUID) async {
        guard let dataService else {
            mutationError = SupabaseClientError.missingConfiguration.localizedDescription
            return
        }
        let snapshot = captureMutationSnapshot()
        applyOptimisticSetDelete(setID: setID)

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteSetLog(accessToken: accessToken, id: setID)
            if let sessionID = sessionForMutations?.id,
               let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID) {
                applyRefreshedSession(refreshed)
            }
            remapSplits()
        }
    }

    func completeActiveWorkout() async {
        guard let dataService, let userID, let session = activeSession else { return }
        let snapshot = captureMutationSnapshot()
        applyOptimisticComplete(sessionID: session.id)

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.completeWorkoutSession(
                accessToken: accessToken,
                userID: userID,
                sessionID: session.id,
                exerciseHistory: exerciseHistory
            )
            try await reloadExerciseHistory(accessToken: accessToken, dataService: dataService)
            if let completed = try await dataService.fetchSession(accessToken: accessToken, sessionID: session.id) {
                completionSummary = WorkoutStatsCalculator.completionSummary(from: completed)
                viewingCompletedSession = completed
                activeSession = nil
            }
            remapSplits()
            await loadHistory(force: true)
            if !isViewingToday {
                await loadDayLogData()
            }
        }
    }

    func updateLifeLogEntry(
        _ logID: UUID,
        eventTypeID: UUID,
        notes: String?,
        cost: Double?,
        date: String
    ) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let updated = try await dataService.updateEventLog(
                accessToken: accessToken,
                logID: logID,
                notes: notes,
                cost: cost,
                date: date
            )
            eventTypes = eventTypes.map { event in
                guard event.id == eventTypeID else { return event }
                let logs = (event.eventLogs ?? []).map { log in
                    log.id == logID ? updated : log
                }
                return EventTypeDTO(
                    id: event.id,
                    name: event.name,
                    icon: event.icon,
                    color: event.color,
                    description: event.description,
                    orderIndex: event.orderIndex,
                    needNotes: event.needNotes,
                    trackGraph: event.trackGraph,
                    eventLogs: logs
                )
            }
            rebuildLifeLogIndex()
        }
    }

    func reopenViewingDateWorkout() async {
        guard let dataService, let session = viewingCompletedSession else { return }
        await mutate {
            let accessToken = try await resolvedAccessToken()
            try await dataService.reopenWorkoutSession(accessToken: accessToken, sessionID: session.id)
            activeSession = try await dataService.fetchSession(accessToken: accessToken, sessionID: session.id)
            viewingCompletedSession = nil
            remapSplits()
            await loadHistory()
            await loadDayLogData()
        }
    }

    func resetWorkout() async {
        guard let dataService, let session = activeSession else { return }
        let snapshot = captureMutationSnapshot()
        activeSession = nil
        viewingCompletedSession = nil
        remapSplits()

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteWorkoutSession(accessToken: accessToken, sessionID: session.id)
            activeSession = nil
            viewingCompletedSession = nil
            remapSplits()
            await loadHistory()
            await loadDayLogData()
        }
    }

    func resetExercise(named exerciseName: String) async {
        guard let dataService, let session = sessionForMutations else { return }
        let snapshot = captureMutationSnapshot()
        applyOptimisticExerciseReset(exerciseName: exerciseName)

        await mutate(revertOnError: snapshot) {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.resetSessionExerciseLogs(
                accessToken: accessToken,
                sessionID: session.id,
                exerciseName: exerciseName
            )
            if let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: session.id) {
                applyRefreshedSession(refreshed)
            }
            remapSplits()
        }
    }

    func deleteHistorySession(_ sessionID: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await resolvedAccessToken()
            try await dataService.deleteWorkoutSession(accessToken: accessToken, sessionID: sessionID)
            loadedSessions.removeAll { $0.id == sessionID }
            historyCacheValid = false
            await loadHistory(force: true)
        }
    }

    func fetchSessionDetail(_ sessionID: UUID) async -> ActiveSessionDTO? {
        guard let dataService else { return nil }
        do {
            let accessToken = try await resolvedAccessToken()
            return try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID)
        } catch {
            mutationError = error.localizedDescription
            return nil
        }
    }

    func deleteSetInHistorySession(_ setID: UUID, sessionID: UUID) async -> ActiveSessionDTO? {
        guard let dataService else { return nil }
        do {
            let accessToken = try await resolvedAccessToken()
            try await dataService.deleteSetLog(accessToken: accessToken, id: setID)
            let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID)
            syncViewingSessionIfNeeded(refreshed, sessionID: sessionID)
            return refreshed
        } catch {
            mutationError = Self.userFacingError(error)
            return nil
        }
    }

    func updateSetInHistorySession(_ setID: UUID, sessionID: UUID, weight: Double, reps: Int) async -> ActiveSessionDTO? {
        guard let dataService else { return nil }
        do {
            let accessToken = try await resolvedAccessToken()
            _ = try await dataService.updateSetLog(
                accessToken: accessToken,
                id: setID,
                payload: SetLogUpdate(weight: weight, reps: reps, isCompleted: true)
            )
            let refreshed = try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID)
            syncViewingSessionIfNeeded(refreshed, sessionID: sessionID)
            return refreshed
        } catch {
            mutationError = Self.userFacingError(error)
            return nil
        }
    }

    func reopenHistorySession(_ sessionID: UUID) async -> Bool {
        guard let dataService else { return false }
        do {
            let accessToken = try await resolvedAccessToken()
            try await dataService.reopenWorkoutSession(accessToken: accessToken, sessionID: sessionID)
            guard let session = try await dataService.fetchSession(accessToken: accessToken, sessionID: sessionID) else {
                return false
            }
            if let date = session.date {
                viewingDate = date
            }
            activeSession = session
            viewingCompletedSession = nil
            remapSplits()
            await loadHistory()
            return true
        } catch {
            mutationError = Self.userFacingError(error)
            return false
        }
    }

    func updateFoodQuantity(_ foodItemID: UUID, quantity: Double) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            if let existing = foodEntries[foodItemID] {
                if let updated = try await dataService.updateFoodEntryQuantity(
                    accessToken: accessToken,
                    entryID: existing.id,
                    quantity: quantity
                ) {
                    foodEntries[foodItemID] = updated
                }
            } else {
                let created = try await dataService.insertFoodEntry(
                    accessToken: accessToken,
                    userID: userID,
                    foodItemID: foodItemID,
                    date: viewingDate,
                    quantity: quantity
                )
                foodEntries[foodItemID] = created
            }
        }
    }

    func setHabitValue(_ trackableID: UUID, value: Double) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let result = try await dataService.setTrackingValue(
                accessToken: accessToken,
                userID: userID,
                trackableID: trackableID,
                date: viewingDate,
                value: value,
                existing: trackingEntries[trackableID]
            )
            trackingEntries[trackableID] = result
        }
    }

    func updateDisplayName(_ name: String) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await resolvedAccessToken()
            let settings = try await dataService.updateUserSettings(
                accessToken: accessToken,
                userID: userID,
                unit: nil,
                displayName: name
            )
            userDisplayName = settings.displayName
        }
    }

    func updateWeightUnit(_ unit: WeightUnit) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await resolvedAccessToken()
            let settings = try await dataService.updateUserSettings(
                accessToken: accessToken,
                userID: userID,
                unit: unit.rawValue,
                displayName: nil
            )
            weightUnit = WeightUnit(rawValue: settings.unit ?? unit.rawValue) ?? unit
            remapSplits()
        }
    }

    var workoutTrend: [WorkoutWeekPoint] {
        cachedWorkoutTrend
    }

    var exerciseOverloadPoints: [ExerciseOverloadPoint] {
        cachedExerciseOverloadPoints
    }

    var libraryExercises: [ExerciseDTO] {
        catalog.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func mediaURL(for exercise: ExerciseDTO) -> URL? {
        ExerciseMediaResolver.resolveMediaURL(
            exerciseName: exercise.name,
            exerciseID: exercise.id,
            catalog: catalog,
            overrides: mediaOverrides
        )
    }

    func mediaURL(forExerciseName name: String) -> URL? {
        let normalized = WorkoutCalculations.normalizeExerciseName(name)
        if let exercise = catalog.first(where: { WorkoutCalculations.normalizeExerciseName($0.name) == normalized }) {
            return mediaURL(for: exercise)
        }
        return ExerciseMediaResolver.resolveMediaURL(
            exerciseName: name,
            exerciseID: nil,
            catalog: catalog,
            overrides: mediaOverrides
        )
    }

    var todayMacroTotals: MacroTotals {
        MacroCalculations.todayTotals(foodItems: foodItems, entries: foodEntries, date: viewingDate)
    }

    var topExerciseProgress: [(name: String, bestWeight: Double, bestReps: Int, sessions: Int)] {
        cachedTopExerciseProgress
    }

    func loadFoodAndLifeLogHistory(force: Bool = false) async {
        guard let dataService else { return }
        guard force || !heatmapCacheValid else { return }
        let today = WorkoutDate.todayString()
        let startDate = WorkoutDataService.historyStartDate()
        do {
            let accessToken = try await resolvedAccessToken()
            async let food = dataService.fetchFoodEntriesRange(accessToken: accessToken, startDate: startDate, endDate: today)
            async let life = dataService.fetchEventLogsRange(accessToken: accessToken, startDate: startDate, endDate: today)
            foodHistoryDates = Set((try await food).map(\.date))
            lifeLogHistoryDates = Set((try await life).compactMap(\.date))
            heatmapCacheValid = true
        } catch {
            mutationError = Self.userFacingError(error)
        }
    }

    func updateMacroTargets(_ targets: MacroTargetsDTO) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let settings = try await dataService.updateMacroTargets(
                accessToken: accessToken,
                userID: userID,
                targets: targets
            )
            macroTargets = MacroCalculations.targets(from: settings)
        }
    }

    func updateMacroMeals(_ meals: [MacroMealDTO]) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let settings = try await dataService.updateMacroPlans(
                accessToken: accessToken,
                userID: userID,
                plans: MacroPlansDTO(mealList: meals)
            )
            macroMeals = MacroCalculations.mealPlan(from: settings)
        }
    }

    func logMacroMealToToday(_ meal: MacroMealDTO) async {
        guard let dataService, let userID else { return }
        for item in meal.items {
            let existing = foodEntries[item.foodItemID]
            await mutate {
                let accessToken = try await self.resolvedAccessToken()
                if let existing {
                    let nextQty = (existing.quantity ?? 0) + item.quantity
                    if let updated = try await dataService.updateFoodEntryQuantity(
                        accessToken: accessToken,
                        entryID: existing.id,
                        quantity: nextQty
                    ) {
                        foodEntries[item.foodItemID] = updated
                    }
                } else {
                    let created = try await dataService.insertFoodEntry(
                        accessToken: accessToken,
                        userID: userID,
                        foodItemID: item.foodItemID,
                        date: viewingDate,
                        quantity: item.quantity
                    )
                    foodEntries[item.foodItemID] = created
                }
            }
        }
    }

    func createStepCard(name: String, icon: String, color: String) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let card = try await dataService.createStepCard(
                accessToken: accessToken,
                userID: userID,
                name: name,
                icon: icon,
                color: color,
                orderIndex: stepCards.count
            )
            stepCards.append(card)
        }
    }

    func deleteStepCard(_ id: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteStepCard(accessToken: accessToken, id: id)
            stepCards.removeAll { $0.id == id }
        }
    }

    func updateStepCard(_ id: UUID, name: String, icon: String, color: String) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.updateStepCard(
                accessToken: accessToken,
                id: id,
                name: name,
                icon: icon,
                color: color
            )
            if let index = stepCards.firstIndex(where: { $0.id == id }) {
                let existing = stepCards[index]
                stepCards[index] = StepCardDTO(
                    id: existing.id,
                    name: name,
                    icon: icon,
                    color: color,
                    orderIndex: existing.orderIndex,
                    stepItems: existing.stepItems
                )
            }
        }
    }

    func addStepItem(cardID: UUID, text: String) async {
        guard let dataService, let userID else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            guard let index = stepCards.firstIndex(where: { $0.id == cardID }) else { return }
            let order = stepCards[index].items.count
            let item = try await dataService.createStepItem(
                accessToken: accessToken,
                userID: userID,
                cardID: cardID,
                text: text,
                orderIndex: order
            )
            var card = stepCards[index]
            var items = card.stepItems ?? []
            items.append(item)
            card = StepCardDTO(
                id: card.id,
                name: card.name,
                icon: card.icon,
                color: card.color,
                orderIndex: card.orderIndex,
                stepItems: items
            )
            stepCards[index] = card
        }
    }

    func deleteStepItem(cardID: UUID, itemID: UUID) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.deleteStepItem(accessToken: accessToken, id: itemID)
            guard let index = stepCards.firstIndex(where: { $0.id == cardID }) else { return }
            var card = stepCards[index]
            card = StepCardDTO(
                id: card.id,
                name: card.name,
                icon: card.icon,
                color: card.color,
                orderIndex: card.orderIndex,
                stepItems: card.items.filter { $0.id != itemID }
            )
            stepCards[index] = card
        }
    }

    func updateStepItem(cardID: UUID, itemID: UUID, text: String) async {
        guard let dataService else { return }
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            try await dataService.updateStepItem(accessToken: accessToken, id: itemID, text: text)
            guard let index = stepCards.firstIndex(where: { $0.id == cardID }) else { return }
            let card = stepCards[index]
            let items = card.items.map { item in
                guard item.id == itemID else { return item }
                return StepItemDTO(id: item.id, text: text, orderIndex: item.orderIndex)
            }
            stepCards[index] = StepCardDTO(
                id: card.id,
                name: card.name,
                icon: card.icon,
                color: card.color,
                orderIndex: card.orderIndex,
                stepItems: items
            )
        }
    }

    func reorderStepCards(from source: IndexSet, to destination: Int) {
        stepCards.move(fromOffsets: source, toOffset: destination)
        Task {
            guard let dataService else { return }
            await mutate {
                let accessToken = try await self.resolvedAccessToken()
                try await dataService.reorderStepCards(accessToken: accessToken, cards: stepCards)
            }
        }
    }

    var recentCompletedSessions: [HistorySessionItem] {
        historyGroups.flatMap(\.sessions).prefix(8).map { $0 }
    }

    func createCustomExercise(name: String, category: String, equipment: String?) async -> ExerciseDTO? {
        guard let dataService, let userID else { return nil }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let normalized = WorkoutCalculations.normalizeExerciseName(trimmed)
        if let existing = catalog.first(where: { WorkoutCalculations.normalizeExerciseName($0.name) == normalized }) {
            return existing
        }

        var created: ExerciseDTO?
        await mutate {
            let accessToken = try await self.resolvedAccessToken()
            let row = try await dataService.createCustomExercise(
                accessToken: accessToken,
                userID: userID,
                name: trimmed,
                category: category.lowercased(),
                equipment: equipment
            )
            catalog.append(row)
            catalog.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            created = row
        }
        return created
    }

    func setExerciseMediaOverride(exercise: ExerciseDTO, mediaURL: String?) async {
        guard let dataService, let userID else { return }
        let keys = Self.mediaOverrideKeys(for: exercise)
        guard !keys.isEmpty else { return }
        let trimmed = mediaURL?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmed.isEmpty, URL(string: trimmed)?.scheme?.hasPrefix("http") != true {
            mutationError = "Enter a valid http or https media URL."
            return
        }

        await mutate {
            var next = Self.encodableOverrides(from: mediaOverrides)
            for key in keys {
                if trimmed.isEmpty {
                    next.removeValue(forKey: key)
                } else {
                    next[key] = ["media_url": trimmed]
                }
            }
            let accessToken = try await self.resolvedAccessToken()
            let settings = try await dataService.upsertExerciseMediaOverrides(
                accessToken: accessToken,
                userID: userID,
                overrides: next
            )
            mediaOverrides = parseMediaOverrides(settings.exerciseMediaOverrides)
            remapSplits()
        }
    }

    func exercise(with routineExerciseID: UUID) -> NativeExercise? {
        for split in splits {
            if let exercise = split.exercises.first(where: { $0.routineExerciseID == routineExerciseID }) {
                return exercise
            }
        }
        return nil
    }

    private struct MutationSnapshot {
        let splits: [NativeSplit]
        let activeSession: ActiveSessionDTO?
        let viewingCompletedSession: ActiveSessionDTO?
        let exerciseHistory: [String: ExerciseHistoryDTO]
    }

    private func captureMutationSnapshot() -> MutationSnapshot {
        MutationSnapshot(
            splits: splits,
            activeSession: activeSession,
            viewingCompletedSession: viewingCompletedSession,
            exerciseHistory: exerciseHistory
        )
    }

    private func restoreMutationSnapshot(_ snapshot: MutationSnapshot) {
        splits = snapshot.splits
        activeSession = snapshot.activeSession
        viewingCompletedSession = snapshot.viewingCompletedSession
        exerciseHistory = snapshot.exerciseHistory
        remapSplits()
    }

    private func applyOptimisticLog(
        routineExerciseID: UUID,
        setID: UUID,
        weight: Double,
        reps: Int
    ) {
        guard let splitIndex = splits.firstIndex(where: { split in
            split.exercises.contains { $0.routineExerciseID == routineExerciseID }
        }), let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: { $0.routineExerciseID == routineExerciseID }) else {
            return
        }
        let label = WorkoutDate.displayLabel(for: viewingDate)
        splits[splitIndex].exercises[exerciseIndex].logs.insert(
            LoggedSet(id: setID, weight: weight, reps: reps, date: label),
            at: 0
        )
    }

    private func applyOptimisticSetUpdate(setID: UUID, weight: Double, reps: Int) {
        for splitIndex in splits.indices {
            if let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: { exercise in
                exercise.logs.contains { $0.id == setID }
            }) {
                if let logIndex = splits[splitIndex].exercises[exerciseIndex].logs.firstIndex(where: { $0.id == setID }) {
                    splits[splitIndex].exercises[exerciseIndex].logs[logIndex].weight = weight
                    splits[splitIndex].exercises[exerciseIndex].logs[logIndex].reps = reps
                }
                return
            }
        }
    }

    private func applyOptimisticSetDelete(setID: UUID) {
        for splitIndex in splits.indices {
            if let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: { exercise in
                exercise.logs.contains { $0.id == setID }
            }) {
                splits[splitIndex].exercises[exerciseIndex].logs.removeAll { $0.id == setID }
                return
            }
        }
    }

    private func applyOptimisticExerciseReset(exerciseName: String) {
        let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
        for splitIndex in splits.indices {
            if let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: {
                WorkoutCalculations.normalizeExerciseName($0.name) == normalized
            }) {
                splits[splitIndex].exercises[exerciseIndex].logs = []
                return
            }
        }
    }

    private func applyOptimisticComplete(sessionID: UUID) {
        if let session = activeSession, session.id == sessionID {
            viewingCompletedSession = ActiveSessionDTO(
                id: session.id,
                routineID: session.routineID,
                routineName: session.routineName,
                date: session.date,
                status: "completed",
                setLogs: session.setLogs,
                clientMeta: session.clientMeta
            )
            activeSession = nil
        }
        remapSplits()
    }

    private func reloadExerciseHistory(accessToken: String, dataService: WorkoutDataService) async throws {
        let rows = try await dataService.fetchExerciseHistory(accessToken: accessToken)
        exerciseHistory = Dictionary(uniqueKeysWithValues: rows.map {
            (WorkoutCalculations.normalizeExerciseName($0.exerciseName), $0)
        })
    }

    private static func userFacingError(_ error: Error) -> String {
        if let auth = error as? SupabaseClientError {
            switch auth {
            case .requestFailed(let message):
                if let data = message.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let parsed = json["message"] as? String {
                    return parsed
                }
                return message
            default:
                return auth.localizedDescription
            }
        }
        return error.localizedDescription
    }

    private func applyRefreshedSession(_ refreshed: ActiveSessionDTO?) {
        guard let refreshed else { return }
        if activeSession?.id == refreshed.id {
            activeSession = refreshed
        } else if viewingCompletedSession?.id == refreshed.id {
            viewingCompletedSession = refreshed
        }
    }

    private func syncViewingSessionIfNeeded(_ refreshed: ActiveSessionDTO?, sessionID: UUID) {
        guard let refreshed else { return }
        if viewingCompletedSession?.id == sessionID {
            viewingCompletedSession = refreshed
            remapSplits()
        } else if activeSession?.id == sessionID {
            activeSession = refreshed
            remapSplits()
        }
    }

    private func applyDayLogEntries(tracking: [TrackingEntryDTO], food: [FoodEntryDTO]) {
        trackingEntries = Dictionary(uniqueKeysWithValues: tracking.map { ($0.trackableID, $0) })
        foodEntries = Dictionary(uniqueKeysWithValues: food.map { ($0.foodItemID, $0) })
    }

    private func mutate(revertOnError snapshot: MutationSnapshot? = nil, _ operation: () async throws -> Void) async {
        mutationError = nil
        do {
            try await operation()
        } catch {
            if let snapshot {
                restoreMutationSnapshot(snapshot)
            }
            mutationError = Self.userFacingError(error)
        }
    }

    private static func sortedForDisplay(_ exercises: [NativeExercise]) -> [NativeExercise] {
        exercises.filter { !$0.isSessionExtra && $0.isPinned }
            + exercises.filter { !$0.isSessionExtra && !$0.isPinned }
            + exercises.filter(\.isSessionExtra)
    }

    private static func inputs(from exercises: [NativeExercise]) -> [RoutineExerciseInput] {
        exercises.map {
            RoutineExerciseInput(
                exerciseID: $0.exerciseID,
                exerciseName: $0.name,
                category: $0.category,
                targetSets: $0.targetSets,
                notes: $0.notes,
                isPinned: $0.isPinned
            )
        }
    }

    private func applyLocalLog(routineExerciseID: UUID, weight: Double, reps: Int) {
        guard usesLiveData else { return }
        guard let splitIndex = splits.firstIndex(where: { split in
            split.exercises.contains { $0.routineExerciseID == routineExerciseID }
        }), let exerciseIndex = splits[splitIndex].exercises.firstIndex(where: { $0.routineExerciseID == routineExerciseID }) else {
            return
        }
        splits[splitIndex].exercises[exerciseIndex].logs.insert(
            LoggedSet(weight: weight, reps: reps, date: WorkoutDate.displayLabel(for: viewingDate)),
            at: 0
        )
    }

    private func refreshFallback(accessToken: String, dataService: WorkoutDataService) async throws {
        let today = WorkoutDate.todayString()
        async let routines = dataService.fetchRoutines(accessToken: accessToken)
        async let exercises = dataService.fetchExercises(accessToken: accessToken)
        async let history = dataService.fetchExerciseHistory(accessToken: accessToken)
        async let session = dataService.fetchActiveSession(accessToken: accessToken, date: today)
        async let trackables = dataService.fetchTrackables(accessToken: accessToken)
        async let foodItems = dataService.fetchFoodItems(accessToken: accessToken)
        async let eventTypes = dataService.fetchEventTypes(accessToken: accessToken)
        async let stepCards = dataService.fetchStepCards(accessToken: accessToken)
        async let todayEntries = dataService.fetchTrackingEntries(accessToken: accessToken, date: today)
        async let todayFoodEntries = dataService.fetchFoodEntries(accessToken: accessToken, date: today)

        let settings: UserSettingsDTO?
        if let userID {
            settings = try await dataService.fetchUserSettings(accessToken: accessToken, userID: userID)
        } else {
            settings = nil
        }

        let initData = InitDataDTO(
            exercises: try await exercises,
            userSettings: settings,
            exerciseHistory: try await history,
            routines: try await routines,
            activeSession: try await session,
            trackables: try await trackables,
            todayEntries: try await todayEntries,
            foodItems: try await foodItems,
            todayFoodEntries: try await todayFoodEntries,
            eventTypes: try await eventTypes,
            stepCards: try await stepCards
        )
        apply(initData)
    }

    private func loadSessionForViewingDate() async {
        guard let dataService else { return }

        do {
            let accessToken = try await resolvedAccessToken()
            if isViewingToday {
                activeSession = try await dataService.fetchActiveSession(accessToken: accessToken, date: viewingDate)
                viewingCompletedSession = try await dataService.fetchCompletedSession(
                    accessToken: accessToken,
                    date: viewingDate
                )
            } else {
                let sessions = try await dataService.fetchSessionsForDate(accessToken: accessToken, date: viewingDate)
                activeSession = sessions.first(where: { $0.status == "active" })
                viewingCompletedSession = sessions.first(where: { $0.status == "completed" })
            }
        } catch {
            mutationError = Self.userFacingError(error)
        }
    }

    private func apply(_ initData: InitDataDTO) {
        catalog = initData.exercises ?? []
        mediaOverrides = parseMediaOverrides(initData.userSettings?.exerciseMediaOverrides)
        exerciseHistory = Dictionary(uniqueKeysWithValues: (initData.exerciseHistory ?? []).map {
            (WorkoutCalculations.normalizeExerciseName($0.exerciseName), $0)
        })
        weightUnit = WeightUnit(rawValue: initData.userSettings?.unit ?? "kg") ?? .kg
        userDisplayName = initData.userSettings?.displayName
        routineDTOs = initData.routines ?? []
        trackables = (initData.trackables ?? []).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
        foodItems = (initData.foodItems ?? []).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
        eventTypes = (initData.eventTypes ?? []).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
        rebuildLifeLogIndex()
        stepCards = (initData.stepCards ?? []).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
        macroTargets = MacroCalculations.targets(from: initData.userSettings)
        macroMeals = MacroCalculations.mealPlan(from: initData.userSettings)
        if viewingDate == WorkoutDate.todayString() {
            applyDayLogEntries(tracking: initData.todayEntries ?? [], food: initData.todayFoodEntries ?? [])
        } else {
            trackingEntries = [:]
            foodEntries = [:]
        }

        if routineDTOs.isEmpty {
            splits = []
            usesLiveData = false
            loadState = .empty
            return
        }

        usesLiveData = true
        loadState = .loaded
        syncLogReminders()
    }

    func syncLogReminders() {
        LogReminderScheduler.reschedule(habits: trackables, events: eventTypes)
    }

    private func rebuildLifeLogIndex() {
        var index: [String: [UUID: EventLogDTO]] = [:]
        for event in eventTypes {
            for log in event.eventLogs ?? [] {
                index[log.date, default: [:]][event.id] = log
            }
        }
        lifeLogsByDate = index
    }

    private func remapSplits() {
        guard usesLiveData else { return }

        let session = sessionForDisplay
        let sessionLogs = session?.setLogs ?? []
        let logsByExercise = WorkoutCalculations.groupLogsByExerciseName(sessionLogs)
        let activeRoutineID = session?.routineID
        let today = WorkoutDate.todayString()
        let sessionDateLabel = WorkoutDate.displayLabel(for: viewingDate, today: today)

        splits = routineDTOs.map { routine in
            var split = WorkoutMapper.mapRoutine(
                routine,
                catalog: catalog,
                overrides: mediaOverrides,
                historyByName: exerciseHistory,
                logsByExercise: logsByExercise,
                activeRoutineID: activeRoutineID,
                sessionDateLabel: sessionDateLabel
            )
            if activeRoutineID == routine.id, let extras = session?.clientMeta?.extras, !extras.isEmpty {
                split = WorkoutMapper.mergeSessionExtras(
                    into: split,
                    extras: extras,
                    catalog: catalog,
                    overrides: mediaOverrides,
                    historyByName: exerciseHistory,
                    logsByExercise: logsByExercise,
                    sessionDateLabel: sessionDateLabel
                )
            }
            return split
        }
    }

    private func parseMediaOverrides(_ raw: [String: JSONValue]?) -> [String: ExerciseMediaOverrideDTO] {
        guard let raw else { return [:] }
        var result: [String: ExerciseMediaOverrideDTO] = [:]
        for (key, value) in raw {
            if case .object(let object) = value,
               case .string(let mediaURL)? = object["media_url"] {
                result[key] = ExerciseMediaOverrideDTO(mediaURL: mediaURL)
            }
        }
        return result
    }

    private static func encodableOverrides(from overrides: [String: ExerciseMediaOverrideDTO]) -> [String: [String: String]] {
        Dictionary(uniqueKeysWithValues: overrides.map { key, value in
            (key, ["media_url": value.mediaURL])
        })
    }

    private static func mediaOverrideKeys(for exercise: ExerciseDTO) -> [String] {
        let normalized = WorkoutCalculations.normalizeExerciseName(exercise.name)
        let compact = normalized.replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
        return [exercise.id.uuidString, "name:\(normalized)", "name:\(compact)"].filter { !$0.isEmpty }
    }
}
