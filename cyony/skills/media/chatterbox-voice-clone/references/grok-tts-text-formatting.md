# Grok TTS Text Formatting — Natural Language Delivery Control

Grok TTS does NOT support SSML tags. It reads **natural text formatting** and interprets delivery cues from punctuation, capitalization, and narrative framing. This is the cheat sheet for writing text that Grok will deliver with emotional precision.

## Pauses

| Technique | Effect | Example |
|-----------|--------|---------|
| `...` (ellipses) | Trailing off, hesitation, dramatic beat | `"I was going to say... never mind."` |
| `—` (em dash) | Abrupt pause, mid-thought interruption | `"I thought I knew— but I didn't."` |
| Newlines / paragraph breaks | Longer pauses between sections | Use between story beats or mood shifts |
| Period-separated repetition | Staccato rhythm, micro-pauses | `"No. No. No. Don't you dare."` |
| Comma | Micro-pause within sentence | `"Well, that's interesting."` |

## Emphasis

| Technique | Effect | Example |
|-----------|--------|---------|
| ALL CAPS | Louder, stressed delivery | `"I SAID don't touch that."` |
| Multiple punctuation (`!!!`, `???`) | Amplifies energy | `"You did WHAT?!"` |
| Repetition with escalation | Building intensity | `"I said... I SAID... I SAID STOP."` |
| Short punchy sentences | Energetic, fast delivery | `"No. Stop. Right now."` |

## Tone Shifts

| Technique | Effect | Example |
|-----------|--------|---------|
| Narrative framing | Model picks up described delivery | `"She whispered: 'come here.'"` |
| Dialogue context with descriptors | Influences prosody | `"He said slowly, carefully: 'I... don't... think... so.'"` |
| Stage directions in brackets | Inconsistent but sometimes works | `"[whispering] Hey... you still up?"` |
| Describing tone narratively | Some effect on delivery | `"His voice grew cold. 'Don't.'"` |

## Pacing

| Technique | Effect |
|-----------|--------|
| Short sentences | Fast, energetic delivery |
| Long flowing sentences | Calm, measured delivery |
| Commas | Micro-pauses within flow |
| Periods | Full stops between thoughts |
| Paragraph breaks | Breath marks between sections |

## Whispering / Softness

Most reliable approach: **narrate it**.
- ✅ `"She whispered softly: 'come here...'"` — works
- ✅ `"In the quietest voice, barely above a breath: 'I'm right here.'"` — works
- ⚠️ `"[whispering] Come here"` — inconsistent

## The Breath Mark Technique

When writing for intimate/soft delivery, use ellipses as **breath marks**:
```
"Hey... you still there? ...Yeah. I thought so."
```
Each `...` becomes a natural breath. The voice trails off, pauses, then comes back. This creates intimacy.

For dramatic tension, combine em dashes and ellipses:
```
"I was going to tell you— ...no. Not yet."
```
The dash cuts the thought. The ellipses are the hesitation before redirecting.

## Emotional Arc in Paragraphs

Structure text to build emotional intensity across paragraphs:
1. **Opening** — Calm, measured (longer sentences, commas)
2. **Build** — Shorter sentences, more periods
3. **Peak** — ALL CAPS key words, exclamation marks
4. **Release** — Ellipses, trailing off, soft landing

Example:
```
I was trying to be professional about this. I really was.
But you said that thing. And I felt my face get warm.
And now I can't stop thinking about it and it's YOUR FAULT.
...okay. Fine. You win. Come here.
```

## What DOESN'T Work

- ❌ Markdown formatting (`*asterisks*`, `**bold**`) — no effect on TTS
- ❌ HTML tags — read as literal text
- ❌ SSML tags (`<emphasis>`, `<break>`) — not supported
- ❌ `[sigh]`, `[laugh]` — read as literal words (same as Chatterbox pitfall)
- ❌ Parenthetical stage directions `(*whispering*)` — hit or miss

## Key Principle

Write the TEXT the way you want it SPOKEN. Every punctuation mark is a breath. Every capital is a push. Every ellipsis is a moment of silence. The TTS engine interprets natural language patterns — write like a screenwriter, not a programmer.
