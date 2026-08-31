import SwiftUI

struct HistorySessionDetailView: View {
    let sessionID: UUID
    @ObservedObject var workoutStore: WorkoutStore

    @State private var session: ActiveSessionDTO?
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                HistorySessionSkeleton()
            } else if session != nil {
                SessionReviewView(
                    workoutStore: workoutStore,
                    session: $session,
                    sessionID: sessionID,
                    showsReopen: true,
                    onDone: nil
                )
            } else {
                ContentUnavailableView(
                    "Workout unavailable",
                    systemImage: "exclamationmark.triangle",
                    description: Text("This session could not be loaded.")
                )
            }
        }
        .task(id: sessionID) {
            isLoading = session == nil
            session = await workoutStore.fetchSessionDetail(sessionID)
            isLoading = false
        }
    }
}
