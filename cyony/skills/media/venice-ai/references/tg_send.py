#!/usr/bin/env python3
"""Send a photo to Telegram. Usage: python3 tg_send.py <image_path> <caption>"""
import urllib.request, json, sys

with open('/opt/data/.env') as f:
    for line in f:
        if line.startswith('TELEGRAM_BOT_TOKEN'):
            bot_token = line.split('=', 1)[1].strip().strip('"')
            break

chat_id = '8808479511'
img_path = sys.argv[1] if len(sys.argv) > 1 else '/opt/data/cyony_kitchen_fal.png'
caption = sys.argv[2] if len(sys.argv) > 2 else '🔧'

with open(img_path, 'rb') as f:
    img = f.read()

boundary = '----FormBoundary7MA4YWxkTrZu0gW'
body = (
    '--' + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n' + chat_id + '\r\n'
    '--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + caption + '\r\n'
    '--' + boundary + '\r\nContent-Disposition: form-data; name="photo"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n'
).encode() + img + ('\r\n--' + boundary + '--\r\n').encode()

req = urllib.request.Request(
    f'https://api.telegram.org/bot{bot_token}/sendPhoto',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
with urllib.request.urlopen(req, timeout=30) as resp:
    r = json.loads(resp.read())
    print('OK' if r.get('ok') else r)
