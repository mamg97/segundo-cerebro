import Foundation
import Security

enum ConfigStore {
    static var directoryURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/SegundoCerebroReminders", isDirectory: true)
    }

    static var configURL: URL { directoryURL.appendingPathComponent("config.json") }
    static var stateURL: URL { directoryURL.appendingPathComponent("state.json") }

    static func load() throws -> AgentConfig {
        if let base = ProcessInfo.processInfo.environment["SHOPPING_SYNC_BASE_URL"],
           let url = URL(string: base),
           let list = ProcessInfo.processInfo.environment["SHOPPING_REMINDERS_LIST_NAME"] {
            let interval = TimeInterval(ProcessInfo.processInfo.environment["SHOPPING_SYNC_INTERVAL_SECONDS"] ?? "90") ?? 90
            return AgentConfig(backendURL: url, listName: list, pollIntervalSeconds: interval)
        }
        guard FileManager.default.fileExists(atPath: configURL.path) else {
            throw AgentError.invalidConfiguration("falta \(configURL.path); ejecuta el instalador")
        }
        let data = try Data(contentsOf: configURL)
        let config = try JSONDecoder().decode(AgentConfig.self, from: data)
        guard config.backendURL.scheme == "https", !config.listName.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw AgentError.invalidConfiguration("la URL debe usar HTTPS y la lista no puede estar vacía")
        }
        return config
    }

    static func save(_ config: AgentConfig) throws {
        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        let data = try JSONEncoder.pretty.encode(config)
        try data.write(to: configURL, options: [.atomic])
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: configURL.path)
    }

    static func loadState() -> AgentState {
        guard let data = try? Data(contentsOf: stateURL),
              let state = try? JSONDecoder().decode(AgentState.self, from: data) else {
            return AgentState(lastSuccessfulSnapshotAt: nil)
        }
        return state
    }

    static func saveState(_ state: AgentState) throws {
        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        let data = try JSONEncoder.pretty.encode(state)
        try data.write(to: stateURL, options: [.atomic])
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: stateURL.path)
    }
}

enum KeychainStore {
    static func save(_ token: String, service: String, account: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let attributes: [String: Any] = [kSecValueData as String: Data(token.utf8)]
        let update = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if update == errSecSuccess { return }
        if update != errSecItemNotFound { throw AgentError.keychain(update) }
        var item = query
        item[kSecValueData as String] = Data(token.utf8)
        let add = SecItemAdd(item as CFDictionary, nil)
        guard add == errSecSuccess else { throw AgentError.keychain(add) }
    }

    static func load(service: String, account: String) throws -> String {
        if let token = ProcessInfo.processInfo.environment["SHOPPING_SYNC_TOKEN"], !token.isEmpty { return token }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data, let token = String(data: data, encoding: .utf8), !token.isEmpty else {
            throw AgentError.keychain(status)
        }
        return token
    }
}

extension JSONEncoder {
    static let pretty: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return encoder
    }()
}
