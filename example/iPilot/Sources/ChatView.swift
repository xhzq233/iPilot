import SwiftUI

// MARK: - Message Model
struct ChatMessage: Identifiable {
    let id = UUID()
    let content: String
    let isFromCurrentUser: Bool
    let timestamp: String
}

// MARK: - Mock Data
struct MockChatData {
    static let messages: [ChatMessage] = [
        ChatMessage(content: "Hey! 👋 看到你最近在做 iOS 自动化的项目？", isFromCurrentUser: false, timestamp: "10:23"),
        ChatMessage(content: "对，在用 iPilot，挺有意思的", isFromCurrentUser: true, timestamp: "10:24"),
        ChatMessage(content: "iPilot？那是什么？", isFromCurrentUser: false, timestamp: "10:24"),
        ChatMessage(content: "一个可以在 IDE 里直接操控真机的工具，DOM-first 的方式，不用写脆弱的坐标", isFromCurrentUser: true, timestamp: "10:25"),
        ChatMessage(content: "听起来很酷！能实时看设备屏幕吗？", isFromCurrentUser: false, timestamp: "10:25"),
        ChatMessage(content: "可以，还有 live preview，每次操作后自动刷新截图和 DOM 树", isFromCurrentUser: true, timestamp: "10:26"),
        ChatMessage(content: "🔥 那比 XCUITest 方便多了啊", isFromCurrentUser: false, timestamp: "10:26"),
        ChatMessage(content: "而且支持 YAML flow，可以把测试脚本化，重复运行", isFromCurrentUser: true, timestamp: "10:27"),
        ChatMessage(content: "求分享链接！我也想试试 🚀", isFromCurrentUser: false, timestamp: "10:27"),
    ]

    static let contactName = "Sarah Chen"
    static let contactHandle = "@sarahchen"
}

// MARK: - Chat View
struct ChatView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var inputText = ""
    @State private var messages = MockChatData.messages

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().background(Color.surfaceHighlight)
            messageList
            Divider().background(Color.surfaceHighlight)
            inputBar
        }
        .background(Color.surface.ignoresSafeArea())
    }

    // MARK: - Header
    private var header: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.accent)
            }

            AsyncImage(url: URL(string: "https://i.pravatar.cc/100?img=47")) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    Circle().fill(Color.surfaceHighlight)
                }
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 0) {
                Text(MockChatData.contactName)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text(MockChatData.contactHandle)
                    .font(.system(size: 13))
                    .foregroundColor(.textTertiary)
            }

            Spacer()

            Button {
                // more action
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.accent)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 56)
        .padding(.bottom, 12)
        .background(Color.surface)
    }

    // MARK: - Message List
    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 4) {
                    ForEach(messages) { message in
                        MessageBubble(message: message)
                            .id(message.id)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 16)
            }
            .onAppear {
                if let last = messages.last {
                    proxy.scrollTo(last.id, anchor: .bottom)
                }
            }
        }
        .background(Color.surface)
    }

    // MARK: - Input Bar
    private var inputBar: some View {
        HStack(spacing: 8) {
            Button {
                // media action
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.accent)
            }

            HStack(spacing: 8) {
                TextField("开始新消息...", text: $inputText)
                    .font(.system(size: 15))
                    .foregroundColor(.textPrimary)
                    .tint(.accent)

                if !inputText.isEmpty {
                    Button {
                        sendMessage()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.accent)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.surfaceLight)
            .clipShape(Capsule())
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.surface)
        .padding(.bottom, 24)
    }

    private func sendMessage() {
        guard !inputText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let newMessage = ChatMessage(
            content: inputText,
            isFromCurrentUser: true,
            timestamp: DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)
        )
        messages.append(newMessage)
        inputText = ""
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .bottom, spacing: 6) {
            if message.isFromCurrentUser {
                Spacer(minLength: 40)
            } else {
                avatar
            }

            VStack(alignment: message.isFromCurrentUser ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(message.isFromCurrentUser ? .white : .textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background {
                        if message.isFromCurrentUser {
                            LinearGradient(colors: [.accent, .accent.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                        } else {
                            Color.surfaceLight
                        }
                    }
                    .clipShape(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                    )

                Text(message.timestamp)
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
                    .padding(.horizontal, 4)
            }

            if !message.isFromCurrentUser {
                Spacer(minLength: 40)
            }
        }
        .padding(.vertical, 2)
    }

    private var avatar: some View {
        AsyncImage(url: URL(string: "https://i.pravatar.cc/100?img=47")) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Circle().fill(Color.surfaceHighlight)
            }
        }
        .frame(width: 28, height: 28)
        .clipShape(Circle())
    }
}