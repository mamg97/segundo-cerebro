import Foundation

struct Failure: Error, CustomStringConvertible {
    let description: String
}
func expect(_ condition: Bool, _ message: String) throws {
    if !condition { throw Failure(description: message) }
}
final class Clock: @unchecked Sendable {
    private let lock = NSLock()
    private var value = Date(timeIntervalSince1970: 1_700_000_000)
    func now() -> Date { lock.lock(); defer { lock.unlock() }; return value }
    func advance(_ seconds: Double) { lock.lock(); value += seconds; lock.unlock() }
}
actor Source {
    var calls: [SyncTrigger] = []
    var version = 1
    var fail = false
    var holdFirst = false
    var releaseFirst: CheckedContinuation<Void, Never>?
    var started: CheckedContinuation<Void, Never>?
    func configure(hold: Bool = false, fail: Bool = false) { holdFirst = hold; self.fail = fail }
    func publish() { version += 1 }
    func count() -> Int { calls.count }
    func triggers() -> [SyncTrigger] { calls }
    func waitForFirstRead() async {
        if !calls.isEmpty { return }
        await withCheckedContinuation { started = $0 }
    }
    func release() { releaseFirst?.resume(); releaseFirst = nil }
    func read(_ days: Int, _ trigger: SyncTrigger, _ date: Date) async throws -> SyncRunResult {
        calls.append(trigger)
        let captured = version
        if calls.count == 1 && holdFirst {
            await withCheckedContinuation { continuation in
                releaseFirst = continuation
                started?.resume(); started = nil
            }
        } else { started?.resume(); started = nil }
        if fail { throw Failure(description: "SYNTHETIC_NETWORK_ERROR") }
        return SyncRunResult(syncedDays: days, bodySamples: captured,
                             recoveryDays: 0, extendedMetrics: 0,
                             finishedAt: date, trigger: trigger, wasSkipped: false)
    }
}
@main struct Tests {
    static func main() async throws {
        var passed = 0
        func run(_ title: String, _ test: (UserDefaults, Clock, Source, SyncCoordinator) async throws -> Void) async throws {
            let suite = "health-sync-synthetic-" + UUID().uuidString
            let defaults = UserDefaults(suiteName: suite)!
            defer { defaults.removePersistentDomain(forName: suite) }
            let clock = Clock(), source = Source()
            let coordinator = SyncCoordinator(defaults: defaults, now: { clock.now() }) { days, trigger in
                try await source.read(days, trigger, clock.now())
            }
            try await test(defaults, clock, source, coordinator)
            passed += 1; print("PASS: " + title)
        }
        try await run("body arriving after activity bypasses routine cooldown") { defaults, clock, source, coordinator in
            _ = try await coordinator.sync(trigger: .healthKit)
            let skipped = try await coordinator.sync(trigger: .healthKit)
            try expect(skipped.wasSkipped, "Routine cooldown lost")
            await source.publish()
            let body = try await coordinator.sync(trigger: .bodyMass)
            try expect(body.bodySamples == 2 && !body.wasSkipped, "Late body not read")
            try expect(await source.count() == 2, "Unexpected request count")
        }
        try await run("body notification during a read causes another read before completion") { defaults, clock, source, coordinator in
            await source.configure(hold: true)
            let activity = Task { try await coordinator.sync(trigger: .healthKit) }
            await source.waitForFirstRead()
            await source.publish()
            let body = Task { try await coordinator.sync(trigger: .bodyMass) }
            let deadline = Date().addingTimeInterval(3)
            while !defaults.bool(forKey: SyncDefaults.pendingBodySync), Date() < deadline { await Task.yield() }
            try expect(defaults.bool(forKey: SyncDefaults.pendingBodySync), "Body request never queued")
            await source.release()
            let result = try await body.value
            _ = try await activity.value
            try expect(result.bodySamples == 2, "New sample was absorbed by old read")
            try expect(await source.triggers() == [.healthKit, .bodyMass], "Expected one follow-up read")
            try expect(!defaults.bool(forKey: SyncDefaults.pendingBodySync), "Successful body work not acknowledged")
        }
        try await run("locked body priority survives coordinator recreation") { defaults, clock, source, coordinator in
            _ = try await coordinator.sync(trigger: .healthKit)
            await coordinator.deferSync(trigger: .bodyMass)
            let restarted = SyncCoordinator(defaults: defaults, now: { clock.now() }) { days, trigger in
                try await source.read(days, trigger, clock.now())
            }
            let result = try await restarted.sync(trigger: .protectedDataRetry)
            try expect(result.trigger == .bodyMass && !result.wasSkipped, "Unlock lost body priority")
            try expect(!defaults.bool(forKey: SyncDefaults.pendingProtectedDataRetry), "Retry not acknowledged")
        }
        try await run("failed weight retains pending work through bounded retry backoff") { defaults, clock, source, coordinator in
            await source.configure(fail: true)
            do { _ = try await coordinator.sync(trigger: .bodyMass); throw Failure(description: "Expected error") }
            catch { try expect(defaults.bool(forKey: SyncDefaults.pendingBodySync), "Failure lost pending body") }
            await source.configure(fail: false)
            let skipped = try await coordinator.sync(trigger: .protectedDataRetry)
            try expect(skipped.wasSkipped && defaults.bool(forKey: SyncDefaults.pendingBodySync), "Backoff falsely acknowledged work")
            clock.advance(61)
            let result = try await coordinator.sync(trigger: .protectedDataRetry)
            try expect(result.trigger == .bodyMass && !result.wasSkipped, "Retry not performed")
        }
        try await run("reopening reconciles within eight hours and duplicate activation is bounded") { defaults, clock, source, coordinator in
            _ = try await coordinator.sync(trigger: .healthKit)
            await source.publish()
            let fresh = try await coordinator.sync(trigger: .foreground)
            try expect(fresh.bodySamples == 2, "Foreground retained old sample")
            let skipped = try await coordinator.sync(trigger: .foreground)
            try expect(skipped.wasSkipped, "Duplicate activation not coalesced")
            clock.advance(61)
            let reopened = try await coordinator.sync(trigger: .foreground)
            try expect(!reopened.wasSkipped, "Reopen did not reconcile")
        }
        try await run("multiple routine observers share one pass") { defaults, clock, source, coordinator in
            await source.configure(hold: true)
            let first = Task { try await coordinator.sync(trigger: .healthKit) }
            await source.waitForFirstRead()
            let second = Task { try await coordinator.sync(trigger: .healthKit) }
            await source.release()
            _ = try await first.value; _ = try await second.value
            try expect(await source.count() == 1, "Routine observers generated duplicate work")
        }
        try await run("event after completed task starts a new pass") { defaults, clock, source, coordinator in
            _ = try await coordinator.sync(trigger: .healthKit)
            _ = try await coordinator.sync(trigger: .bodyMass)
            try expect(await source.count() == 2, "Joined an already completed task")
        }
        print("\(passed) executable coordination tests passed")
    }
}
