#!/usr/bin/env node
// device-preview.mjs - iPilot preview helper
// 角色 1: Preview HTTP server (fs.watch -> SSE -> screenshot+DOM overlay)
// 角色 2: Manual snapshot refresh

import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, networkInterfaces } from "node:os";

const IPILOT_DIR = join(homedir(), ".ipilot");
const SCREENSHOT_PATH = join(IPILOT_DIR, "snapshot.jpg");
const DOM_PATH = join(IPILOT_DIR, "snapshot.txt");
const PID_PATH = join(IPILOT_DIR, "preview.pid");
const PORT = 3200;
const LOCALHOST_PREVIEW_URL = `http://localhost:${PORT}/`;
const LOOPBACK_PREVIEW_URL = `http://127.0.0.1:${PORT}/`;

function previewAddressLines() {
  const lines = [
    "",
    `  - Local:   ${LOCALHOST_PREVIEW_URL}`,
    `  - Loopback: ${LOOPBACK_PREVIEW_URL}`,
  ];
  const lanAddress = firstLanAddress();
  if (lanAddress) {
    lines.push(`  - Network: use --host 0.0.0.0 to expose on http://${lanAddress}:${PORT}/`);
  }
  lines.push("");
  return lines;
}

function printPreviewAddress() {
  for (const line of previewAddressLines()) {
    console.log(line);
  }
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

function refreshSnapshot() {
  mkdirSync(IPILOT_DIR, { recursive: true });

  try {
    // 截图
    execSync(`ios-use screenshot --name snapshot`, { stdio: "ignore", timeout: 15000 });
    // ios-use 默认保存到 ~/.ios-use/artifacts/snapshot.jpg，复制到 ~/.ipilot/
    const srcScreenshot = join(homedir(), ".ios-use", "artifacts", "snapshot.jpg");
    if (existsSync(srcScreenshot)) {
      writeFileSync(SCREENSHOT_PATH, readFileSync(srcScreenshot));
    }
  } catch { /* screenshot 失败不阻塞 */ }

  try {
    // DOM
    const domOutput = execSync(`ios-use dom`, { timeout: 15000, encoding: "utf-8" });
    writeFileSync(DOM_PATH, domOutput);
  } catch { /* dom 失败不阻塞 */ }
}

function readPreviewPid() {
  try {
    const pid = Number.parseInt(readFileSync(PID_PATH, "utf-8").trim(), 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function removePidFileIfOwned() {
  const pid = readPreviewPid();
  if (pid !== process.pid) return;
  try { unlinkSync(PID_PATH); } catch {}
}

function stopServer() {
  const pid = readPreviewPid();
  if (!pid) return;

  try {
    process.kill(pid, "SIGTERM");
  } catch {}

  try { unlinkSync(PID_PATH); } catch {}
}

// ────────────────────────────────────────
// 角色 2: Preview Server
// ────────────────────────────────────────

function startServer(options = {}) {
  const quiet = options.quiet === true;
  mkdirSync(IPILOT_DIR, { recursive: true });

  const existingPid = readPreviewPid();
  if (existingPid && existingPid !== process.pid && isAlive(existingPid)) {
    if (!quiet) {
      printPreviewAddress();
    }
    return;
  }
  if (existingPid && !isAlive(existingPid)) {
    try { unlinkSync(PID_PATH); } catch {}
  }

  const clients = new Set();
  let version = 0;

  // 监听文件变化
  for (const file of ["snapshot.jpg", "snapshot.txt"]) {
    const fp = join(IPILOT_DIR, file);
    if (!existsSync(fp)) writeFileSync(fp, "");
    try {
      watch(fp, () => {
        version++;
        for (const res of clients) {
          res.write(`event: update\ndata: ${JSON.stringify({ version })}\n\n`);
        }
      });
    } catch { /* watch 失败忽略 */ }
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // SSE 事件流
    if (url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(`data: ${JSON.stringify({ version })}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    // 截图原图
    if (url.pathname === "/screenshot") {
      try {
        const img = readFileSync(SCREENSHOT_PATH);
        res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-cache" });
        res.end(img);
      } catch {
        res.writeHead(404);
        res.end("No screenshot");
      }
      return;
    }

    // DOM 文本
    if (url.pathname === "/dom") {
      try {
        const dom = readFileSync(DOM_PATH, "utf-8");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
        res.end(dom);
      } catch {
        res.writeHead(404);
        res.end("No DOM");
      }
      return;
    }

    // 手动刷新
    if (url.pathname === "/refresh" && req.method === "POST") {
      refreshSnapshot();
      res.writeHead(200);
      res.end("ok");
      return;
    }

    // Preview HTML 页面
    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(PREVIEW_HTML);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      process.exit(0);
    }

    if (!quiet) {
      console.error(error?.message || String(error));
    }
    process.exit(1);
  });

  const shutdown = () => {
    removePidFileIfOwned();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("exit", removePidFileIfOwned);

  server.listen(PORT, () => {
    writeFileSync(PID_PATH, `${process.pid}\n`);
    if (!quiet) {
      printPreviewAddress();
    }
  });
}

// ────────────────────────────────────────
// Preview HTML (serve-sim 风格: iPhone Chrome + DOM/Frame 切换 + 缩放)
// ────────────────────────────────────────

const PREVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iPilot Device Preview</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #0d1117; color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  display: flex; flex-direction: column; height: 100vh; overflow: hidden;
}

/* ─── Floating HUD ─── */
.floating-status,
.floating-controls,
.zoom-ctrl {
  position: fixed; z-index: 20;
  display: flex; align-items: center;
  background: rgba(28,28,30,0.78);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 24px rgba(0,0,0,0.28);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
.floating-status {
  top: 10px; left: 10px;
  gap: 6px; height: 30px; padding: 0 10px;
  border-radius: 8px;
  font-size: 11px; font-family: monospace;
  color: rgba(255,255,255,0.78);
}
.floating-controls {
  top: 10px; right: 10px;
  gap: 3px; padding: 3px;
  border-radius: 8px;
}
.hud-btn {
  background: transparent; border: none; padding: 6px; border-radius: 6px;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.82); transition: background 0.15s, color 0.15s;
}
.hud-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.hud-btn svg { width: 18px; height: 18px; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #4ade80;
  transition: background 0.3s;
}
.dot.disconnected { background: #ef4444; }
.dot.refreshing { background: #facc15; }
.zoom-ctrl {
  bottom: 10px; right: 10px;
  gap: 4px; padding: 3px;
  border-radius: 8px;
  font-size: 11px; font-family: monospace; color: #8b949e;
}
.zoom-ctrl button {
  background: transparent; border: none; color: #e6edf3;
  width: 22px; height: 22px; border-radius: 4px; cursor: pointer;
  font-size: 13px; line-height: 1; display: inline-flex; align-items: center; justify-content: center;
}
.zoom-ctrl button:hover { background: rgba(255,255,255,0.15); }

/* ─── Viewport ─── */
.viewport {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 0; min-width: 0; overflow: auto; padding: 16px;
}

/* ─── Device container ─── */
.device-container {
  position: relative; background: #000;
  border-radius: 32px; overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.device-container .screen-surface {
  position: relative; overflow: hidden;
}
.device-container .screen-surface img {
  display: block;
  height: calc(100vh - 32px);
  width: auto;
  user-select: none; -webkit-user-drag: none;
}
.device-container .screen-surface .placeholder {
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 8px; aspect-ratio: 402/874;
  color: #484f58; font-size: 13px; font-family: monospace; background: #161b22;
}

/* ─── DOM overlay ─── */
.dom-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: auto; transition: opacity 0.2s;
}
.dom-box {
  position: absolute;
  display: block;
  margin: 0; padding: 0;
  background: transparent;
  border: 1.5px solid transparent;
  border-radius: 3px;
  color: transparent;
  appearance: none; -webkit-appearance: none;
  pointer-events: auto; cursor: pointer;
  font-size: 0;
  outline: none;
}
.dom-box:hover, .dom-box:focus-visible {
  background: rgba(59,130,246,0.12);
  border-color: rgba(59,130,246,0.85);
  box-shadow: 0 0 0 1px rgba(59,130,246,0.45);
}

/* ─── Tooltip (智能定位) ─── */
.dom-tooltip {
  position: fixed; z-index: 1000; pointer-events: none; display: none;
  background: #1c1c1e; color: #e6edf3;
  border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
  padding: 6px 10px; font-size: 11px; font-family: 'SF Mono', ui-monospace, monospace;
  max-width: 320px; white-space: pre-wrap; line-height: 1.5;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}
.tt-label { color: #e6edf3; font-weight: 500; }
.tt-traits { color: #8b949e; }
.tt-bounds { color: #58a6ff; font-size: 10px; display: block; margin-top: 2px; }
</style>
</head>
<body>

<div class="floating-status">
  <span class="dot" id="dot"></span><span id="statusText">connecting</span>
</div>
<div class="floating-controls">
  <button class="hud-btn" id="btnRefresh" title="Refresh" onclick="refresh()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  </button>
</div>
<div class="zoom-ctrl">
  <button onclick="zoomOut()">−</button>
  <span id="zoomLabel">80%</span>
  <button onclick="zoomIn()">+</button>
  <button onclick="zoomFit()">Fit</button>
</div>

<!-- Viewport -->
<div class="viewport" id="viewport">
  <div class="device-container" id="deviceContainer">
    <div class="screen-surface" id="screenSurface">
      <div class="placeholder" id="placeholder">
        <svg width="32" height="32" fill="none" stroke="#484f58" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Waiting for screenshot...</span>
      </div>
      <img id="screenshot" style="display:none" alt="Device screenshot">
      <div class="dom-overlay" id="overlay"></div>
    </div>
  </div>
</div>

<div class="dom-tooltip" id="tooltip"></div>

<script>
const img = document.getElementById('screenshot');
const placeholder = document.getElementById('placeholder');
const overlay = document.getElementById('overlay');
const tooltip = document.getElementById('tooltip');
const statusText = document.getElementById('statusText');
const dot = document.getElementById('dot');
const deviceContainer = document.getElementById('deviceContainer');

let currentVersion = -1;
let zoomLevel = 80;

// ─── Zoom ───
function updateZoom() {
  var baseH = window.innerHeight - 32;
  img.style.height = (baseH * zoomLevel / 100) + 'px';
  document.getElementById('zoomLabel').textContent = zoomLevel + '%';
  // 缩放后重新定位 DOM 框
  setTimeout(function() { loadDom(); }, 50);
}
function zoomIn() { zoomLevel = Math.min(200, zoomLevel + 20); updateZoom(); }
function zoomOut() { zoomLevel = Math.max(40, zoomLevel - 20); updateZoom(); }
function zoomFit() { zoomLevel = 100; updateZoom(); }

// ─── Data loading ───
function loadScreenshot() {
  const newImg = new Image();
  newImg.onload = () => { img.src = newImg.src; img.style.display = 'block'; placeholder.style.display = 'none'; };
  newImg.src = '/screenshot?t=' + Date.now();
}

async function loadDom() {
  try {
    const res = await fetch('/dom?t=' + Date.now());
    if (!res.ok) return;
    renderDomOverlay(await res.text());
  } catch {}
}

// ─── DOM parsing ───
function parseDomTree(text) {
  const elements = [];
  const lines = text.split('\\n');
  const boundsRe = /\\((\\d+),(\\d+),(\\d+),(\\d+)\\)/;
  const typeRe = /\\[([^\\]]+)\\]/;
  for (const line of lines) {
    const bm = line.match(boundsRe);
    if (!bm) continue;
    const typeMatch = line.match(typeRe);
    const traits = typeMatch ? typeMatch[1] : '';
    if (traits.includes('invisible')) continue;
    const beforeType = line.substring(0, typeMatch ? typeMatch.index : line.length);
    const label = beforeType.replace(/^[\\s-]+/, '').trim();
    elements.push({ traits, label, x: +bm[1], y: +bm[2], w: +bm[3], h: +bm[4] });
  }
  return elements;
}

// ─── DOM overlay rendering ───
function renderDomOverlay(text) {
  overlay.innerHTML = '';
  if (!img.naturalWidth) return;
  const elements = parseDomTree(text);
  if (!elements.length) return;

  // 用根元素 bounds 作为逻辑屏幕尺寸（第一个匹配到 bounds 的元素）
  const logicalW = elements[0].w || 402;
  const logicalH = elements[0].h || 874;
  const scaleX = img.clientWidth / logicalW;
  const scaleY = img.clientHeight / logicalH;

  // 过滤不可见后，按面积从大到小排序：大元素先渲染（底层），小元素后渲染（顶层接收事件）
  const sorted = elements.filter(el => {
    if (el.w < 2 || el.h < 2) return false;
    // 去掉等于屏幕尺寸的全屏容器
    if (el.x === 0 && el.y === 0 && el.w === logicalW && el.h === logicalH) return false;
    return true;
  });
  sorted.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  for (const el of sorted) {
    const box = document.createElement('button');
    const annotation = annotationText(el);
    box.className = 'dom-box';
    box.type = 'button';
    box.setAttribute('aria-label', annotation);
    box.dataset.ipilotLabel = el.label;
    box.dataset.ipilotTraits = el.traits;
    box.dataset.ipilotBounds = '(' + el.x + ', ' + el.y + ', ' + el.w + ', ' + el.h + ')';
    box.dataset.codexAnnotation = annotation;
    box.style.left = (el.x * scaleX) + 'px';
    box.style.top = (el.y * scaleY) + 'px';
    box.style.width = (el.w * scaleX) + 'px';
    box.style.height = (el.h * scaleY) + 'px';
    box.addEventListener('click', (e) => {
      e.preventDefault();
      box.focus();
    });

    box.addEventListener('mouseenter', () => {
      let html = '';
      if (el.label) html += '<span class="tt-label">' + esc(el.label) + '</span>';
      if (el.traits) html += ' <span class="tt-traits">[' + esc(el.traits) + ']</span>';
      html += '<span class="tt-bounds">(' + el.x + ', ' + el.y + ', ' + el.w + ', ' + el.h + ')</span>';
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
    });
    box.addEventListener('mousemove', (e) => positionTooltip(e));
    box.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    overlay.appendChild(box);
  }
}

function annotationText(el) {
  const parts = [];
  if (el.label) parts.push(el.label);
  if (el.traits) parts.push('[' + el.traits + ']');
  parts.push('frame (' + el.x + ', ' + el.y + ', ' + el.w + ', ' + el.h + ')');
  return parts.join(' ');
}

// ─── Tooltip 智能定位 (避免被边缘裁切) ───
function positionTooltip(e) {
  const pad = 14;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  // 右侧溢出 → 移到左边
  if (x + tw > vw - 8) x = e.clientX - tw - pad;
  // 底部溢出 → 移到上方
  if (y + th > vh - 8) y = e.clientY - th - pad;
  // 保底
  if (x < 4) x = 4;
  if (y < 4) y = 4;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── SSE ───
function connectSSE() {
  const es = new EventSource('/events');
  es.addEventListener('update', (e) => {
    const data = JSON.parse(e.data);
    if (data.version !== currentVersion) {
      currentVersion = data.version;
      loadScreenshot(); loadDom();
      statusText.textContent = 'updated';
      dot.className = 'dot';
    }
  });
  es.addEventListener('open', () => { statusText.textContent = 'connected'; dot.className = 'dot'; });
  es.addEventListener('error', () => { statusText.textContent = 'reconnecting'; dot.className = 'dot disconnected'; });
}

async function refresh() {
  statusText.textContent = 'refreshing'; dot.className = 'dot refreshing';
  try { await fetch('/refresh', { method: 'POST' }); } catch {}
}

// ─── Init ───
updateZoom(); loadScreenshot(); loadDom(); connectSSE();
img.addEventListener('load', () => loadDom());
window.addEventListener('resize', () => loadDom());
new ResizeObserver(() => loadDom()).observe(deviceContainer);
</script>
</body>
</html>`;

// ────────────────────────────────────────
// 入口
// ────────────────────────────────────────

const mode = process.argv[2];
if (mode === "serve") {
  startServer({ quiet: process.argv.includes("--quiet") });
} else if (mode === "refresh") {
  refreshSnapshot();
} else if (mode === "stop-server") {
  stopServer();
} else {
  console.error("Usage: device-preview.mjs <serve|refresh|stop-server>");
  process.exit(1);
}
