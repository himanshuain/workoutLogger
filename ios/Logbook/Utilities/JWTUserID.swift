import Foundation

enum JWTUserID {
    static func extract(from accessToken: String) -> UUID? {
        guard let sub = payload(from: accessToken)?["sub"] as? String else { return nil }
        return UUID(uuidString: sub)
    }

    static func isExpired(_ accessToken: String, leeway: TimeInterval = 60) -> Bool {
        guard let exp = expirationDate(from: accessToken) else { return false }
        return exp.addingTimeInterval(-leeway) <= Date()
    }

    static func expirationDate(from accessToken: String) -> Date? {
        guard let exp = payload(from: accessToken)?["exp"] else { return nil }
        if let value = exp as? TimeInterval { return Date(timeIntervalSince1970: value) }
        if let value = exp as? Int { return Date(timeIntervalSince1970: TimeInterval(value)) }
        if let value = exp as? Double { return Date(timeIntervalSince1970: value) }
        return nil
    }

    private static func payload(from accessToken: String) -> [String: Any]? {
        let segments = accessToken.split(separator: ".")
        guard segments.count >= 2 else { return nil }

        var payload = String(segments[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let padding = (4 - payload.count % 4) % 4
        payload += String(repeating: "=", count: padding)

        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }
}
