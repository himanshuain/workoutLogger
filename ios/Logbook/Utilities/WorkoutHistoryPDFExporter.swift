import UIKit

enum WorkoutHistoryPDFExporter {
    static func export(groups: [HistoryDayGroup], weightUnit: WeightUnit) throws -> URL {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextCreator: "Logbook iOS",
            kCGPDFContextTitle: "Workout History"
        ] as [String: Any]

        let page = CGRect(x: 0, y: 0, width: 612, height: 792)
        let renderer = UIGraphicsPDFRenderer(bounds: page, format: format)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("workout-history-\(Int(Date().timeIntervalSince1970)).pdf")

        try renderer.writePDF(to: url) { context in
            var y: CGFloat = 40
            context.beginPage()
            drawTitle("Workout History", at: &y, pageWidth: page.width)

            for group in groups.prefix(60) {
                if y > page.height - 80 {
                    context.beginPage()
                    y = 40
                }
                drawHeading(group.date, at: &y, pageWidth: page.width)
                for session in group.sessions {
                    let line = "\(session.routineName ?? "Workout") — \(session.setCount) sets, \(Int(session.volume)) \(weightUnit.rawValue)"
                    drawBody(line, at: &y, pageWidth: page.width)
                }
                y += 8
            }
        }
        return url
    }

    private static func drawTitle(_ text: String, at y: inout CGFloat, pageWidth: CGFloat) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.boldSystemFont(ofSize: 22),
            .foregroundColor: UIColor.label
        ]
        let rect = CGRect(x: 40, y: y, width: pageWidth - 80, height: 30)
        text.draw(in: rect, withAttributes: attrs)
        y += 36
    }

    private static func drawHeading(_ text: String, at y: inout CGFloat, pageWidth: CGFloat) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.boldSystemFont(ofSize: 14),
            .foregroundColor: UIColor.orange
        ]
        text.draw(in: CGRect(x: 40, y: y, width: pageWidth - 80, height: 20), withAttributes: attrs)
        y += 22
    }

    private static func drawBody(_ text: String, at y: inout CGFloat, pageWidth: CGFloat) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12),
            .foregroundColor: UIColor.label
        ]
        text.draw(in: CGRect(x: 52, y: y, width: pageWidth - 92, height: 18), withAttributes: attrs)
        y += 18
    }
}
