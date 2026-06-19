#!/usr/bin/env python3
"""
Batch Chatterbox TTS generation with crash-safe resume.
Edit the QUIPS list below, then run: python3 batch-generate.py

Resumes from manifest.json — skips already-generated clips.
Generates WAV + OGG (opus 64k) for each clip.
"""
import json, os, sys, time, warnings
warnings.filterwarnings("ignore")

# Fix perth before importing chatterbox
import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
import torchaudio

# === CONFIGURE THESE ===
REF = "/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav"
OUT_DIR = "./output"
MANIFEST = os.path.join(OUT_DIR, "manifest.json")

QUIPS = [
    # (key, text, exaggeration)
    ("example_1", "Hello world, this is a test.", 0.5),
    ("example_2", "Another example with more energy!", 0.7),
]
# === END CONFIG ===

os.makedirs(OUT_DIR, exist_ok=True)

# Load existing manifest
manifest = {}
if os.path.exists(MANIFEST):
    with open(MANIFEST) as f:
        manifest = json.load(f)

# Find what's missing
todo = [(k, t, e) for k, t, e in QUIPS if k not in manifest]
print(f"Total: {len(QUIPS)}, Done: {len(manifest)}, Remaining: {len(todo)}")

if not todo:
    print("All clips generated!")
    sys.exit(0)

# Load model
print("Loading Chatterbox model...")
model = ChatterboxTTS.from_pretrained("cpu")
print(f"Model loaded. Generating {len(todo)} clips...")

start_all = time.time()
for i, (key, text, exh) in enumerate(todo):
    t0 = time.time()
    print(f"  [{i+1}/{len(todo)}] {key}: \"{text[:50]}...\" (exh={exh})")
    
    try:
        wav = model.generate(
            text=text,
            audio_prompt_path=REF,
            exaggeration=exh,
            temperature=0.8,
        )
        
        wav_path = os.path.join(OUT_DIR, f"{key}.wav")
        torchaudio.save(wav_path, wav, model.sr)
        
        # Convert to ogg for web delivery
        ogg_path = os.path.join(OUT_DIR, f"{key}.ogg")
        os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")
        
        duration = time.time() - t0
        
        manifest[key] = {
            "file": f"{key}.wav",
            "ogg": f"{key}.ogg",
            "text": text,
            "exaggeration": exh,
            "duration": round(duration, 1),
        }
        
        # Save manifest after each clip (crash-safe)
        with open(MANIFEST, "w") as f:
            json.dump(manifest, f, indent=2)
        
        elapsed = time.time() - start_all
        eta = (elapsed / (i+1)) * (len(todo) - i - 1)
        print(f"    ✓ Done in {duration:.0f}s (ETA: {eta/60:.0f}m remaining)")
        
    except Exception as e:
        print(f"    ✗ FAILED: {e}")
        continue

total = time.time() - start_all
print(f"\nBatch complete! {len(manifest)}/{len(QUIPS)} clips in {total/60:.1f} minutes")
