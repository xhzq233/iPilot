import SwiftUI

struct ContentView: View {
    @State private var scrollOffset: CGFloat = 0
    @State private var showChat = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.surface.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroSection
                        featuresSection
                        footerSection
                    }
                    .background(
                        GeometryReader { geo in
                            Color.clear.preference(
                                key: ScrollOffsetKey.self,
                                value: geo.frame(in: .named("scroll")).minY
                            )
                        }
                    )
                }
                .coordinateSpace(name: "scroll")
                .onPreferenceChange(ScrollOffsetKey.self) { value in
                    scrollOffset = value
                }

                // Nav bar
                navBar
            }
            .statusBar(hidden: true)
            .navigationDestination(isPresented: $showChat) {
                ChatView()
                    .navigationBarBackButtonHidden(true)
            }
        }
    }

    // MARK: - Nav Bar
    private var navBar: some View {
        let opacity = min(max(-scrollOffset / 60, 0), 1)
        return VStack(spacing: 0) {
            HStack {
                Text("iPilot")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.textPrimary)
                    .opacity(opacity)

                Spacer()

                Image(systemName: "iphone.gen3")
                    .font(.system(size: 16))
                    .foregroundColor(.accent)
                    .opacity(opacity)
            }
            .padding(.horizontal, 20)
            .padding(.top, 56)
            .padding(.bottom, 12)

            Divider()
                .background(Color.surfaceHighlight)
                .opacity(opacity * 0.5)
        }
        .background(Color.surface.opacity(opacity))
        .ignoresSafeArea(.all, edges: .top)
    }

    // MARK: - Hero Section
    private var heroSection: some View {
        VStack(spacing: 0) {
            Spacer().frame(height: 80)

            Spacer().frame(height: 40)

            // Logo text
            Text("iPilot")
                .font(.system(size: 52, weight: .heavy, design: .rounded))
                .foregroundStyle(LinearGradient.hero)
                .tracking(-1)

            Spacer().frame(height: 8)

            Text("iOS Device Automation\nfrom Your IDE")
                .font(.system(size: 20, weight: .regular))
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Spacer().frame(height: 28)

            // CTA Button
            HStack(spacing: 8) {
                Image(systemName: "terminal")
                    .font(.system(size: 14, weight: .medium))
                Text("./ios-use start")
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 13)
            .background(
                LinearGradient.hero
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            .shadow(color: .accent.opacity(0.3), radius: 20, y: 8)
            .onTapGesture {
                showChat = true
            }

            Spacer().frame(height: 12)

            Text("DOM-first · Real device · Scriptable")
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.textTertiary)

            Spacer().frame(height: 40)

            // Scroll indicator
            Image(systemName: "chevron.down")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.textTertiary)
                .opacity(0.6)
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 32)
    }

    // MARK: - Features Section
    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Section header
            VStack(alignment: .leading, spacing: 4) {
                Text("Capabilities")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.textPrimary)

                Text("Everything you need for iOS device automation")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.textTertiary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 4)

            ForEach(Array(Feature.all.enumerated()), id: \.element.id) { index, feature in
                FeatureCard(feature: feature, index: index)
                    .padding(.horizontal, 20)
            }
        }
        .padding(.bottom, 32)
    }

    // MARK: - Footer
    private var footerSection: some View {
        VStack(spacing: 8) {
            Divider()
                .background(Color.surfaceHighlight)

            Text("Built with ios-use & Virtualization.framework")
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.textTertiary)

            Text("© 2026 iPilot")
                .font(.system(size: 11, weight: .regular))
                .foregroundColor(.textTertiary.opacity(0.6))

            Spacer().frame(height: 40)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Scroll Preference Key
struct ScrollOffsetKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}