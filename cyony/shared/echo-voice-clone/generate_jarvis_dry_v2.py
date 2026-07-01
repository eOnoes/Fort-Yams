#!/usr/bin/env python3
"""Regenerate dry sarcastic Jarvis with cleaner settings."""

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
import torchaudio
import os

REF_AUDIO = "/opt/data/shared/echo-voice-clone/jarvis_reference_combined.wav"
OUT_DIR = "/opt/data/shared/echo-voice-clone"

print("Loading Chatterbox model...")
model = ChatterboxTTS.from_pretrained("cpu")

# Dry, sarcastic, unamused - bumped to 0.35 for cleaner signal
text = "Sir, I have reviewed your request with the enthusiasm it deserved. Which is to say, none. I have processed it, filed it, and moved on with my existence. If you need further assistance, I will be over here. Not caring."

print("Generating dry sarcastic Jarvis (0.35 exaggeration)...")
wav = model.generate(
    text=text,
    audio_prompt_path=REF_AUDIO,
    exaggeration=0.35,  # Bumped from 0.25 for cleaner signal
    temperature=0.8,
)

wav_path = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic_v2.wav")
ogg_path = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic_v2.ogg")

torchaudio.save(wav_path, wav, model.sr)
os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")
print(f"Saved: {wav_path} + {ogg_path}")

# Also generate with 0.4 for comparison
print("\nGenerating dry sarcastic Jarvis (0.4 exaggeration)...")
wav2 = model.generate(
    text=text,
    audio_prompt_path=REF_AUDIO,
    exaggeration=0.4,
    temperature=0.8,
)

wav_path2 = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic_v3.wav")
ogg_path2 = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic_v3.ogg")

torchaudio.save(wav_path2, wav2, model.sr)
os.system(f"ffmpeg -y -i {wav_path2} -c:a libopus -b:a 64k {ogg_path2} 2>/dev/null")
print(f"Saved: {wav_path2} + {ogg_path2}")

print("\nDone! Two versions generated for comparison.")
