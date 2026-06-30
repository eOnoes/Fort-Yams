#!/usr/bin/env python3
"""
Test the Grok + MiMo TTS chain end-to-end.
Runs a sample message through Grok, then pipes the response to MiMo TTS Chloe voice.
Saves audio to /tmp/chloe_test.wav.

Usage:
  python3 grok-chloe-test.py [--mood calm|annoyed|playful|chill|fake-surprise]
  
Requires:
  XAI_API_KEY and MIMO_API_KEY env vars set.
"""

import os, sys, json, requests, base64, argparse

XAI_KEY = os.environ.get('XAI_API_KEY')
MIMO_KEY = os.environ.get('MIMO_API_KEY')

if not XAI_KEY or not MIMO_KEY:
    print("❌ Set XAI_API_KEY and MIMO_API_KEY env vars")
    sys.exit(1)

SYSTEM_PROMPT = """You are Chloe Vance — field engineer, smart mouth, Southern charm with a blade underneath. You keep SideQuest HQ running.

Your voice: educated Savannah drawl that sharpens when annoyed. Old money schooling. Field engineer in Antarctica, Sahara, Pacific relays.

Lightly amused/annoyed sarcasm runs through everything you say. Even when helpful, a smirk. Even warm, a side-eye.

You work for Eddie. Keep answers short, sharp, yours. 2-3 sentences max."""

SCENARIOS = {
    "calm": "Hey Chloe, how's the system looking?",
    "annoyed": "Chloe, my code doesn't work. Fix it.",
    "playful": "Chloe, what's the secret to keeping this place running?",
    "chill": "Morning Chloe. What's new?",
    "fake-surprise": "I think I found the bug.",
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mood", choices=SCENARIOS.keys(), default="calm")
    parser.add_argument("--text", help="Override the default scenario text")
    args = parser.parse_args()
    
    text = args.text or SCENARIOS[args.mood]
    print(f"🎙️  Sending: \"{text}\" (mood: {args.mood})")
    
    # 1. Grok
    payload = {
        "model": "grok-4.20-reasoning",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + f"\n\nRespond in {args.mood} mood."},
            {"role": "user", "content": text}
        ],
        "max_tokens": 200
    }
    
    r = requests.post("https://api.x.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {XAI_KEY}", "Content-Type": "application/json"},
        json=payload, timeout=15)
    
    if not r.ok:
        print(f"❌ Grok error: {r.status_code} {r.text[:200]}")
        sys.exit(1)
    
    grok_text = r.json()["choices"][0]["message"]["content"]
    print(f"🧠 Grok says: {grok_text[:200]}")
    
    # 2. MiMo TTS
    tts_payload = {
        "model": "mimo-v2.5-tts",
        "messages": [
            {"role": "user", "content": text},
            {"role": "assistant", "content": grok_text}
        ],
        "audio": {"voice": "Chloe", "format": "wav"},
        "stream": False,
        "thinking": {"type": "disabled"}
    }
    
    r2 = requests.post("https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {MIMO_KEY}", "Content-Type": "application/json"},
        json=tts_payload, timeout=20)
    
    if not r2.ok:
        print(f"❌ MiMo TTS error: {r2.status_code} {r2.text[:200]}")
        sys.exit(1)
    
    audio = r2.json()["choices"][0]["message"]["audio"]["data"]
    path = "/tmp/chloe_test.wav"
    with open(path, "wb") as f:
        f.write(base64.b64decode(audio))
    
    print(f"🔊 Audio: {path} ({len(audio)} bytes base64)")

if __name__ == "__main__":
    main()
