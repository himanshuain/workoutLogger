import Foundation

enum PostgRESTQuery {
    static func eq(_ column: String, value: String) -> String {
        let encoded = value.addingPercentEncoding(withAllowedCharacters: postgrestValueAllowed) ?? value
        return "\(column)=eq.\(encoded)"
    }

    private static let postgrestValueAllowed: CharacterSet = {
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&=+")
        return allowed
    }()
}
