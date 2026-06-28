#!/usr/bin/env python3
import urllib.request
import json
import subprocess

API_KEY="2295e5c187564019861ee2f62ac17e8a"
voices = [
    ("bb70f7b4aedf4f458ba6ec34d73c42e5", "reddington_confident"),
    ("c3b9dd241d59423aa9936cecfddc78bd", "reddington_dramatic"),
    ("95340690fd1142e899b46d8cbf566e93", "spader_warm"),
]

text = "You see, most men go through life chasing things that don't matter. Money. Status. Approval. But the truly dangerous ones? They chase clarity. And once you have clarity, everything else falls into place."

for voice_id, name in voices:
    print(f"Trying {name}...")
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
            subprocess.run([
                "ffmpeg", "-y", "-i", mp3_path,
                "-af", "volume=2.5",
                "-c:a", "libopus", "-b:a", "64k",
                ogg_path
            ], capture_output=True)
            result = subprocess.run([
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", ogg_path
            ], capture_output=True, text=True)
            dur = float(json.loads(result.stdout)["format"]["duration"])
            print(f"  OK: {dur:.1f}s")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  FAIL {e.code}: {body[:100]}")
    except Exception as e:
        print(f"  ERROR: {e}")
