import BackgroundTasks
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    static let refreshIdentifier = "com.mamg97.segundocerebro.healthbridge.refresh"
    private static let refreshInterval: TimeInterval = 60 * 60

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        registerBackgroundRefresh()

        HealthKitService.shared.installObserverQueries {
            Task {
                _ = try? await SyncService.shared.syncRecentDays(days: 2)
            }
        }

        if UserDefaults.standard.bool(forKey: "healthBridge.didRequestHealthAuthorization") {
            HealthKitService.shared.enableBackgroundDelivery()
        }

        scheduleBackgroundRefresh()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        guard UserDefaults.standard.bool(forKey: "healthBridge.didRequestHealthAuthorization") else { return }
        Task {
            _ = try? await SyncService.shared.syncRecentDays(days: 2)
        }
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        scheduleBackgroundRefresh()
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
                do {
                    _ = try await SyncService.shared.syncRecentDays(days: 2)
                    refreshTask.setTaskCompleted(success: true)
                } catch {
                    refreshTask.setTaskCompleted(success: false)
                }
            }
            refreshTask.expirationHandler = {
                operation.cancel()
            }
        }
    }

    private func scheduleBackgroundRefresh() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.refreshIdentifier)
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: Self.refreshInterval)
        try? BGTaskScheduler.shared.submit(request)
    }
}
