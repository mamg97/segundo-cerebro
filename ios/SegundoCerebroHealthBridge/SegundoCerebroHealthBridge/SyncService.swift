import Foundation

actor SyncService {
    static let shared = SyncService()
    static let automaticSyncInterval = SyncCoordinator.automaticSyncInterval
    static let automaticReconciliationDays = 3

    static let endpoint = URL(string: "https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/sync")!

    private let health = HealthKitService.shared
    private let session: URLSession
    private lazy var coordinator = SyncCoordinator { [self] days, trigger in
        try await performSync(days: days, trigger: trigger)
    }

    private init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 25
        configuration.timeoutIntervalForResource = 40
        configuration.waitsForConnectivity = true
        self.session = URLSession(configuration: configuration)
    }

    func syncRecentDays(days: Int = automaticReconciliationDays, trigger: SyncTrigger = .manual) async throws -> SyncRunResult {
        try await coordinator.sync(days: days, trigger: trigger)
    }

    func deferSync(trigger: SyncTrigger) async {
        await coordinator.deferSync(trigger: trigger)
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
            let defaults = UserDefaults.standard
            defaults.set(Date(), forKey: SyncDefaults.lastBodyReadAt)
            defaults.set(snapshot.bodySamples.count, forKey: SyncDefaults.lastBodyReadCount)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let latest = snapshot.bodySamples.filter({ $0.type == "bodyMass" }).map(\.measuredAt).max(),
               let measuredAt = formatter.date(from: latest) ?? ISO8601DateFormatter().date(from: latest) {
                let previous = defaults.object(forKey: SyncDefaults.lastWeightReadAt) as? Date
                if previous == nil || measuredAt > previous! {
                    defaults.set(measuredAt, forKey: SyncDefaults.lastWeightReadAt)
                }
            }
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
            // Only acknowledge the weight timestamp when the entire body batch was accepted.
            if response.bodySamplesAccepted == snapshot.bodySamples.count,
               let latest = snapshot.bodySamples.filter({ $0.type == "bodyMass" }).map(\.measuredAt).max(),
               let measuredAt = formatter.date(from: latest) ?? ISO8601DateFormatter().date(from: latest) {
                let previous = defaults.object(forKey: SyncDefaults.lastAcceptedWeightMeasuredAt) as? Date
                if previous == nil || measuredAt >= previous! {
                    defaults.set(measuredAt, forKey: SyncDefaults.lastAcceptedWeightMeasuredAt)
                    defaults.set(Date(), forKey: SyncDefaults.lastWeightAcceptedAt)
                }
            }
            syncedDays += 1
            bodySamples += response.bodySamplesAccepted ?? 0
            if response.recoveryAccepted == true { recoveryDays += 1 }
            extendedMetrics += response.metricsAccepted ?? 0
        }

        let finishedAt = Date()
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
