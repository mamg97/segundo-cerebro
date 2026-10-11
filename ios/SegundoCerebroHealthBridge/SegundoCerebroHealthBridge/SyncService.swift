import Foundation

enum SyncTrigger: String, Sendable {
    case manual
    case healthKit
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

actor SyncService {
    static let shared = SyncService()
    static let automaticSyncInterval: TimeInterval = 8 * 60 * 60
    static let automaticReconciliationDays = 3
    private static let currentReconciliationRevision = 4

    static let endpoint = URL(string: "https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/sync")!

    private let health = HealthKitService.shared
    private let session: URLSession
    private var inFlightSync: Task<SyncRunResult, Error>?

    private init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 25
        configuration.timeoutIntervalForResource = 40
        configuration.waitsForConnectivity = true
        self.session = URLSession(configuration: configuration)
    }

    func syncRecentDays(days: Int = automaticReconciliationDays, trigger: SyncTrigger = .manual) async throws -> SyncRunResult {
        if let inFlightSync {
            return try await inFlightSync.value
        }

        let defaults = UserDefaults.standard
        let now = Date()
        if trigger.isAutomatic,
           defaults.integer(forKey: SyncDefaults.reconciliationRevision) >= Self.currentReconciliationRevision,
           let last = defaults.object(forKey: SyncDefaults.lastSuccessfulSync) as? Date,
           now.timeIntervalSince(last) < Self.automaticSyncInterval {
            return SyncRunResult(
                syncedDays: 0,
                bodySamples: 0,
                recoveryDays: 0,
                extendedMetrics: 0,
                finishedAt: last,
                trigger: trigger,
                wasSkipped: true
            )
        }

        defaults.set(now, forKey: SyncDefaults.lastAttempt)
        defaults.set(trigger.rawValue, forKey: SyncDefaults.lastAttemptTrigger)

        let task = Task { [self] in
            try await performSync(days: days, trigger: trigger)
        }
        inFlightSync = task

        do {
            let result = try await task.value
            inFlightSync = nil
            return result
        } catch {
            inFlightSync = nil
            defaults.set(error.localizedDescription, forKey: SyncDefaults.lastFailure)
            throw error
        }
    }

    private func performSync(days: Int, trigger: SyncTrigger) async throws -> SyncRunResult {
        guard let token = KeychainStore.loadToken(), !token.isEmpty else {
            throw HealthBridgeError.tokenMissing
        }

        let count = max(1, min(days, 7))
        let calendar = Calendar.autoupdatingCurrent
        let today = calendar.startOfDay(for: Date())

        var syncedDays = 0
        var bodySamples = 0
        var recoveryDays = 0
        var extendedMetrics = 0

        // Oldest first so late-arriving data from two completed days is reconciled
        // before today's partial snapshot.
        for offset in stride(from: count - 1, through: 0, by: -1) {
            guard let date = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            let snapshot = try await health.snapshot(for: date)
            guard snapshot.activity != nil || !snapshot.bodySamples.isEmpty || snapshot.recovery != nil || !snapshot.metrics.isEmpty else {
                continue
            }

            let payload = HealthSyncPayload(
                activity: snapshot.activity,
                bodySamples: snapshot.bodySamples,
                recovery: snapshot.recovery,
                metrics: snapshot.metrics,
                note: "Native iOS HealthKit bridge"
            )

            let response = try await post(payload, token: token)
            syncedDays += 1
            bodySamples += response.bodySamplesAccepted ?? 0
            if response.recoveryAccepted == true { recoveryDays += 1 }
            extendedMetrics += response.metricsAccepted ?? 0
        }

        let finishedAt = Date()
        let summary = "\(syncedDays) días · \(bodySamples) muestras corporales · \(recoveryDays) días de recuperación · \(extendedMetrics) métricas ampliadas"
        let defaults = UserDefaults.standard
        defaults.set(finishedAt, forKey: SyncDefaults.lastSuccessfulSync)
        defaults.set(trigger.rawValue, forKey: SyncDefaults.lastSuccessfulTrigger)
        defaults.set(summary, forKey: SyncDefaults.lastSuccessfulSummary)
        defaults.set(Self.currentReconciliationRevision, forKey: SyncDefaults.reconciliationRevision)
        defaults.removeObject(forKey: SyncDefaults.lastFailure)
        return SyncRunResult(
            syncedDays: syncedDays,
            bodySamples: bodySamples,
            recoveryDays: recoveryDays,
            extendedMetrics: extendedMetrics,
            finishedAt: finishedAt,
            trigger: trigger,
            wasSkipped: false
        )
    }

    private func post(_ payload: HealthSyncPayload, token: String) async throws -> SyncResponse {
        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, rawResponse) = try await session.data(for: request)
        guard let http = rawResponse as? HTTPURLResponse else {
            throw HealthBridgeError.invalidServerResponse
        }

        let decoded = try? JSONDecoder().decode(SyncResponse.self, from: data)
        guard (200..<300).contains(http.statusCode) else {
            throw HealthBridgeError.serverError(decoded?.code ?? "HTTP_\(http.statusCode)")
        }

        guard let decoded, decoded.ok else {
            throw HealthBridgeError.invalidServerResponse
        }
        return decoded
    }
}
