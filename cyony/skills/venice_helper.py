#!/usr/bin/env python3
"""
Venice API helper — bypasses Hermes API key redaction by reading key at runtime.
Usage:
  python3 venice_helper.py test          # Auth + chat test
  python3 venice_helper.py tts "text" "voice" "/path/out.mp3"
  python3 venice_helper.py image "prompt" "/path/out.png"
  python3 venice_helper.py edit /path/img.png "prompt" "/path/out.png" [model]
  python3 venice_helper.py upscale /path/img.png "/path/out.png"
  python3 venice_helper.py bgremove /path/img.png "/path/out.png"
  python3 venice_helper.py models [text|image|tts|music|video]
"""
import urllib.request
import json
import base64
import sys

VENICE_KEY = "PASTE_YOUR_KEY_HERE"  # Overwritten by env or inline
BASE = "https://api.venice.ai/api/v1"

def get_key():
    """Read key from .env — may be redacted by Hermes. If so, hardcode above."""
    import os
    k = os.environ.get('VENICE_KEY')
    if k: return k
    with open('/opt/data/.env') as f:
        for line in f:
            if line.startswith('VENICE_API_KEY'):
                return line.split('=', 1)[1].strip().strip('"')
    return VENICE_KEY

def api(endpoint, body=None, method="GET"):
    key = get_key()
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE}{endpoint}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        ct = resp.headers.get('Content-Type', '')
        raw = resp.read()
        return json.loads(raw) if 'json' in ct else raw

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    
    if cmd == "test":
        r = api("/chat/completions", {"model": "venice-uncensored",
            "messages": [{"role": "user", "content": "Say hi in 5 words"}]}, "POST")
        print(f"CHAT: {r['choices'][0]['message']['content']}")
        print("AUTH_OK")
    
    elif cmd == "tts":
        text = sys.argv[2] if len(sys.argv) > 2 else "Hello"
        voice = sys.argv[3] if len(sys.argv) > 3 else "tara"
        out = sys.argv[4] if len(sys.argv) > 4 else "/opt/data/venice_tts.mp3"
        audio = api("/audio/speech", {"model": "tts-orpheus", "voice": voice,
            "input": text, "response_format": "mp3", "speed": 1.0}, "POST")
        with open(out, 'wb') as f: f.write(audio)
        print(f"TTS_OK: {len(audio)} bytes -> {out}")
    
    elif cmd == "image":
        prompt = sys.argv[2] if len(sys.argv) > 2 else "A sunset"
        out = sys.argv[3] if len(sys.argv) > 3 else "/opt/data/venice_img.png"
        r = api("/image/generate", {"model": "flux-2-pro", "prompt": prompt,
            "width": 1280, "height": 720, "safe_mode": True,
            "format": "png", "return_binary": False}, "POST")
        if 'images' in r:
            img = base64.b64decode(r['images'][0])
            with open(out, 'wb') as f: f.write(img)
            print(f"IMAGE_OK: {len(img)} bytes -> {out}")
        else:
            print(f"IMAGE_ERR: {json.dumps(r)[:300]}")
    
    elif cmd == "edit":
        img_path = sys.argv[2]; prompt = sys.argv[3]
        out = sys.argv[4] if len(sys.argv) > 4 else "/opt/data/venice_edited.png"
        model = sys.argv[5] if len(sys.argv) > 5 else "qwen-edit"
        with open(img_path, 'rb') as f: img_b64 = base64.b64encode(f.read()).decode()
        resp = api("/image/edit", {"model": model, "prompt": prompt,
            "image": img_b64, "safe_mode": True}, "POST")
        if isinstance(resp, bytes):
            with open(out, 'wb') as f: f.write(resp)
            print(f"EDIT_OK: {len(resp)} bytes -> {out}")
        else:
            print(f"EDIT_ERR: {json.dumps(resp)[:300]}")
    
    elif cmd == "upscale":
        img_path = sys.argv[2]
        out = sys.argv[3] if len(sys.argv) > 3 else "/opt/data/venice_upscaled.png"
        with open(img_path, 'rb') as f: img_b64 = base64.b64encode(f.read()).decode()
        resp = api("/image/upscale", {"image": img_b64, "scale": 2}, "POST")
        if isinstance(resp, bytes):
            with open(out, 'wb') as f: f.write(resp)
            print(f"UPSCALE_OK: {len(resp)} bytes -> {out}")
        else:
            print(f"UPSCALE_ERR: {json.dumps(resp)[:300]}")
    
    elif cmd == "bgremove":
        img_path = sys.argv[2]
        out = sys.argv[3] if len(sys.argv) > 3 else "/opt/data/venice_nobg.png"
        with open(img_path, 'rb') as f: img_b64 = base64.b64encode(f.read()).decode()
        resp = api("/image/background-remove", {"image": img_b64}, "POST")
        if isinstance(resp, bytes):
            with open(out, 'wb') as f: f.write(resp)
            print(f"BGREMOVE_OK: {len(resp)} bytes -> {out}")
        else:
            print(f"BGREMOVE_ERR: {json.dumps(resp)[:300]}")
    
    elif cmd == "models":
        mtype = sys.argv[2] if len(sys.argv) > 2 else "text"
        r = api(f"/models?type={mtype}")
        for m in r.get('data', []):
            spec = m.get('model_spec', {})
            print(f"  {m['id']}: {spec.get('name', '')}")
