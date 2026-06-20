#!/usr/bin/env python3
"""Web File Explorer — read-only filesystem browser for /root/agents/"""

import os
import mimetypes
import stat
import datetime
import urllib.parse
import hashlib
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, send_file, render_template, request, abort, Response

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ROOT_DIR = os.path.abspath("/root/agents")
LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 8080
USERNAME = "eddie"
PASSWORD = "explorer"  # simple; change in production

app = Flask(__name__)

mimetypes.init()

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
# Set WFE_NO_AUTH=1 env var or pass --no-auth to disable basic auth.
# The env var is checked at runtime inside the decorator.

def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return Response(
        "Authentication required",
        401,
        {"WWW-Authenticate": 'Basic realm="Web File Explorer"'},
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check for --no-auth via os.environ
        if os.environ.get('WFE_NO_AUTH') == '1':
            return f(*args, **kwargs)
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# ---------------------------------------------------------------------------
# Path safety
# ---------------------------------------------------------------------------
ALLOWED_PREFIXES = [
    os.path.abspath("/root/agents/openclaw/workspace"),
    os.path.abspath("/root/agents/cyony/workspace"),
    os.path.abspath("/root/agents/shared"),
]

def safe_path(requested_path):
    """Resolve a requested path and return the absolute path or None."""
    # Remove root prefix or combine
    if requested_path.startswith("/"):
        # Treat as absolute within /root/agents
        abs_path = os.path.abspath(os.path.join(ROOT_DIR, requested_path.lstrip("/")))
    else:
        abs_path = os.path.abspath(os.path.join(ROOT_DIR, requested_path))
    
    # Must be within ROOT_DIR
    if not abs_path.startswith(ROOT_DIR + "/") and abs_path != ROOT_DIR:
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
    
    # Detect mime
    mime = "inode/directory" if is_dir else (mimetypes.guess_type(abs_path)[0] or "application/octet-stream")
    
    # Image extensions we can embed
    img_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"}
    is_image = not is_dir and os.path.splitext(abs_path)[1].lower() in img_exts
    
    # Text extensions (including code)
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
    is_text = (
        not is_dir
        and (ext in text_exts or basename in text_exts or basename.startswith("."))
    )
    
    # Markdown
    is_markdown = not is_dir and ext == ".md"
    
    info = {
        "name": os.path.basename(abs_path),
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
    return info

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
@app.route("/<path:subpath>")
@requires_auth
def serve_ui(subpath=""):
    """Serve the SPA UI for any path — the frontend handles routing."""
    return render_template("index.html")

@app.route("/api/browse")
@requires_auth
def api_browse():
    """List directory contents."""
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    
    if not os.path.isdir(abs_path):
        return jsonify({"error": "Not a directory"}), 400
    
    items = []
    try:
        for name in sorted(os.listdir(abs_path), key=lambda n: (not os.path.isdir(os.path.join(abs_path, n)), n.lower())):
            child_path = os.path.join(abs_path, name)
            items.append(file_info(child_path))
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403
    
    current = file_info(abs_path)
    parent = None
    if abs_path != ROOT_DIR:
        parent_path = os.path.dirname(abs_path)
        if parent_path.startswith(ROOT_DIR):
            parent = file_info(parent_path)
    
    # Workspace roots for the breadcrumb
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
        "root_path": ROOT_DIR,
    })

@app.route("/api/file")
@requires_auth
def api_file():
    """Get file content (text/markdown)."""
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    if os.path.isdir(abs_path):
        return jsonify({"error": "Is a directory"}), 400
    
    info = file_info(abs_path)
    
    if info["is_image"]:
        # Return image URL for direct download
        return jsonify({
            "type": "image",
            "download_url": f"/api/download?path={urllib.parse.quote(path)}",
            "info": info,
        })
    
    # Read text content
    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return jsonify({
            "type": "text",
            "content": content,
            "info": info,
        })
    except UnicodeDecodeError:
        # Binary file — offer download
        return jsonify({
            "type": "binary",
            "download_url": f"/api/download?path={urllib.parse.quote(path)}",
            "info": info,
        })

@app.route("/api/download")
@requires_auth
def api_download():
    """Download a file."""
    path = request.args.get("path", "")
    abs_path = safe_path(path)
    if abs_path is None:
        return jsonify({"error": "Path not found or not allowed"}), 404
    if os.path.isdir(abs_path):
        return jsonify({"error": "Is a directory"}), 400
    
    return send_file(
        abs_path,
        as_attachment=True,
        download_name=os.path.basename(abs_path),
    )

# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Web File Explorer")
    parser.add_argument("--port", type=int, default=LISTEN_PORT, help=f"Port (default: {LISTEN_PORT})")
    parser.add_argument("--host", type=str, default=LISTEN_HOST, help=f"Host (default: {LISTEN_HOST})")
    parser.add_argument("--no-auth", action="store_true", help="Disable basic auth (dangerous)")
    args = parser.parse_args()
    
    if args.no_auth:
        os.environ['WFE_NO_AUTH'] = '1'
        print("⚠️  Auth disabled — server is open to everyone!")
    
    print(f"📁 Web File Explorer")
    print(f"   Listening on http://{args.host}:{args.port}")
    print(f"   Browsing: {ROOT_DIR}")
    print(f"   Auth: {'DISABLED ⚠️' if args.no_auth else 'enabled'}")
    app.run(host=args.host, port=args.port, debug=False)