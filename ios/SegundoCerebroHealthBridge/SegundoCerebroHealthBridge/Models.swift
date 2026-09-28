import Foundation

struct HealthSyncPayload: Codable {
    let activity: ActivityPayload?
    let bodySamples: [BodySamplePayload]
    let recovery: RecoveryPayload?
    let note: String
}

struct ActivityPayload: Codable {
    let date: String
    let activeKcal: Double?
    let restingKcal: Double?
    let totalKcal: Double?
    let steps: Int?
    let exerciseMinutes: Double?
    let sampledAt: String
    let sources: [String]
    let workouts: [WorkoutPayload]
}

struct WorkoutPayload: Codable {
    let activityType: String
    let startAt: String
    let endAt: String?
    let durationMinutes: Double?
    let activeKcal: Double?
    let source: String
}

struct BodySamplePayload: Codable {
    let type: String
    let value: Double
    let unit: String
    let measuredAt: String
    let source: String
}

struct RecoveryPayload: Codable {
    let date: String
    let restingHeartRate: Double?
    let walkingHeartRateAverage: Double?
    let hrvSdnnMs: Double?
    let respiratoryRate: Double?
    let oxygenSaturationPct: Double?
    let vo2Max: Double?
    let wristTemperatureC: Double?
    let sleepAsleepMinutes: Double?
    let sleepInBedMinutes: Double?
    let sleepAwakeMinutes: Double?
    let sleepCoreMinutes: Double?
    let sleepDeepMinutes: Double?
    let sleepRemMinutes: Double?
    let sampledAt: String
    let sources: [String]

    var hasValues: Bool {
        [
            restingHeartRate,
            walkingHeartRateAverage,
            hrvSdnnMs,
            respiratoryRate,
            oxygenSaturationPct,
            vo2Max,
            wristTemperatureC,
            sleepAsleepMinutes,
            sleepInBedMinutes,
            sleepAwakeMinutes,
            sleepCoreMinutes,
            sleepDeepMinutes,
            sleepRemMinutes
        ].contains { $0 != nil }
    }
}

struct SyncResponse: Codable {
    let ok: Bool
    let date: String?
    let bodySamplesAccepted: Int?
    let recoveryAccepted: Bool?
    let code: String?
}

struct DailyHealthSnapshot {
    let activity: ActivityPayload?
    let bodySamples: [BodySamplePayload]
    let recovery: RecoveryPayload?
}
