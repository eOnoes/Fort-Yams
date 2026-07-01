#!/usr/bin/env python3
"""Pre-generate all static Scout quips with Chatterbox voice cloning."""

import os, json, time
from pathlib import Path

os.environ["HF_HOME"] = "/opt/data/.cache/huggingface"

import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

import torch, torchaudio
from chatterbox.tts import ChatterboxTTS

REF = "/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav"
OUT_DIR = Path("/opt/data/SideQuestHQ/public/audio/scout")
OUT_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST = OUT_DIR / "manifest.json"

# All static quips from the SQHQ app
QUIPS = {
    # Snooze toast tiers (HomeFeed.tsx)
    "snooze_warn_1": (0.4, "Should I get you coffee since you're so lazy right now?"),
    "snooze_warn_2": (0.4, "You're building a bad habit here."),
    "snooze_warn_3": (0.4, "Snooze button broken? Or is that just your motivation?"),
    "snooze_warn_4": (0.4, "I see you. Snoozing. I'm taking notes."),
    "snooze_warn_5": (0.4, "This is how it starts. First a snooze, then total chaos."),
    "snooze_warn_6": (0.4, "You know what doesn't snooze? Your bills."),
    
    "snooze_scold_1": (0.7, "Oh, again? Cool cool cool."),
    "snooze_scold_2": (0.7, "Two snoozes. I'm not angry, just disappointed. Okay I'm a little angry."),
    "snooze_scold_3": (0.7, "You're really testing me today."),
    "snooze_scold_4": (0.7, "I'm putting this in your permanent record."),
    "snooze_scold_5": (0.7, "The snooze button is not a life strategy, Eddie."),
    "snooze_scold_6": (0.7, "Bold move snoozing that again. Bold and wrong."),
    
    "snooze_giveup_1": (0.9, "Yeah, fuck it. Who cares right? Why am I even here?"),
    "snooze_giveup_2": (0.9, "Three snoozes. I quit. You win. Enjoy your chaos."),
    "snooze_giveup_3": (0.9, "I'm just gonna sit here. In the dark. While you snooze everything."),
    "snooze_giveup_4": (0.9, "You know what? Snooze the whole app. Snooze your whole life."),
    "snooze_giveup_5": (0.9, "I'm not even mad anymore. I'm just tired."),
    "snooze_giveup_6": (0.9, "Congratulations. You've broken an AI's will to remind."),
    
    # Complete quips (HomeFeed.tsx)
    "complete_1": (0.5, "Well look at you being productive."),
    "complete_2": (0.5, "One down. How many to go? Don't ask."),
    "complete_3": (0.5, "Done. Filed. Forgotten. By me, not by you probably."),
    "complete_4": (0.5, "Marking that one off before you change your mind."),
    "complete_5": (0.5, "And that is how it's done."),
    
    # Dismiss quips (HomeFeed.tsx)
    "dismiss_1": (0.6, "Wow, unreal. I will just remind you again."),
    "dismiss_2": (0.6, "Snoozed. I'll bring it back when you're ready to be an adult."),
    "dismiss_3": (0.6, "Fine. Sweeping that under the rug for now."),
    "dismiss_4": (0.6, "Dismissed. But I have the receipts."),
    "dismiss_5": (0.6, "Putting that in the deal with later pile. It's a big pile."),
    "dismiss_6": (0.6, "Okay but when this comes back around, don't say I didn't warn you."),
    "dismiss_7": (0.6, "Sure. Snooze. Whatever."),
    "dismiss_8": (0.6, "That's going back in the pile and I'm not happy about it."),
    "dismiss_9": (0.6, "You're lucky I'm an AI and can't actually throw things."),
    
    # Greetings (HomeFeed.tsx)
    "greet_calm_1": (0.3, "Good afternoon, Eddie."),
    "greet_calm_2": (0.3, "Evening. Let's see what we've got."),
    "greet_calm_3": (0.3, "Everything's nominal. Mostly."),
    "greet_annoyed_1": (0.7, "We need to talk."),
    "greet_annoyed_2": (0.7, "I've been waiting."),
    "greet_annoyed_3": (0.7, "You have some explaining to do."),
    "greet_playful_1": (0.5, "Hey there, stranger."),
    "greet_playful_2": (0.5, "Look who finally showed up."),
    "greet_playful_3": (0.5, "Well well well."),
    "greet_chill_1": (0.3, "Hey. No rush. Just vibing."),
    "greet_chill_2": (0.3, "Sup. Take your time."),
    "greet_chill_3": (0.3, "Just hanging out. You do you."),
}

def main():
    print(f"Loading Chatterbox with reference: {REF}")
    t0 = time.time()
    model = ChatterboxTTS.from_pretrained("cpu")
    print(f"Model loaded in {time.time() - t0:.1f}s")
    
    # Load existing manifest
    manifest = {}
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text())
    
    total = len(QUIPS)
    done = 0
    skipped = 0
    
    for key, (exag, text) in QUIPS.items():
        fname = f"{key}.wav"
        fpath = OUT_DIR / fname
        
        # Skip if already generated
        if key in manifest and fpath.exists():
            skipped += 1
            done += 1
            continue
        
        print(f"\n[{done+1}/{total}] {key} (exag={exag})")
        print(f"  \"{text[:60]}...\"" if len(text) > 60 else f"  \"{text}\"")
        
        t1 = time.time()
        wav = model.generate(
            text=text,
            audio_prompt_path=REF,
            exaggeration=exag,
            temperature=0.8,
        )
        torchaudio.save(str(fpath), wav, model.sr)
        
        # Also save as ogg for smaller file size
        ogg_path = OUT_DIR / f"{key}.ogg"
        # torchaudio can't write ogg directly, but we'll convert with ffmpeg after
        
        dur = wav.shape[-1] / model.sr
        elapsed = time.time() - t1
        
        manifest[key] = {
            "file": fname,
            "ogg": f"{key}.ogg",
            "text": text,
            "exaggeration": exag,
            "duration": round(dur, 1),
        }
        
        # Save manifest after each clip (in case of interruption)
        MANIFEST.write_text(json.dumps(manifest, indent=2))
        
        done += 1
        print(f"  ✓ {dur:.1f}s in {elapsed:.1f}s ({dur/elapsed:.2f}x RT)")
    
    if skipped:
        print(f"\nSkipped {skipped} already-generated clips")
    
    print(f"\n=== DONE: {done}/{total} clips generated ===")
    print(f"Manifest: {MANIFEST}")

if __name__ == "__main__":
    main()
