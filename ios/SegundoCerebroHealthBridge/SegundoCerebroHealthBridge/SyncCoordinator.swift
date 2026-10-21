import Foundation

enum SyncTrigger: String, Sendable {
    case manual
    case foreground
    case healthKit
    case bodyMass
    case backgroundRefresh
    case protectedDataRetry

    var isAutomatic: Bool { self != .manual }
}

enum SyncDefaults {
    static let lastSuccessfulSync = "healthBridge.lastSuccessfulSync"
    static let lastSuccessfulTrigger = "healthBridge.lastSuccessfulSyncTrigger"
    static let lastSuccessfulSummary = "healthBridge.lastSuccessfulSyncSummary"
    static let lastAttempt = "healthBridge.lastSyncAttempt"
    static let lastAttemptTrigger = "healthBridge.lastSyncAttemptTrigger"
    static let lastFailure = "healthBridge.lastSyncFailure"
    static let nextBackgroundRefreshEarliest = "healthBridge.nextBackgroundRefreshEarliest"
    static let backgroundScheduleFailure = "healthBridge.backgroundScheduleFailure"
    static let pendingProtectedDataRetry = "healthBridge.pendingProtectedDataRetry"
    static let pendingBodySync = "healthBridge.pendingBodySync"
    static let lastFailureAt = "healthBridge.lastFailureAt"
    static let lastForegroundAttempt = "healthBridge.lastForegroundAttempt"
    static let lastBodyReadAt = "healthBridge.lastBodyReadAt"
    static let lastWeightReadAt = "healthBridge.lastWeightReadAt"
    static let lastBodyReadCount = "healthBridge.lastBodyReadCount"
    static let reconciliationRevision = "healthBridge.reconciliationRevision"
}

struct SyncRunResult: Sendable {
    let syncedDays: Int
    let bodySamples: Int
    let recoveryDays: Int
    let extendedMetrics: Int
    let finishedAt: Date
    let trigger: SyncTrigger
    let wasSkipped: Bool
}

// Foundation-only coordination, shared by the iPhone app and executable regression tests.
actor SyncCoordinator {
    typealias Operation = @Sendable (Int, SyncTrigger) async throws -> SyncRunResult
    static let automaticSyncInterval: TimeInterval = 8 * 60 * 60
    static let reconciliationRevision = 5
    private let defaults: UserDefaults
    private let operation: Operation
    private let now: @Sendable () -> Date
    private var inFlight: Task<SyncRunResult, Error>?
    private var generation = 0

    init(defaults: UserDefaults = .standard,
         now: @escaping @Sendable () -> Date = { Date() },
         operation: @escaping Operation) {
        self.defaults = defaults
        self.now = now
        self.operation = operation
    }

    // Persist before acknowledging an observer while protected data is unavailable.
    func deferSync(trigger: SyncTrigger) {
        generation += 1
        defaults.set(true, forKey: SyncDefaults.pendingProtectedDataRetry)
        if trigger == .bodyMass { defaults.set(true, forKey: SyncDefaults.pendingBodySync) }
    }

    func sync(days: Int = 3, trigger: SyncTrigger) async throws -> SyncRunResult {
        let time = now()
        let pending = defaults.bool(forKey: SyncDefaults.pendingProtectedDataRetry)
        if trigger == .foreground, (!pending || inFlight != nil),
           let last = defaults.object(forKey: SyncDefaults.lastForegroundAttempt) as? Date,
           time.timeIntervalSince(last) < 60 { return skipped(trigger, at: time) }

        if trigger == .bodyMass || trigger == .manual || trigger == .foreground {
            deferSync(trigger: trigger)
        }
        if let inFlight { return try await inFlight.value }

        // Retain failed work without causing a request storm from multiple observers.
        if trigger.isAutomatic,
           let failure = defaults.object(forKey: SyncDefaults.lastFailureAt) as? Date,
           time.timeIntervalSince(failure) < 60 { return skipped(trigger, at: time) }

        if trigger.isAutomatic,
           !defaults.bool(forKey: SyncDefaults.pendingProtectedDataRetry),
           defaults.integer(forKey: SyncDefaults.reconciliationRevision) >= Self.reconciliationRevision,
           let last = defaults.object(forKey: SyncDefaults.lastSuccessfulSync) as? Date,
           time.timeIntervalSince(last) < Self.automaticSyncInterval {
            return skipped(trigger, at: time)
        }
        if trigger == .foreground { defaults.set(time, forKey: SyncDefaults.lastForegroundAttempt) }
        let effective = defaults.bool(forKey: SyncDefaults.pendingBodySync) ? SyncTrigger.bodyMass : trigger
        let task = Task { try await self.drain(days: days, trigger: effective) }
        inFlight = task
        return try await task.value
    }

    private func drain(days: Int, trigger: SyncTrigger) async throws -> SyncRunResult {
        // Clear inside the actor before completing the shared task: a late request
        // must never join a finished task after setting new pending work.
        defer { inFlight = nil }
        var next = trigger
        while true {
            let startedGeneration = generation
            defaults.set(now(), forKey: SyncDefaults.lastAttempt)
            defaults.set(next.rawValue, forKey: SyncDefaults.lastAttemptTrigger)
            do {
                let result = try await operation(days, next)
                guard !result.wasSkipped else { return result }
                defaults.set(result.finishedAt, forKey: SyncDefaults.lastSuccessfulSync)
                defaults.set(next.rawValue, forKey: SyncDefaults.lastSuccessfulTrigger)
                defaults.set("\(result.syncedDays) días · \(result.bodySamples) muestras corporales · \(result.recoveryDays) días de recuperación · \(result.extendedMetrics) métricas ampliadas", forKey: SyncDefaults.lastSuccessfulSummary)
                defaults.set(Self.reconciliationRevision, forKey: SyncDefaults.reconciliationRevision)
                defaults.removeObject(forKey: SyncDefaults.lastFailure)
                defaults.removeObject(forKey: SyncDefaults.lastFailureAt)
                if startedGeneration == generation {
                    defaults.removeObject(forKey: SyncDefaults.pendingProtectedDataRetry)
                    defaults.removeObject(forKey: SyncDefaults.pendingBodySync)
                    return result
                }
                // A critical event arrived after this pass started. Read again,
                // even if an activity pass just succeeded inside the 8-hour window.
                next = defaults.bool(forKey: SyncDefaults.pendingBodySync) ? .bodyMass : .foreground
            } catch {
                defaults.set(true, forKey: SyncDefaults.pendingProtectedDataRetry)
                defaults.set(error.localizedDescription, forKey: SyncDefaults.lastFailure)
                defaults.set(now(), forKey: SyncDefaults.lastFailureAt)
                throw error
            }
        }
    }

    private func skipped(_ trigger: SyncTrigger, at time: Date) -> SyncRunResult {
        SyncRunResult(syncedDays: 0, bodySamples: 0, recoveryDays: 0,
                      extendedMetrics: 0, finishedAt: time, trigger: trigger, wasSkipped: true)
    }
}
