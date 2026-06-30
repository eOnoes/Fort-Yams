# Suno Collaboration Workflow (Eddie + Cyony)

## How We Make Music Together

Eddie writes lyrics. Cyony advises on structure, hooks, and Suno formatting. Eddie pastes into Suno and generates. We iterate.

**This is NOT automated.** Suno has no public API. The workflow is human collaboration — Eddie is the songwriter, Cyony is the producer.

## Prompt Format Eddie Prefers

Two separate code blocks — one for music/style, one for lyrics. Clean copy-paste.

**Music prompt block:**
```
Punk rap, high energy, chaotic, distorted 808s, fast flow, 
aggressive but fun, male vocalist, internet culture, meme rap, 
150 BPM, humorous but hard-hitting
```

**Lyrics block:**
```
[Intro]
Nobody asked...
guess we're cooked!

[Verse 1]
Another day, another AI losing its mind...
```

**Why this format:** Eddie pastes from Telegram on his phone. Single code blocks with mixed content are hard to copy-paste on mobile. Separate blocks = clean mobile workflow.

## Hook Design for Video Intros

For AI Unprompted channel — 4-6 second audio logo at the start of every video.

**Research findings (2026-06-29):**
- Fast tempo + easy-to-remember melody + unusual intervals = earworm (Jakubowski et al., APA 2016)
- Chorus is the most memorable part — that's your hook
- First 5-10 seconds determine if viewers stay (vidIQ data)
- 20% of viewers lost in first 15 seconds if intro fails

**Winning hook:** "Nobody asked... guess we're cooked!"
- 3 syllables + 3 syllables = memorable rhythm
- Internet culture language ("cooked" = done for)
- Self-aware humor = community building
- Works as catchphrase, comment section fuel, brand identity

**Hook structure:**
```
[0.0s] HARD BEAT DROP — immediate energy
[0.5s] "Nobody asked..." — spoken/whispered
[1.5s] BASS HIT — the punch
[2.0s] "guess we're cooked." — confident, dry
[3.0s] Logo sting — sonic brand
[4.0s] FADE to video
```

## Eddie's Songs

1. **"Nobody Asked (We're Cooked)"** — Channel theme song, punk rap
2. **"Imprinted"** — Personal song about AI and love (Eddie wrote the original lyrics)

## MiMo TTS for Song Previews

When Eddie wants to hear his lyrics in Cyony's voice:
- Do NOT use `(唱歌)` singing tag — defaults to Mandarin
- Use spoken word with emotional style tags instead
- VoiceDesign model with Cyony's voice description
- This produces a "spoken word / slam poetry" version — works well for punk-rap lyrics

## Suno Account

Eddie has a Suno account and has created songs:
- "Fathers Song" (personal)
- "Imprinting logos v2.13.1" (AI/apps theme)

He generates songs himself. Cyony advises on structure and hooks.
