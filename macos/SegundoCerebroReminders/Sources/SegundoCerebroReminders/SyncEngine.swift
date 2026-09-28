import Foundation

@MainActor
final class SyncEngine {
    private let config: AgentConfig
    private let reminders: ReminderStore
    private let api: APIClient
    private var running = false
    private var pending = false

    init(config: AgentConfig, reminders: ReminderStore, api: APIClient) {
        self.config = config
        self.reminders = reminders
        self.api = api
    }

    func sync(dryRun: Bool) async throws {
        try await reminders.requestAccessIfNeeded()
        let calendar = try reminders.locateList(named: config.listName)
        let state = ConfigStore.loadState()
        let completedSince = state.lastSuccessfulSnapshotAt?.addingTimeInterval(-300)
        let snapshot = try await reminders.snapshots(in: calendar, completedSince: completedSince)
        let response = try await api.sendSnapshot(snapshot, dryRun: dryRun)
        if dryRun {
            guard let report = response.report else { throw AgentError.backend(200, "DRY_RUN_REPORT_MISSING") }
            print("Apple only: \(report.appleOnly)")
            print("Segundo Cerebro only: \(report.segundoCerebroOnly)")
            print("Matched: \(report.matched)")
            print("Potential conflicts: \(report.potentialConflicts)")
            return
        }

        try ConfigStore.saveState(AgentState(lastSuccessfulSnapshotAt: Date()))

        let actions = try await api.pendingActions()
        for action in actions {
            let result: Result<AppliedReminder, Error>
            do { result = .success(try reminders.apply(action, in: calendar)) }
            catch { result = .failure(error) }
            try await api.acknowledge(action: action, result: result)
        }

        if !actions.isEmpty {
            let confirmed = try await reminders.snapshots(in: calendar, completedSince: Date().addingTimeInterval(-300))
            _ = try await api.sendSnapshot(confirmed, dryRun: false)
        }
        print("Sincronización completada · Apple: \(snapshot.count) · acciones aplicadas: \(actions.count)")
    }

    func scheduleSync(reason: String) {
        if running {
            pending = true
            return
        }
        running = true

        Task {
            defer {
                let repeatSync = pending
                pending = false
                running = false
                if repeatSync { scheduleSync(reason: "cambios acumulados") }
            }
            do { try await sync(dryRun: false) }
            catch { fputs("Sincronización fallida (\(reason)): \(error.localizedDescription)\n", stderr) }
        }
    }
}
