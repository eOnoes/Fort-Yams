#!/usr/bin/env python3
import urllib.request
import json
import subprocess
import os

API_KEY="2295...8a"
voices = [
    ("95340690fd1142e899b46d8cbf566e93", "spader_warm"),
    ("b769a32ae8944012bac23bc7c9034d1b", "spader_deep"),
    ("685cedbb1f4741e4a22ca12d1f77d115", "spader_commanding"),
]

text = "I appreciate the candor. But let me be clear. I don't make threats. I make promises. And I always deliver. That's not arrogance. That's just the math."

for voice_id, name in voices:
    data = json.dumps({
        "text": text,
        "reference_id": voice_id
    }).encode()

    req = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=data,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req) as resp:
            audio_data = resp.read()
            mp3_path = f"/opt/data/shared/tripp-voice-clone/{name}.mp3"
            ogg_path = f"/opt/data/shared/tripp-voice-clone/{name}.ogg"
            with open(mp3_path, "wb") as f:
                f.write(audio_data)
            # Boost volume by 2x and convert to ogg
            subprocess.run([
                "ffmpeg", "-y", "-i", mp3_path,
                "-af", "volume=2.0",
                "-c:a", "libopus", "-b:a", "64k",
                ogg_path
            ], capture_output=True)
            # Get duration
            result = subprocess.run([
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", ogg_path
            ], capture_output=True, text=True)
            dur = float(json.loads(result.stdout)["format"]["duration"])
            size = os.path.getsize(ogg_path) / 1024
            print(f"OK {name}: {dur:.1f}s, {size:.0f}KB")
    except Exception as e:
        print(f"FAIL {name}: {e}")
