#!/usr/bin/env python3
"""Test Chatterbox voice cloning with Chloe reference samples."""

import os
import time
from pathlib import Path

os.environ["HF_HOME"] = "/opt/data/.cache/huggingface"

# Patch perth before importing chatterbox
import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

import torch
import torchaudio

print("Loading Chatterbox TTS model...")
t0 = time.time()
from chatterbox.tts import ChatterboxTTS

device = "cpu"
model = ChatterboxTTS.from_pretrained(device)
print(f"Model loaded in {time.time() - t0:.1f}s on {device}")

ref_audio = "/opt/data/shared/chloe-voice-clone/chloe_sample_1.wav"
ref_audio2 = "/opt/data/shared/chloe-voice-clone/chloe_sample_2.wav"
output_dir = Path("/opt/data/shared/chloe-voice-clone")

tests = [
    ("chloe_clone_calm.wav", ref_audio, 
     "Hey Eddie. Let's review what we've got on the ledger today. Nothing too crazy.",
     0.3, "calm"),
    ("chloe_clone_annoyed.wav", ref_audio, 
     "We talked about this. The power bill is overdue by three days. I'm not repeating myself.",
     0.8, "annoyed"),
    ("chloe_clone_playful.wav", ref_audio2, 
     "Psst. Eddie. The power bill is looking at you. Might wanna return the gaze.",
     0.5, "playful"),
    ("chloe_clone_sigh.wav", ref_audio,
     "Sigh. Fine. I'll add it to the pile. But I'm not happy about it.",
     0.7, "sigh"),
]

for fname, ref, text, exaggeration, label in tests:
    print(f"\n--- {label.upper()} (exag={exaggeration}) ---")
    print(f"  Text: {text[:60]}...")
    t0 = time.time()
    wav = model.generate(
        text=text,
        audio_prompt_path=ref,
        exaggeration=exaggeration,
        temperature=0.8,
    )
    out_path = output_dir / fname
    torchaudio.save(str(out_path), wav, model.sr)
    elapsed = time.time() - t0
    duration = wav.shape[-1] / model.sr
    speed = duration / elapsed
    print(f"  Generated {duration:.1f}s in {elapsed:.1f}s ({speed:.2f}x realtime)")
    print(f"  Saved: {out_path}")

print("\n=== DONE ===")
print(f"All {len(tests)} cloned samples saved to {output_dir}")
