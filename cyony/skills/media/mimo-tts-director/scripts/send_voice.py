#!/usr/bin/env python3
"""
Send voice notes to Telegram via Bot API sendVoice endpoint.
tg_send.py is photo-only (sendPhoto). Use this for voice/ogg files.

Usage: python3 send_voice.py <audio_file.ogg> <caption text>
"""
import urllib.request, json, sys, os

# Get bot token from .env
BOT_TOKEN=*** open('/opt/data/.env') as f:
    for line in f:
        if 'TELEGRAM_BOT_TOKEN' in line:
            BOT_TOKEN=*** 1)[1].strip().strip('"')
            break

CHAT_ID = '8808479511'  # Eddie's Telegram chat ID

if len(sys.argv) < 2:
    print("Usage: python3 send_voice.py <audio_file> [caption]")
    sys.exit(1)

filepath = sys.argv[1]
caption = sys.argv[2] if len(sys.argv) > 2 else '🎤'

if not os.path.exists(filepath):
    print(f"❌ File not found: {filepath}")
    sys.exit(1)

# Determine content type
ext = os.path.splitext(filepath)[1].lower()
content_type = {'ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg'}.get(ext, 'audio/ogg')

boundary = '----FormBoundary7MA4YW'
with open(filepath, 'rb') as f:
    audio_data = f.read()

filename = os.path.basename(filepath)
body = (
    f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{CHAT_ID}\r\n'
    f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'
    f'--{boundary}\r\nContent-Disposition: form-data; name="voice"; filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n'
).encode() + audio_data + f'\r\n--{boundary}--\r\n'.encode()

req = urllib.request.Request(
    f'https://api.telegram.org/bot{BOT_TOKEN}/sendVoice',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

with urllib.request.urlopen(req, timeout=60) as resp:
    result = json.loads(resp.read())
    if result.get('ok'):
        print(f'✅ Sent: {filename}')
    else:
        print(f'❌ Error: {result}')
