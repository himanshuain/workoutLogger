import Foundation

struct StepItemDTO: Codable, Identifiable, Equatable {
    let id: UUID
    var text: String
    var orderIndex: Int?

    enum CodingKeys: String, CodingKey {
        case id, text
        case orderIndex = "order_index"
    }
}

struct StepCardDTO: Codable, Identifiable, Equatable {
    let id: UUID
    var name: String
    var icon: String?
    var color: String?
    var orderIndex: Int?
    var stepItems: [StepItemDTO]?

    enum CodingKeys: String, CodingKey {
        case id, name, icon, color
        case orderIndex = "order_index"
        case stepItems = "step_items"
    }

    var items: [StepItemDTO] {
        (stepItems ?? []).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
    }
}
