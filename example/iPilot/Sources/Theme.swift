import SwiftUI

// MARK: - Design Tokens
extension Color {
    static let accent = Color(red: 0.35, green: 0.6, blue: 1.0)       // #5B99FF
    static let accentSecondary = Color(red: 0.6, green: 0.35, blue: 1.0) // #995BFF
    static let surface = Color(red: 0.08, green: 0.09, blue: 0.11)    // #15171C
    static let surfaceLight = Color(red: 0.13, green: 0.14, blue: 0.17) // #212429
    static let surfaceHighlight = Color(red: 0.18, green: 0.19, blue: 0.22) // #2E3136
    static let textPrimary = Color(red: 0.92, green: 0.93, blue: 0.95)  // #EBEDEF
    static let textSecondary = Color(red: 0.62, green: 0.63, blue: 0.67) // #9EA1A8
    static let textTertiary = Color(red: 0.42, green: 0.43, blue: 0.47)  // #6B6E76
    static let positive = Color(red: 0.2, green: 0.84, blue: 0.52)     // #33D784
    static let warning = Color(red: 1.0, green: 0.73, blue: 0.22)      // #FFBA38
    static let destructive = Color(red: 1.0, green: 0.27, blue: 0.27)  // #FF4545
}

// MARK: - Gradient Presets
extension LinearGradient {
    static let hero = LinearGradient(
        colors: [.accent, .accentSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cardBackground = LinearGradient(
        colors: [.surfaceLight, .surface],
        startPoint: .top,
        endPoint: .bottom
    )
}

// MARK: - Feature Model
struct Feature: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let subtitle: String
    let description: String
    let color: Color
}

// MARK: - Feature Data
extension Feature {
    static let all: [Feature] = [
        Feature(
            icon: "iphone.gen3.radiowaves.left.and.right",
            title: "Real Device Automation",
            subtitle: "DOM-first UI control",
            description: "Drive physical iOS devices from your IDE using structured DOM queries. Tap, swipe, input, and wait for elements with precise label-based targeting—no fragile coordinates.",
            color: .accent
        ),
        Feature(
            icon: "eye",
            title: "Live Preview",
            subtitle: "Real-time device mirroring",
            description: "Stream live screenshots and DOM snapshots from your device directly into the IDE panel. See exactly what the device sees, updated after every mutating command.",
            color: .positive
        ),
        Feature(
            icon: "square.3.layers.3d",
            title: "App Lifecycle",
            subtitle: "Install, launch, inspect",
            description: "Install signed IPAs or .app bundles, activate with stdout/stderr capture, filter logs by pattern or process, and terminate cleanly. Full control over the app lifecycle.",
            color: .accentSecondary
        ),
        Feature(
            icon: "flowchart",
            title: "YAML Flows",
            subtitle: "Scriptable automation",
            description: "Author repeatable test scenarios as YAML. Define sequences of tap, input, wait, and assert steps. Replay across devices without changing a single line.",
            color: .warning
        ),
        Feature(
            icon: "shield",
            title: "Network Capture",
            subtitle: "HTTP/HTTPS proxy",
            description: "Route device traffic through an integrated proxy. Inspect requests, responses, and headers in real time. Perfect for API debugging and reverse engineering.",
            color: .destructive
        ),
        Feature(
            icon: "chart.bar.xaxis",
            title: "Performance Profiling",
            subtitle: "ETTrace integration",
            description: "Profile launch time, CPU, GPU, and memory with ETTrace. Identify bottlenecks with instrument-grade data, all triggered from the command line.",
            color: .positive
        ),
    ]
}