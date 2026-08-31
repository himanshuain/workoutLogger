import Foundation
import AuthenticationServices
import Combine
import UIKit

@MainActor
final class NativeAuthStore: ObservableObject {
    @Published private(set) var session: NativeAuthSession?
    @Published private(set) var isLoading = false
    @Published private(set) var isRestoringSession = true
    @Published var errorMessage: String?
    @Published private(set) var sessionExpired = false

    private var client: SupabaseClient?
    private let legacyAccessTokenKey = "logbook.native.access-token"
    private var webSession: ASWebAuthenticationSession?
    private var refreshTask: Task<String?, Error>?

    init() {
        if let config = NativeSupabaseConfig.fromBundle {
            var created = SupabaseClient(config: config)
            created.onUnauthorized = { [weak self] in
                try await self?.refreshAccessToken()
            }
            client = created
        }
    }

    var isConfigured: Bool { client != nil }
    var isSignedIn: Bool { session != nil && !sessionExpired }
    var accessToken: String? { session?.accessToken }
    var userID: UUID? {
        if let id = session?.user?.id { return id }
        if let token = session?.accessToken { return JWTUserID.extract(from: token) }
        return nil
    }

    func restoreSession() async {
        defer { isRestoringSession = false }
        migrateLegacyTokenIfNeeded()
        guard let accessToken = KeychainTokenStore.read(.accessToken), !accessToken.isEmpty else { return }

        let refreshToken = KeychainTokenStore.read(.refreshToken)
        let userID = JWTUserID.extract(from: accessToken)
        session = NativeAuthSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: userID.map { NativeUser(id: $0, email: nil) }
        )
        sessionExpired = false
        errorMessage = nil

        if JWTUserID.isExpired(accessToken) {
            await refreshSessionOnRestore()
        }
    }

    func validAccessToken() async throws -> String {
        guard let token = session?.accessToken, !sessionExpired else {
            throw SupabaseClientError.unauthorized
        }
        if JWTUserID.isExpired(token) {
            guard let refreshed = try await refreshAccessToken() else {
                throw SupabaseClientError.sessionExpired
            }
            return refreshed
        }
        return token
    }

    func refreshAccessToken() async throws -> String? {
        if let refreshTask {
            return try await refreshTask.value
        }

        let task = Task<String?, Error> { [weak self] in
            guard let self else { return nil }
            defer { self.refreshTask = nil }
            return try await self.performRefresh()
        }
        refreshTask = task
        return try await task.value
    }

    func signIn(email: String, password: String) async {
        guard let client else {
            errorMessage = SupabaseClientError.missingConfiguration.localizedDescription
            return
        }
        isLoading = true
        errorMessage = nil
        sessionExpired = false
        defer { isLoading = false }
        do {
            let newSession = try await client.signIn(email: email, password: password)
            persistSession(newSession)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signUp(email: String, password: String) async -> Bool {
        guard let client else {
            errorMessage = SupabaseClientError.missingConfiguration.localizedDescription
            return false
        }
        isLoading = true
        errorMessage = nil
        sessionExpired = false
        defer { isLoading = false }
        do {
            if let newSession = try await client.signUp(email: email, password: password) {
                persistSession(newSession)
                return true
            }
            errorMessage = "Check your email to confirm your account, then sign in."
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func resetPassword(email: String) async -> Bool {
        guard let client else {
            errorMessage = SupabaseClientError.missingConfiguration.localizedDescription
            return false
        }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await client.resetPassword(email: email)
            errorMessage = "Password reset email sent. Check your inbox."
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func signOut() {
        let refreshToken = session?.refreshToken ?? KeychainTokenStore.read(.refreshToken)
        if let client {
            Task { await client.signOut(refreshToken: refreshToken) }
        }
        sessionExpired = false
        errorMessage = nil
        clearStoredSession()
    }

    func signInWithGoogle() async {
        guard let client else { errorMessage = SupabaseClientError.missingConfiguration.localizedDescription; return }
        isLoading = true
        errorMessage = nil
        sessionExpired = false
        defer { isLoading = false }
        do {
            var components = URLComponents(url: client.config.url.appendingPathComponent("auth/v1/authorize"), resolvingAgainstBaseURL: false)
            components?.queryItems = [
                URLQueryItem(name: "provider", value: "google"),
                URLQueryItem(name: "redirect_to", value: "logbook://auth-callback"),
                URLQueryItem(name: "prompt", value: "select_account")
            ]
            guard let url = components?.url else { throw SupabaseClientError.invalidResponse }
            let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
                let authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: "logbook") { callback, error in
                    if let error { continuation.resume(throwing: error) }
                    else if let callback { continuation.resume(returning: callback) }
                    else { continuation.resume(throwing: SupabaseClientError.invalidResponse) }
                }
                authSession.presentationContextProvider = AuthPresentationContext.shared
                webSession = authSession
                authSession.start()
            }
            guard let fragment = callbackURL.fragment,
                  let values = URLComponents(string: "?\(fragment)")?.queryItems,
                  let token = values.first(where: { $0.name == "access_token" })?.value else {
                throw SupabaseClientError.requestFailed("Google sign-in did not return a session.")
            }
            let refresh = values.first(where: { $0.name == "refresh_token" })?.value
            let newSession = NativeAuthSession(
                accessToken: token,
                refreshToken: refresh,
                user: JWTUserID.extract(from: token).map { NativeUser(id: $0, email: nil) }
            )
            persistSession(newSession)
        } catch { errorMessage = error.localizedDescription }
        webSession = nil
    }

    private func refreshSessionOnRestore() async {
        do {
            _ = try await refreshAccessToken()
        } catch {
            markSessionExpired()
        }
    }

    private func performRefresh() async throws -> String? {
        guard let client else { return nil }
        guard let refreshToken = session?.refreshToken ?? KeychainTokenStore.read(.refreshToken),
              !refreshToken.isEmpty else {
            markSessionExpired()
            return nil
        }

        do {
            let newSession = try await client.refreshSession(refreshToken: refreshToken)
            persistSession(newSession)
            return newSession.accessToken
        } catch {
            markSessionExpired()
            throw SupabaseClientError.sessionExpired
        }
    }

    private func persistSession(_ newSession: NativeAuthSession) {
        session = newSession
        sessionExpired = false
        KeychainTokenStore.save(newSession.accessToken, for: .accessToken)
        if let refreshToken = newSession.refreshToken {
            KeychainTokenStore.save(refreshToken, for: .refreshToken)
        }
        UserDefaults.standard.removeObject(forKey: legacyAccessTokenKey)
    }

    private func markSessionExpired() {
        sessionExpired = true
        errorMessage = SupabaseClientError.sessionExpired.localizedDescription
        clearStoredSession()
    }

    private func clearStoredSession() {
        session = nil
        KeychainTokenStore.clearAll()
        UserDefaults.standard.removeObject(forKey: legacyAccessTokenKey)
    }

    private func migrateLegacyTokenIfNeeded() {
        guard KeychainTokenStore.read(.accessToken) == nil,
              let legacy = UserDefaults.standard.string(forKey: legacyAccessTokenKey),
              !legacy.isEmpty else { return }
        KeychainTokenStore.save(legacy, for: .accessToken)
        UserDefaults.standard.removeObject(forKey: legacyAccessTokenKey)
    }
}

final class AuthPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = AuthPresentationContext()
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? UIWindow()
    }
}
