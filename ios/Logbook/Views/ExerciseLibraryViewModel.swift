import Foundation
import SwiftUI

struct ExerciseLibrarySnapshot {
    let exercises: [ExerciseDTO]
    let catalog: [ExerciseDTO]
    let history: [String: ExerciseHistoryDTO]
    let overrides: [String: ExerciseMediaOverrideDTO]
    let weightUnit: WeightUnit
}

struct LibraryExerciseRowModel: Identifiable {
    let id: UUID
    let exercise: ExerciseDTO
    let subtitle: String
    let thumbnailURL: URL?
    let symbol: String
    let personalBest: Double
}

@MainActor
final class ExerciseLibraryViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var parentFilter: String?
    @Published var subFilter: String?
    @Published var equipmentKey: String?
    @Published var shownCount = 40
    @Published private(set) var rows: [LibraryExerciseRowModel] = []
    @Published private(set) var equipmentOptions: [ExerciseFilterLogic.EquipmentChip] = []
    @Published private(set) var totalCount = 0
    @Published private(set) var animatedCount = 0

    private var filterTask: Task<Void, Never>?
    private var snapshot = ExerciseLibrarySnapshot(
        exercises: [],
        catalog: [],
        history: [:],
        overrides: [:],
        weightUnit: .kg
    )

    func bind(to workoutStore: WorkoutStore) {
        snapshot = workoutStore.exerciseLibrarySnapshot()
        animatedCount = snapshot.exercises.filter(ExerciseCatalogInfo.hasAnimation).count
        scheduleFilter(immediate: true)
    }

    func refreshCatalog(from workoutStore: WorkoutStore) {
        snapshot = workoutStore.exerciseLibrarySnapshot()
        animatedCount = snapshot.exercises.filter(ExerciseCatalogInfo.hasAnimation).count
        scheduleFilter(immediate: true)
    }

    func scheduleFilter(immediate: Bool = false) {
        filterTask?.cancel()
        filterTask = Task {
            if !immediate {
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
            guard !Task.isCancelled else { return }
            await recomputeRows()
        }
    }

    func resetPaginationAndEquipment() {
        shownCount = 40
        if let equipmentKey,
           !equipmentOptions.contains(where: { $0.key == equipmentKey }) {
            self.equipmentKey = nil
        }
        scheduleFilter(immediate: true)
    }

    func showMore() {
        shownCount += 40
    }

    var displayedRows: [LibraryExerciseRowModel] {
        Array(rows.prefix(shownCount))
    }

    var hasMoreRows: Bool {
        displayedRows.count < rows.count
    }

    private func recomputeRows() async {
        let snapshot = snapshot
        let query = searchText
        let parent = parentFilter
        let sub = subFilter
        let equipment = equipmentKey

        let result = await Task.detached(priority: .userInitiated) {
            Self.buildRows(
                snapshot: snapshot,
                query: query,
                parent: parent,
                sub: sub,
                equipmentKey: equipment
            )
        }.value

        guard !Task.isCancelled else { return }
        rows = result.rows
        equipmentOptions = result.equipmentOptions
        totalCount = snapshot.exercises.count
    }

    private struct FilterSnapshot {
        let rows: [LibraryExerciseRowModel]
        let equipmentOptions: [ExerciseFilterLogic.EquipmentChip]
    }

    nonisolated private static func buildRows(
        snapshot: ExerciseLibrarySnapshot,
        query: String,
        parent: String?,
        sub: String?,
        equipmentKey: String?
    ) -> FilterSnapshot {
        let exercises = snapshot.exercises
        let base = exercises.filter { exercise in
            ExerciseFilterLogic.matchesSearch(exercise, query: query)
                && ExerciseFilterLogic.matchesParent(exercise, parent: parent)
                && ExerciseFilterLogic.matchesSub(exercise, parent: parent, sub: sub)
        }

        let equipmentOptions = ExerciseCatalogInfo.derivedEquipmentOptions(from: base)
        let filtered = base.filter { ExerciseFilterLogic.matchesEquipmentKey($0, key: equipmentKey) }

        let rows = filtered.map { exercise in
            let normalized = WorkoutCalculations.normalizeExerciseName(exercise.name)
            let record = snapshot.history[normalized]
            let personalBest = max(record?.personalRecordWeight ?? 0, record?.lastWeight ?? 0)

            return LibraryExerciseRowModel(
                id: exercise.id,
                exercise: exercise,
                subtitle: ExerciseCatalogInfo.subtitle(for: exercise),
                thumbnailURL: ExerciseMediaResolver.resolveThumbnailURL(
                    exercise: exercise,
                    catalog: snapshot.catalog,
                    overrides: snapshot.overrides
                ),
                symbol: ExerciseMediaResolver.symbol(for: exercise.category),
                personalBest: personalBest
            )
        }

        return FilterSnapshot(rows: rows, equipmentOptions: equipmentOptions)
    }
}
