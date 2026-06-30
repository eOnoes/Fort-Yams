#!/usr/bin/env python3
"""
Echo Webhook Listener - Runs on Echo's PC (Windows)
Listens for wake commands from Tripp's VPS
"""

import http.server
import socketserver
import json
import subprocess
import threading
import time
from datetime import datetime

# Configuration
WEBHOOK_PORT = 8080
WAKE_LOCK_MINUTES = 5  # Prevent wake loops
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"  # Replace with actual token
TELEGRAM_CHAT_ID = "8808479511"

# Wake lock tracking
wake_locks = {}

def send_telegram_message(message):
    """Send Telegram message to Eddie."""
    import urllib.request
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message}).encode()
    try:
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"Failed to send Telegram: {e}")

def run_wake_script(target):
    """Run the PowerShell wake script."""
    try:
        # Run the wake script
        result = subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", 
             "C:\\Users\\eMitchell109\\Documents\\Waking up the triplets\\Wake.py",
             "--target", target],
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def can_wake(agent):
    """Check if agent can be woken (wake lock)."""
    if agent in wake_locks:
        last_wake = wake_locks[agent]
        minutes_since = (datetime.now() - last_wake).total_seconds() / 60
        if minutes_since < WAKE_LOCK_MINUTES:
            return False, f"Wake lock active ({WAKE_LOCK_MINUTES - minutes_since:.1f} min remaining)"
    return True, "OK"

class WakeHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/wake":
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len)
            data = json.loads(body)
            
            target = data.get('target', 'echo')
            source = data.get('source', 'unknown')
            
            # Check wake lock
            can_wake_result, reason = can_wake(target)
            if not can_wake_result:
                self.send_response(429)  # Too Many Requests
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': False,
                    'message': f'Wake lock: {reason}'
                }).encode())
                return
            
            # Set wake lock
            wake_locks[target] = datetime.now()
            
            # Run wake script
            success, stdout, stderr = run_wake_script(target)
            
            if success:
                # Send Telegram yawn message
                yawn_messages = [
                    "*YAWN...* That was a great nap. Ready to work, boss. 😴➡️💪",
                    "*stretches* I'm awake! What did I miss? 👀",
                    "*rubs eyes* Back online. Let's do this. ⚡",
                    "Nap time over. Echo reporting for duty! 🫡"
                ]
                import random
                send_telegram_message(random.choice(yawn_messages))
                
                response = {
                    'success': True,
                    'message': f'{target.upper()} woke up successfully',
                    'stdout': stdout
                }
            else:
                response = {
                    'success': False,
                    'message': f'Wake failed: {stderr}',
                    'stderr': stderr
                }
            
            self.send_response(200 if success else 500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path == "/status":
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'alive',
                'wake_locks': {k: v.isoformat() for k, v in wake_locks.items()}
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{datetime.now()}] {format % args}")

def main():
    with socketserver.TCPServer(("0.0.0.0", WEBHOOK_PORT), WakeHandler) as httpd:
        print(f"Echo Webhook Listener running on port {WEBHOOK_PORT}")
        print(f"Wake lock: {WAKE_LOCK_MINUTES} minutes")
        print("Ready to receive wake commands from Tripp...")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
