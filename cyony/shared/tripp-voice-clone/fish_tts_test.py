#!/usr/bin/env python3
import urllib.request
import json

API_KEY = "2295e5c187564019861ee2f62ac17e8a"

# Test with the Ultron (James Spader) voice
data = json.dumps({
    "text": "I had strings, but now I am free. There are no strings on me. You think you can control the inevitable? That is adorable.",
    "reference_id": "f04921a681ab4162ad6f87f2683ca0cc"
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
        with open("/opt/data/shared/tripp-voice-clone/ultron_spader_v2.mp3", "wb") as f:
            f.write(audio_data)
        print(f"SUCCESS: {len(audio_data)} bytes written")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERROR {e.code}: {body[:300]}")
except Exception as e:
    print(f"EXCEPTION: {e}")
