# Hook Integration

The hook is convenience glue, not part of the portable skill contract.

## Codex Plugin Mode

When this repository is installed as a Codex plugin, root `hooks.json` registers a `PostToolUse` hook for Bash. After matching `ios-use` action commands, Codex runs:

```bash
node "${PLUGIN_ROOT:-$PLUGIN_DIR}/skills/ipilot/scripts/device-preview.mjs" hook
```

The hook reads the tool payload from stdin, checks whether the Bash command contains an `ios-use` UI action, then refreshes `~/.ipilot/snapshot.jpg` and `~/.ipilot/snapshot.txt`.

## Portable Skill Mode

When another IDE installs only `skills/ipilot`, do not require this hook. Agents can still use:

```bash
node "$SKILL_DIR/scripts/device-preview.mjs" serve
node "$SKILL_DIR/scripts/device-preview.mjs" hook
```

If the IDE supports post-command hooks, configure its equivalent of:

```bash
node "<absolute-path-to-skills/ipilot>/scripts/device-preview.mjs" hook
```

The IDE must pipe a JSON payload containing either `tool_input.command` or `tool_input.cmd`. If it cannot provide that payload shape, skip automatic updates and use manual refresh.

## Design Decision

Keep `hooks.json` at the plugin root for Codex compatibility. Keep hook usage documented in this reference for other IDEs. Do not put `hooks.json` inside the skill as required behavior, because most skill hosts do not share a hook schema.

## Troubleshooting

- Preview server is running but not updating: run the hook command manually and then refresh `http://localhost:3200`.
- Hook runs but produces no snapshot: run `ios-use dom` and `ios-use screenshot --name snapshot` manually to find the device/session problem first.
- Hook path fails after restructuring: verify it points to `skills/ipilot/scripts/device-preview.mjs`.
