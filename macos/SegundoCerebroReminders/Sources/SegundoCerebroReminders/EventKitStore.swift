import EventKit
import Foundation

@MainActor
final class ReminderStore {
    private let store = EKEventStore()

    var authorizationDescription: String {
        switch EKEventStore.authorizationStatus(for: .reminder) {
        case .notDetermined: return "pendiente"
        case .restricted: return "restringido"
        case .denied: return "denegado"
        case .authorized, .fullAccess: return "concedido"
        case .writeOnly: return "solo escritura (insuficiente)"
        @unknown default: return "desconocido"
        }
    }

    var isAuthorized: Bool {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        return status == .fullAccess || status.rawValue == 3
    }

    func requestAccessIfNeeded() async throws {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        switch status {
        case .authorized, .fullAccess:
            return
        case .denied, .writeOnly:
            throw AgentError.reminderPermissionDenied
        case .restricted:
            throw AgentError.reminderPermissionRestricted
        case .notDetermined:
            let granted = try await store.requestFullAccessToReminders()
            guard granted else { throw AgentError.reminderPermissionDenied }
        @unknown default:
            throw AgentError.reminderPermissionDenied
        }
    }

    func locateList(named name: String) throws -> EKCalendar {
        let matches = store.calendars(for: .reminder).filter { $0.title == name }
        guard !matches.isEmpty else { throw AgentError.listNotFound(name) }
        guard matches.count == 1 else { throw AgentError.listAmbiguous(name, matches.count) }
        guard matches[0].allowsContentModifications else {
            throw AgentError.invalidConfiguration("la lista «\(name)» no permite modificaciones desde este Mac")
        }
        return matches[0]
    }

    func snapshots(in calendar: EKCalendar, completedSince: Date?) async throws -> [ReminderSnapshot] {
        let incompletePredicate = store.predicateForIncompleteReminders(
            withDueDateStarting: nil,
            ending: nil,
            calendars: [calendar]
        )
        var reminders = await fetch(matching: incompletePredicate)
        if let completedSince {
            let completedPredicate = store.predicateForCompletedReminders(
                withCompletionDateStarting: completedSince,
                ending: nil,
                calendars: [calendar]
            )
            reminders.append(contentsOf: await fetch(matching: completedPredicate))
        }
        var seen = Set<String>()
        return reminders
            .filter { seen.insert($0.calendarItemIdentifier).inserted }
            .filter { !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .map(Self.snapshot)
            .sorted { $0.reminderId < $1.reminderId }
    }

    private func fetch(matching predicate: NSPredicate) async -> [EKReminder] {
        await withCheckedContinuation { continuation in
            store.fetchReminders(matching: predicate) { values in
                continuation.resume(returning: values ?? [])
            }
        }
    }

    func apply(_ action: AppleAction, in calendar: EKCalendar) throws -> AppliedReminder {
        let reminder: EKReminder
        if action.type == "create" {
            guard let title = action.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty else {
                throw AgentError.invalidConfiguration("la acción create no contiene título")
            }
            reminder = EKReminder(eventStore: store)
            reminder.calendar = calendar
            reminder.title = title
            reminder.isCompleted = action.desiredCompleted ?? false
        } else {
            guard let identifier = action.appleReminderId,
                  let existing = store.calendarItem(withIdentifier: identifier) as? EKReminder else {
                throw AgentError.reminderNotFound(action.appleReminderId ?? "sin-id")
            }
            reminder = existing
            try verifyExpectedVersion(action.expectedAppleModifiedAt, reminder: reminder)
            switch action.type {
            case "setCompleted":
                reminder.isCompleted = action.desiredCompleted ?? true
                if !reminder.isCompleted { reminder.completionDate = nil }
                if let title = action.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty {
                    reminder.title = title
                }
            case "updateTitle":
                guard let title = action.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty else {
                    throw AgentError.invalidConfiguration("la acción updateTitle no contiene título")
                }
                reminder.title = title
            default:
                throw AgentError.invalidConfiguration("tipo de acción Apple no soportado: \(action.type)")
            }
        }

        try store.save(reminder, commit: true)
        let modifiedAt = reminder.lastModifiedDate ?? Date()
        return AppliedReminder(
            reminderId: reminder.calendarItemIdentifier,
            externalIdentifier: reminder.calendarItemExternalIdentifier,
            modifiedAt: ISO8601DateFormatter.shoppingSync.string(from: modifiedAt),
            completed: reminder.isCompleted
        )
    }

    private func verifyExpectedVersion(_ value: String?, reminder: EKReminder) throws {
        guard let value,
              let expected = ISO8601DateFormatter.shoppingSync.date(from: value) ?? ISO8601DateFormatter().date(from: value),
              let actual = reminder.lastModifiedDate else { return }
        if actual.timeIntervalSince(expected) > 1.0 {
            throw AgentError.appleConflict(reminder.calendarItemIdentifier)
        }
    }

    static func snapshot(_ reminder: EKReminder) -> ReminderSnapshot {
        let modified = reminder.lastModifiedDate ?? reminder.creationDate ?? Date()
        let modifiedAt = ISO8601DateFormatter.shoppingSync.string(from: modified)
        return ReminderSnapshot(
            eventId: "\(reminder.calendarItemIdentifier):\(modifiedAt):\(reminder.isCompleted ? 1 : 0)",
            reminderId: reminder.calendarItemIdentifier,
            externalIdentifier: reminder.calendarItemExternalIdentifier,
            title: reminder.title,
            completed: reminder.isCompleted,
            modifiedAt: modifiedAt,
            createdAt: reminder.creationDate.map(ISO8601DateFormatter.shoppingSync.string),
            deleted: false
        )
    }

    func observeChanges(_ handler: @escaping @MainActor () -> Void) -> NSObjectProtocol {
        NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: store,
            queue: .main
        ) { _ in
            Task { @MainActor in handler() }
        }
    }

    func stopObserving(_ observer: NSObjectProtocol) {
        NotificationCenter.default.removeObserver(observer)
    }
}
