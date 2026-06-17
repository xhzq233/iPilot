# Installation And Downloads

Use this reference when installing iPilot dependencies in a fresh IDE or agent environment.

## Current Tool Pins

These versions were checked from upstream tags on 2026-06-16:

| Tool | Version | Repository | Download / install URL |
| --- | --- | --- | --- |
| `ios-use` | `v1.2.4` | `https://github.com/xhzq233/ios-use` | Installer: `https://raw.githubusercontent.com/xhzq233/ios-use/main/scripts/install.sh`; tag: `https://github.com/xhzq233/ios-use/releases/tag/v1.2.4`; source: `https://github.com/xhzq233/ios-use/archive/refs/tags/v1.2.4.tar.gz` |
| `altsign-cli` | `v0.1.3` | `https://github.com/xhzq233/altsign-cli` | Tag: `https://github.com/xhzq233/altsign-cli/releases/tag/v0.1.3`; source: `https://github.com/xhzq233/altsign-cli/archive/refs/tags/v0.1.3.tar.gz` |

Use pinned installs for reproducible agent behavior. Use upstream `main` only when deliberately testing newer behavior.

## Install ios-use

Apple Silicon macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/xhzq233/ios-use/main/scripts/install.sh | bash -s -- --version v1.2.4
```

Intel macOS or local rebuild:

```bash
curl -fsSL https://raw.githubusercontent.com/xhzq233/ios-use/main/scripts/install.sh | bash -s -- --version v1.2.4 --build-from-source
```

After installation:

```bash
ios-use devices
ios-use config --udid <udid>
ios-use start <udid>
```

If `ios-use devices` reports `driver update required`, rerun:

```bash
ios-use config --udid <udid>
```

## Install altsign-cli

`altsign-cli` is needed when signing or re-signing an IPA or `.app` with a free Apple ID.

```bash
brew install openssl
curl -L https://github.com/xhzq233/altsign-cli/archive/refs/tags/v0.1.3.tar.gz -o altsign-cli-v0.1.3.tar.gz
tar -xzf altsign-cli-v0.1.3.tar.gz
cd altsign-cli-0.1.3
./build.sh
```

The build produces `./altsign-cli`.

## Portable Skill Layout

For IDEs that understand skills but not Codex plugins, install only this folder:

```text
skills/ipilot/
├── SKILL.md
├── references/
└── scripts/
```

The optional Codex plugin files at repository root are not required for basic skill usage. The live preview hook is host-specific; read `hooks.md`.
