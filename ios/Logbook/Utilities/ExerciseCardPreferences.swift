import CoreGraphics
import Foundation
import SwiftUI

enum ExerciseCardSize: String, CaseIterable, Identifiable {
    case compact
    case standard
    case large

    var id: String { rawValue }

    var columnCount: Int {
        switch self {
        case .compact: 3
        case .standard: 2
        case .large: 1
        }
    }

    var gridSpacing: CGFloat {
        switch self {
        case .compact: 8
        case .standard: 10
        case .large: 12
        }
    }

    var mediaCornerRadius: CGFloat {
        switch self {
        case .compact: 8
        case .standard: 10
        case .large: 12
        }
    }

    var textSpacing: CGFloat {
        switch self {
        case .compact: 6
        case .standard: 8
        case .large: 10
        }
    }

    var titleHeight: CGFloat {
        switch self {
        case .compact: 28
        case .standard: 36
        case .large: 40
        }
    }

    var titleFont: Font {
        switch self {
        case .compact: .caption2.weight(.semibold)
        case .standard: .caption.weight(.semibold)
        case .large: .subheadline.weight(.semibold)
        }
    }

    var subtitleFont: Font {
        switch self {
        case .compact: .caption2
        case .standard: .caption2
        case .large: .caption
        }
    }

    var badgeSize: CGFloat {
        switch self {
        case .compact: 16
        case .standard: 18
        case .large: 22
        }
    }

    var tilePadding: CGFloat {
        switch self {
        case .compact: 0
        case .standard: 0
        case .large: 0
        }
    }

    var label: String {
        switch self {
        case .compact: "Small"
        case .standard: "Medium"
        case .large: "Large"
        }
    }

    var systemImage: String {
        switch self {
        case .compact: "square.grid.3x3.fill"
        case .standard: "square.grid.2x2.fill"
        case .large: "rectangle.fill"
        }
    }
}

enum ExerciseCardPreferences {
    private static let key = "logbook.exerciseCardSize"

    static var cardSize: ExerciseCardSize {
        get {
            guard let raw = UserDefaults.standard.string(forKey: key),
                  let size = ExerciseCardSize(rawValue: raw) else {
                return .standard
            }
            return size
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: key)
        }
    }
}
