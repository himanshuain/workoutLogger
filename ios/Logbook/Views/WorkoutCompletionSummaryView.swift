import SwiftUI

struct WorkoutCompletionSummaryView: View {
    @ObservedObject var workoutStore: WorkoutStore
    let summary: WorkoutCompletionSummary
    let onDismiss: () -> Void

    @State private var session: ActiveSessionDTO?

    var body: some View {
        NavigationStack {
            Group {
                if let session {
                    SessionReviewView(
                        workoutStore: workoutStore,
                        session: $session,
                        sessionID: summary.id,
                        showsReopen: false,
                        onDone: onDismiss
                    )
                } else {
                    VStack(spacing: 12) {
                        NativeActivityIndicator()
                        Text("Loading summary…")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Workout complete")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task(id: summary.id) {
            session = await workoutStore.fetchSessionDetail(summary.id)
        }
    }
}
