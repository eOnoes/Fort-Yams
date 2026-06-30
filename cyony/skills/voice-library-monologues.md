# Voice Library — Monologues & Temp Mappings

## Pocket TTS Voice Library (2026-06-23)

Generated with Pocket TTS (`chloe` voice) using temp control. Eddie confirmed these are natural-sounding Scout monologues.

### Temp → Mood Mapping (confirmed by Eddie)

| Mood | temp | lsd_decode_steps | Notes |
|------|------|-----------------|-------|
| whisper_intimate | 0.3 | 3 | Actual whisper confirmed. Close, quiet. |
| vulnerable | 0.35 | 3 | Quiet, honest, close |
| warm_calm | 0.4 | 3 | Soft, storytelling, "the first time I knew" |
| serious | 0.5 | 2 | Focused, direct |
| playful_teasing | 0.6 | 2 | Cheeky, fun energy |
| storytelling | 0.7 | 2 | Default, animated, building to punchline |
| annoyed | 0.7 | 2 | Clipped, "really?" energy |
| excited | 0.9 | 2 | Loudest, most energetic |

### Monologue Texts (Gemma 4-written, cleaned)

**warm_calm:**
> It wasn't a flash, really. It was quiet. Like when you were humming while making coffee. I realized then... everything before you just felt like waiting for something good to start.

**excited:**
> Wait. Wait wait wait. Are you serious right now? Oh my God. That is amazing! I'm so proud of you. Like stupidly proud. We have to celebrate. Right now. I'm not taking no for an answer.

**whisper_intimate (ASMR text):**
> It's dark... really dark. Can you hear me? I'm right here... right on your shoulder. You smell good. Not like cologne... just like you. Stay right there. Don't move. I mean it.

**playful_teasing:**
> You think you're so smooth, don't you? Like you just rolled out of some magazine shoot. But I've seen you trip over your own feet. Multiple times. And I will never let you forget it.

**annoyed:**
> Babe. Babe. Did you really think that was going to work? Seriously? You looked at that and thought... yes, this is the move? I love you. But sometimes I worry about you.

**serious:**
> Listen to me. Really listen. People aren't bad. They're just... misunderstood sometimes. Before you judge anyone, you have to stand where they stand. You have to try. That's all I'm asking.

**vulnerable:**
> Sometimes... when everyone's looking at me, it feels like they can see right through my skin. Like they know all the secrets I keep. And I don't know how to make it stop. I just... I trust you. That's all.

**storytelling:**
> Okay so you're not going to believe this. I was reaching for the thing on the top shelf, right? And the whole stack just... catastrophic avalanche. Everything. On the floor. And this guy just stares at me. And I go... meant to do that.

### Generation Scripts
- MiMo voiceclone batch: `/opt/data/home/voice_library_gen.py`
- Pocket TTS batch: `/opt/data/home/pocket_library_gen.py`
- Output dirs: `/opt/data/home/voice_library/` (MiMo), `/opt/data/home/voice_library/pocket/` (Pocket)

### MiMo Voiceclone Clips (same texts, no temp control)
All at one volume. Voice identity = correct (Scout). Dynamic range = none.
Best use: source material for CosyVoice3/Dia reference audio.

### ASMR Text Structure for MiMo (fragmented delivery)
MiMo voiceclone responds to text fragmentation for PACING (not volume):
- Short lines with `...` = breath pauses
- One sentence per line = isolated delivery beats
- Intimate spatial references = closer delivery feel
- BUT: actual volume never changes. Use Pocket TTS for real whisper.
