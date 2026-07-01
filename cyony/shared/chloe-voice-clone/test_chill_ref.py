#!/usr/bin/env python3
"""Quick test with Eddie's chill/flirty voice reference."""

import os, time
os.environ["HF_HOME"] = "/opt/data/.cache/huggingface"

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

import torch, torchaudio
from chatterbox.tts import ChatterboxTTS

device = "cpu"
print("Loading Chatterbox...")
model = ChatterboxTTS.from_pretrained(device)

ref = "/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav"
out = "/opt/data/shared/chloe-voice-clone"

# Quick test — one calm, one sassy, using the 60s chill reference
tests = [
    ("chill_ref_calm.wav", 0.3,
     "Hey Eddie. Just checking in. Everything's running smooth. No fires today."),
    ("chill_ref_sassy.wav", 0.7,
     "So you snoozed THREE reminders and now you want me to be impressed? Babe, the bar is on the floor."),
]

for fname, exag, text in tests:
    print(f"\n--- {fname} (exag={exag}) ---")
    t0 = time.time()
    wav = model.generate(text=text, audio_prompt_path=ref, exaggeration=exag, temperature=0.8)
    torchaudio.save(f"{out}/{fname}", wav, model.sr)
    dur = wav.shape[-1] / model.sr
    print(f"  {dur:.1f}s in {time.time()-t0:.1f}s")

print("\nDone!")
