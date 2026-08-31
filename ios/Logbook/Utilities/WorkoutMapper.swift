import Foundation

enum WorkoutMapper {
    static func stableExtraID(for exerciseName: String) -> UUID {
        let normalized = WorkoutCalculations.normalizeExerciseName(exerciseName)
        var bytes = [UInt8](repeating: 0, count: 16)
        for (index, byte) in normalized.utf8.enumerated() {
            bytes[index % 16] ^= byte
        }
        bytes[6] = (bytes[6] & 0x0F) | 0x40
        bytes[8] = (bytes[8] & 0x3F) | 0x80
        return UUID(uuid: (
            bytes[0], bytes[1], bytes[2], bytes[3],
            bytes[4], bytes[5], bytes[6], bytes[7],
            bytes[8], bytes[9], bytes[10], bytes[11],
            bytes[12], bytes[13], bytes[14], bytes[15]
        ))
    }

    static func mapInitData(_ data: InitDataDTO) -> MappedWorkoutData {
        let catalog = data.exercises ?? []
        let overrides = parseMediaOverrides(data.userSettings?.exerciseMediaOverrides)
        let historyByName = Dictionary(uniqueKeysWithValues: (data.exerciseHistory ?? []).map {
            (WorkoutCalculations.normalizeExerciseName($0.exerciseName), $0)
        })
        let sessionLogs = data.activeSession?.setLogs ?? []
        let logsByExercise = WorkoutCalculations.groupLogsByExerciseName(sessionLogs)
        let activeRoutineID = data.activeSession?.routineID
        let unit = WeightUnit(rawValue: data.userSettings?.unit ?? "kg") ?? .kg
        let today = WorkoutDate.todayString()
        let sessionDateLabel = WorkoutDate.displayLabel(for: data.activeSession?.date ?? today, today: today)

        let routines = (data.routines ?? []).map { routine in
            mapRoutine(
                routine,
                catalog: catalog,
                overrides: overrides,
                historyByName: historyByName,
                logsByExercise: logsByExercise,
                activeRoutineID: activeRoutineID,
                sessionDateLabel: sessionDateLabel
            )
        }

        return MappedWorkoutData(
            splits: routines,
            activeSession: data.activeSession,
            exerciseHistory: historyByName,
            weightUnit: unit,
            userDisplayName: data.userSettings?.displayName
        )
    }

    static func mapRoutine(
        _ routine: RoutineDTO,
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO],
        historyByName: [String: ExerciseHistoryDTO],
        logsByExercise: [String: [SetLogDTO]],
        activeRoutineID: UUID?,
        sessionDateLabel: String
    ) -> NativeSplit {
        let components = ExerciseMediaResolver.color(from: routine.color)
        let includeSessionLogs = activeRoutineID == nil || activeRoutineID == routine.id

        let exercises = (routine.routineExercises ?? [])
            .sorted {
                if ($0.isPinned ?? false) != ($1.isPinned ?? false) {
                    return ($0.isPinned ?? false) && !($1.isPinned ?? false)
                }
                return ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0)
            }
            .map { routineExercise in
                mapExercise(
                    routineExercise,
                    catalog: catalog,
                    overrides: overrides,
                    historyByName: historyByName,
                    logs: includeSessionLogs
                        ? logsByExercise[WorkoutCalculations.normalizeExerciseName(routineExercise.exerciseName)] ?? []
                        : [],
                    sessionDateLabel: sessionDateLabel
                )
            }

        return NativeSplit(
            id: routine.id,
            name: routine.name,
            color: Color(components: components),
            colorHex: routine.color ?? "#f97316",
            exercises: exercises
        )
    }

    static func mergeSessionExtras(
        into split: NativeSplit,
        extras: [SessionExtraDTO],
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO],
        historyByName: [String: ExerciseHistoryDTO],
        logsByExercise: [String: [SetLogDTO]],
        sessionDateLabel: String
    ) -> NativeSplit {
        guard !extras.isEmpty else { return split }
        var merged = split
        var existing = Set(split.exercises.map { WorkoutCalculations.normalizeExerciseName($0.name) })

        for extra in extras {
            let normalized = WorkoutCalculations.normalizeExerciseName(extra.exerciseName)
            guard !existing.contains(normalized) else { continue }
            existing.insert(normalized)

            let mediaURL: URL?
            if let imageURL = extra.imageURL, let url = URL(string: imageURL) {
                mediaURL = url
            } else {
                mediaURL = ExerciseMediaResolver.resolveMediaURL(
                    exerciseName: extra.exerciseName,
                    exerciseID: extra.exerciseID,
                    catalog: catalog,
                    overrides: overrides
                )
            }

            let logs = logsByExercise[normalized] ?? []
            let mappedLogs = logs
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
                .map {
                    LoggedSet(
                        id: $0.id,
                        weight: $0.weight,
                        reps: $0.reps,
                        date: sessionDateLabel,
                        isCompleted: $0.isCompleted
                    )
                }

            merged.exercises.append(
                NativeExercise(
                    routineExerciseID: extra.localID ?? WorkoutMapper.stableExtraID(for: extra.exerciseName),
                    exerciseID: extra.exerciseID,
                    name: extra.exerciseName,
                    category: extra.category ?? "other",
                    symbol: ExerciseMediaResolver.symbol(for: extra.category),
                    mediaURL: mediaURL,
                    logs: mappedLogs,
                    isSessionExtra: true
                )
            )
        }
        return merged
    }

    static func mapExercise(
        _ routineExercise: RoutineExerciseDTO,
        catalog: [ExerciseDTO],
        overrides: [String: ExerciseMediaOverrideDTO],
        historyByName: [String: ExerciseHistoryDTO],
        logs: [SetLogDTO],
        sessionDateLabel: String
    ) -> NativeExercise {
        let normalized = WorkoutCalculations.normalizeExerciseName(routineExercise.exerciseName)
        _ = historyByName[normalized]
        let mediaURL = ExerciseMediaResolver.resolveMediaURL(
            exerciseName: routineExercise.exerciseName,
            exerciseID: routineExercise.exerciseID,
            catalog: catalog,
            overrides: overrides
        )

        let mappedLogs = logs
            .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
            .map {
                LoggedSet(
                    id: $0.id,
                    weight: $0.weight,
                    reps: $0.reps,
                    date: sessionDateLabel,
                    isCompleted: $0.isCompleted
                )
            }

        return NativeExercise(
            routineExerciseID: routineExercise.id,
            exerciseID: routineExercise.exerciseID,
            name: routineExercise.exerciseName,
            category: routineExercise.category ?? "other",
            symbol: ExerciseMediaResolver.symbol(for: routineExercise.category),
            mediaURL: mediaURL,
            logs: mappedLogs,
            targetSets: routineExercise.targetSets ?? 3,
            notes: routineExercise.notes,
            isPinned: routineExercise.isPinned ?? false
        )
    }

    private static func parseMediaOverrides(_ raw: [String: JSONValue]?) -> [String: ExerciseMediaOverrideDTO] {
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
}

struct MappedWorkoutData {
    let splits: [NativeSplit]
    let activeSession: ActiveSessionDTO?
    let exerciseHistory: [String: ExerciseHistoryDTO]
    let weightUnit: WeightUnit
    let userDisplayName: String?
}

import SwiftUI
