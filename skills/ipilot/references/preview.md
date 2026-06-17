# iOS Device Preview

Use the preview server to show live real-device screenshots with DOM element overlays in an IDE/browser panel.

## Start Preview

From the loaded skill folder:

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" serve
```

If `$SKILL_DIR` is not provided by the host IDE, replace it with the absolute path to `skills/ipilot`.

The server prints:

```text
  - Local:   http://localhost:3200
```

Keep the terminal alive while the preview is in use.

## How It Updates

- Manual refresh: click the preview page refresh button or call the hook command manually.
- Codex plugin mode: the repository root `hooks.json` runs the hook after Bash tool usage.
- Other IDEs: read `hooks.md`; the hook is optional and host-specific.

## Manual Snapshot Refresh

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" hook
```

The hook captures `ios-use screenshot --name snapshot` and `ios-use dom`, then writes the preview state under `~/.ipilot/`.

## Prerequisites

- `ios-use` CLI installed.
- `ios-use start <udid>` has selected an active real device.
- A real iPhone connected over USB with Developer Mode enabled.

## Notes

- The preview server is view-only; it does not send commands to the device.
- Drive the device with normal `ios-use` commands.
- If preview is stale, first check whether `ios-use dom` and `ios-use screenshot --name snapshot` work manually.
