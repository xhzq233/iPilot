# iOS ETTrace Performance

Use this reference to capture a focused, symbolicated ETTrace profile from a USB-connected iOS device. The device must be connected via USB because ETTrace communicates with the on-device framework through PeerTalk over usbmuxd.

## Core Workflow

1. Pick one focused flow and define exact start and stop points.
2. Build the app for `iphoneos` with dSYM generation enabled.
3. Temporarily link ETTrace into the app target.
4. Install the app on the device.
5. Collect UUID-matched dSYMs for the app executable and embedded dynamic frameworks.
6. Launch the app by tapping the icon on the device home screen, not from Xcode.
7. Capture one launch or runtime trace.
8. Preserve the processed flamegraph JSON immediately after the run.
9. Analyze only the processed JSON and report artifacts, hotspots, and caveats.

Avoid broad "use the app for a while" captures. One trace should correspond to one user-visible flow.

## Setup

```bash
if [ -z "${RUN_DIR:-}" ]; then
  RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ipilot-ettrace.XXXXXX")"
fi
mkdir -p "$RUN_DIR"
brew install emergetools/homebrew-tap/ettrace
```

## Link ETTrace Into The App

Preferred options:

- Reuse an existing `ETTrace.xcframework` if the repo already vendors one.
- If none exists, build a device copy into `$RUN_DIR` from upstream ETTrace.
- Link the framework directly into the exact app target being profiled.
- Confirm launch logs print `Starting ETTrace`.

Build a device framework when needed:

```bash
ETTRACE_TAG="${ETTRACE_TAG:-v1.1.0}"
ETTRACE_SRC="$RUN_DIR/ETTrace-src"
if [ ! -d "$ETTRACE_SRC" ]; then
  git clone --depth 1 --branch "$ETTRACE_TAG" https://github.com/EmergeTools/ETTrace "$ETTRACE_SRC"
fi

rm -rf "$RUN_DIR/ETTrace-iphoneos.xcarchive" "$RUN_DIR/ETTrace.xcframework"
pushd "$ETTRACE_SRC" >/dev/null
xcodebuild archive \
  -scheme ETTrace \
  -archivePath "$RUN_DIR/ETTrace-iphoneos.xcarchive" \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
  INSTALL_PATH='Library/Frameworks' \
  SKIP_INSTALL=NO \
  CLANG_CXX_LANGUAGE_STANDARD=c++17

xcodebuild -create-xcframework \
  -framework "$RUN_DIR/ETTrace-iphoneos.xcarchive/Products/Library/Frameworks/ETTrace.framework" \
  -output "$RUN_DIR/ETTrace.xcframework"
popd >/dev/null
```

## Build The App

```bash
xcodebuild -scheme "$SCHEME" \
  -sdk iphoneos \
  -configuration Debug \
  -derivedDataPath "$RUN_DIR/build" \
  DWARF_DSYM_FOLDER_PATH="$RUN_DIR/build/dSYMs" \
  DEBUG_INFORMATION_FORMAT=dwarf-with-dsym \
  CODE_SIGN_IDENTITY="Apple Development" \
  build
```

Install to device:

```bash
ios-use install "$APP_PATH" --udid "$UDID"
```

## Symbolication Gate

Real device builds strip symbols. dSYMs are mandatory.

```bash
SKILL_DIR="<absolute path to iPilot skill>"
APP="<path-to-built-iphoneos-App.app>"
DSYMS="$RUN_DIR/dsyms"

"$SKILL_DIR/scripts/collect_ios_dsyms.sh" \
  --app "$APP" \
  --out-dir "$DSYMS" \
  --search-root "$(dirname "$APP")" \
  --search-root "$RUN_DIR/build" \
  --extra-dsym "$RUN_DIR/ETTrace-iphoneos.xcarchive/dSYMs/ETTrace.framework.dSYM"
```

Verify UUIDs match:

```bash
dwarfdump --uuid "$APP/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Info.plist")"
find "$DSYMS" -maxdepth 1 -type d -name '*.dSYM' -print -exec dwarfdump --uuid {} \;
```

## Capture

Launch traces:

```bash
cd "$RUN_DIR"
CAPTURE_MARKER="$RUN_DIR/.ettrace-capture-start"
: > "$CAPTURE_MARKER"
find "$RUN_DIR" -maxdepth 1 \( -name 'output.json' -o -name 'output_*.json' \) -delete
ettrace --launch --verbose --dsyms "$DSYMS"
```

Runtime flow traces:

```bash
cd "$RUN_DIR"
CAPTURE_MARKER="$RUN_DIR/.ettrace-capture-start"
: > "$CAPTURE_MARKER"
find "$RUN_DIR" -maxdepth 1 \( -name 'output.json' -o -name 'output_*.json' \) -delete
ettrace --verbose --dsyms "$DSYMS"
```

For multi-thread profiling, add `--multi-thread`.

## Preserve Outputs

```bash
PRESERVED_DIR="$(mktemp -d "$RUN_DIR/run-$(date +%Y%m%d-%H%M%S).XXXXXX")"
: > "$PRESERVED_DIR/summary.txt"
if [ ! -e "$CAPTURE_MARKER" ]; then
  echo "error: capture marker missing; start a fresh ETTrace capture before preserving outputs" >&2
  exit 1
fi
find "$RUN_DIR" -maxdepth 1 -name 'output_*.json' -newer "$CAPTURE_MARKER" -print | while IFS= read -r json; do
  preserved="$PRESERVED_DIR/${json##*/}"
  cp "$json" "$preserved"
  {
    echo "## ${preserved##*/}"
    python3 "$SKILL_DIR/scripts/analyze_flamegraph_json.py" "$preserved"
  } >> "$PRESERVED_DIR/summary.txt"
done
if [ ! -s "$PRESERVED_DIR/summary.txt" ]; then
  echo "error: no fresh processed ETTrace output JSON found in $RUN_DIR" >&2
  exit 1
fi
```

## Report

Report exact flow, build, device model/iOS version, run count, processed JSON paths, top active leaves, inclusive first-party stacks, dSYM completeness, and caveats such as thermal state, background activity, first-run setup, network variance, or low sample count.
