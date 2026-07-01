#!/usr/bin/env python3
"""Mission Control Dashboard - Agent monitoring with kill switch and loop detection."""

import sqlite3
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.request

DB_PATH = Path(__file__).parent / "heartbeat.db"
ALERT_THRESHOLD_MINUTES = 5
DEFAULT_LOOP_THRESHOLD_MINUTES = 30  # Default if agent doesn't specify

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
        elif self.path.startswith("/api/wake/"):
            agent = self.path.split("/")[-1]
            result = wake_agent(agent)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        elif self.path == "/api/wake-all":
            result = wake_all_agents()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
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
        elif self.path == "/api/agents":
            status = get_all_status()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS heartbeats (
            agent TEXT PRIMARY KEY,
            host TEXT,
            status TEXT,
            current_task TEXT,
            task_started TEXT,
            last_seen TEXT,
            expected_minutes INTEGER DEFAULT 30,
            alert_sent INTEGER DEFAULT 0,
            loop_alert_sent INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

def store_heartbeat(data):
    conn = sqlite3.connect(DB_PATH)
    
    # Check if task changed
    cursor = conn.execute("SELECT current_task, task_started FROM heartbeats WHERE agent=?", (data['agent'],))
    row = cursor.fetchone()
    
    task_started = data['timestamp']
    if row and row[0] == data.get('current_task', ''):
        # Same task, keep original start time
        task_started = row[1] or data['timestamp']
    
    conn.execute("""
        INSERT INTO heartbeats (agent, host, status, current_task, task_started, last_seen, expected_minutes, alert_sent, loop_alert_sent)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
        ON CONFLICT(agent) DO UPDATE SET
            host=excluded.host,
            status=excluded.status,
            current_task=excluded.current_task,
            task_started=CASE WHEN heartbeats.current_task=excluded.current_task THEN heartbeats.task_started ELSE excluded.task_started END,
            last_seen=excluded.last_seen,
            expected_minutes=excluded.expected_minutes,
            alert_sent=0
    """, (data['agent'], data['host'], data['status'], data.get('current_task', ''), task_started, data['timestamp'], data.get('expected_minutes', DEFAULT_LOOP_THRESHOLD_MINUTES)))
    conn.commit()
    conn.close()

def get_all_status():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("SELECT agent, host, status, current_task, task_started, last_seen, expected_minutes, alert_sent, loop_alert_sent FROM heartbeats")
    rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now(timezone.utc)
    result = []
    for row in rows:
        agent, host, status, task, task_started, last_seen, expected_minutes, alert_sent, loop_alert_sent = row
        
        last = parse_time(last_seen)
        task_start = parse_time(task_started) if task_started else last
        
        # Use agent-reported expected time, or default
        loop_threshold = expected_minutes or DEFAULT_LOOP_THRESHOLD_MINUTES
        
        minutes_ago = (now - last).total_seconds() / 60
        task_minutes = (now - task_start).total_seconds() / 60
        
        # Health status
        if minutes_ago > ALERT_THRESHOLD_MINUTES:
            health = "🔴 OFFLINE"
            health_class = "offline"
        elif status == "warning":
            health = "🟡 WARNING"
            health_class = "warning"
        elif status == "error":
            health = "🔴 ERROR"
            health_class = "error"
        else:
            health = "🟢 ONLINE"
            health_class = "online"
        
        # Loop detection: uses agent-reported expected time
        is_looping = False
        if task_minutes > loop_threshold and status == "ok":
            # Check if task looks like a real work task vs heartbeat
            generic_tasks = ["active", "heartbeat", "monitoring", "online", "idle", "waiting"]
            is_generic = any(generic in task.lower() for generic in generic_tasks)
            
            # Only flag as looping if it's a descriptive task stuck past expected time
            if not is_generic and len(task) > 10:
                is_looping = True
                health = "🟠 LOOPING?"
                health_class = "looping"
        
        result.append({
            'agent': agent,
            'host': host,
            'health': health,
            'health_class': health_class,
            'status': status,
            'task': task,
            'task_minutes': round(task_minutes, 1),
            'expected_minutes': loop_threshold,
            'last_seen': last_seen,
            'minutes_ago': round(minutes_ago, 1),
            'alert_sent': alert_sent,
            'loop_alert_sent': loop_alert_sent,
            'is_looping': is_looping
        })
    return result

def parse_time(ts):
    if not ts:
        return datetime.now(timezone.utc)
    # Handle various ISO formats
    ts = ts.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        # Fallback for older Python versions
        from datetime import datetime as dt2
        dt = dt2.strptime(ts.replace('+00:00', ''), '%Y-%m-%dT%H:%M:%S')
    
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def render_status_page(status):
    rows = ""
    for s in status:
        # Kill switch + wake button
        agent_name = s['agent']
        kill_btn = f"<button class='kill-btn' onclick='killAgent(\"{agent_name}\")'>🛑 STOP</button>"
        wake_btn = f"<button class='wake-btn' onclick='wakeAgent(\"{agent_name}\")'>⚡ WAKE</button>"
        
        # Loop indicator - shows expected time and actual time
        loop_indicator = ""
        if s['is_looping']:
            task_mins = s['task_minutes']
            loop_indicator = f"<span class='loop-badge'>⏱️ {task_mins}min (exp: {s['expected_minutes']}min)</span>"
        elif s['expected_minutes'] and s['expected_minutes'] != DEFAULT_LOOP_THRESHOLD_MINUTES:
            loop_indicator = f"<span style='color:#666;font-size:11px;'> (exp: {s['expected_minutes']}min)</span>"
        
        rows += f"""
        <tr class="{s['health_class']}">
            <td class="agent-name">{s['agent'].upper()}</td>
            <td>{s['host']}</td>
            <td class="health">{s['health']}</td>
            <td>{s['task']} {loop_indicator}</td>
            <td>{s['minutes_ago']} min ago</td>
            <td>{wake_btn} {kill_btn}</td>
        </tr>
        """
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>🔺 Mission Control</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: #0a0a0f; 
            color: #e0e0e0; 
            padding: 20px;
            min-height: 100vh;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        header {{ 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #333;
        }}
        h1 {{ font-size: 28px; color: #fff; }}
        .subtitle {{ color: #666; font-size: 14px; margin-top: 5px; }}
        .refresh-info {{ color: #444; font-size: 12px; }}
        
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            background: #111118;
            border-radius: 12px;
            overflow: hidden;
        }}
        th {{ 
            background: #1a1a24; 
            color: #888; 
            font-weight: 500;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
        }}
        th, td {{ padding: 16px; text-align: left; }}
        tr {{ border-bottom: 1px solid #222; transition: background 0.2s; }}
        tr:last-child {{ border-bottom: none; }}
        tr:hover {{ background: #1a1a24; }}
        
        .agent-name {{ font-weight: 600; font-size: 16px; color: #fff; }}
        .health {{ font-weight: 600; font-size: 14px; }}
        
        .online {{ color: #4ade80; }}
        .offline {{ color: #ef4444; }}
        .warning {{ color: #fbbf24; }}
        .error {{ color: #ef4444; }}
        .looping {{ color: #fb923c; }}
        
        .loop-badge {{
            background: rgba(251, 146, 60, 0.15);
            color: #fb923c;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
        }}
        
        .kill-btn {{
            background: #dc2626;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        }}
        .kill-btn:hover {{ background: #b91c1c; transform: scale(1.05); }}
        .kill-btn:active {{ transform: scale(0.95); }}
        
        .wake-btn {{
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
            margin-right: 8px;
        }}
        .wake-btn:hover {{ background: #1d4ed8; transform: scale(1.05); }}
        .wake-btn:active {{ transform: scale(0.95); }}
        
        .wake-all-btn {{
            background: #7c3aed;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 20px;
            transition: all 0.2s;
        }}
        .wake-all-btn:hover {{ background: #6d28d9; transform: scale(1.05); }}
        
        .legend {{
            display: flex;
            gap: 20px;
            margin-top: 20px;
            padding: 16px;
            background: #111118;
            border-radius: 8px;
            font-size: 12px;
            color: #666;
        }}
        .legend-item {{ display: flex; align-items: center; gap: 6px; }}
        
        .toast {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a24;
            color: #fff;
            padding: 16px 24px;
            border-radius: 8px;
            border-left: 4px solid #4ade80;
            display: none;
            z-index: 1000;
        }}
        .toast.error {{ border-left-color: #ef4444; }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>🔺 Mission Control</h1>
                <div class="subtitle">Agent Team Status Dashboard</div>
            </div>
            <div class="refresh-info">Auto-refreshes every 10s</div>
        </header>
        
        <table>
            <thead>
                <tr>
                    <th>Agent</th>
                    <th>Host</th>
                    <th>Status</th>
                    <th>Current Task (Expected)</th>
                    <th>Last Seen</th>
                    <th>Control</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
        
        <div class="legend">
            <div class="legend-item"><span>🟢</span> Online & Working</div>
            <div class="legend-item"><span>🟡</span> Warning State</div>
            <div class="legend-item"><span>🟠</span> Possible Loop (>expected time)</div>
            <div class="legend-item"><span>🔴</span> Offline / Error</div>
            <div class="legend-item">⚡ = Wake agent</div>
            <div class="legend-item">🛑 = Stop agent</div>
        </div>
        
        <button class="wake-all-btn" onclick="wakeAll()">⚡ WAKE UP THE HOUSE</button>
    </div>
    
    <div id="toast" class="toast"></div>
    
    <script>
        function showToast(msg, isError) {{
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast' + (isError ? ' error' : '');
            t.style.display = 'block';
            setTimeout(() => t.style.display = 'none', 3000);
        }}
        
        function killAgent(agent) {{
            if (!confirm('Stop ' + agent.toUpperCase() + '?')) return;
            fetch('/api/kill/' + agent, {{ method: 'POST' }})
                .then(r => r.json())
                .then(data => showToast(agent.toUpperCase() + ' stopped'))
                .catch(e => showToast('Failed: ' + e.message, true));
        }}
        
        function wakeAgent(agent) {{
            if (!confirm('Wake ' + agent.toUpperCase() + '?')) return;
            fetch('/api/wake/' + agent, {{ method: 'POST' }})
                .then(r => r.json())
                .then(data => showToast(data.message))
                .catch(e => showToast('Failed: ' + e.message, true));
        }}
        
        function wakeAll() {{
            if (!confirm('Wake ALL agents?')) return;
            fetch('/api/wake-all', {{ method: 'POST' }})
                .then(r => r.json())
                .then(data => {{
                    let msg = 'Wake commands sent:\n';
                    for (let agent in data) {{
                        msg += agent.toUpperCase() + ': ' + data[agent].message + '\n';
                    }}
                    showToast(msg);
                }})
                .catch(e => showToast('Failed: ' + e.message, true));
        }}
        
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>"""

def check_alerts():
    """Background thread: check for missed heartbeats and loops."""
    import time
    while True:
        time.sleep(60)
        status = get_all_status()
        for s in status:
            # Offline alert
            if s['health'] == "🔴 OFFLINE" and not s['alert_sent']:
                send_telegram_alert(f"🚨 {s['agent'].upper()} is OFFLINE! Last seen {s['minutes_ago']} min ago.")
                mark_alert_sent(s['agent'], 'alert')
            
            # Loop alert
            if s['is_looping'] and not s['loop_alert_sent']:
                send_telegram_alert(f"🟠 {s['agent'].upper()} may be LOOPING on: {s['task']} ({s['task_minutes']} min)")
                mark_alert_sent(s['agent'], 'loop')

def send_telegram_alert(msg):
    if not TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": msg}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}))
    except Exception as e:
        print(f"Failed to send alert: {e}")

def mark_alert_sent(agent, alert_type):
    conn = sqlite3.connect(DB_PATH)
    if alert_type == 'alert':
        conn.execute("UPDATE heartbeats SET alert_sent=1 WHERE agent=?", (agent,))
    else:
        conn.execute("UPDATE heartbeats SET loop_alert_sent=1 WHERE agent=?", (agent,))
    conn.commit()
    conn.close()

def wake_agent(agent):
    """Trigger wake for a specific agent."""
    wake_methods = {
        'tripp': {'method': 'self', 'note': 'Dashboard is Tripp — already awake'},
        'cyony': {'method': 'docker', 'command': 'docker restart hermes-agent-8eep-hermes-agent-1'},
        'echo': {'method': 'webhook', 'url': 'http://ECHO_WEBHOOK_URL:8080/wake', 'note': 'Sending wake signal to Echo\'s PC...'}
    }
    
    method = wake_methods.get(agent.lower(), {})
    
    if method.get('method') == 'docker':
        try:
            subprocess.run(method['command'], shell=True, check=True, capture_output=True, timeout=30)
            return {'success': True, 'message': f'{agent.upper()} wake command sent'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    elif method.get('method') == 'webhook':
        # Try to call Echo's webhook
        try:
            import urllib.request
            req = urllib.request.Request(
                method['url'], 
                data=json.dumps({'target': agent, 'source': 'tripp'}).encode(),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            resp = urllib.request.urlopen(req, timeout=30)
            result = json.loads(resp.read())
            return {'success': result.get('success', False), 'message': result.get('message', 'Wake signal sent')}
        except Exception as e:
            # Fallback to manual command if webhook fails
            return {'success': False, 'message': f'Webhook failed: {str(e)}. Run manually: cd "C:\\Users\\eMitchell109\\Documents\\Waking up the triplets" && py .\\Wake.py --target echo'}
    else:
        return {'success': True, 'message': f'{agent.upper()}: {method.get("note", "Manual wake required")}'} 

def wake_all_agents():
    """Wake all agents."""
    results = {}
    for agent in ['tripp', 'cyony', 'echo']:
        results[agent] = wake_agent(agent)
    return results

def main():
    init_db()
    
    alert_thread = threading.Thread(target=check_alerts, daemon=True)
    alert_thread.start()
    
    server = HTTPServer(('0.0.0.0', 18791), HeartbeatHandler)
    print(f"Mission Control running on http://0.0.0.0:18791")
    server.serve_forever()

if __name__ == "__main__":
    main()
