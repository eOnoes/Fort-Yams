import urllib.request, json

token = 'H1Ot712y0f2yj_Y4xZi-EGxZpU1cwtnrcqW04ngxKN8'
url = 'http://localhost:8788/v1/tts'
headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
data = json.dumps({'text': 'Audit test from Cyony', 'voice': 'chloe'}).encode()

req = urllib.request.Request(url, data=data, headers=headers)
try:
    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read())
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Error: {e}')
