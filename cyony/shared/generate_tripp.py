#!/usr/bin/env python3
import urllib.request, json, subprocess, os

API_KEY = os.environ.get("FISH_KEY", "")
voice_id = "bb70f7b4aedf4f458ba6ec34d73c42e5"

lines = [
    ("tripp_intro", "The name is Tripp. I handle operations. If something needs building, fixing, or breaking in a controlled manner, I am your guy."),
    ("tripp_task", "Consider it done. I will have the results on your desk by morning. And by desk, I mean your Telegram."),
    ("tripp_dry", "With all due respect, that is the worst idea I have heard today. And I have heard some bad ones."),
]

for name, text in lines:
    print(f"Generating {name}...")
    data = json.dumps({"text": text, "reference_id": voice_id}).encode()
    req = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=data,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            audio_data = resp.read()
            mp3_path = f"/opt/data/shared/tripp-voice-clone/{name}.mp3"
            ogg_path = f"/opt/data/shared/tripp-voice-clone/{name}.ogg"
            with open(mp3_path, "wb") as f:
                f.write(audio_data)
            subprocess.run(["ffmpeg", "-y", "-i", mp3_path, "-af", "volume=2.5", "-c:a", "libopus", "-b:a", "64k", ogg_path], capture_output=True)
            result = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", ogg_path], capture_output=True, text=True)
            dur = float(json.loads(result.stdout)["format"]["duration"])
            print(f"  OK: {dur:.1f}s")
    except Exception as e:
        print(f"  FAIL: {e}")
