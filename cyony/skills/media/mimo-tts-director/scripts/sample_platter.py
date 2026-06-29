#!/usr/bin/env python3
"""MiMo Director Mode — Sample Platter Generator.
Generates multiple emotional style samples in one batch run.
Usage: python3 sample_platter.py [all|specific_name]
Requires: MIMO_API_KEY in /opt/data/.env (token plan key, starts with tp-)
"""
import json, urllib.request, os, base64, sys, time

mimo_key = None
with open(os.path.expanduser('/opt/data/.env'), 'r') as f:
    for line in f:
        if 'MIMO_API_KEY' in line:
            parts = line.split('=', 1)
            if len(parts) > 1:
                candidate = parts[1].strip().strip('"').strip("'")
                if len(candidate) > 10:
                    mimo_key = candidate
                    break

BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1"
H = {"api-key": mimo_key, "Content-Type": "application/json"}
OUT = "/opt/data/audio_cache"

def generate(director, text, filename, voice="Chloe"):
    payload = json.dumps({
        "model": "mimo-v2.5-tts",
        "messages": [
            {"role": "user", "content": director},
            {"role": "assistant", "content": text}
        ],
        "audio": {"format": "wav", "voice": voice}
    }).encode()
    req = urllib.request.Request(BASE_URL + "/chat/completions", data=payload, headers=H)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            msg = data.get('choices', [{}])[0].get('message', {})
            audio_data = msg.get('audio', {})
            if isinstance(audio_data, dict) and 'data' in audio_data:
                audio_bytes = base64.b64decode(audio_data['data'])
                wav_path = os.path.join(OUT, filename + ".wav")
                ogg_path = os.path.join(OUT, filename + ".ogg")
                with open(wav_path, 'wb') as f:
                    f.write(audio_bytes)
                os.system(f'ffmpeg -i "{wav_path}" -codec:a libvorbis -qscale:a 5 "{ogg_path}" -y 2>/dev/null')
                os.remove(wav_path)
                return True, len(audio_bytes)
    except Exception as e:
        return False, str(e)[:100]
    return False, "unknown"

# Add samples here. Each needs: name, director, text
samples = []  # Populate from conversation or template

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "list"
    if action == "list":
        for s in samples:
            print(s["name"])
    else:
        for s in samples:
            if action == "all" or s["name"] == action:
                print(f"\n[{s['name']}]")
                ok, result = generate(s["director"], s["text"], s["name"])
                print(f"  {'OK' if ok else 'FAILED'}: {result}")
                time.sleep(3)
