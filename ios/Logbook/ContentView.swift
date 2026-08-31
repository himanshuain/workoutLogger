import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("app_appearance") private var appearanceRaw = AppAppearance.system.rawValue
    @StateObject private var authStore = NativeAuthStore()
    @StateObject private var workoutStore = WorkoutStore()

    private var appearance: AppAppearance {
        AppAppearance(rawValue: appearanceRaw) ?? .system
    }

    var body: some View {
        Group {
            if authStore.isRestoringSession {
                restoringSessionView
            } else if authStore.isSignedIn {
                MainTabView(authStore: authStore, workoutStore: workoutStore)
            } else {
                LoginView(auth: authStore)
            }
        }
        .preferredColorScheme(appearance.colorScheme)
        .task {
            await authStore.restoreSession()
            await syncWorkoutData()
        }
        .onChange(of: authStore.isSignedIn) { _, signedIn in
            Task {
                if signedIn {
                    await syncWorkoutData()
                } else {
                    workoutStore.clear()
                }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, authStore.isSignedIn else { return }
            Task {
                _ = try? await authStore.refreshAccessToken()
                if authStore.isSignedIn {
                    await workoutStore.refreshForeground()
                }
            }
        }
    }

    private var restoringSessionView: some View {
        ZStack {
            Color(.systemGroupedBackground).ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 36))
                    .foregroundStyle(.orange.opacity(0.7))
                Text("Logbook")
                    .font(.title2.bold())
                NativeActivityIndicator()
                Text("Signing in…")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func syncWorkoutData() async {
        guard authStore.isSignedIn else { return }
        await workoutStore.bind(
            accessToken: authStore.accessToken,
            userID: authStore.userID,
            tokenProvider: { try await authStore.validAccessToken() },
            refreshProvider: { try await authStore.refreshAccessToken() }
        )
        if await LogReminderScheduler.requestAuthorizationIfNeeded() {
            workoutStore.syncLogReminders()
        }
    }
}


struct LoginView: View {
    enum Mode: String, CaseIterable {
        case signIn = "Sign in"
        case signUp = "Sign up"
        case forgotPassword = "Reset"
    }

    @ObservedObject var auth: NativeAuthStore
    @State private var email = ""
    @State private var password = ""
    @State private var mode: Mode = .signIn

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 54)).foregroundStyle(.orange)
                VStack(spacing: 8) {
                    Text(titleText).font(.largeTitle.bold())
                    Text(subtitleText)
                        .font(.subheadline).foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                Picker("Mode", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
                .pickerStyle(.segmented)

                VStack(spacing: 12) {
                    TextField("Email", text: $email)
                        .textContentType(.username).textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress).autocorrectionDisabled()
                        .padding(14).background(Color(.secondarySystemGroupedBackground)).clipShape(RoundedRectangle(cornerRadius: 12))
                    if mode != .forgotPassword {
                        SecureField("Password", text: $password)
                            .textContentType(mode == .signUp ? .newPassword : .password)
                            .padding(14).background(Color(.secondarySystemGroupedBackground)).clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                if let error = auth.errorMessage {
                    Text(error).font(.footnote).foregroundStyle(isSuccessMessage ? .green : .red).multilineTextAlignment(.center)
                }
                Button {
                    Task { await primaryAction() }
                } label: {
                    Group {
                        if auth.isLoading { ProgressView().tint(.white) }
                        else { Text(primaryButtonTitle) }
                    }
                    .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent).tint(.orange)
                .disabled(primaryActionDisabled || auth.isLoading)
                .accessibilityIdentifier("sign-in")

                if mode == .signIn {
                    Button {
                        Task { await auth.signInWithGoogle() }
                    } label: {
                        Label("Continue with Google", systemImage: "g.circle.fill")
                            .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 14)
                    }
                    .buttonStyle(.bordered)
                    .disabled(auth.isLoading)
                    .accessibilityIdentifier("google-sign-in")
                }

                if !auth.isConfigured {
                    Text("Add SUPABASE_URL and SUPABASE_ANON_KEY in the target Build Settings to enable sign-in.")
                        .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
                Spacer()
            }
            .padding(24).background(Color(.systemGroupedBackground))
            .navigationTitle("Logbook").navigationBarTitleDisplayMode(.inline)
        }.tint(.orange)
    }

    private var titleText: String {
        switch mode {
        case .signIn: return "Welcome to Logbook"
        case .signUp: return "Create account"
        case .forgotPassword: return "Reset password"
        }
    }

    private var subtitleText: String {
        switch mode {
        case .signIn: return "Sign in once — you'll stay signed in on this device until you log out."
        case .signUp: return "Create an account to sync workouts with the web app."
        case .forgotPassword: return "We'll email you a link to reset your password."
        }
    }

    private var primaryButtonTitle: String {
        switch mode {
        case .signIn: return "Sign in"
        case .signUp: return "Create account"
        case .forgotPassword: return "Send reset email"
        }
    }

    private var primaryActionDisabled: Bool {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedEmail.isEmpty { return true }
        if mode != .forgotPassword && password.isEmpty { return true }
        return false
    }

    private var isSuccessMessage: Bool {
        auth.errorMessage?.contains("email") == true || auth.errorMessage?.contains("inbox") == true
    }

    private func primaryAction() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        switch mode {
        case .signIn:
            await auth.signIn(email: trimmedEmail, password: password)
        case .signUp:
            await auth.signUp(email: trimmedEmail, password: password)
        case .forgotPassword:
            await auth.resetPassword(email: trimmedEmail)
        }
    }
}

struct ExerciseDetailView: View {
    let exercise: NativeExercise
    let weightUnit: WeightUnit
    let history: ExerciseHistoryDTO?
    let canLogSets: Bool
    let mutationError: String?
    let loadAnalysis: () async -> ExerciseSetHistoryAnalysis?
    let onDeleteSet: (UUID) async -> Void
    let onUpdateSet: (UUID, Double, Int) async -> Void
    let onResetExercise: () async -> Void
    let onLog: (Double, Int) async -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ExerciseDetailPage(
                exercise: exercise,
                weightUnit: weightUnit,
                history: history,
                canLogSets: canLogSets,
                mutationError: mutationError,
                loadAnalysis: loadAnalysis,
                onDeleteSet: onDeleteSet,
                onUpdateSet: onUpdateSet,
                onResetExercise: onResetExercise,
                onLog: onLog
            )
            .navigationTitle("Log exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct ExerciseDetailPage: View {
    let exercise: NativeExercise
    let weightUnit: WeightUnit
    let history: ExerciseHistoryDTO?
    let canLogSets: Bool
    let mutationError: String?
    let loadAnalysis: () async -> ExerciseSetHistoryAnalysis?
    let onDeleteSet: (UUID) async -> Void
    let onUpdateSet: (UUID, Double, Int) async -> Void
    let onResetExercise: () async -> Void
    let onLog: (Double, Int) async -> Void
    var embeddedInFlow: Bool = false

    @State private var weight = 20.0
    @State private var reps = 10
    @State private var editingSet: LoggedSet?
    @State private var editWeight = 20.0
    @State private var editReps = 10
    @State private var pastAnalysis: ExerciseSetHistoryAnalysis?
    @State private var showResetConfirm = false
    @State private var isSubmitting = false
    @State private var isSavingEdit = false

    private var weightPills: [Double] { WorkoutCalculations.weightPills(for: weightUnit) }
    private var repPills: [Double] { WorkoutCalculations.repPills().map(Double.init) }

    var body: some View {
        List {
            Section {
                ExerciseMediaView(
                    url: exercise.mediaURL,
                    symbol: exercise.symbol,
                    tint: .orange,
                    cornerRadius: 16
                )
                .frame(maxWidth: .infinity)
                .frame(height: embeddedInFlow ? 180 : 220)
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))

                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.name).font(.title2.bold())
                    Text(exercise.category.capitalized).font(.subheadline).foregroundStyle(.secondary)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 12, trailing: 16))
            }

            Section("Weight") {
                PillScroll(values: weightPills, selection: $weight) {
                    $0 == 0 ? "Bar" : WorkoutCalculations.formatWeight($0, unit: weightUnit)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            }

            Section("Reps") {
                PillScroll(
                    values: repPills,
                    selection: Binding(get: { Double(reps) }, set: { reps = Int($0) })
                ) { "\(Int($0))" }
                .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            }

            Section {
                Button {
                    Task {
                        isSubmitting = true
                        await onLog(weight, reps)
                        isSubmitting = false
                    }
                } label: {
                    Group {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Label(canLogSets ? "Log set" : "Workout completed", systemImage: canLogSets ? "plus.circle.fill" : "lock.fill")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(isSubmitting || !canLogSets)
                .listRowBackground(Color.clear)

                if !canLogSets {
                    Text("Open this workout from Today to edit sets.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if let mutationError {
                    Text(mutationError)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            Section {
                if exercise.logs.isEmpty {
                    Text("No sets logged yet")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(Array(exercise.logs.enumerated()), id: \.element.id) { index, log in
                        Button {
                            editingSet = log
                            editWeight = log.weight
                            editReps = log.reps
                        } label: {
                            HStack {
                                Text("Set \(index + 1)")
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("\(WorkoutCalculations.formatWeight(log.weight, unit: weightUnit)) × \(log.reps)")
                                    .font(.subheadline.weight(.semibold))
                                    .monospacedDigit()
                                Image(systemName: "pencil")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                Task { await onDeleteSet(log.id) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            } header: {
                HStack {
                    Text("Today's sets")
                    Spacer()
                    Text("PR \(Int(max(exercise.bestWeight, WorkoutCalculations.personalBest(from: history)))) \(weightUnit.rawValue)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }

            if pastAnalysis != nil || !embeddedInFlow {
                pastHistorySection
            }
        }
        .listStyle(.insetGrouped)
        .background(Color(.systemGroupedBackground))
        .toolbar {
            if !embeddedInFlow {
                ToolbarItem(placement: .topBarLeading) {
                    if !exercise.logs.isEmpty {
                        Button("Reset exercise", role: .destructive) {
                            showResetConfirm = true
                        }
                    }
                }
            }
        }
        .confirmationDialog("Reset exercise?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Reset exercise", role: .destructive) {
                Task { await onResetExercise() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This deletes all logged sets for \(exercise.name) in today's workout.")
        }
        .sheet(item: $editingSet) { set in
            NavigationStack {
                VStack(spacing: 20) {
                    Text("Edit set").font(.title2.bold())
                    PillScroll(values: weightPills, selection: $editWeight) {
                        $0 == 0 ? "Bar" : WorkoutCalculations.formatWeight($0, unit: weightUnit)
                    }
                    PillScroll(
                        values: repPills,
                        selection: Binding(get: { Double(editReps) }, set: { editReps = Int($0) })
                    ) { "\(Int($0))" }
                    Button("Save changes") {
                        Task {
                            isSavingEdit = true
                            await onUpdateSet(set.id, editWeight, editReps)
                            isSavingEdit = false
                            editingSet = nil
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(isSavingEdit)
                    Spacer()
                }
                .padding(20)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Cancel") { editingSet = nil }
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .task {
            pastAnalysis = await loadAnalysis()
        }
        .onAppear(perform: applyHistoryDefaults)
        .onChange(of: exercise.id) { _, _ in
            applyHistoryDefaults()
            pastAnalysis = nil
            Task { pastAnalysis = await loadAnalysis() }
        }
    }

    private var pastHistorySection: some View {
        Section {
            if let pastAnalysis {
                if let streak = pastAnalysis.currentStreak {
                    Text("Streak: \(streak.sessions) sessions at \(WorkoutCalculations.formatWeight(streak.weight, unit: weightUnit)) × \(streak.reps)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let suggestion = pastAnalysis.suggestion {
                    Text(suggestion.message)
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }
                if pastAnalysis.tableRows.isEmpty {
                    Text("No past sessions yet").foregroundStyle(.secondary)
                } else {
                    ForEach(pastAnalysis.tableRows.prefix(embeddedInFlow ? 4 : 8)) { row in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(row.date).font(.subheadline.weight(.semibold))
                                Spacer()
                                Text(row.setsSummary)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.orange)
                                    .monospacedDigit()
                            }
                            if let routine = row.routineName {
                                Text(routine).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            } else {
                HStack(spacing: 8) {
                    NativeActivityIndicator()
                    Text("Loading history…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        } header: {
            Text("Past sessions")
        }
    }

    private func applyHistoryDefaults() {
        if let last = exercise.latest {
            weight = last.weight
            reps = last.reps
        } else if let history {
            weight = history.lastWeight ?? weight
            reps = history.lastReps ?? reps
        }
    }
}

struct PillScroll: View {
    let values: [Double]
    @Binding var selection: Double
    let label: (Double) -> String

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(values, id: \.self) { value in
                        Button { selection = value } label: {
                            Text(label(value))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(selection == value ? .white : .primary)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .frame(minHeight: 44)
                                .background(selection == value ? Color.orange : Color(.secondarySystemGroupedBackground))
                                .clipShape(Capsule())
                        }
                        .id(value)
                    }
                }
                .padding(.horizontal, 16)
            }
            .onChange(of: selection) { _, newValue in
                withAnimation(.snappy) {
                    proxy.scrollTo(newValue, anchor: .center)
                }
            }
            .onAppear {
                proxy.scrollTo(selection, anchor: .center)
            }
        }
    }
}
