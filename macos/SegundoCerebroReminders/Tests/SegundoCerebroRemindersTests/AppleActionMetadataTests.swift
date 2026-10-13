import XCTest
@testable import SegundoCerebroReminders

final class AppleActionMetadataTests: XCTestCase {
    func testAppleActionDecodesQuantityNotesAndMercadonaURL() throws {
        let json = """
        {
          "id": "action-1",
          "type": "updateDetails",
          "externalId": "shopping-1",
          "appleReminderId": "apple-1",
          "title": "Huevos",
          "notes": "Cantidad: 1 pack 12 ud",
          "url": "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete",
          "desiredCompleted": null,
          "expectedAppleModifiedAt": "2026-10-13T15:00:00Z",
          "attempts": 0,
          "createdAt": "2026-10-13T16:00:00Z"
        }
        """.data(using: .utf8)!

        let action = try JSONDecoder().decode(AppleAction.self, from: json)
        XCTAssertEqual(action.notes, "Cantidad: 1 pack 12 ud")
        XCTAssertEqual(action.url, "https://tienda.mercadona.es/product/31504/huevos-grandes-l-paquete")
        XCTAssertEqual(action.type, "updateDetails")
    }

    func testLegacyAppleActionStillDecodesWithoutDetails() throws {
        let json = """
        {
          "id": "action-legacy",
          "type": "setCompleted",
          "externalId": "shopping-legacy",
          "appleReminderId": "apple-legacy",
          "title": "Café",
          "desiredCompleted": true,
          "expectedAppleModifiedAt": null,
          "attempts": 0,
          "createdAt": "2026-10-13T16:00:00Z"
        }
        """.data(using: .utf8)!

        let action = try JSONDecoder().decode(AppleAction.self, from: json)
        XCTAssertNil(action.notes)
        XCTAssertNil(action.url)
    }
}
