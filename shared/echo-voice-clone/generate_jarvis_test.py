#!/usr/bin/env python3
"""Generate a Jarvis voice clone test using Chatterbox TTS."""

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
import torchaudio
import os

# Reference audio - combined Echo/Jarvis clips (30s)
REF_AUDIO = "/opt/data/shared/echo-voice-clone/jarvis_reference_combined.wav"
OUT_DIR = "/opt/data/shared/echo-voice-clone"

# Test quips with different emotions
test_quips = [
    ("jarvis_test_calm", "Good evening, sir. All systems are nominal. How may I assist you today?", 0.35),
    ("jarvis_test_sassy", "With all due respect, sir, that is perhaps the most ridiculous request I have heard this week. And it is only Tuesday.", 0.6),
    ("jarvis_test_playful", "I took the liberty of optimizing your workflow while you were away. You are welcome. I expect a raise.", 0.5),
]

print("Loading Chatterbox model...")
model = ChatterboxTTS.from_pretrained("cpu")

for key, text, exh in test_quips:
    print(f"Generating: {key} (exaggeration={exh})...")
    wav = model.generate(
        text=text,
        audio_prompt_path=REF_AUDIO,
        exaggeration=exh,
        temperature=0.8,
    )
    
    wav_path = os.path.join(OUT_DIR, f"{key}.wav")
    ogg_path = os.path.join(OUT_DIR, f"{key}.ogg")
    
    torchaudio.save(wav_path, wav, model.sr)
    os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")
    print(f"  Saved: {wav_path} + {ogg_path}")

print("\nDone! Jarvis voice clone test clips generated.")
print(f"Output: {OUT_DIR}")
