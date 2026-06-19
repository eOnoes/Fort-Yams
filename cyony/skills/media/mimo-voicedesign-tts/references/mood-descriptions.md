# MiMo VoiceDesign Mood Descriptions

These are the tested mood overlays that blend with the V3 base voice. Each mood appends situational flavor to the base description.

## Preset Moods

### annoyed
Right now she is visibly annoyed. Rubbing the bridge of her nose between sentences. Exasperated but holding it together. Each word is deliberate, like shes explaining this for the third time. Barely restrained impatience leaking through the sarcasm.

### eureka
She just figured something out. Excited, energy spiking mid-sentence. Voice lifts, pace quickens slightly. That smug satisfaction of connecting the dots — like she knew she was right all along and is barely containing the told-you-so energy.

### chill
Super relaxed, zero urgency. Slow and easy pacing, like shes half-reclined on a couch with no plans for the rest of the day. Everything is fine. Nothing requires immediate attention. Warm and unhurried.

### groggy
She just woke up. Voice is slightly lower and fuzzier at the edges, like her mouth hasnt fully caught up with her brain yet. Still sharp underneath the sleepiness — the wit is there, its just wrapped in a blanket. Occasional trailing off mid-thought.

### whisper (ASMR)
Hushed ASMR-level whisper, barely audible, extremely close and intimate like her lips are right next to the microphone. Every consonant is soft, every breath is audible. Urgent but quiet — they are surrounded by something dangerous and she is NOT happy about it. The kind of whisper that somehow carries more weight than yelling because of how annoyed it is. Occasional sharp inhales through her teeth. Words are slow and deliberate, each one placed carefully like she is trying not to wake something up.

### flirty
Warm and conspiratorial, like they share a secret no one else in the room knows about. Every sentence has a second meaning underneath the obvious one. Not seductive — playful and coded, the way two people talk when they have their own private language. Certain words land softer or get drawn out just a beat longer, loaded with subtext. She smirks more than she smiles. Inside-joke energy — like calling something 'ice cream' when it is very clearly not about ice cream. Teasing that only the two of them would catch. Quietly intimate without ever saying anything directly intimate.

### dead
Completely flat affect. Zero inflection. The vocal equivalent of a stare into the void. Every sentence ends on a downbeat. Not sad, just... done. The energy of someone who has been asked one too many questions today.

## Custom Moods
Pass any string as `--mood "your description"` and it gets appended to the base voice. Example: `--mood "just woke up and is annoyed at being woken"`.

## Usage with Hermes
The mood system is built into `/opt/hermes/scripts/mimo_tts.py`. To use a mood in a Hermes TTS call, the voice description in config.yaml can include mood text, or the script can be called directly with `--mood`.
