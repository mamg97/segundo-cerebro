import Foundation
import HealthKit

final class HealthKitService {
    static let shared = HealthKitService()

    private let store = HKHealthStore()
    private var observerQueries: [HKObserverQuery] = []

    private init() {}

    private enum MetricAggregation: String {
        case cumulative
        case discrete
    }

    private struct MetricDefinition {
        let identifier: HKQuantityTypeIdentifier
        let key: String
        let unit: HKUnit
        let unitName: String
        let aggregation: MetricAggregation
        let multiplier: Double

        init(
            _ identifier: HKQuantityTypeIdentifier,
            _ key: String,
            _ unit: HKUnit,
            _ unitName: String,
            _ aggregation: MetricAggregation,
            multiplier: Double = 1
        ) {
            self.identifier = identifier
            self.key = key
            self.unit = unit
            self.unitName = unitName
            self.aggregation = aggregation
            self.multiplier = multiplier
        }
    }

    private var additionalMetricDefinitions: [MetricDefinition] {
        let speed = HKUnit.meter().unitDivided(by: .second())
        let bpm = countPerMinute()
        return [
            MetricDefinition(.height, "height", .meter(), "m", .discrete),
            MetricDefinition(.waistCircumference, "waistCircumference", .meter(), "m", .discrete),
            MetricDefinition(.appleMoveTime, "appleMoveTime", .minute(), "min", .cumulative),
            MetricDefinition(.appleStandTime, "appleStandTime", .minute(), "min", .cumulative),
            MetricDefinition(.distanceWalkingRunning, "distanceWalkingRunning", .meter(), "m", .cumulative),
            MetricDefinition(.distanceCycling, "distanceCycling", .meter(), "m", .cumulative),
            MetricDefinition(.distanceSwimming, "distanceSwimming", .meter(), "m", .cumulative),
            MetricDefinition(.flightsClimbed, "flightsClimbed", .count(), "count", .cumulative),
            MetricDefinition(.swimmingStrokeCount, "swimmingStrokeCount", .count(), "count", .cumulative),
            MetricDefinition(.heartRate, "heartRate", bpm, "bpm", .discrete),
            MetricDefinition(.heartRateRecoveryOneMinute, "heartRateRecoveryOneMinute", bpm, "bpm", .discrete),
            MetricDefinition(.bodyTemperature, "bodyTemperature", .degreeCelsius(), "degC", .discrete),
            MetricDefinition(.basalBodyTemperature, "basalBodyTemperature", .degreeCelsius(), "degC", .discrete),
            MetricDefinition(.bloodPressureSystolic, "bloodPressureSystolic", .millimeterOfMercury(), "mmHg", .discrete),
            MetricDefinition(.bloodPressureDiastolic, "bloodPressureDiastolic", .millimeterOfMercury(), "mmHg", .discrete),
            MetricDefinition(.bloodGlucose, "bloodGlucose", HKUnit(from: "mg/dL"), "mg/dL", .discrete),
            MetricDefinition(.peripheralPerfusionIndex, "peripheralPerfusionIndex", .percent(), "%", .discrete, multiplier: 100),
            MetricDefinition(.atrialFibrillationBurden, "atrialFibrillationBurden", .percent(), "%", .discrete, multiplier: 100),
            MetricDefinition(.electrodermalActivity, "electrodermalActivity", .siemen(), "S", .discrete),
            MetricDefinition(.timeInDaylight, "timeInDaylight", .minute(), "min", .cumulative),
            MetricDefinition(.environmentalAudioExposure, "environmentalAudioExposure", .decibelAWeightedSoundPressureLevel(), "dBA", .discrete),
            MetricDefinition(.headphoneAudioExposure, "headphoneAudioExposure", .decibelAWeightedSoundPressureLevel(), "dBA", .discrete),
            MetricDefinition(.walkingSpeed, "walkingSpeed", speed, "m/s", .discrete),
            MetricDefinition(.walkingStepLength, "walkingStepLength", .meter(), "m", .discrete),
            MetricDefinition(.walkingAsymmetryPercentage, "walkingAsymmetryPercentage", .percent(), "%", .discrete, multiplier: 100),
            MetricDefinition(.walkingDoubleSupportPercentage, "walkingDoubleSupportPercentage", .percent(), "%", .discrete, multiplier: 100),
            MetricDefinition(.sixMinuteWalkTestDistance, "sixMinuteWalkTestDistance", .meter(), "m", .discrete),
            MetricDefinition(.stairAscentSpeed, "stairAscentSpeed", speed, "m/s", .discrete),
            MetricDefinition(.stairDescentSpeed, "stairDescentSpeed", speed, "m/s", .discrete),
            MetricDefinition(.runningPower, "runningPower", .watt(), "W", .discrete),
            MetricDefinition(.runningSpeed, "runningSpeed", speed, "m/s", .discrete),
            MetricDefinition(.runningStrideLength, "runningStrideLength", .meter(), "m", .discrete),
            MetricDefinition(.runningVerticalOscillation, "runningVerticalOscillation", .meterUnit(with: .centi), "cm", .discrete),
            MetricDefinition(.runningGroundContactTime, "runningGroundContactTime", .secondUnit(with: .milli), "ms", .discrete),
            MetricDefinition(.cyclingCadence, "cyclingCadence", bpm, "count/min", .discrete),
            MetricDefinition(.cyclingPower, "cyclingPower", .watt(), "W", .discrete),
            MetricDefinition(.cyclingSpeed, "cyclingSpeed", speed, "m/s", .discrete),
            MetricDefinition(.cyclingFunctionalThresholdPower, "cyclingFunctionalThresholdPower", .watt(), "W", .discrete),
            MetricDefinition(.physicalEffort, "physicalEffort", HKUnit(from: "kcal/(kg*hr)"), "kcal/(kg*hr)", .discrete),
            MetricDefinition(.dietaryEnergyConsumed, "dietaryEnergyConsumed", .kilocalorie(), "kcal", .cumulative),
            MetricDefinition(.dietaryProtein, "dietaryProtein", .gram(), "g", .cumulative),
            MetricDefinition(.dietaryCarbohydrates, "dietaryCarbohydrates", .gram(), "g", .cumulative),
            MetricDefinition(.dietaryFatTotal, "dietaryFatTotal", .gram(), "g", .cumulative),
            MetricDefinition(.dietaryFiber, "dietaryFiber", .gram(), "g", .cumulative),
            MetricDefinition(.dietarySugar, "dietarySugar", .gram(), "g", .cumulative),
            MetricDefinition(.dietarySodium, "dietarySodium", .gramUnit(with: .milli), "mg", .cumulative),
            MetricDefinition(.dietaryWater, "dietaryWater", .literUnit(with: .milli), "mL", .cumulative),
            MetricDefinition(.dietaryCaffeine, "dietaryCaffeine", .gramUnit(with: .milli), "mg", .cumulative),
            MetricDefinition(.numberOfTimesFallen, "numberOfTimesFallen", .count(), "count", .cumulative),
            MetricDefinition(.uvExposure, "uvExposure", .count(), "count", .discrete),
            MetricDefinition(.underwaterDepth, "underwaterDepth", .meter(), "m", .discrete),
            MetricDefinition(.waterTemperature, "waterTemperature", .degreeCelsius(), "degC", .discrete)
        ]
    }

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    private var quantityTypes: [HKQuantityTypeIdentifier: HKQuantityType] {
        let coreIdentifiers: [HKQuantityTypeIdentifier] = [
            .activeEnergyBurned,
            .basalEnergyBurned,
            .stepCount,
            .appleExerciseTime,
            .bodyMass,
            .bodyFatPercentage,
            .bodyMassIndex,
            .leanBodyMass,
            .restingHeartRate,
            .walkingHeartRateAverage,
            .heartRateVariabilitySDNN,
            .respiratoryRate,
            .oxygenSaturation,
            .vo2Max,
            .appleSleepingWristTemperature
        ]
        let identifiers = Set(coreIdentifiers + additionalMetricDefinitions.map(\.identifier))
        return Dictionary(uniqueKeysWithValues: identifiers.compactMap { identifier in
            HKObjectType.quantityType(forIdentifier: identifier).map { (identifier, $0) }
        })
    }

    private var sleepType: HKCategoryType? {
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
    }

    var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        quantityTypes.values.forEach { types.insert($0) }
        if let sleepType { types.insert(sleepType) }
        types.insert(HKObjectType.workoutType())
        return types
    }

    func requestAuthorization() async throws {
        guard isAvailable else { throw HealthBridgeError.healthDataUnavailable }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            store.requestAuthorization(toShare: [], read: readTypes) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: HealthBridgeError.authorizationFailed)
                }
            }
        }
    }

    func installObserverQueries(onUpdate: @escaping @Sendable () async -> Void) {
        guard isAvailable, observerQueries.isEmpty else { return }

        for type in readTypes {
            guard let sampleType = type as? HKSampleType else { continue }
            let query = HKObserverQuery(sampleType: sampleType, predicate: nil) { _, completion, _ in
                Task {
                    await onUpdate()
                    completion()
                }
            }
            observerQueries.append(query)
            store.execute(query)
        }
    }

    func enableBackgroundDelivery() {
        guard isAvailable else { return }
        for type in readTypes {
            store.enableBackgroundDelivery(for: type, frequency: .hourly) { _, _ in }
        }
    }

    func snapshot(for date: Date) async throws -> DailyHealthSnapshot {
        let activity = try await activitySnapshot(for: date)
        let bodySamples = try await bodySamples(for: date)
        let recovery = try await recoverySnapshot(for: date)
        let metrics = try await additionalMetricSnapshots(for: date)
        return DailyHealthSnapshot(activity: activity, bodySamples: bodySamples, recovery: recovery, metrics: metrics)
    }

    private func activitySnapshot(for date: Date) async throws -> ActivityPayload? {
        let interval = dayInterval(for: date)
        async let active = cumulative(.activeEnergyBurned, unit: .kilocalorie(), interval: interval)
        async let resting = cumulative(.basalEnergyBurned, unit: .kilocalorie(), interval: interval)
        async let stepsValue = cumulative(.stepCount, unit: .count(), interval: interval)
        async let exercise = cumulative(.appleExerciseTime, unit: .minute(), interval: interval)
        async let workouts = workouts(for: interval)

        let activeKcal = try await active
        let restingKcal = try await resting
        let stepsDouble = try await stepsValue
        let steps = stepsDouble.map { Int($0.rounded()) }
        let exerciseMinutes = try await exercise
        let workoutValues = try await workouts
        let hasAny = [activeKcal, restingKcal, exerciseMinutes].contains { $0 != nil }
            || steps != nil
            || !workoutValues.isEmpty

        guard hasAny else { return nil }

        let totalKcal = activeKcal.flatMap { activeValue in
            restingKcal.map { activeValue + $0 }
        }
        let sources = Set(workoutValues.map(\.source)).sorted()
        return ActivityPayload(
            date: dateKey(date),
            activeKcal: activeKcal,
            restingKcal: restingKcal,
            totalKcal: totalKcal,
            steps: steps,
            exerciseMinutes: exerciseMinutes,
            sampledAt: iso(Date()),
            sources: sources,
            workouts: workoutValues
        )
    }

    private func bodySamples(for date: Date) async throws -> [BodySamplePayload] {
        let interval = dayInterval(for: date)
        let specs: [(HKQuantityTypeIdentifier, String, HKUnit, String)] = [
            (.bodyMass, "bodyMass", .gramUnit(with: .kilo), "kg"),
            (.bodyFatPercentage, "bodyFatPercentage", .percent(), "%"),
            (.bodyMassIndex, "bodyMassIndex", .count(), "count"),
            (.leanBodyMass, "leanBodyMass", .gramUnit(with: .kilo), "kg")
        ]

        var output: [BodySamplePayload] = []
        for (identifier, typeName, unit, unitName) in specs {
            guard let type = quantityTypes[identifier] else { continue }
            let samples = try await quantitySamples(type: type, interval: interval)
            output.append(contentsOf: samples.map {
                BodySamplePayload(
                    type: typeName,
                    value: $0.quantity.doubleValue(for: unit) * (identifier == .bodyFatPercentage ? 100 : 1),
                    unit: unitName,
                    measuredAt: iso($0.startDate),
                    source: $0.sourceRevision.source.name
                )
            })
        }
        return output
    }

    private func recoverySnapshot(for date: Date) async throws -> RecoveryPayload? {
        let day = dayInterval(for: date)

        async let restingHeartRate = average(.restingHeartRate, unit: countPerMinute(), interval: day)
        async let walkingHeartRate = average(.walkingHeartRateAverage, unit: countPerMinute(), interval: day)
        async let hrv = average(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), interval: day)
        async let respiratory = average(.respiratoryRate, unit: countPerMinute(), interval: day)
        async let oxygenFraction = average(.oxygenSaturation, unit: .percent(), interval: day)
        async let vo2Max = average(.vo2Max, unit: HKUnit(from: "ml/kg*min"), interval: day)
        async let wristTemperature = average(.appleSleepingWristTemperature, unit: .degreeCelsius(), interval: day)
        async let sleep = sleepBreakdown(endingOn: date)

        let sleepValues = try await sleep
        let recovery = RecoveryPayload(
            date: dateKey(date),
            restingHeartRate: try await restingHeartRate,
            walkingHeartRateAverage: try await walkingHeartRate,
            hrvSdnnMs: try await hrv,
            respiratoryRate: try await respiratory,
            oxygenSaturationPct: try await oxygenFraction.map { $0 * 100 },
            vo2Max: try await vo2Max,
            wristTemperatureC: try await wristTemperature,
            sleepAsleepMinutes: sleepValues?.asleep,
            sleepInBedMinutes: sleepValues?.inBed,
            sleepAwakeMinutes: sleepValues?.awake,
            sleepCoreMinutes: sleepValues?.core,
            sleepDeepMinutes: sleepValues?.deep,
            sleepRemMinutes: sleepValues?.rem,
            sampledAt: iso(Date()),
            sources: sleepValues.map { [$0.source] } ?? []
        )
        return recovery.hasValues ? recovery : nil
    }

    private func additionalMetricSnapshots(for date: Date) async throws -> [HealthMetricPayload] {
        let interval = dayInterval(for: date)
        var output: [HealthMetricPayload] = []
        for definition in additionalMetricDefinitions {
            guard let type = quantityTypes[definition.identifier],
                  let metric = try await metricSnapshot(type: type, definition: definition, interval: interval) else {
                continue
            }
            output.append(metric)
        }
        return output
    }

    private func metricSnapshot(
        type: HKQuantityType,
        definition: MetricDefinition,
        interval: DateInterval
    ) async throws -> HealthMetricPayload? {
        let effectiveAggregation: MetricAggregation = type.aggregationStyle == .cumulative
            ? .cumulative
            : .discrete
        async let samplesRequest = quantitySamples(type: type, interval: interval)
        async let statisticsRequest = metricStatistics(
            type: type,
            definition: definition,
            aggregation: effectiveAggregation,
            interval: interval
        )
        let samples = try await samplesRequest
        let values = try await statisticsRequest
        guard !samples.isEmpty || values.sum != nil || values.average != nil else { return nil }

        let latestSample = samples.max(by: { $0.startDate < $1.startDate })
        let multiplier = definition.multiplier
        return HealthMetricPayload(
            date: dateKey(interval.start),
            key: definition.key,
            unit: definition.unitName,
            aggregation: effectiveAggregation.rawValue,
            sum: values.sum.map { $0 * multiplier },
            average: values.average.map { $0 * multiplier },
            minimum: values.minimum.map { $0 * multiplier },
            maximum: values.maximum.map { $0 * multiplier },
            latest: latestSample.map { $0.quantity.doubleValue(for: definition.unit) * multiplier },
            latestAt: latestSample.map { iso($0.startDate) },
            sampleCount: samples.count,
            sources: Set(samples.map { $0.sourceRevision.source.name }).sorted(),
            sampledAt: iso(Date())
        )
    }

    private func metricStatistics(
        type: HKQuantityType,
        definition: MetricDefinition,
        aggregation: MetricAggregation,
        interval: DateInterval
    ) async throws -> (sum: Double?, average: Double?, minimum: Double?, maximum: Double?) {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let options: HKStatisticsOptions = aggregation == .cumulative
            ? .cumulativeSum
            : [.discreteAverage, .discreteMin, .discreteMax]

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: options
            ) { _, statistics, error in
                if let error {
                    let nsError = error as NSError
                    if nsError.domain == HKErrorDomain,
                       nsError.code == HKError.Code.errorNoData.rawValue {
                        continuation.resume(returning: (nil, nil, nil, nil))
                        return
                    }
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (
                    statistics?.sumQuantity()?.doubleValue(for: definition.unit),
                    statistics?.averageQuantity()?.doubleValue(for: definition.unit),
                    statistics?.minimumQuantity()?.doubleValue(for: definition.unit),
                    statistics?.maximumQuantity()?.doubleValue(for: definition.unit)
                ))
            }
            store.execute(query)
        }
    }

    private func cumulative(
        _ identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        interval: DateInterval
    ) async throws -> Double? {
        guard let type = quantityTypes[identifier] else { return nil }
        return try await statistics(type: type, option: .cumulativeSum, unit: unit, interval: interval)
    }

    private func average(
        _ identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        interval: DateInterval
    ) async throws -> Double? {
        guard let type = quantityTypes[identifier] else { return nil }
        return try await statistics(type: type, option: .discreteAverage, unit: unit, interval: interval)
    }

    private func statistics(
        type: HKQuantityType,
        option: HKStatisticsOptions,
        unit: HKUnit,
        interval: DateInterval
    ) async throws -> Double? {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: option
            ) { _, statistics, error in
                if let error {
                    let nsError = error as NSError
                    if nsError.domain == HKErrorDomain,
                       nsError.code == HKError.Code.errorNoData.rawValue {
                        continuation.resume(returning: nil)
                        return
                    }
                    continuation.resume(throwing: error)
                    return
                }
                let quantity = option.contains(.cumulativeSum)
                    ? statistics?.sumQuantity()
                    : statistics?.averageQuantity()
                continuation.resume(returning: quantity?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func quantitySamples(
        type: HKQuantityType,
        interval: DateInterval
    ) async throws -> [HKQuantitySample] {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample]) ?? [])
            }
            store.execute(query)
        }
    }

    private func workouts(for interval: DateInterval) async throws -> [WorkoutPayload] {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate]
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: predicate,
                limit: 50,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let activeType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
                let values = ((samples as? [HKWorkout]) ?? []).map { workout -> WorkoutPayload in
                    let activeKcal = activeType
                        .flatMap { workout.statistics(for: $0)?.sumQuantity() }
                        .map { $0.doubleValue(for: .kilocalorie()) }

                    return WorkoutPayload(
                        activityType: String(workout.workoutActivityType.rawValue),
                        startAt: self.iso(workout.startDate),
                        endAt: self.iso(workout.endDate),
                        durationMinutes: workout.duration / 60,
                        activeKcal: activeKcal,
                        source: workout.sourceRevision.source.name
                    )
                }
                continuation.resume(returning: values)
            }
            store.execute(query)
        }
    }

    private struct SleepBreakdown {
        var asleep: Double = 0
        var inBed: Double = 0
        var awake: Double = 0
        var core: Double = 0
        var deep: Double = 0
        var rem: Double = 0
        var unspecified: Double = 0
        var source: String = ""

        var scoredAsleep: Double {
            let staged = core + deep + rem
            return staged > 0 ? staged : unspecified
        }
    }

    private func sleepBreakdown(endingOn date: Date) async throws -> SleepBreakdown? {
        guard let sleepType else { return nil }

        let calendar = Calendar.autoupdatingCurrent
        let targetStart = calendar.startOfDay(for: date)
        guard let previousDay = calendar.date(byAdding: .day, value: -1, to: targetStart),
              let start = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: previousDay),
              let end = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: targetStart) else {
            return nil
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, rawSamples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (rawSamples as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }

        var bySource: [String: SleepBreakdown] = [:]
        for sample in samples {
            let source = sample.sourceRevision.source.name
            var row = bySource[source] ?? SleepBreakdown(source: source)
            let minutes = max(0, sample.endDate.timeIntervalSince(sample.startDate) / 60)
            guard let value = HKCategoryValueSleepAnalysis(rawValue: sample.value) else { continue }

            switch value {
            case .inBed: row.inBed += minutes
            case .awake: row.awake += minutes
            case .asleepCore: row.core += minutes
            case .asleepDeep: row.deep += minutes
            case .asleepREM: row.rem += minutes
            case .asleepUnspecified: row.unspecified += minutes
            @unknown default: break
            }
            bySource[source] = row
        }

        guard var best = bySource.values.max(by: {
            max($0.scoredAsleep, $0.inBed) < max($1.scoredAsleep, $1.inBed)
        }) else {
            return nil
        }
        best.asleep = best.scoredAsleep
        return best
    }

    private func dayInterval(for date: Date) -> DateInterval {
        let calendar = Calendar.autoupdatingCurrent
        let start = calendar.startOfDay(for: date)
        let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86400)
        return DateInterval(start: start, end: end)
    }

    private func dateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .autoupdatingCurrent
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private func iso(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func countPerMinute() -> HKUnit {
        HKUnit.count().unitDivided(by: .minute())
    }
}

enum HealthBridgeError: LocalizedError {
    case healthDataUnavailable
    case authorizationFailed
    case tokenMissing
    case invalidServerResponse
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .healthDataUnavailable:
            return "HealthKit no está disponible en este dispositivo."
        case .authorizationFailed:
            return "No se pudo completar la autorización de Salud."
        case .tokenMissing:
            return "Falta configurar el token privado de sincronización."
        case .invalidServerResponse:
            return "La respuesta del servidor no es válida."
        case .serverError(let code):
            return "El servidor rechazó la sincronización: \(code)."
        }
    }
}
