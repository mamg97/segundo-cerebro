import Foundation

struct AgentConfig: Codable {
    var backendURL: URL
    var listName: String
    var pollIntervalSeconds: TimeInterval
    var keychainService: String
    var keychainAccount: String

    static let defaultService = "com.mamg97.segundo-cerebro.reminders"
    static let defaultAccount = "shopping-sync-token"

    init(
        backendURL: URL,
        listName: String,
        pollIntervalSeconds: TimeInterval = 90,
        keychainService: String = Self.defaultService,
        keychainAccount: String = Self.defaultAccount
    ) {
        self.backendURL = backendURL
        self.listName = listName
        self.pollIntervalSeconds = min(600, max(60, pollIntervalSeconds))
        self.keychainService = keychainService
        self.keychainAccount = keychainAccount
    }
}

struct AgentState: Codable {
    var lastSuccessfulSnapshotAt: Date?
}

struct ReminderSnapshot: Codable {
    let eventId: String
    let reminderId: String
    let externalIdentifier: String?
    let title: String
    let completed: Bool
    let modifiedAt: String
    let createdAt: String?
    let deleted: Bool
}

struct AppleEventsRequest: Codable {
    let events: [ReminderSnapshot]
    let dryRun: Bool
    let fullSnapshot: Bool
    let agent: AgentMetadata
}

struct AgentMetadata: Codable {
    let version: String
    let hostname: String
}

struct DryRunReport: Codable {
    let appleOnly: Int
    let segundoCerebroOnly: Int
    let matched: Int
    let potentialConflicts: Int
    let appleCount: Int
    let segundoCerebroCount: Int
}

struct AppleEventsResponse: Codable {
    let ok: Bool
    let dryRun: Bool?
    let runId: String?
    let report: DryRunReport?
}

struct PendingActionsResponse: Codable {
    let ok: Bool
    let actions: [AppleAction]
}

struct AppleAction: Codable {
    let id: String
    let type: String
    let externalId: String
    let appleReminderId: String?
    let title: String?
    let desiredCompleted: Bool?
    let expectedAppleModifiedAt: String?
    let attempts: Int
    let createdAt: String
}

struct AppliedReminder {
    let reminderId: String
    let externalIdentifier: String?
    let modifiedAt: String
    let completed: Bool
}

struct ActionAcknowledgement: Codable {
    let success: Bool
    let appleReminderId: String?
    let appleExternalIdentifier: String?
    let appleModifiedAt: String?
    let appleCompleted: Bool?
    let error: String?
}

struct BackendStatus: Codable {
    struct LastSync: Codable {
        let status: String
        let startedAt: String
        let completedAt: String?
        let conflicts: Int
        let error: String?
    }

    let ok: Bool
    let sheetLocated: Bool
    let schemaReady: Bool
    let linkedItems: Int
    let pendingActions: Int
    let failedActions: Int
    let lastSync: LastSync?
}

enum AgentError: LocalizedError {
    case invalidConfiguration(String)
    case reminderPermissionDenied
    case reminderPermissionRestricted
    case listNotFound(String)
    case listAmbiguous(String, Int)
    case reminderNotFound(String)
    case appleConflict(String)
    case backend(Int, String)
    case keychain(OSStatus)

    var errorDescription: String? {
        switch self {
        case .invalidConfiguration(let detail): return "Configuración no válida: \(detail)"
        case .reminderPermissionDenied: return "El acceso a Recordatorios está denegado."
        case .reminderPermissionRestricted: return "El acceso a Recordatorios está restringido por macOS."
        case .listNotFound(let name): return "No se encontró exactamente la lista «\(name)»."
        case .listAmbiguous(let name, let count): return "Hay \(count) listas llamadas «\(name)»; la sincronización se detuvo."
        case .reminderNotFound(let id): return "El recordatorio \(id) ya no existe."
        case .appleConflict(let detail): return "Apple cambió el recordatorio antes de aplicar la acción: \(detail)"
        case .backend(let status, let code): return "El backend devolvió \(status): \(code)"
        case .keychain(let status): return "Keychain devolvió el estado \(status)."
        }
    }
}

enum NameNormalizer {
    static func normalize(_ value: String) -> String {
        value
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "es_ES"))
            .lowercased(with: Locale(identifier: "es_ES"))
            .replacingOccurrences(of: "[^\\p{L}\\p{N}'%+]+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    }
}

extension ISO8601DateFormatter {
    static let shoppingSync: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
