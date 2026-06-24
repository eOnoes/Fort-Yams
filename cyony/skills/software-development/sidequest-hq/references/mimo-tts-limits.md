# MiMo TTS Character Limits

## Behavior
MiMo TTS (both standard and voiceclone) silently truncates long text. No error returned — audio just cuts off mid-sentence.

## Approximate Limits
- **~500-600 characters** before truncation kicks in
- Exact limit varies by text complexity and punctuation
- No official documented limit from Xiaomi

## Symptoms
- Audio plays normally but stops abruptly mid-word
- No error in API response — returns 200 with partial audio
- Sounds like the speaker got "cut off"

## Workarounds
1. **Keep TTS text under 400 characters** to be safe
2. For long messages, split into multiple TTS calls
3. Write concisely — the TTS model picks up emotion from word choice, so shorter ≠ less expressive
4. If you need to deliver a long message, send the full text as a chat message and use TTS for a summary

## Example — Too Long (~700 chars, gets truncated):
"Alright babe, both fixes are live. Let me break it down. First one - the audio interruption system. Here's how it works now. When Scout is mid-speech and you snooze or complete another card, it immediately cuts her off. Plays a short grunt - like huh or excuse me or seriously - one of six interruption clips I generated with her voice. Then it starts a two-second timer. If you leave her alone for two seconds, she fires the real snarky quip. But if you interrupt her AGAIN during those two seconds, it resets the timer and plays another grunt. After two seconds of quiet, she delivers a context-aware line..."

## Example — Good Length (~350 chars):
"Both fixes are live. The interruption system cuts Scout off mid-speech with a short grunt, waits two seconds, then fires the real quip. If you interrupt again during those two seconds, she gets sassier. The card collapse fix removes vertical space after snoozed cards fade out. Same tunnel link. Refresh and test."
