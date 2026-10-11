import BackgroundTasks
import UIKit

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    static let refreshIdentifier = "com.mamg97.segundocerebro.healthbridge.refresh"

    private var protectedDataRetryTask: Task<Void, Never>?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        registerBackgroundRefresh()

        HealthKitService.shared.installObserverQueries { [weak self] in
            _ = await self?.performAutomaticSync(trigger: .healthKit)
        }

        if UserDefaults.standard.bool(forKey: "healthBridge.didRequestHealthAuthorization") {
            HealthKitService.shared.enableBackgroundDelivery()
        }

        restorePendingRetryIfNeeded()
        scheduleBackgroundRefresh()
        retryWhenProtectedDataIsAvailable(application)
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        scheduleBackgroundRefresh()
    }

    func applicationProtectedDataDidBecomeAvailable(_ application: UIApplication) {
        retryWhenProtectedDataIsAvailable(application)
    }

    private func registerBackgroundRefresh() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.refreshIdentifier,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }

            self.scheduleBackgroundRefresh()
            let operation = Task {
                let success = await self.performAutomaticSync(trigger: .backgroundRefresh)
                refreshTask.setTaskCompleted(success: success)
            }
            refreshTask.expirationHandler = {
                operation.cancel()
            }
        }
    }

    private func scheduleBackgroundRefresh() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.refreshIdentifier)

        let defaults = UserDefaults.standard
        let now = Date()
        let earliest: Date
        if let lastSuccessfulSync = defaults.object(forKey: SyncDefaults.lastSuccessfulSync) as? Date {
            earliest = max(now, lastSuccessfulSync.addingTimeInterval(SyncService.automaticSyncInterval))
        } else {
            earliest = now.addingTimeInterval(SyncService.automaticSyncInterval)
        }
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshIdentifier)
        request.earliestBeginDate = earliest

        do {
            try BGTaskScheduler.shared.submit(request)
            defaults.set(earliest, forKey: SyncDefaults.nextBackgroundRefreshEarliest)
            defaults.removeObject(forKey: SyncDefaults.backgroundScheduleFailure)
        } catch {
            UserDefaults.standard.set(error.localizedDescription, forKey: SyncDefaults.backgroundScheduleFailure)
        }
    }

    private func performAutomaticSync(trigger: SyncTrigger) async -> Bool {
        guard UIApplication.shared.isProtectedDataAvailable else {
            UserDefaults.standard.set(true, forKey: SyncDefaults.pendingProtectedDataRetry)
            return false
        }

        do {
            _ = try await SyncService.shared.syncRecentDays(trigger: trigger)
            UserDefaults.standard.removeObject(forKey: SyncDefaults.pendingProtectedDataRetry)
            scheduleBackgroundRefresh()
            return true
        } catch {
            if !UIApplication.shared.isProtectedDataAvailable {
                UserDefaults.standard.set(true, forKey: SyncDefaults.pendingProtectedDataRetry)
            }
            scheduleBackgroundRefresh()
            return false
        }
    }

    private func restorePendingRetryIfNeeded() {
        let defaults = UserDefaults.standard
        guard defaults.string(forKey: SyncDefaults.lastFailure) != nil,
              let attempt = defaults.object(forKey: SyncDefaults.lastAttempt) as? Date,
              let triggerValue = defaults.string(forKey: SyncDefaults.lastAttemptTrigger),
              let trigger = SyncTrigger(rawValue: triggerValue),
              trigger.isAutomatic else {
            return
        }

        let lastSuccess = defaults.object(forKey: SyncDefaults.lastSuccessfulSync) as? Date
        if lastSuccess.map({ attempt > $0 }) ?? true {
            defaults.set(true, forKey: SyncDefaults.pendingProtectedDataRetry)
        }
    }

    private func retryWhenProtectedDataIsAvailable(_ application: UIApplication) {
        let defaults = UserDefaults.standard
        guard application.isProtectedDataAvailable,
              defaults.bool(forKey: SyncDefaults.pendingProtectedDataRetry),
              protectedDataRetryTask == nil else {
            return
        }

        protectedDataRetryTask = Task { [weak self] in
            guard let self else { return }
            _ = await self.performAutomaticSync(trigger: .protectedDataRetry)
            self.protectedDataRetryTask = nil
        }
    }
}
