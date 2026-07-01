#!/usr/bin/env python3
"""
🔺 Mission Control Server v4
Integrated dashboard + file explorer
"""

import json
import os
import subprocess
import mimetypes
import stat
import datetime
from pathlib import Path
from functools import wraps
from flask import Flask, jsonify, request, send_file, Response

app = Flask(__name__)

# Paths
COST_LOG = "/root/agents/shared/cost-log.md"
ROOT_DIR = Path("/root/agents").resolve()

# Auth config
USERNAME = "eddie"
PASSWORD = "***"

def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return Response(
        "Authentication required",
        401,
        {"WWW-Authenticate": 'Basic realm="Mission Control"'},
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if os.environ.get('MC_NO_AUTH') == '1':
            return f(*args, **kwargs)
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# FILE EXPLORER API
# =============================================================================

def safe_path(requested_path):
    if not requested_path:
        return str(ROOT_DIR)
    if requested_path.startswith("/"):
        abs_path = os.path.abspath(os.path.join(ROOT_DIR, requested_path.lstrip("/")))
    else:
        abs_path = os.path.abspath(os.path.join(ROOT_DIR, requested_path))
    if not abs_path.startswith(str(ROOT_DIR) + "/") and abs_path != str(ROOT_DIR):
        return None
    if not os.path.exists(abs_path):
        return None
    return abs_path

def human_size(num_bytes):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}" if unit != "B" else f"{num_bytes} B"
        num_bytes /= 1024
    return f"{num_bytes:.1f} PB"

def file_info(abs_path):
    st = os.stat(abs_path)
    is_dir = os.path.isdir(abs_path)
    rel_path = os.path.relpath(abs_path, ROOT_DIR)
    mime = "inode/directory" if is_dir else (mimetypes.guess_type(abs_path)[0] or "application/octet-stream")
    img_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"}
    is_image = not is_dir and os.path.splitext(abs_path)[1].lower() in img_exts
    text_exts = {
        ".txt", ".md", ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css",
        ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
        ".sh", ".bash", ".zsh", ".fish", ".env", ".gitignore", ".dockerfile",
        ".sql", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp",
        ".php", ".pl", ".lua", ".r", ".vue", ".svelte", ".astro", ".patch",
        ".diff", ".log", ".lock", ".mdx", ".mjs", ".cjs", ".mts", ".cts",
    }
    ext = os.path.splitext(abs_path)[1].lower()
    basename = os.path.basename(abs_path)
    is_text = not is_dir and (ext in text_exts or basename in text_exts or basename.startswith("."))
    is_markdown = not is_dir and ext == ".md"
    return {
        "name": basename,
        "path": rel_path,
        "size": st.st_size,
        "size_human": human_size(st.st_size),
        "is_dir": is_dir,
        "is_image": is_image,
        "is_text": is_text,
        "is_markdown": is_markdown,
        "mime": mime,
        "modified": datetime.datetime.fromtimestamp(st.st_mtime, tz=datetime.timezone.utc).isoformat(),
        "modified_human": datetime.datetime.fromtimestamp(st.st_mtime, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "mode": stat.filemode(st.st_mode),
    }

@app.route("/api/files/browse")
@requires_auth
def api_browse():
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    if not os.path.isdir(abs_path):
        return jsonify({"error": "Not a directory"}), 400
    items = []
    try:
        for name in sorted(os.listdir(abs_path), key=lambda n: (not os.path.isdir(os.path.join(abs_path, n)), n.lower())):
            if name.startswith("."):
                continue
            child_path = os.path.join(abs_path, name)
            items.append(file_info(child_path))
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403
    current = file_info(abs_path)
    parent = None
    if abs_path != str(ROOT_DIR):
        parent_path = os.path.dirname(abs_path)
        if parent_path.startswith(str(ROOT_DIR)):
            parent = file_info(parent_path)
    bookmarks = [
        {"name": "Tripp's Workspace", "path": "openclaw/workspace"},
        {"name": "Cyony's Workspace", "path": "cyony/workspace"},
        {"name": "Shared", "path": "shared"},
    ]
    return jsonify({
        "current": current,
        "parent": parent,
        "items": items,
        "bookmarks": bookmarks,
        "root_path": str(ROOT_DIR),
    })

@app.route("/api/files/content")
@requires_auth
def api_file_content():
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    if os.path.isdir(abs_path):
        return jsonify({"error": "Is a directory"}), 400
    info = file_info(abs_path)
    if info["is_image"]:
        return jsonify({
            "type": "image",
            "download_url": f"/api/files/download?path={os.path.relpath(abs_path, ROOT_DIR)}",
            "info": info,
        })
    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return jsonify({
            "type": "text",
            "content": content,
            "info": info,
        })
    except UnicodeDecodeError:
        return jsonify({
            "type": "binary",
            "download_url": f"/api/files/download?path={os.path.relpath(abs_path, ROOT_DIR)}",
            "info": info,
        })

@app.route("/api/files/download")
@requires_auth
def api_download():
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    if os.path.isdir(abs_path):
        return jsonify({"error": "Is a directory"}), 400
    return send_file(abs_path, as_attachment=True, download_name=os.path.basename(abs_path))

# =============================================================================
# DASHBOARD API
# =============================================================================

@app.route("/api/status")
@requires_auth
def api_status():
    status = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "agents": {
            "tripp": {"status": "online", "model": "moonshot/kimi-k2.6"},
            "cyony": {"status": "online", "model": "qwen/qwen3.7-max"},
            "echo": {"status": "unknown", "model": "TBD"},
        },
        "credits": {"openrouter": 116.00, "deepseek": 169.00, "xai": 98.86}
    }
    return jsonify(status)

@app.route("/api/costs")
@requires_auth
def api_costs():
    costs = []
    try:
        if os.path.exists(COST_LOG):
            with open(COST_LOG, 'r') as f:
                lines = f.readlines()
            for line in lines:
                if line.startswith('|') and any(a in line for a in ['Tripp', 'Cyony', 'Echo']):
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 8 and parts[1] not in ['Date', '------']:
                        costs.append({
                            "date": parts[1], "agent": parts[2], "task": parts[3],
                            "model": parts[4], "input": parts[5] if len(parts) > 5 else '-',
                            "output": parts[6] if len(parts) > 6 else '-',
                            "cost": parts[7], "savings": parts[8] if len(parts) > 8 else '-'
                        })
    except Exception as e:
        costs = [{"error": str(e)}]
    return jsonify({"costs": costs})

@app.route("/api/wake/<agent>", methods=["POST"])
@requires_auth
def wake_agent(agent):
    if agent == "cyony":
        try:
            result = subprocess.run(
                ["docker", "restart", "hermes-agent-8eep-hermes-agent-1"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                return jsonify({"success": True, "message": "Cyony restarted"})
            return jsonify({"success": False, "message": result.stderr})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)})
    return jsonify({"success": False, "message": f"Wake not implemented for {agent}"})

# =============================================================================
# UI ROUTES
# =============================================================================

@app.route("/")
@requires_auth
def dashboard():
    return Response(DASHBOARD_HTML, mimetype="text/html")

@app.route("/files")
@requires_auth
def file_explorer():
    return Response(FILE_EXPLORER_HTML, mimetype="text/html")

# =============================================================================
# HTML TEMPLATES
# =============================================================================

DASHBOARD_HTML = '''<!DOCTYPE html>
<html>
<head>
    <title>🔺 Mission Control</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="60">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333; }
        h1 { font-size: 28px; color: #fff; }
        .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
        .nav { display: flex; gap: 20px; margin-bottom: 20px; }
        .nav a { color: #888; text-decoration: none; padding: 8px 16px; border-radius: 6px; transition: all 0.2s; }
        .nav a:hover, .nav a.active { color: #fff; background: #1a1a24; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #111118; border: 1px solid #222; border-radius: 8px; padding: 20px; }
        .card h2 { font-size: 18px; color: #fff; margin-bottom: 15px; }
        .agent-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #222; }
        .agent-row:last-child { border-bottom: none; }
        .agent-name { font-weight: 600; color: #fff; }
        .agent-status { font-size: 12px; padding: 4px 12px; border-radius: 12px; }
        .status-online { background: #1a3a1a; color: #4ade80; }
        .status-unknown { background: #3a3a1a; color: #fbbf24; }
        .wake-btn { background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .wake-btn:hover { background: #1d4ed8; }
        .credit-bar { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #222; }
        .credit-bar:last-child { border-bottom: none; }
        .credit-name { color: #888; }
        .credit-amount { color: #4ade80; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; background: #111118; border-radius: 8px; overflow: hidden; }
        th { background: #1a1a24; color: #888; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
        th, td { padding: 12px; text-align: left; }
        tr { border-bottom: 1px solid #222; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #444; font-size: 12px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>🔺 Mission Control</h1>
                <div class="subtitle">Pack Status & Token Tracker</div>
            </div>
            <div style="color: #444; font-size: 12px;">Auto-refresh: 60s</div>
        </header>
        <nav class="nav">
            <a href="/" class="active">Dashboard</a>
            <a href="/files">📁 File Explorer</a>
        </nav>
        <div class="grid">
            <div class="card">
                <h2>🤖 Agents</h2>
                <div class="agent-row">
                    <div>
                        <div class="agent-name">🔺 Tripp</div>
                        <div style="color: #666; font-size: 12px;">moonshot/kimi-k2.6</div>
                    </div>
                    <span class="agent-status status-online">● Online</span>
                </div>
                <div class="agent-row">
                    <div>
                        <div class="agent-name">🤖 Cyony</div>
                        <div style="color: #666; font-size: 12px;">qwen/qwen3.7-max</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="agent-status status-online">● Online</span>
                        <button class="wake-btn" onclick="wakeAgent('cyony')">Wake</button>
                    </div>
                </div>
                <div class="agent-row">
                    <div>
                        <div class="agent-name">🔷 Echo</div>
                        <div style="color: #666; font-size: 12px;">TBD</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="agent-status status-unknown">● Unknown</span>
                        <button class="wake-btn" onclick="wakeAgent('echo')">Wake</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <h2>💰 Credits</h2>
                <div class="credit-bar"><span class="credit-name">OpenRouter</span><span class="credit-amount" id="cred-openrouter">Loading...</span></div>
                <div class="credit-bar"><span class="credit-name">DeepSeek</span><span class="credit-amount" id="cred-deepseek">Loading...</span></div>
                <div class="credit-bar"><span class="credit-name">xAI</span><span class="credit-amount" id="cred-xai">Loading...</span></div>
                <div class="credit-bar"><span class="credit-name">Moonshot/Kimi</span><span class="credit-amount">Cloud Limits</span></div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #1a3a1a 0%, #111118 100%); border: 1px solid #2a5a2a;">
                <h2>🎯 Token Usage</h2>
                <div class="credit-bar"><span class="credit-name">Est. Cost (No Munch)</span><span class="credit-amount" style="color: #fbbf24;" id="est-cost">$0.00</span></div>
                <div class="credit-bar"><span class="credit-name">Actual Cost</span><span class="credit-amount" id="actual-cost">$0.00</span></div>
                <div class="credit-bar"><span class="credit-name">Tokens Saved</span><span class="credit-amount" style="color: #fbbf24;" id="tokens-saved">0</span></div>
                <div class="credit-bar"><span class="credit-name">Savings %</span><span class="credit-amount" style="color: #fbbf24;" id="savings-pct">0%</span></div>
                <div class="credit-bar"><span class="credit-name">Total Pack Cost</span><span class="credit-amount" id="total-cost">$0.00</span></div>
            </div>
        </div>
        <div class="card" style="margin-bottom: 20px;">
            <h2>📊 Recent Token Usage</h2>
            <table>
                <thead><tr><th>Date</th><th>Agent</th><th>Task</th><th>Model</th><th>Cost</th></tr></thead>
                <tbody id="cost-table"><tr><td colspan="5" style="color: #666; text-align: center;">Loading...</td></tr></tbody>
            </table>
        </div>
        <div class="footer">Mission Control v4.0 | <a href="/files" style="color: #666;">File Explorer</a></div>
    </div>
    <script>
        async function wakeAgent(agent) {
            try {
                const res = await fetch(`/api/wake/${agent}`, {method: 'POST'});
                const data = await res.json();
                alert(data.message || `Wake signal sent to ${agent}`);
            } catch (e) { alert(`Failed: ${e.message}`); }
        }
        async function loadCosts() {
            try {
                const res = await fetch('/api/costs');
                const data = await res.json();
                const tbody = document.getElementById('cost-table');
                if (data.costs?.length > 0) {
                    tbody.innerHTML = data.costs.slice(-10).reverse().map(c => 
                        `<tr><td>${c.date}</td><td>${c.agent}</td><td>${c.task}</td><td>${c.model}</td><td>${c.cost}</td></tr>`
                    ).join('');
                    
                    // Calculate totals
                    const totalCost = data.costs.reduce((sum, c) => {
                        const cost = parseFloat(c.cost?.replace('$', '') || 0);
                        return sum + (isNaN(cost) ? 0 : cost);
                    }, 0);
                    document.getElementById('total-cost').textContent = '$' + totalCost.toFixed(2);
                    document.getElementById('actual-cost').textContent = '$' + totalCost.toFixed(2);
                    
                    // Estimate savings (placeholder logic)
                    const estNoMunch = totalCost * 1.5;
                    document.getElementById('est-cost').textContent = '$' + estNoMunch.toFixed(2);
                    document.getElementById('savings-pct').textContent = '33%';
                    document.getElementById('tokens-saved').textContent = 'N/A';
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="color: #666; text-align: center;">No costs logged yet</td></tr>';
                }
            } catch (e) { console.error('Failed to load costs:', e); }
        }
        
        async function loadStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                if (data.credits) {
                    document.getElementById('cred-openrouter').textContent = '$' + data.credits.openrouter.toFixed(2);
                    document.getElementById('cred-deepseek').textContent = '$' + data.credits.deepseek.toFixed(2);
                    document.getElementById('cred-xai').textContent = '$' + data.credits.xai.toFixed(2);
                }
            } catch (e) { console.error('Failed to load status:', e); }
        }
        
        loadCosts();
        loadStatus();
    </script>
</body>
</html>'''

FILE_EXPLORER_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📁 File Explorer — Mission Control</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --sidebar: #111118; --surface: #1a1a24; --surface-alt: #22222e;
    --border: #333; --text: #e0e0e0; --text-dim: #666; --text-bright: #fff;
    --accent: #2563eb; --accent-hover: #1d4ed8; --green: #4ade80; --yellow: #fbbf24;
    --radius: 6px;
    --font: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    --mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  }
  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; overflow: hidden; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  #app { display: flex; flex-direction: column; height: 100vh; }
  .top-nav {
    height: 44px; background: var(--sidebar); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 20px; gap: 20px; flex-shrink: 0;
  }
  .top-nav a { color: #888; padding: 6px 12px; border-radius: 4px; transition: all 0.2s; }
  .top-nav a:hover, .top-nav a.active { color: #fff; background: var(--surface); }
  .top-nav .spacer { flex: 1; }
  .top-nav h1 { font-size: 14px; color: var(--text-bright); }
  .main { display: flex; flex: 1; overflow: hidden; }
  .sidebar {
    width: 260px; min-width: 260px; background: var(--sidebar); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .sidebar-section { padding: 12px; border-bottom: 1px solid var(--border); }
  .sidebar-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); margin-bottom: 8px; font-weight: 600; }
  .bookmark-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: var(--radius); cursor: pointer; font-size: 13px; transition: background 0.15s;
  }
  .bookmark-item:hover { background: var(--surface); }
  .breadcrumb-area { padding: 10px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .breadcrumb { font-size: 12px; color: var(--text-dim); word-break: break-all; line-height: 1.4; }
  .breadcrumb span { cursor: pointer; color: var(--accent); }
  .breadcrumb span:hover { text-decoration: underline; }
  .breadcrumb .current { color: var(--text); cursor: default; }
  .file-list { flex: 1; overflow-y: auto; padding: 4px 0; }
  .file-item {
    display: flex; align-items: center; padding: 6px 14px; cursor: pointer; gap: 10px; transition: background 0.12s;
  }
  .file-item:hover { background: var(--surface); }
  .file-item .icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
  .file-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .file-item .meta { flex-shrink: 0; text-align: right; font-size: 11px; color: var(--text-dim); white-space: nowrap; }
  .file-item.parent-link { color: var(--yellow); }
  .content-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
  .content-placeholder {
    flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 15px;
  }
  .content-placeholder .inner { text-align: center; }
  .content-placeholder .big-icon { font-size: 48px; margin-bottom: 12px; }
  .content-viewer { flex: 1; overflow: auto; padding: 20px 24px; line-height: 1.6; }
  .file-info-bar {
    display: flex; align-items: center; gap: 14px;
    padding: 10px 20px; background: var(--sidebar); border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap;
  }
  .file-info-bar .fi-name { font-weight: 600; color: var(--text-bright); }
  .file-info-bar .fi-stat { font-size: 12px; color: var(--text-dim); }
  .file-info-bar .download-btn {
    margin-left: auto; background: var(--accent); color: #fff; border: none;
    padding: 5px 14px; border-radius: var(--radius); font-size: 12px; font-weight: 600; cursor: pointer;
  }
  .file-info-bar .download-btn:hover { background: var(--accent-hover); }
  pre.code-block {
    background: var(--sidebar); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px 18px; overflow-x: auto; font-family: var(--mono); font-size: 13px; line-height: 1.55;
  }
  .markdown-body h1 { font-size: 22px; color: var(--text-bright); margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .markdown-body h2 { font-size: 18px; color: var(--text-bright); margin: 20px 0 8px 0; }
  .markdown-body h3 { font-size: 15px; color: var(--text-bright); margin: 16px 0 6px 0; }
  .markdown-body p { margin: 8px 0; }
  .markdown-body ul, .markdown-body ol { margin: 8px 0; padding-left: 24px; }
  .markdown-body li { margin: 3px 0; }
  .markdown-body code { background: var(--surface); padding: 2px 6px; border-radius: 3px; font-family: var(--mono); font-size: 12.5px; }
  .markdown-body pre code { background: none; padding: 0; border-radius: 0; }
  .markdown-body blockquote { border-left: 3px solid var(--accent); padding-left: 12px; color: var(--text-dim); margin: 8px 0; }
  .markdown-body table { border-collapse: collapse; margin: 10px 0; width: 100%; }
  .markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
  .markdown-body th { background: var(--surface); }
  .markdown-body hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  .markdown-body a { color: var(--accent); }
  .markdown-body img { max-width: 100%; border-radius: var(--radius); }
  .image-viewer { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 20px; }
  .image-viewer img { max-width: 100%; max-height: calc(100vh - 160px); object-fit: contain; border-radius: var(--radius); }
  .loading { text-align: center; padding: 40px; color: var(--text-dim); }
  .error { color: #f87171; padding: 20px; text-align: center; }
  @media (max-width: 720px) {
    .sidebar { display: none; }
    .file-info-bar { flex-direction: column; align-items: flex-start; }
    .file-info-bar .download-btn { margin-left: 0; }
  }
</style>
</head>
<body>
<div id="app">
  <nav class="top-nav">
    <h1>🔺 Mission Control</h1>
    <a href="/">Dashboard</a>
    <a href="/files" class="active">📁 Files</a>
    <span class="spacer"></span>
    <span style="font-size: 12px; color: var(--text-dim);" id="path-display">/root/agents/</span>
  </nav>
  <div class="main">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-section">
        <h3>📌 Bookmarks</h3>
        <div id="bookmarks"></div>
      </div>
      <div class="breadcrumb-area">
        <div class="breadcrumb" id="breadcrumb"></div>
      </div>
      <div class="file-list" id="file-list"></div>
    </aside>
    <section class="content-panel" id="content-panel">
      <div class="content-placeholder" id="placeholder">
        <div class="inner">
          <div class="big-icon">📂</div>
          <p>Select a file to preview</p>
          <p style="font-size:12px;margin-top:8px;color:var(--text-dim)">Browse files from the sidebar</p>
        </div>
      </div>
      <div id="content-viewer" style="display:none"></div>
    </section>
  </div>
</div>
<script>
let currentPath = '';
let currentFile = null;

const fileList = document.getElementById('file-list');
const breadcrumb = document.getElementById('breadcrumb');
const bookmarksEl = document.getElementById('bookmarks');
const placeholder = document.getElementById('placeholder');
const contentViewer = document.getElementById('content-viewer');
const pathDisplay = document.getElementById('path-display');

async function api(url) {
  console.log('API call:', url);
  const res = await fetch(url);
  console.log('API response status:', res.status);
  if (res.status === 401) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#f87171"><h2>🔒 Authentication Required</h2></div>';
    throw new Error('Auth required');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({error: res.statusText}));
    throw new Error(err.error || 'Request failed');
  }
  const data = await res.json();
  console.log('API data:', data);
  return data;
}

async function browse(path) {
  if (path === undefined) path = '';
  currentPath = path;
  console.log('browse called with:', path);
  try {
    const data = await api('/api/files/browse?path=' + encodeURIComponent(path));
    console.log('API returned', data.items.length, 'items');
    pathDisplay.textContent = data.root_path + (path ? '/' + path : '');
    renderBreadcrumb(data);
    renderBookmarks(data.bookmarks);
    renderFileList(data);
    showPlaceholder();
  } catch (e) {
    console.error('browse error:', e);
    fileList.innerHTML = '<div class="error">Error loading files: ' + escapeHtml(e.message) + '</div>';
  }
}

function renderBreadcrumb(data) {
  const parts = (data.current.path || '').split('/').filter(Boolean);
  let html = '<span onclick="browseHome()">agents</span>';
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    acc += (acc ? '/' : '') + parts[i];
    const isLast = acc === data.current.path;
    html += ' / ';
    if (isLast) {
      html += '<span class="current">' + escapeHtml(parts[i]) + '</span>';
    } else {
      html += '<span onclick="browseBreadcrumb(' + (i+1) + ')">' + escapeHtml(parts[i]) + '</span>';
    }
  }
  breadcrumb.innerHTML = html;
  // Store paths for breadcrumb clicks
  breadcrumb.dataset.paths = JSON.stringify(parts);
}

function renderBookmarks(bookmarks) {
  let html = '';
  for (let i = 0; i < bookmarks.length; i++) {
    const b = bookmarks[i];
    html += '<div class="bookmark-item" onclick="browseBookmark(' + i + ')">';
    html += '<span class="icon">📂</span>';
    html += '<span>' + escapeHtml(b.name) + '</span>';
    html += '</div>';
  }
  bookmarksEl.innerHTML = html;
  // Store bookmark paths
  bookmarksEl.dataset.paths = JSON.stringify(bookmarks.map(b => b.path));
}

function renderFileList(data) {
  let html = '';
  if (data.parent) {
    html += '<div class="file-item parent-link" onclick="browseParent()">';
    html += '<span class="icon">📁</span>';
    html += '<span class="name">.. (parent)</span>';
    html += '<span class="meta"></span>';
    html += '</div>';
  }
  // Store items for click handlers
  fileList.dataset.items = JSON.stringify(data.items.map(item => ({path: item.path, is_dir: item.is_dir})));
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const icon = item.is_dir ? '📁' : (item.is_image ? '🖼️' : (item.is_text ? '📄' : '📎'));
    let nameStyle = '';
    if (item.is_markdown) nameStyle = ' style="color:var(--green)"';
    else if (item.name.startsWith('.')) nameStyle = ' style="color:var(--text-dim)"';
    html += '<div class="file-item" onclick="fileClick(' + i + ')">';
    html += '<span class="icon">' + icon + '</span>';
    html += '<span class="name"' + nameStyle + '>' + escapeHtml(item.name) + '</span>';
    html += '<span class="meta">' + (item.is_dir ? '' : item.size_human + ' · ') + item.modified_human.split(' ')[0] + '</span>';
    html += '</div>';
  }
  fileList.innerHTML = html || '<div class="loading">Empty directory</div>';
}

function browseHome() {
  browse('');
}

function browseParent() {
  const parts = currentPath.split('/').filter(Boolean);
  parts.pop();
  browse(parts.join('/'));
}

function browseBreadcrumb(idx) {
  const paths = JSON.parse(breadcrumb.dataset.paths || '[]');
  browse(paths.slice(0, idx).join('/'));
}

function browseBookmark(idx) {
  const paths = JSON.parse(bookmarksEl.dataset.paths || '[]');
  browse(paths[idx] || '');
}

function fileClick(idx) {
  const items = JSON.parse(fileList.dataset.items || '[]');
  const item = items[idx];
  if (!item) return;
  if (item.is_dir) {
    browse(item.path);
  } else {
    viewFile(item.path);
  }
}

async function viewFile(path) {
  currentFile = path;
  hidePlaceholder();
  contentViewer.style.display = 'block';
  contentViewer.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const data = await api('/api/files/content?path=' + encodeURIComponent(path));
    let html = '';
    const info = data.info;
    html += '<div class="file-info-bar">';
    html += '<span class="fi-name">' + escapeHtml(info.name) + '</span>';
    html += '<span class="fi-stat">' + info.size_human + '</span>';
    html += '<span class="fi-stat">' + info.modified_human + '</span>';
    html += '<button class="download-btn" onclick="downloadCurrentFile()">Download</button>';
    html += '</div>';

    if (data.type === 'image') {
      html += '<div class="image-viewer"><img src="/api/files/download?path=' + encodeURIComponent(path) + '" alt="' + escapeHtml(info.name) + '" /></div>';
    } else if (data.type === 'text') {
      if (info.is_markdown) {
        html += '<div class="content-viewer markdown-body">' + renderMarkdown(data.content) + '</div>';
      } else {
        html += '<div class="content-viewer"><pre class="code-block">' + escapeHtml(data.content) + '</pre></div>';
      }
    } else {
      html += '<div class="content-viewer"><div class="content-placeholder"><div class="inner"><div class="big-icon">📎</div><p>Binary file</p><p style="margin-top:8px"><a href="/api/files/download?path=' + encodeURIComponent(path) + '">Download file</a></p></div></div></div>';
    }
    contentViewer.innerHTML = html;
  } catch (e) {
    contentViewer.innerHTML = '<div class="error">Error: ' + escapeHtml(e.message) + '</div>';
  }
}

function downloadCurrentFile() {
  if (currentFile) {
    window.open('/api/files/download?path=' + encodeURIComponent(currentFile), '_blank');
  }
}

function showPlaceholder() {
  contentViewer.style.display = 'none';
  placeholder.style.display = 'flex';
  currentFile = null;
}

function hidePlaceholder() {
  placeholder.style.display = 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  let html = '';
  const lines = text.split(String.fromCharCode(10));
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += '<pre class="code-block"><code>' + escapeHtml(codeContent.slice(0, -1)) + '</code></pre>';
        codeContent = '';
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + String.fromCharCode(10);
      continue;
    }
    if (line.startsWith('### ')) { html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>'; continue; }
    if (line.startsWith('## ')) { html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>'; continue; }
    if (line.startsWith('# ')) { html += '<h1>' + escapeHtml(line.slice(2)) + '</h1>'; continue; }
    if (/^[-*_]{3,}\s*$/.test(line.trim())) { html += '<hr>'; continue; }
    if (line.startsWith('> ')) { html += '<blockquote>' + escapeHtml(line.slice(2)) + '</blockquote>'; continue; }

    let processed = escapeHtml(line);
    processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    if (/^[\s]*[-*+]\s/.test(line)) {
      html += '<li>' + processed.replace(/^[\s]*[-*+]\s/, '') + '</li>';
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      html += '<li>' + processed.replace(/^\s*\d+\.\s/, '') + '</li>';
      continue;
    }
    if (line.trim() === '') { html += ''; continue; }
    html += '<p>' + processed + '</p>';
  }
  if (inCodeBlock) {
    html += '<pre class="code-block"><code>' + escapeHtml(codeContent) + '</code></pre>';
  }
  return html;
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM ready, calling browse');
  browse('');
});
</script>
</body>
</html>'''

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Mission Control v4")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--no-auth", action="store_true", help="Disable auth (dangerous)")
    args = parser.parse_args()
    if args.no_auth:
        os.environ['MC_NO_AUTH'] = '1'
    print(f"🔺 Mission Control v4 running on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=False)