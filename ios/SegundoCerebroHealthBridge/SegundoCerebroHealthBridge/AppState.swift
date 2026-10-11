import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var tokenDraft = ""
    @Published var hasToken = KeychainStore.loadToken() != nil
    @Published var didRequestHealthAuthorization = UserDefaults.standard.bool(forKey: "healthBridge.didRequestHealthAuthorization")
    @Published var isSyncing = false
    @Published var statusMessage = "Preparado"
    @Published var lastSuccessfulSync: Date?
    @Published var lastSyncTrigger: SyncTrigger?
    @Published var lastSyncSummary: String?
    @Published var nextBackgroundRefreshEarliest: Date?

    init() {
        refreshDiagnostics()
        if didRequestHealthAuthorization {
            HealthKitService.shared.enableBackgroundDelivery()
        }
    }

    func saveToken() {
        do {
            try KeychainStore.saveToken(tokenDraft)
            tokenDraft = ""
            hasToken = KeychainStore.loadToken() != nil
            statusMessage = hasToken ? "Token guardado de forma segura en Keychain." : "Token eliminado."
        } catch {
            statusMessage = "No se pudo guardar el token: \(error.localizedDescription)"
        }
    }

    func replaceToken() {
        KeychainStore.deleteToken()
        hasToken = false
        tokenDraft = ""
        statusMessage = "Introduce el token privado actual."
    }

    func requestHealthAuthorization() async {
        guard HealthKitService.shared.isAvailable else {
            statusMessage = "HealthKit no está disponible en este dispositivo."
            return
        }

        do {
            try await HealthKitService.shared.requestAuthorization()
            didRequestHealthAuthorization = true
            UserDefaults.standard.set(true, forKey: "healthBridge.didRequestHealthAuthorization")
            HealthKitService.shared.enableBackgroundDelivery()
            statusMessage = "Permisos solicitados. Apple no revela a la app qué permisos de lectura concretos has denegado."
        } catch {
            statusMessage = "Error de autorización: \(error.localizedDescription)"
        }
    }

    func syncNow() async {
        guard !isSyncing else { return }
        isSyncing = true
        statusMessage = "Leyendo Apple Health…"
        defer { isSyncing = false }

        do {
            let result = try await SyncService.shared.syncRecentDays(days: 2, trigger: .manual)
            refreshDiagnostics()
            statusMessage = "Sincronización correcta: \(result.syncedDays) días, \(result.bodySamples) muestras corporales, \(result.recoveryDays) días de recuperación y \(result.extendedMetrics) métricas ampliadas."
        } catch {
            refreshDiagnostics()
            statusMessage = "Sincronización fallida: \(error.localizedDescription)"
        }
    }

    func refreshDiagnostics() {
        let defaults = UserDefaults.standard
        lastSuccessfulSync = defaults.object(forKey: SyncDefaults.lastSuccessfulSync) as? Date
        lastSyncTrigger = defaults.string(forKey: SyncDefaults.lastSuccessfulTrigger).flatMap(SyncTrigger.init(rawValue:))
        lastSyncSummary = defaults.string(forKey: SyncDefaults.lastSuccessfulSummary)
        nextBackgroundRefreshEarliest = defaults.object(forKey: SyncDefaults.nextBackgroundRefreshEarliest) as? Date
    }

    var lastSyncTriggerLabel: String {
        switch lastSyncTrigger {
        case .manual: "Manual"
        case .healthKit: "Automática · nuevos datos de Salud"
        case .backgroundRefresh: "Automática · reconciliación periódica"
        case .protectedDataRetry: "Automática · reintento tras desbloqueo"
        case nil: "Sin información"
        }
    }
}
