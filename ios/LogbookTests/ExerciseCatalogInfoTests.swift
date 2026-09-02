import XCTest
@testable import Logbook

final class ExerciseCatalogInfoTests: XCTestCase {
    private func exercise(
        name: String = "Bench Press",
        category: String? = "chest",
        metadata: ExerciseMetadataDTO? = nil
    ) -> ExerciseDTO {
        ExerciseDTO(
            id: UUID(),
            name: name,
            category: category,
            description: nil,
            gifURL: "https://example.com/demo.gif",
            imageURL: nil,
            externalSource: nil,
            externalID: nil,
            metadata: metadata
        )
    }

    func testEquipmentFromMetadataDisplay() {
        let exercise = exercise(metadata: ExerciseMetadataDTO(
            equipmentDisplay: "Barbell",
            exercisedb: nil
        ))
        XCTAssertEqual(ExerciseCatalogInfo.equipment(for: exercise), "Barbell")
    }

    func testTargetMuscleFallsBackToCategory() {
        let exercise = exercise(category: "back")
        XCTAssertEqual(ExerciseCatalogInfo.targetMuscle(for: exercise), "back")
    }

    func testSubtitleCombinesMuscleAndEquipment() {
        let exercise = exercise(metadata: ExerciseMetadataDTO(
            equipmentDisplay: "dumbbell",
            exercisedb: ExerciseDBMetadataDTO(
                equipments: nil,
                targetMuscles: ["pectorals"],
                secondaryMuscles: nil,
                instructions: nil
            )
        ))
        XCTAssertEqual(ExerciseCatalogInfo.subtitle(for: exercise), "Pectorals · Dumbbell")
    }

    func testEquipmentTagsDetectBarbell() {
        let exercise = exercise(metadata: ExerciseMetadataDTO(
            equipmentDisplay: "olympic barbell",
            exercisedb: nil
        ))
        XCTAssertTrue(ExerciseCatalogInfo.equipmentTags(for: exercise).contains("barbell"))
    }
}

final class ExerciseFilterLogicTests: XCTestCase {
    private func exercise(name: String, category: String?, equipment: String) -> ExerciseDTO {
        ExerciseDTO(
            id: UUID(),
            name: name,
            category: category,
            description: nil,
            gifURL: nil,
            imageURL: nil,
            externalSource: nil,
            externalID: nil,
            metadata: ExerciseMetadataDTO(
                equipmentDisplay: equipment,
                exercisedb: nil
            )
        )
    }

    func testMatchesSearchByEquipment() {
        let row = exercise(name: "Curl", category: "arms", equipment: "dumbbell")
        XCTAssertTrue(ExerciseFilterLogic.matchesSearch(row, query: "dumbbell"))
    }

    func testMatchesEquipmentKey() {
        let row = exercise(name: "Pull-up", category: "back", equipment: "body weight")
        XCTAssertTrue(ExerciseFilterLogic.matchesEquipmentKey(row, key: "bodyweight"))
        XCTAssertFalse(ExerciseFilterLogic.matchesEquipmentKey(row, key: "barbell"))
    }
}
