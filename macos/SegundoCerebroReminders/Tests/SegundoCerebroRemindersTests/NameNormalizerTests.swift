import XCTest
@testable import SegundoCerebroReminders

final class NameNormalizerTests: XCTestCase {
    func testEquivalentNamesNormalizeTogether() {
        XCTAssertEqual(NameNormalizer.normalize(" Huevos "), NameNormalizer.normalize("huevos"))
        XCTAssertEqual(NameNormalizer.normalize("Café"), NameNormalizer.normalize("cafe"))
    }

    func testDistinctProductsRemainDistinct() {
        XCTAssertNotEqual(NameNormalizer.normalize("café"), NameNormalizer.normalize("café descafeinado"))
    }
}
