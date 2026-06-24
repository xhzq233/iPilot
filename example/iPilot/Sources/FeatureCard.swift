import SwiftUI

struct FeatureCard: View {
    let feature: Feature
    let index: Int

    @State private var isExpanded = false
    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(feature.color.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: feature.icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(feature.color)
                }

                // Titles
                VStack(alignment: .leading, spacing: 2) {
                    Text(feature.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text(feature.subtitle)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                // Expand chevron
                Image(systemName: "chevron.down")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.textTertiary)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    .animation(.spring(response: 0.35, dampingFraction: 0.7), value: isExpanded)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    isExpanded.toggle()
                }
            }

            // Expanded detail
            if isExpanded {
                VStack(spacing: 0) {
                    Divider()
                        .background(Color.surfaceHighlight)
                        .padding(.horizontal, 16)

                    Text(feature.description)
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color.surfaceLight)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.surfaceHighlight, lineWidth: 1)
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .onAppear {
            withAnimation(.easeOut(duration: 0.4).delay(Double(index) * 0.08)) {
                appeared = true
            }
        }
    }
}