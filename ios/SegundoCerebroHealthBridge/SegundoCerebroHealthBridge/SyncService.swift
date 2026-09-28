import Foundation

struct SyncRunResult {
    let syncedDays: Int
    let bodySamples: Int
    let recoveryDays: Int
    let finishedAt: Date
}

actor SyncService {
    static let shared = SyncService()

    static let endpoint = URL(string: "https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/sync")!

    private let health = HealthKitService.shared
    private let session: URLSession

    private init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 25
        configuration.timeoutIntervalForResource = 40
        configuration.waitsForConnectivity = true
        self.session = URLSession(configuration: configuration)
    }

    func syncRecentDays(days: Int = 2) async throws -> SyncRunResult {
        guard let token = KeychainStore.loadToken(), !token.isEmpty else {
            throw HealthBridgeError.tokenMissing
        }

        let count = max(1, min(days, 7))
        let calendar = Calendar.autoupdatingCurrent
        let today = calendar.startOfDay(for: Date())

        var syncedDays = 0
        var bodySamples = 0
        var recoveryDays = 0

        // Oldest first so yesterday is finalized before today's partial snapshot.
        for offset in stride(from: count - 1, through: 0, by: -1) {
            guard let date = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            let snapshot = try await health.snapshot(for: date)
            guard snapshot.activity != nil || !snapshot.bodySamples.isEmpty || snapshot.recovery != nil else {
                continue
            }

            let payload = HealthSyncPayload(
                activity: snapshot.activity,
                bodySamples: snapshot.bodySamples,
                recovery: snapshot.recovery,
                note: "Native iOS HealthKit bridge"
            )

            let response = try await post(payload, token: token)
            syncedDays += 1
            bodySamples += response.bodySamplesAccepted ?? 0
            if response.recoveryAccepted == true { recoveryDays += 1 }
        }

        let finishedAt = Date()
        UserDefaults.standard.set(finishedAt, forKey: "healthBridge.lastSuccessfulSync")
        return SyncRunResult(
            syncedDays: syncedDays,
            bodySamples: bodySamples,
            recoveryDays: recoveryDays,
            finishedAt: finishedAt
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
