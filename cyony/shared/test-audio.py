import urllib.request

token = 'H1Ot712y0f2yj_Y4xZi-EGxZpU1cwtnrcqW04ngxKN8'
url = 'http://localhost:8788/v1/audio/tts_20260627_213312_6b162b.wav'
headers = {'Authorization': f'Bearer {token}'}

req = urllib.request.Request(url, headers=headers)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    data = resp.read()
    print(f'Audio size: {len(data)} bytes')
    print(f'Content-Type: {resp.headers.get("Content-Type")}')
except Exception as e:
    print(f'Error: {e}')
