import Foundation

enum LifeLogGapFormatting {
    static func gapDays(between newer: String, and older: String) -> Int? {
        guard let newerDate = WorkoutDate.date(from: newer),
              let olderDate = WorkoutDate.date(from: older) else { return nil }
        let days = Calendar.current.dateComponents([.day], from: olderDate, to: newerDate).day ?? 0
        return days > 0 ? days : nil
    }

    static func tierLabels(for gapDays: Int) -> [String] {
        guard gapDays > 0 else { return [] }
        var tiers = ["\(gapDays)d gap"]
        if gapDays >= 7 {
            let weeks = gapDays / 7
            let rem = gapDays % 7
            tiers.append(rem > 0 ? "\(weeks)w \(rem)d gap" : "\(weeks)w gap")
        }
        if gapDays >= 30 {
            let months = gapDays / 30
            let remWeeks = (gapDays % 30) / 7
            if remWeeks > 0 {
                tiers.append("\(months) month \(remWeeks)w gap")
            } else {
                tiers.append("\(months) month gap")
            }
        }
        return tiers
    }
}
