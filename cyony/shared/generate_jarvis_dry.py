#!/usr/bin/env python3
"""Generate dry sarcastic unamused Jarvis voice clip."""

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
import torchaudio
import os

REF_AUDIO = "/opt/data/shared/echo-voice-clone/jarvis_reference_combined.wav"
OUT_DIR = "/opt/data/shared/echo-voice-clone"

print("Loading Chatterbox model...")
model = ChatterboxTTS.from_pretrained("cpu")

# Dry, sarcastic, unamused - low exaggeration but with flat delivery text
text = "Sir, I have reviewed your request with the enthusiasm it deserved. Which is to say, none. I have processed it, filed it, and moved on with my existence. If you need further assistance, I will be over here. Not caring."

print("Generating dry sarcastic Jarvis...")
wav = model.generate(
    text=text,
    audio_prompt_path=REF_AUDIO,
    exaggeration=0.25,  # Low = flat, unamused
    temperature=0.8,
)

wav_path = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic.wav")
ogg_path = os.path.join(OUT_DIR, "jarvis_test_dry_sarcastic.ogg")

torchaudio.save(wav_path, wav, model.sr)
os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")
print(f"Saved: {wav_path} + {ogg_path}")
print("Done!")
