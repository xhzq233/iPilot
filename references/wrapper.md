# ios-use Wrapper

Use the root iPilot wrapper for all `ios-use` calls made from this skill.

## Command

Run:

```bash
cd <path-to-this-skill-directory>
./ios-use <command>
```

Enter the skill directory first, the directory containing `SKILL.md` and the executable `ios-use`. Do not call the host `ios-use` binary directly from agent workflows. The root wrapper is intentionally named `./ios-use` so agents can invoke it quickly without PATH setup once they are in the skill directory.

```bash
./ios-use tap "通用"
./ios-use activateApp com.example.app --terminateExisting --log
./ios-use input --tap "搜索" --content "蓝牙" --dom
```

The wrapper finds the real `ios-use` in `PATH`. To force a specific binary for the wrapper only:

```bash
export IPILOT_IOS_USE_BIN="/absolute/path/to/ios-use"
```

## Behavior

The wrapper forwards command results from the real `ios-use`. It does not pass wrapper-specific environment variables to the real process.

If the real `ios-use` binary is not installed or cannot be found, the wrapper exits with code `127` and prints an install/configuration error.

`./ios-use start` only starts the iOS driver. It does not start Preview in the background. To open Preview, run:

```bash
./ios-use preview
```

The foreground preview command prints a serve-sim-style URL:

```text
  - Local:   http://localhost:3200/
  - Loopback: http://127.0.0.1:3200/
  - Network: use --host 0.0.0.0 to expose on http://<lan-ip>:3200/
```

`./ios-use preview` refreshes the current snapshot and stays running. Stop it with Ctrl-C.

For `./ios-use dom` and mutating UI commands that exit successfully, it refreshes the preview snapshot:

1. Run real `ios-use screenshot --name snapshot`.
2. Copy `~/.ios-use/artifacts/snapshot.jpg` to `~/.ipilot/snapshot.jpg`.
3. Reuse `./ios-use dom` stdout or the command's `--dom` stdout when it contains DOM bounds; otherwise run real `ios-use dom`.
4. Write the DOM to `~/.ipilot/snapshot.txt`.

Automatic refresh is silent. If the original command fails, the wrapper returns that failure and does not run extra refresh commands.

## Mutating Commands

Automatic refresh runs after:

- `activateApp`
- `dismissAlert`
- `flow`
- `home`
- `input`
- `launch`
- `longpress`
- `open`
- `openUrl`
- `swipe`
- `tap`
- `terminateApp`

Other commands are plain passthrough.

## Disable

```bash
export IPILOT_DISABLE_AUTO_PREVIEW=1
```

## Troubleshooting

- Wrapper cannot find real `ios-use`: install `ios-use`, move the wrapper earlier in `PATH` while keeping the real binary later, or set `IPILOT_IOS_USE_BIN`.
- Preview does not update: run `./ios-use dom` and `./ios-use screenshot --name snapshot` manually to find the device/session problem first.
- Need to verify which binary is used: run `command -v ios-use` and inspect `PATH`.
