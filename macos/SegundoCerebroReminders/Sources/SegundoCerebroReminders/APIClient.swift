import Foundation

final class APIClient {
    private let config: AgentConfig
    private let token: String
    private let session: URLSession

    init(config: AgentConfig, token: String, session: URLSession = .shared) {
        self.config = config
        self.token = token
        self.session = session
    }

    func sendSnapshot(_ events: [ReminderSnapshot], dryRun: Bool) async throws -> AppleEventsResponse {
        let body = AppleEventsRequest(
            events: events,
            dryRun: dryRun,
            fullSnapshot: true,
            agent: AgentMetadata(version: "1.0.0", hostname: Host.current().localizedName ?? "mac")
        )
        return try await request(
            path: "/v1/shopping-list/apple-events",
            method: "POST",
            body: body,
            response: AppleEventsResponse.self
        )
    }

    func pendingActions() async throws -> [AppleAction] {
        let response: PendingActionsResponse = try await request(
            path: "/v1/shopping-list/pending-apple-actions",
            method: "GET",
            response: PendingActionsResponse.self
        )
        return response.actions
    }

    func acknowledge(action: AppleAction, result: Result<AppliedReminder, Error>) async throws {
        let acknowledgement: ActionAcknowledgement
        switch result {
        case .success(let reminder):
            acknowledgement = ActionAcknowledgement(
                success: true,
                appleReminderId: reminder.reminderId,
                appleExternalIdentifier: reminder.externalIdentifier,
                appleModifiedAt: reminder.modifiedAt,
                appleCompleted: reminder.completed,
                error: nil
            )
        case .failure(let error):
            acknowledgement = ActionAcknowledgement(
                success: false,
                appleReminderId: action.appleReminderId,
                appleExternalIdentifier: nil,
                appleModifiedAt: nil,
                appleCompleted: nil,
                error: String(describing: error).prefix(500).description
            )
        }
        let _: EmptyResponse = try await request(
            path: "/v1/shopping-list/apple-actions/\(action.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? action.id)/ack",
            method: "POST",
            body: acknowledgement,
            response: EmptyResponse.self
        )
    }

    func status() async throws -> BackendStatus {
        try await request(path: "/v1/shopping-list/status", method: "GET", response: BackendStatus.self)
    }

    private func request<Response: Decodable>(
        path: String,
        method: String,
        response: Response.Type
    ) async throws -> Response {
        try await request(path: path, method: method, bodyData: nil, response: response)
    }

    private func request<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body,
        response: Response.Type
    ) async throws -> Response {
        try await request(path: path, method: method, bodyData: try JSONEncoder().encode(body), response: response)
    }

    private func request<Response: Decodable>(
        path: String,
        method: String,
        bodyData: Data?,
        response: Response.Type
    ) async throws -> Response {
        let url = URL(string: path, relativeTo: config.backendURL)!.absoluteURL
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }
        let (data, urlResponse) = try await session.data(for: request)
        guard let http = urlResponse as? HTTPURLResponse else {
            throw AgentError.backend(0, "INVALID_RESPONSE")
        }
        guard (200..<300).contains(http.statusCode) else {
            let code = (try? JSONDecoder().decode(ErrorResponse.self, from: data).code) ?? "HTTP_ERROR"
            throw AgentError.backend(http.statusCode, code)
        }
        do { return try JSONDecoder().decode(Response.self, from: data) }
        catch { throw AgentError.backend(http.statusCode, "INVALID_JSON_RESPONSE") }
    }
}

private struct ErrorResponse: Codable { let code: String }
private struct EmptyResponse: Codable { let ok: Bool }
