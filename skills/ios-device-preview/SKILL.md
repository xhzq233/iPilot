---
name: ios-device-preview
description: Start a real-device preview server that shows live screenshots and DOM overlays in the Codex browser panel.
---

# iOS Device Preview

Start the device preview server to show real-device screenshots with DOM element overlays in the Codex browser panel.

## Start Preview

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" serve
```

The server runs at `http://localhost:3200`. Open it in the Codex browser panel.

## How It Works

- **Automatic updates**: The plugin's `PostToolUse` hook automatically captures a screenshot and DOM tree after every `ios-use` action command (tap, swipe, input, longpress, home, etc.). The preview page updates via SSE — no manual refresh needed.
- **Manual refresh**: Click the "Refresh" button in the preview page, or the hook triggers automatically on any ios-use action.
- **DOM overlays**: Accessibility elements are drawn as semi-transparent boxes over the screenshot. Hover to see type, label, and ref.
- **Annotation**: Use Codex's native annotation feature to select elements in the preview and ask AI about them.

## Prerequisites

- `ios-use` CLI installed and a driver session started (`ios-use start`)
- A real iPhone connected via USB with Developer Mode enabled

## Notes

- The preview server is view-only — it does not send commands to the device.
- All ios-use commands are executed by the agent directly via Bash. The PostToolUse hook in `hooks.json` handles the screenshot+DOM capture transparently.
