# iOS Device Preview

Use the preview server to show live real-device screenshots with DOM element overlays in an IDE/browser panel.

## Start Preview

From the loaded skill folder:

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" serve
```

If `$SKILL_DIR` is not provided by the IDE, replace it with the absolute path to this skill directory.

The server prints:

```text
  - Local:   http://localhost:3200
  - Network: use --host 0.0.0.0 to expose on http://<lan-ip>:3200
```

Keep the terminal alive while the preview is in use. In normal agent workflows, `./ios-use start` starts this server automatically in the background, prints the same local preview URL in the current terminal so Codex can open the side Preview, and `./ios-use stop` exits it.

## How It Updates

- Manual refresh: click the preview page refresh button or call the refresh command manually.
- Automatic server lifecycle: `./ios-use start` starts the preview server; `./ios-use stop` stops it.
- Automatic snapshot refresh: `./ios-use dom` and mutating `./ios-use` commands refresh screenshot and DOM after success.

## Manual Snapshot Refresh

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" refresh
```

The refresh command captures real `ios-use screenshot --name snapshot` and real `ios-use dom`, then writes the preview state under `~/.ipilot/`.

## Prerequisites

- `ios-use` CLI installed.
- `./ios-use start <udid>` has selected an active real device.
- A real iPhone connected over USB with Developer Mode enabled.

## Notes

- The preview server is view-only; it does not send commands to the device.
- Drive the device with normal `ios-use` commands.
- If preview is stale, first check whether `./ios-use dom` and `./ios-use screenshot --name snapshot` work manually.
