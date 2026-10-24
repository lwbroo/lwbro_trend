// swift-tools-version:5.9
import PackageDescription

// Existing cached 8.4.1 XCFrameworks; no network package resolution.
let package = Package(
    name: "CapacitorRuntime",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Capacitor", targets: ["Capacitor"]),
        .library(name: "Cordova", targets: ["Cordova"])
    ],
    targets: [
        .binaryTarget(name: "Capacitor", path: "Capacitor.xcframework"),
        .binaryTarget(name: "Cordova", path: "Cordova.xcframework")
    ]
)
