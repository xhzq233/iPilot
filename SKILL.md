---
name: ipilot
description: Real-device iOS development and verification with ios-use, AltSign signing, live device preview, YAML flows, HTTP/HTTPS proxy capture, Simulator support, app logs, and ETTrace profiling. Use when a task needs to inspect or drive an iPhone UI, install or sign iOS apps, collect iOS logs/network traffic, show a live device preview, or profile launch/runtime performance on physical iOS hardware.
---

# iPilot

Use iPilot for iOS device automation and verification from an agent or IDE. Prefer DOM-first `ios-use` commands for UI state, screenshots only when visual evidence is required, and focused references for optional subsystems.

## References

- Installation, pinned versions, and download URLs: read `references/install.md`.
- IPA or `.app` signing with `altsign-cli`: read `references/altsign.md`.
- Live screenshot + DOM preview server: read `references/preview.md`.
- Portable `ios-use` wrapper for automatic preview refresh: read `references/wrapper.md`.
- YAML Flow authoring: read `references/flow.md`.
- HTTP/HTTPS proxy capture: read `references/proxy.md`.
- Simulator setup and troubleshooting: read `references/simulator.md`.
- Legacy NSLogger / `nslog`: read `references/nslog.md`.
- ETTrace real-device performance profiling: read `references/ettrace.md`.

## Core Setup

Install `ios-use`, then configure and start a real device:

```bash
curl -fsSL https://raw.githubusercontent.com/xhzq233/ios-use/main/scripts/install.sh | bash -s -- --version v1.2.5
ios-use devices
ios-use config --udid <udid>
ios-use start <udid>
```

If `ios-use devices` reports `driver update required`, run `ios-use config --udid <udid>` again before retrying UI actions. Real devices must be connected by USB and trusted; iOS 17+ is expected for the current driver path.

## Device Targeting

- `start` selects the current driver-backed device. Use `ios-use stop` before switching devices.
- `dom`, `tap`, `swipe`, `input`, `waitFor`, `screenshot`, `home`, `dismissAlert`, `flow`, and device-side proxy commands use the current driver lock; do not pass a separate `--udid`.
- `devices`, `config`, `install`, `uninstall`, `apps`, `ddi-mount`, `open`, `activateApp`, `terminateApp`, and `oslog` can take `--udid`. If omitted, some commands use the current driver lock.

## DOM-First Workflow

Observe, act, then confirm:

```bash
ios-use activateApp com.apple.Preferences
ios-use dom
ios-use waitFor --label "蓝牙" --timeout 8
ios-use tap "通用" --dom
ios-use input --tap "搜索" --content "蓝牙" --dom 300
```

Rules:

- Run `ios-use dom` after page transitions, scrolls, failed element lookup, or ambiguous state.
- Use labels/values as targets. Do not paste full DOM lines, traits text, or coordinates from the tree as labels.
- Use `screenshot` only for visual-only controls, layout checks, or explicit visual verification requests.
- Identify the cause before retrying failed commands; repeated retries without a state change usually preserve the same failure.

## App And Log Basics

```bash
ios-use activateApp com.example.app --terminateExisting --log
ios-use log-read --last 50
ios-use log-read --pattern "error|warning" --flags i --timeout 5
ios-use terminateApp com.example.app
```

Use `activateApp --terminateExisting --log` for app stdout/stderr and console-visible launch logs. Use `oslog` for broader unified logging:

```bash
ios-use oslog --process MyApp --timeout 10
ios-use oslog --pattern "error|failed" --flags i --timeout 10
```

## Install Apps

```bash
ios-use apps
ios-use ddi-mount --udid <udid>
ios-use install path/to/App.ipa --udid <udid>
ios-use install path/to/App.app --udid <udid>
ios-use uninstall com.example.app --udid <udid>
```

`ios-use install` expects a signed `.ipa` or `.app`. For free-Apple-ID signing or re-signing, read `references/altsign.md`.
