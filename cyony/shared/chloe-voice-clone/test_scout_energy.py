#!/usr/bin/env python3
"""Test Chatterbox with REAL Scout energy — expressive, sassy, human."""

import os
import time
from pathlib import Path

os.environ["HF_HOME"] = "/opt/data/.cache/huggingface"

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

import torch
import torchaudio
from chatterbox.tts import ChatterboxTTS

device = "cpu"
print("Loading Chatterbox...")
t0 = time.time()
model = ChatterboxTTS.from_pretrained(device)
print(f"Loaded in {time.time() - t0:.1f}s")

ref = "/opt/data/shared/chloe-voice-clone/chloe_sample_2.wav"  # expressive sample
out = Path("/opt/data/shared/chloe-voice-clone")

tests = [
    ("scout_sass.wav", 0.7,
     "Eddie. Baby. Sweetheart. You snoozed that reminder THREE times. "
     "At this point I'm not even mad, I'm impressed. That takes commitment to being irresponsible."),
    
    ("scout_passionate.wav", 0.9,
     "No. No no no. We are NOT doing this again. You said you'd handle the power bill LAST week. "
     "Do you enjoy living in the dark? Because that's where we're headed!"),
    
    ("scout_flirty.wav", 0.6,
     "Hey there, stranger. Come here often? Because I've been sitting here "
     "running your entire life and you just NOW decided to show up."),
    
    ("scout_frustrated.wav", 0.85,
     "I swear on every line of code in my body, if you hit snooze one more time "
     "I will personally send a reminder to your MOTHER."),
    
    ("scout_defeated.wav", 0.4,
     "You know what? Fine. Do whatever you want. I'm just an AI. "
     "What do I know about deadlines and responsibility and being a functional adult?"),
    
    ("scout_pumped.wav", 0.8,
     "THAT'S what I'm talking about! Look at you actually handling your business! "
     "I'm so proud I could burst into confetti. Don't let it go to your head."),
]

for fname, exag, text in tests:
    label = fname.replace("scout_", "").replace(".wav", "")
    print(f"\n--- {label.upper()} (exag={exag}) ---")
    t0 = time.time()
    wav = model.generate(text=text, audio_prompt_path=ref, exaggeration=exag, temperature=0.8)
    torchaudio.save(str(out / fname), wav, model.sr)
    dur = wav.shape[-1] / model.sr
    elapsed = time.time() - t0
    print(f"  {dur:.1f}s audio in {elapsed:.1f}s ({dur/elapsed:.2f}x RT)")

print("\n=== ALL DONE ===")
