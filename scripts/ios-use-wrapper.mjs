#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = realpathSync(fileURLToPath(import.meta.url));
const SKILL_DIR = dirname(dirname(SCRIPT_PATH));
const WRAPPER_ROOT_PATH = realpathOrNull(join(SKILL_DIR, "ios-use"));
const IPILOT_DIR = join(homedir(), ".ipilot");
const DOM_PATH = join(IPILOT_DIR, "snapshot.txt");
const SCREENSHOT_PATH = join(IPILOT_DIR, "snapshot.jpg");
const DEVICE_PREVIEW_SCRIPT = join(SKILL_DIR, "scripts", "device-preview.mjs");
const PREVIEW_PORT = 3200;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

const MUTATING_COMMANDS = new Set([
  "activateApp",
  "dismissAlert",
  "flow",
  "home",
  "input",
  "launch",
  "longpress",
  "open",
  "openUrl",
  "swipe",
  "tap",
  "terminateApp",
]);

const OBSERVATION_REFRESH_COMMANDS = new Set([
  "dom",
]);

const KNOWN_COMMANDS = new Set([
  "activateApp",
  "apps",
  "config",
  "ddi-mount",
  "devices",
  "dismissAlert",
  "dom",
  "flow",
  "home",
  "input",
  "install",
  "launch",
  "log-read",
  "longpress",
  "nslog",
  "open",
  "openUrl",
  "oslog",
  "proxy",
  "screenshot",
  "start",
  "status",
  "stop",
  "swipe",
  "tap",
  "terminateApp",
  "uninstall",
  "waitFor",
]);

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function realpathOrNull(path) {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

function childEnv() {
  const env = { ...process.env };
  delete env.IPILOT_IOS_USE_BIN;
  delete env.IPILOT_IOS_USE_WRAPPER;
  delete env.IPILOT_IOS_USE_SUPPRESS_PREVIEW;
  delete env.IPILOT_DISABLE_AUTO_PREVIEW;
  return env;
}

function isWrapperPath(path) {
  const real = realpathOrNull(path);
  if (!real) return false;
  if (real === SCRIPT_PATH) return true;
  return Boolean(WRAPPER_ROOT_PATH && real === WRAPPER_ROOT_PATH);
}

function findRealIosUse() {
  if (process.env.IPILOT_IOS_USE_BIN) {
    if (!executable(process.env.IPILOT_IOS_USE_BIN)) return null;
    return isWrapperPath(process.env.IPILOT_IOS_USE_BIN) ? null : process.env.IPILOT_IOS_USE_BIN;
  }

  for (const dir of (process.env.PATH || "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, "ios-use");
    if (!executable(candidate)) continue;

    const real = realpathOrNull(candidate);
    if (!real) continue;
    if (real === SCRIPT_PATH) continue;
    if (WRAPPER_ROOT_PATH && real === WRAPPER_ROOT_PATH) continue;

    return candidate;
  }

  return null;
}

function commandName(args) {
  return args.find((arg) => KNOWN_COMMANDS.has(arg)) || "";
}

function hasDomOption(args) {
  return args.some((arg) => arg === "--dom" || arg.startsWith("--dom="));
}

function looksLikeDom(text) {
  return /\(\d+,\d+,\d+,\d+\)/.test(text);
}

function runPreviewCommand(realBin, args, options = {}) {
  return spawnSync(realBin, args, {
    encoding: options.encoding || "utf8",
    env: childEnv(),
    stdio: options.stdio || "pipe",
    timeout: options.timeout || 15000,
  });
}

function refreshPreview(realBin, stdoutText, canReuseDom) {
  mkdirSync(IPILOT_DIR, { recursive: true });

  try {
    runPreviewCommand(realBin, ["screenshot", "--name", "snapshot"], { stdio: "ignore" });
    const srcScreenshot = join(homedir(), ".ios-use", "artifacts", "snapshot.jpg");
    if (existsSync(srcScreenshot)) {
      copyFileSync(srcScreenshot, SCREENSHOT_PATH);
    }
  } catch {
    // Preview refresh must not change the wrapped command result.
  }

  try {
    if (canReuseDom && looksLikeDom(stdoutText)) {
      writeFileSync(DOM_PATH, stdoutText);
      return;
    }

    const dom = runPreviewCommand(realBin, ["dom"], { encoding: "utf8" });
    if (dom.status === 0 && typeof dom.stdout === "string" && dom.stdout.length > 0) {
      writeFileSync(DOM_PATH, dom.stdout);
    }
  } catch {
    // Preview refresh must not change the wrapped command result.
  }
}

function startPreviewServer() {
  if (process.env.IPILOT_DISABLE_AUTO_PREVIEW === "1") return;

  try {
    const child = spawn(process.execPath, [DEVICE_PREVIEW_SCRIPT, "serve", "--quiet"], {
      detached: true,
      env: childEnv(),
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Preview server startup must not change the wrapped command result.
  }
}

function printPreviewAddress() {
  console.log("");
  console.log(`  - Local:   ${PREVIEW_URL}`);
  const lanAddress = firstLanAddress();
  if (lanAddress) {
    console.log(`  - Network: use --host 0.0.0.0 to expose on http://${lanAddress}:${PREVIEW_PORT}`);
  }
  console.log("");
}

function firstLanAddress() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      return addr.address;
    }
  }
  return "";
}

function stopPreviewServer() {
  try {
    spawnSync(process.execPath, [DEVICE_PREVIEW_SCRIPT, "stop-server"], {
      env: childEnv(),
      stdio: "ignore",
      timeout: 2000,
    });
  } catch {
    // Preview server shutdown must not change the wrapped command result.
  }
}

function passthrough(realBin, args, onSuccess) {
  const child = spawn(realBin, args, {
    env: childEnv(),
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    if (code === 0 && onSuccess) {
      onSuccess();
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`iPilot ios-use wrapper failed to run ${realBin}: ${error.message}`);
    process.exit(127);
  });
}

function runAndRefresh(realBin, args) {
  const canReuseStdout = commandName(args) === "dom" || hasDomOption(args);
  if (!canReuseStdout) {
    passthrough(realBin, args, () => refreshPreview(realBin, "", false));
    return;
  }

  const stdoutChunks = [];
  const child = spawn(realBin, args, {
    env: childEnv(),
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    if (code === 0) {
      const stdoutText = Buffer.concat(stdoutChunks).toString("utf8");
      refreshPreview(realBin, stdoutText, true);
    }

    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`iPilot ios-use wrapper failed to run ${realBin}: ${error.message}`);
    process.exit(127);
  });
}

const args = process.argv.slice(2);
const realBin = findRealIosUse();

if (!realBin) {
  console.error(
    "iPilot ios-use wrapper could not find the real ios-use binary. " +
      "Install ios-use or set IPILOT_IOS_USE_BIN=/absolute/path/to/ios-use.",
  );
  process.exit(127);
}

const cmd = commandName(args);
const shouldRefresh =
  (MUTATING_COMMANDS.has(cmd) || OBSERVATION_REFRESH_COMMANDS.has(cmd)) &&
  process.env.IPILOT_DISABLE_AUTO_PREVIEW !== "1";

if (cmd === "start" && process.env.IPILOT_DISABLE_AUTO_PREVIEW !== "1") {
  passthrough(realBin, args, () => {
    startPreviewServer();
    printPreviewAddress();
    refreshPreview(realBin, "", false);
  });
} else if (cmd === "stop") {
  passthrough(realBin, args, stopPreviewServer);
} else if (!shouldRefresh) {
  passthrough(realBin, args);
} else {
  runAndRefresh(realBin, args);
}
