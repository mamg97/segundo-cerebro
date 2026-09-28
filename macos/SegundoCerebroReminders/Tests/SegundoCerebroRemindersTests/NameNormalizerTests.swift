import Testing
@testable import SegundoCerebroReminders

@Test func equivalentNamesNormalizeTogether() {
    #expect(NameNormalizer.normalize(" Huevos ") == NameNormalizer.normalize("huevos"))
    #expect(NameNormalizer.normalize("Café") == NameNormalizer.normalize("cafe"))
}

@Test func distinctProductsRemainDistinct() {
    #expect(NameNormalizer.normalize("café") != NameNormalizer.normalize("café descafeinado"))
}
