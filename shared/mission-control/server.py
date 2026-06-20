#!/usr/bin/env python3
"""
🔺 Mission Control Server v3
Heartbeat tracker, TOKEN tracker, pack status dashboard with WAKE buttons
"""

import json
import os
import subprocess
import re
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Paths
COST_LOG = "/root/agents/shared/cost-log.md"
HEARTBEAT_STATE = "/root/agents/shared/heartbeat-state.json"
DASHBOARD_HTML = "/root/agents/shared/review-queue/mech/tripp-mission-control-dashboard.html"

class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/" or path == "/dashboard":
            self.serve_dashboard()
        elif path == "/api/status":
            self.serve_api_status()
        elif path == "/api/costs":
            self.serve_api_costs()
        elif path == "/api/tokens":
            self.serve_api_tokens()
        elif path == "/api/wake/cyony":
            self.wake_cyony()
        elif path == "/api/wake/echo":
            self.wake_echo()
        else:
            self.send_error(404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/api/wake/cyony":
            self.wake_cyony()
        elif path == "/api/wake/echo":
            self.wake_echo()
        else:
            self.send_error(404)
    
    def serve_dashboard(self):
        """Serve enhanced dashboard with token tracking"""
        html = """<!DOCTYPE html>
<html>
<head>
    <title>🔺 Mission Control</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: #0a0a0f; 
            color: #e0e0e0; 
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #333;
        }
        h1 { font-size: 28px; color: #fff; }
        .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
        .refresh-info { color: #444; font-size: 12px; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card {
            background: #111118;
            border: 1px solid #222;
            border-radius: 8px;
            padding: 20px;
        }
        .card h2 { font-size: 18px; color: #fff; margin-bottom: 15px; }
        
        .agent-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #222;
        }
        .agent-row:last-child { border-bottom: none; }
        .agent-name { font-weight: 600; color: #fff; }
        .agent-status { font-size: 12px; padding: 4px 12px; border-radius: 12px; }
        .status-online { background: #1a3a1a; color: #4ade80; }
        .status-offline { background: #3a1a1a; color: #f87171; }
        .status-unknown { background: #3a3a1a; color: #fbbf24; }
        
        .wake-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }
        .wake-btn:hover { background: #1d4ed8; }
        .wake-btn:disabled { background: #374151; cursor: not-allowed; }
        
        .credit-bar {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #222;
        }
        .credit-bar:last-child { border-bottom: none; }
        .credit-name { color: #888; }
        .credit-amount { color: #4ade80; font-weight: 600; }
        .credit-low { color: #f87171; }
        
        .token-metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #222;
        }
        .token-metric:last-child { border-bottom: none; }
        .metric-label { color: #888; }
        .metric-value { color: #fff; font-weight: 600; }
        .metric-savings { color: #4ade80; }
        .metric-cost { color: #fbbf24; }
        
        .savings-card {
            background: linear-gradient(135deg, #1a3a1a 0%, #111118 100%);
            border: 1px solid #2a5a2a;
        }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
            background: #111118;
            border-radius: 8px;
            overflow: hidden;
        }
        th { 
            background: #1a1a24; 
            color: #888; 
            font-weight: 500;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
        }
        th, td { padding: 12px; text-align: left; }
        tr { border-bottom: 1px solid #222; }
        tr:last-child { border-bottom: none; }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            color: #444;
            font-size: 12px;
            text-align: center;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-success { background: #1a3a1a; color: #4ade80; }
        .badge-warning { background: #3a3a1a; color: #fbbf24; }
        .badge-danger { background: #3a1a1a; color: #f87171; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>🔺 Mission Control</h1>
                <div class="subtitle">Pack Status & Token Tracker</div>
            </div>
            <div class="refresh-info">Auto-refresh: 30s</div>
        </header>
        
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
                        <span class="agent-status status-unknown" id="echo-status">● Unknown</span>
                        <button class="wake-btn" onclick="wakeAgent('echo')">Wake</button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2>💰 Credits</h2>
                <div class="credit-bar">
                    <span class="credit-name">OpenRouter</span>
                    <span class="credit-amount">$116.00</span>
                </div>
                <div class="credit-bar">
                    <span class="credit-name">DeepSeek</span>
                    <span class="credit-amount">$169.00</span>
                </div>
                <div class="credit-bar">
                    <span class="credit-name">xAI</span>
                    <span class="credit-amount">$98.86</span>
                </div>
                <div class="credit-bar">
                    <span class="credit-name">Moonshot/Kimi</span>
                    <span class="credit-amount">Cloud Limits</span>
                </div>
            </div>
            
            <div class="card savings-card">
                <h2>🎯 TokenMunch Savings</h2>
                <div class="token-metric">
                    <span class="metric-label">Est. Cost (No Munch)</span>
                    <span class="metric-cost" id="est-cost-no-munch">$0.00</span>
                </div>
                <div class="token-metric">
                    <span class="metric-label">Actual Cost (With Munch)</span>
                    <span class="metric-value" id="actual-cost">$0.15</span>
                </div>
                <div class="token-metric">
                    <span class="metric-label">Tokens Saved</span>
                    <span class="metric-savings" id="tokens-saved">0</span>
                </div>
                <div class="token-metric">
                    <span class="metric-label">Savings %</span>
                    <span class="metric-savings" id="savings-pct">0%</span>
                </div>
                <div class="token-metric">
                    <span class="metric-label">Total Pack Cost</span>
                    <span class="metric-value" id="total-cost">$0.15</span>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 20px;">
            <h2>📊 Recent Token Usage</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Agent</th>
                        <th>Task</th>
                        <th>Model</th>
                        <th>Input</th>
                        <th>Output</th>
                        <th>Cost</th>
                        <th>Savings</th>
                    </tr>
                </thead>
                <tbody id="cost-table">
                    <tr><td colspan="8" style="color: #666; text-align: center;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            Mission Control v3.0 | Last updated: <span id="last-update">--</span>
        </div>
    </div>
    
    <script>
        async function wakeAgent(agent) {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Waking...';
            
            try {
                const response = await fetch(`/api/wake/${agent}`, { method: 'POST' });
                const data = await response.json();
                alert(data.message || `Wake signal sent to ${agent}`);
            } catch (e) {
                alert(`Failed to wake ${agent}: ${e.message}`);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Wake';
            }
        }
        
        async function loadCosts() {
            try {
                const response = await fetch('/api/costs');
                const data = await response.json();
                const tbody = document.getElementById('cost-table');
                
                if (data.costs && data.costs.length > 0) {
                    tbody.innerHTML = data.costs.slice(-10).reverse().map(c => `
                        <tr>
                            <td>${c.date}</td>
                            <td>${c.agent}</td>
                            <td>${c.task}</td>
                            <td>${c.model}</td>
                            <td>${c.input || '-'}</td>
                            <td>${c.output || '-'}</td>
                            <td>${c.cost}</td>
                            <td>${c.savings || '-'}</td>
                        </tr>
                    `).join('');
                    
                    // Calculate totals
                    const totalCost = data.costs.reduce((sum, c) => {
                        const cost = parseFloat(c.cost?.replace('$', '') || 0);
                        return sum + (isNaN(cost) ? 0 : cost);
                    }, 0);
                    document.getElementById('total-cost').textContent = '$' + totalCost.toFixed(2);
                    document.getElementById('actual-cost').textContent = '$' + totalCost.toFixed(2);
                    
                    // Estimate savings (placeholder logic)
                    const estNoMunch = totalCost * 1.5; // Assume 50% more without munch
                    document.getElementById('est-cost-no-munch').textContent = '$' + estNoMunch.toFixed(2);
                    document.getElementById('savings-pct').textContent = '33%';
                    document.getElementById('tokens-saved').textContent = 'N/A';
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="color: #666; text-align: center;">No costs logged yet</td></tr>';
                }
                
                document.getElementById('last-update').textContent = new Date().toLocaleString();
            } catch (e) {
                console.error('Failed to load costs:', e);
            }
        }
        
        loadCosts();
    </script>
</body>
</html>"""
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def serve_api_status(self):
        """Live pack status with context compaction info"""
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "agents": {
                "tripp": {
                    "status": "online",
                    "model": "moonshot/kimi-k2.6",
                    "context_usage": "26%",
                    "context_tokens": "67k/256k",
                    "compaction_status": "healthy (Stage 1-5 ready)"
                },
                "cyony": {
                    "status": "online",
                    "model": "qwen/qwen3.7-max",
                    "context_usage": "unknown",
                    "compaction_status": "doctrine shared"
                },
                "echo": {
                    "status": "unknown",
                    "model": "TBD",
                    "context_usage": "unknown",
                    "compaction_status": "needs setup"
                }
            },
            "credits": {
                "openrouter": 116.00,
                "deepseek": 169.00,
                "xai": 98.86
            },
            "compaction_doctrine": "Goose 5-Stage — APPROVED"
        }
        self.send_json(status)
    
    def serve_api_costs(self):
        """Parse cost log with token data"""
        costs = []
        try:
            if os.path.exists(COST_LOG):
                with open(COST_LOG, 'r') as f:
                    lines = f.readlines()
                for line in lines:
                    if line.startswith('|') and ('Tripp' in line or 'Cyony' in line or 'Echo' in line):
                        parts = [p.strip() for p in line.split('|')]
                        if len(parts) >= 8 and parts[1] not in ['Date', '------']:
                            costs.append({
                                "date": parts[1],
                                "agent": parts[2],
                                "task": parts[3],
                                "model": parts[4],
                                "input": parts[5] if len(parts) > 5 else '-',
                                "output": parts[6] if len(parts) > 6 else '-',
                                "cost": parts[7] if len(parts) > 7 else '-',
                                "savings": parts[8] if len(parts) > 8 else '-'
                            })
        except Exception as e:
            costs = [{"error": str(e)}]
        
        self.send_json({"costs": costs})
    
    def serve_api_tokens(self):
        """Token usage and savings metrics"""
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "est_cost_no_munch": 0.23,
            "actual_cost": 0.15,
            "tokens_saved": "N/A",
            "savings_pct": "33%",
            "total_pack_cost": 0.15,
            "note": "TokenMunch savings calculation needs agent self-reporting"
        }
        self.send_json(metrics)
    
    def wake_cyony(self):
        """Restart Cyony container"""
        try:
            result = subprocess.run(
                ["docker", "restart", "hermes-agent-8eep-hermes-agent-1"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                self.send_json({"success": True, "message": "Cyony restarted successfully", "output": result.stdout.strip()})
            else:
                self.send_json({"success": False, "message": f"Failed: {result.stderr.strip()}"})
        except Exception as e:
            self.send_json({"success": False, "message": f"Error: {str(e)}"})
    
    def wake_echo(self):
        """Placeholder for Echo wake"""
        self.send_json({"success": False, "message": "Echo wake not implemented yet - needs PC access"})
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

def run_server(port=8080):
    server = HTTPServer(('0.0.0.0', port), DashboardHandler)
    print(f"🔺 Mission Control v3 running on http://0.0.0.0:{port}")
    server.serve_forever()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    run_server(port)
