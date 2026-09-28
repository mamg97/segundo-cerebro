// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SegundoCerebroReminders",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "SegundoCerebroReminders", targets: ["SegundoCerebroReminders"])
    ],
    targets: [
        .executableTarget(
            name: "SegundoCerebroReminders",
            linkerSettings: [
                .linkedFramework("EventKit"),
                .linkedFramework("Security")
            ]
        ),
        .testTarget(
            name: "SegundoCerebroRemindersTests",
            dependencies: ["SegundoCerebroReminders"]
        )
    ],
    swiftLanguageModes: [.v5]
)
