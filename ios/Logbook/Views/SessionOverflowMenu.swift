import SwiftUI

struct SessionOverflowMenu: View {
    @ObservedObject var workoutStore: WorkoutStore
    var session: ActiveSessionDTO?
    var onDelete: (() -> Void)?
    var onEdit: (() -> Void)?
    var onUndoDone: (() -> Void)?
    var onReset: (() -> Void)?

    var body: some View {
        Menu {
            if let onEdit {
                Button("Edit workout", systemImage: "pencil") { onEdit() }
            }
            if workoutStore.isViewingToday, workoutStore.viewingCompletedSession != nil, let onUndoDone {
                Button("Undo mark done", systemImage: "arrow.uturn.backward") { onUndoDone() }
            }
            if workoutStore.activeSession != nil, let onReset {
                Button("Reset workout", systemImage: "arrow.counterclockwise", role: .destructive) { onReset() }
            }
            if let session, let onDelete {
                Button("Delete workout", systemImage: "trash", role: .destructive) { onDelete() }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }
}
