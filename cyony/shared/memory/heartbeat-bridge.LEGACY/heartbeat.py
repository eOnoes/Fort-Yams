#!/usr/bin/env python3
"""Simple heartbeat aggregator for hybrid agent monitoring."""

import sqlite3
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.request

DB_PATH = Path(__file__).parent / "heartbeat.db"
ALERT_THRESHOLD_MINUTES = 5

# Telegram config (loaded from env or config file)
TELEGRAM_BOT_TOKEN = None
TELEGRAM_CHAT_ID = "8808479511"

class HeartbeatHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/heartbeat":
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len)
            data = json.loads(body)
            
            store_heartbeat(data)
            self.send_response(200)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_GET(self):
        if self.path == "/status":
            status = get_all_status()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(render_status_page(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Quiet

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS heartbeats (
            agent TEXT PRIMARY KEY,
            host TEXT,
            status TEXT,
            current_task TEXT,
            last_seen TEXT,
            alert_sent INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

def store_heartbeat(data):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO heartbeats (agent, host, status, current_task, last_seen, alert_sent)
        VALUES (?, ?, ?, ?, ?, 0)
        ON CONFLICT(agent) DO UPDATE SET
            host=excluded.host,
            status=excluded.status,
            current_task=excluded.current_task,
            last_seen=excluded.last_seen,
            alert_sent=0
    """, (data['agent'], data['host'], data['status'], data.get('current_task', ''), data['timestamp']))
    conn.commit()
    conn.close()

def get_all_status():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("SELECT agent, host, status, current_task, last_seen, alert_sent FROM heartbeats")
    rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now(timezone.utc)
    result = []
    for row in rows:
        agent, host, status, task, last_seen, alert_sent = row
        last = datetime.fromisoformat(last_seen.replace('Z', '+00:00').replace('+00:00', ''))
        last = last.replace(tzinfo=timezone.utc)
        minutes_ago = (now - last).total_seconds() / 60
        
        if minutes_ago > ALERT_THRESHOLD_MINUTES:
            health = "🔴 DOWN"
        elif status == "warning":
            health = "🟡 WARNING"
        else:
            health = "🟢 OK"
        
        result.append({
            'agent': agent,
            'host': host,
            'health': health,
            'status': status,
            'task': task,
            'last_seen': last_seen,
            'minutes_ago': round(minutes_ago, 1),
            'alert_sent': alert_sent
        })
    return result

def render_status_page(status):
    rows = ""
    for s in status:
        rows += f"""
        <tr>
            <td>{s['agent']}</td>
            <td>{s['host']}</td>
            <td>{s['health']}</td>
            <td>{s['task']}</td>
            <td>{s['minutes_ago']} min ago</td>
        </tr>
        """
    
    return f"""<!DOCTYPE html>
<html>
<head><title>Agent Status</title><style>
    body {{ font-family: sans-serif; background: #1a1a1a; color: #eee; padding: 20px; }}
    table {{ border-collapse: collapse; width: 100%; max-width: 800px; }}
    th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #444; }}
    th {{ color: #888; }}
    tr:hover {{ background: #2a2a2a; }}
</style></head>
<body>
    <h1>🔺 Agent Status</h1>
    <table>
        <tr><th>Agent</th><th>Host</th><th>Health</th><th>Current Task</th><th>Last Seen</th></tr>
        {rows}
    </table>
    <p style="color:#666; margin-top:20px;">Auto-refreshes every 30s</p>
    <script>setTimeout(()=>location.reload(),30000)</script>
</body>
</html>"""

def check_alerts():
    """Background thread: check for missed heartbeats, send Telegram alerts."""
    import time
    while True:
        time.sleep(60)
        status = get_all_status()
        for s in status:
            if s['health'] == "🔴 DOWN" and not s['alert_sent']:
                send_telegram_alert(s)
                mark_alert_sent(s['agent'])

def send_telegram_alert(agent_status):
    if not TELEGRAM_BOT_TOKEN:
        return
    msg = f"🚨 ALERT: {agent_status['agent']} on {agent_status['host']} is DOWN! Last seen {agent_status['minutes_ago']} min ago."
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": msg}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}))
    except Exception as e:
        print(f"Failed to send alert: {e}")

def mark_alert_sent(agent):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE heartbeats SET alert_sent=1 WHERE agent=?", (agent,))
    conn.commit()
    conn.close()

def main():
    init_db()
    
    # Start alert checker in background
    alert_thread = threading.Thread(target=check_alerts, daemon=True)
    alert_thread.start()
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', 18790), HeartbeatHandler)
    print(f"Heartbeat monitor running on http://0.0.0.0:18790")
    print(f"POST /heartbeat — agents report in")
    print(f"GET /status — web dashboard")
    server.serve_forever()

if __name__ == "__main__":
    main()
