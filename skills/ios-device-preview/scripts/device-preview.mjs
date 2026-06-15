#!/usr/bin/env node
// device-preview.mjs — iPilot Codex Plugin
// 角色 1: PostToolUse hook handler (stdin → match ios-use → screenshot+dom)
// 角色 2: Preview HTTP server (fs.watch → SSE → 截图+DOM框)

import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, watch, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const IPILOT_DIR = join(homedir(), ".ipilot");
const SCREENSHOT_PATH = join(IPILOT_DIR, "snapshot.jpg");
const DOM_PATH = join(IPILOT_DIR, "snapshot.txt");
const PORT = 3200;

// ios-use 操作命令：执行后需要自动截图+DOM
const ACTION_RE = /\bios-use\s+(tap|swipe|input|longpress|home|activateApp|dismissAlert|openUrl|dom|launch|terminate)\b/;

// ────────────────────────────────────────
// 角色 1: Hook Handler
// ────────────────────────────────────────

async function handleHook() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();

  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); }

  const cmd = payload?.tool_input?.command ?? payload?.tool_input?.cmd ?? "";
  if (!ACTION_RE.test(cmd)) process.exit(0);

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

// ────────────────────────────────────────
// 角色 2: Preview Server
// ────────────────────────────────────────

function startServer() {
  mkdirSync(IPILOT_DIR, { recursive: true });

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
      try {
        execSync(`ios-use screenshot --name snapshot`, { stdio: "ignore", timeout: 15000 });
        const srcScreenshot = join(homedir(), ".ios-use", "artifacts", "snapshot.jpg");
        if (existsSync(srcScreenshot)) writeFileSync(SCREENSHOT_PATH, readFileSync(srcScreenshot));
      } catch {}
      try {
        const domOutput = execSync(`ios-use dom`, { timeout: 15000, encoding: "utf-8" });
        writeFileSync(DOM_PATH, domOutput);
      } catch {}
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

  server.listen(PORT, () => {
    console.log(`iPilot Preview: http://localhost:${PORT}`);
  });
}

// ────────────────────────────────────────
// Preview HTML (截图 + DOM 框叠加)
// ────────────────────────────────────────

const PREVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iPilot Device Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; font-family: -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; height: 100vh; overflow: hidden; }
  .toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; width: 100%; background: #16213e; border-bottom: 1px solid #0f3460; }
  .toolbar h1 { font-size: 13px; color: #e0e0e0; font-weight: 500; flex: 1; }
  .toolbar button { background: #0f3460; color: #e0e0e0; border: 1px solid #533483; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .toolbar button:hover { background: #533483; }
  .toolbar .status { font-size: 11px; color: #888; }
  .preview-container { flex: 1; display: flex; justify-content: center; align-items: center; padding: 12px; overflow: hidden; }
  .device-frame { position: relative; display: inline-block; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
  .device-frame img { display: block; max-height: calc(100vh - 60px); max-width: 100%; height: auto; }
  .device-frame .no-screenshot { display: flex; align-items: center; justify-content: center; width: 300px; height: 600px; color: #666; font-size: 14px; background: #111; }
  .dom-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
  .dom-box { position: absolute; border: 1.5px solid rgba(0, 200, 255, 0.6); border-radius: 2px; pointer-events: auto; cursor: pointer; transition: background 0.15s; }
  .dom-box:hover { background: rgba(0, 200, 255, 0.15); }
  .dom-tooltip { position: fixed; background: #16213e; color: #e0e0e0; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-family: 'SF Mono', monospace; pointer-events: none; z-index: 100; border: 1px solid #533483; max-width: 300px; white-space: pre-wrap; display: none; }
</style>
</head>
<body>
<div class="toolbar">
  <h1>iPilot</h1>
  <span class="status" id="status">connecting...</span>
  <button onclick="refresh()">Refresh</button>
</div>
<div class="preview-container">
  <div class="device-frame" id="frame">
    <div class="no-screenshot" id="placeholder">No screenshot yet.<br>Run an ios-use command.</div>
    <img id="screenshot" style="display:none" alt="Device screenshot">
    <div class="dom-overlay" id="overlay"></div>
  </div>
</div>
<div class="dom-tooltip" id="tooltip"></div>

<script>
const img = document.getElementById('screenshot');
const placeholder = document.getElementById('placeholder');
const overlay = document.getElementById('overlay');
const tooltip = document.getElementById('tooltip');
const status = document.getElementById('status');
let currentVersion = -1;

function loadScreenshot() {
  const t = Date.now();
  const newImg = new Image();
  newImg.onload = () => {
    img.src = newImg.src;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  };
  newImg.src = '/screenshot?t=' + t;
}

async function loadDom() {
  try {
    const res = await fetch('/dom?t=' + Date.now());
    if (!res.ok) return;
    const text = await res.text();
    renderDomOverlay(text);
  } catch {}
}

function parseDomTree(text) {
  // ios-use dom 格式: 缩进式文本, 每行格式:
  // <ref> <label> [<Type>] {{x, y}, {w, h}}
  const elements = [];
  const lines = text.split('\\n');
  const boundsRe = /\\{\\{(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)\\},\\s*\\{(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)\\}\\}/;
  const refRe = /^\\s*(\\w+)\\s+/;
  const typeRe = /\\[(\\w+)\\]/;

  for (const line of lines) {
    const bm = line.match(boundsRe);
    if (!bm) continue;
    const ref = line.match(refRe)?.[1] ?? '';
    const type = line.match(typeRe)?.[1] ?? '';
    const label = line.replace(boundsRe, '').replace(typeRe, '').replace(refRe, '').trim();
    elements.push({
      ref, type, label,
      x: parseFloat(bm[1]), y: parseFloat(bm[2]),
      w: parseFloat(bm[3]), h: parseFloat(bm[4]),
    });
  }
  return elements;
}

function renderDomOverlay(text) {
  overlay.innerHTML = '';
  if (!img.naturalWidth) return;

  const elements = parseDomTree(text);
  const scaleX = img.clientWidth / img.naturalWidth;
  const scaleY = img.clientHeight / img.naturalHeight;

  for (const el of elements) {
    if (el.w < 2 || el.h < 2) continue;
    const box = document.createElement('div');
    box.className = 'dom-box';
    box.style.left = (el.x * scaleX) + 'px';
    box.style.top = (el.y * scaleY) + 'px';
    box.style.width = (el.w * scaleX) + 'px';
    box.style.height = (el.h * scaleY) + 'px';

    const info = [el.ref, el.type, el.label].filter(Boolean).join(' ');
    box.addEventListener('mouseenter', (e) => {
      tooltip.textContent = info;
      tooltip.style.display = 'block';
    });
    box.addEventListener('mousemove', (e) => {
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
    });
    box.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    overlay.appendChild(box);
  }
}

// SSE 监听
function connectSSE() {
  const es = new EventSource('/events');
  es.addEventListener('update', (e) => {
    const data = JSON.parse(e.data);
    if (data.version !== currentVersion) {
      currentVersion = data.version;
      loadScreenshot();
      loadDom();
      status.textContent = 'updated #' + data.version;
    }
  });
  es.addEventListener('open', () => { status.textContent = 'connected'; });
  es.addEventListener('error', () => {
    status.textContent = 'reconnecting...';
    setTimeout(() => connectSSE(), 2000);
  });
}

async function refresh() {
  status.textContent = 'refreshing...';
  try { await fetch('/refresh', { method: 'POST' }); } catch {}
}

// 初始加载
loadScreenshot();
loadDom();
connectSSE();

// 截图加载后重绘 DOM 框
img.addEventListener('load', () => loadDom());
window.addEventListener('resize', () => loadDom());
</script>
</body>
</html>`;

// ────────────────────────────────────────
// 入口
// ────────────────────────────────────────

const mode = process.argv[2];
if (mode === "hook") {
  handleHook();
} else if (mode === "serve") {
  startServer();
} else {
  console.error("Usage: device-preview.mjs <hook|serve>");
  process.exit(1);
}
