# iPilot Example

This is a small SwiftUI demo app used to preview iPilot on an iOS real device.

The app shows a promotional landing screen and a simple chat-style screen that can be driven with iPilot/ios-use. It is intentionally lightweight so it can be installed, opened, inspected with DOM, and captured through the iPilot preview server.

## Requirements

- macOS with Xcode installed.
- A USB-connected iPhone configured for development.
- iPilot loaded as a skill in your AI agent or IDE.
- `ios-use` installed through iPilot.
- Optional: `xcodegen`, only if you want to regenerate `iPilot.xcodeproj` from `project.yml`.

## Run With iPilot

From the iPilot skill directory:

```bash
./ios-use status
./ios-use config --udid <udid>
./ios-use start <udid>
```

Build or sign the example app, then install it:

```bash
./ios-use install example/build/Build/Products/Debug-iphoneos/iPilot.app --udid <udid>
```

Open the app and refresh preview:

```bash
./ios-use activateApp com.ipilot.app --terminateExisting --log
./ios-use dom
```

The preview server starts when `./ios-use start` succeeds. To open Codex side Preview, keep a foreground preview session running:

```bash
./ios-use preview
```

Open:

```text
http://localhost:3200
```

## Build From Source

You can open `example/iPilot.xcodeproj` directly in Xcode and build the `iPilot` target for a connected device.

If you change `project.yml`, regenerate the project first:

```bash
cd example
xcodegen generate
```

Then build from Xcode, or with `xcodebuild`:

```bash
xcodebuild \
  -project iPilot.xcodeproj \
  -scheme iPilot \
  -configuration Debug \
  -sdk iphoneos \
  -derivedDataPath build \
  build
```

## Suggested AI Chat Flow

Use this example as the first demo after installing iPilot:

```text
Add https://github.com/xhzq233/iPilot as a skill.
What can iPilot do?
Install the iPilot dependencies and prepare my connected iPhone.
Build and run the example app in the iPilot repository.
Open the iPilot preview so I can take a screenshot.
```

## Notes

- `build/` and signed `.ipa` files are local artifacts and are ignored by git.
- Bundle identifier: `com.ipilot.app`.
- The app is portrait-only and optimized for iPhone screenshots.
