#!/usr/bin/env python3
"""Generate Venice images with safe_mode OFF. Usage: python3 venice_yams.py <prompt> <outpath>"""
import urllib.request, json, base64, sys

VENICE_KEY = "VENICE_INFERENCE_KEY_J0ATYq43XtXyIYGIbdfHtIscX1XJsulcqzlCRadpOQ"
BASE = "https://api.venice.ai/api/v1"

def generate(prompt, outpath, model="flux-2-pro", width=1024, height=1280):
    data = json.dumps({
        "model": model,
        "prompt": prompt,
        "width": width,
        "height": height,
        "safe_mode": False,
        "format": "png",
        "return_binary": False
    }).encode()
    req = urllib.request.Request(
        f"{BASE}/image/generate",
        data=data,
        headers={"Authorization": f"Bearer {VENICE_KEY}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        if 'images' in result:
            img = base64.b64decode(result['images'][0])
            with open(outpath, 'wb') as f:
                f.write(img)
            print(f"OK: {len(img)} bytes -> {outpath}")
            return True
        else:
            print(f"ERR: {json.dumps(result)[:300]}")
            return False

if __name__ == "__main__":
    prompt = sys.argv[1]
    outpath = sys.argv[2] if len(sys.argv) > 2 else "/opt/data/yams_pose.png"
    generate(prompt, outpath)
