import Darwin
import Foundation

@main
enum SegundoCerebroRemindersMain {
    static func main() async {
        do {
            try await run()
        } catch {
            fputs("Error: \(error.localizedDescription)\n", stderr)
            exit(1)
        }
    }

    @MainActor
    private static func run() async throws {
        let arguments = Array(CommandLine.arguments.dropFirst())
        let command = arguments.first ?? "help"

        if command == "configure" {
            try configure(arguments: Array(arguments.dropFirst()))
            return
        }

        let config = try ConfigStore.load()
        let token = try KeychainStore.load(service: config.keychainService, account: config.keychainAccount)
        let reminders = ReminderStore()
        let api = APIClient(config: config, token: token)
        let engine = SyncEngine(config: config, reminders: reminders, api: api)

        switch command {
        case "sync":
            try await engine.sync(dryRun: arguments.contains("--dry-run"))
        case "status":
            try await printStatus(config: config, reminders: reminders, api: api)
        case "run":
            try await reminders.requestAccessIfNeeded()
            _ = try reminders.locateList(named: config.listName)
            engine.scheduleSync(reason: "arranque")
            let observer = reminders.observeChanges {
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    engine.scheduleSync(reason: "cambio EventKit")
                }
            }
            let timer = Timer.scheduledTimer(withTimeInterval: config.pollIntervalSeconds, repeats: true) { _ in
                Task { @MainActor in engine.scheduleSync(reason: "fallback periódico") }
            }
            RunLoop.main.add(timer, forMode: .common)
            while !Task.isCancelled {
                try await Task.sleep(for: .seconds(3_600))
            }
            reminders.stopObserving(observer)
        default:
            printUsage()
        }
    }

    private static func configure(arguments: [String]) throws {
        guard let backendValue = value(after: "--backend", in: arguments),
              let backend = URL(string: backendValue), backend.scheme == "https" else {
            throw AgentError.invalidConfiguration("usa --backend https://…")
        }
        let listName = value(after: "--list", in: arguments) ?? "Lista De La Compra"
        let interval = TimeInterval(value(after: "--interval", in: arguments) ?? "90") ?? 90
        let token: String
        if arguments.contains("--token-stdin") {
            token = (readLine() ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        } else {
            guard let pointer = getpass("Token privado de sincronización: ") else {
                throw AgentError.invalidConfiguration("no se pudo leer el token")
            }
            token = String(cString: pointer).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        guard token.count >= 32 else { throw AgentError.invalidConfiguration("el token debe tener al menos 32 caracteres") }
        let config = AgentConfig(backendURL: backend, listName: listName, pollIntervalSeconds: interval)
        try ConfigStore.save(config)
        try KeychainStore.save(token, service: config.keychainService, account: config.keychainAccount)
        print("Configuración guardada en Application Support y token protegido en Keychain.")
    }

    @MainActor
    private static func printStatus(config: AgentConfig, reminders: ReminderStore, api: APIClient) async throws {
        print("Agente: instalado/ejecutable")
        print("Permiso EventKit: \(reminders.authorizationDescription)")
        if reminders.isAuthorized {
            do {
                let list = try reminders.locateList(named: config.listName)
                print("Lista localizada: sí · \(list.title)")
            } catch {
                print("Lista localizada: no · \(error.localizedDescription)")
            }
        } else {
            print("Lista localizada: pendiente de permiso")
        }
        let status = try await api.status()
        print("Backend: operativo")
        print("Sheet localizado: \(status.sheetLocated ? "sí" : "no")")
        print("Pendientes Apple: \(status.pendingActions)")
        print("Fallos definitivos: \(status.failedActions)")
        if let last = status.lastSync {
            print("Última sincronización: \(last.completedAt ?? last.startedAt) · \(last.status) · conflictos \(last.conflicts)")
            if let error = last.error { print("Último error: \(error)") }
        } else {
            print("Última sincronización: todavía no ejecutada")
        }
    }

    private static func value(after flag: String, in arguments: [String]) -> String? {
        guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(index + 1) else { return nil }
        return arguments[index + 1]
    }

    private static func printUsage() {
        print("""
        Uso:
          SegundoCerebroReminders configure --backend https://privado.ejemplo --list "Lista De La Compra" [--interval 90]
          SegundoCerebroReminders sync --dry-run
          SegundoCerebroReminders sync
          SegundoCerebroReminders status
          SegundoCerebroReminders run
        """)
    }
}
