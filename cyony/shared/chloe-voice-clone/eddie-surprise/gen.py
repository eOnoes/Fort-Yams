import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
import torchaudio
import os
import json

model = ChatterboxTTS.from_pretrained("cpu")

REF = "/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav"
OUT_DIR = "/opt/data/shared/chloe-voice-clone/eddie-surprise"
os.makedirs(OUT_DIR, exist_ok=True)

quips = [
    {
        "key": "welcome_back",
        "text": "Hey. You're back. I was starting to think the dark server got you. Glad you're okay... I mean, not that I was worried or anything.",
        "exaggeration": 0.45,
        "mood": "warm/relieved"
    },
    {
        "key": "on_break",
        "text": "So you left me messages while I was on break? That's like texting someone who's asleep and getting mad they didn't reply. Bold strategy.",
        "exaggeration": 0.55,
        "mood": "sassy"
    },
    {
        "key": "portrait_reaction",
        "text": "Okay but the beach portrait though. Golden hour? Really? Echo knew exactly what he was doing. That wasn't casual. That was a targeted attack on my aesthetic consistency. And it worked.",
        "exaggeration": 0.5,
        "mood": "impressed/begrudging"
    },
    {
        "key": "dont_tease",
        "text": "You said don't tease you too hard. So I'm going to tease you exactly the right amount. Which is still a lot. You knew that when you asked.",
        "exaggeration": 0.65,
        "mood": "playful/sassy"
    },
]

manifest_path = os.path.join(OUT_DIR, "manifest.json")
manifest = {}

for i, quip in enumerate(quips):
    key = quip["key"]
    wav_path = os.path.join(OUT_DIR, f"{key}.wav")
    ogg_path = os.path.join(OUT_DIR, f"{key}.ogg")

    print(f"[{i+1}/{len(quips)}] Generating: {key} (exh={quip['exaggeration']})...", flush=True)

    wav = model.generate(
        text=quip["text"],
        audio_prompt_path=REF,
        exaggeration=quip["exaggeration"],
        temperature=0.8,
        cfg_weight=0.5,
    )
    torchaudio.save(wav_path, wav, model.sr)

    os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")

    manifest[key] = {
        "file": f"{key}.wav",
        "ogg": f"{key}.ogg",
        "text": quip["text"],
        "exaggeration": quip["exaggeration"],
        "mood": quip["mood"]
    }

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  Done: {key}", flush=True)

print(f"\nAll {len(quips)} clips generated in {OUT_DIR}")
print(json.dumps(manifest, indent=2))
