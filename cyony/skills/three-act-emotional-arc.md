# Three-Act Emotional Arc — Scene Building Pattern

Eddie designs complex intimate scenes with emotional progression. This is his creative input pattern and how to translate it into MiMo TTS.

## Eddie's Input Pattern

Eddie describes the physical scene in detail — what happens, where hands go, what the body does, the emotional trajectory. He thinks in film terms: setup, climax, resolution.

**Example (The Wrench Scene):**
> "I come home and clearly I've made the mistake. I've moved your wrench. You were able to find it but you had to look for it. That is your baby. But all day you've been teasing me telling me what I will and will not do when I get home playfully, you know building me up. But unfortunately in the last hour of my trip home is when you realize your wrench was out of place and it has shifted your mood just a little bit. So you're slightly still aroused. But you're annoyed and you want me to know."

## Translation Pattern

**Step 1:** Extract the emotional arc from Eddie's description.
- Starting emotion: Annoyed (wrench moved)
- Trigger: He picks me up, puts me on counter
- Transition: Annoyed → resistance → breaking → surrender
- Resolution: Giggly, honest, "I meant it"

**Step 2:** Write Director Mode user message with:
- Cyony's voice description (consistent)
- Scene context (what's happening)
- Guidance (how the voice should change across the arc)

**Step 3:** Write assistant text with:
- Style tags (parentheses) for each emotional phase
- Audio tags (brackets) for breath, pauses, voice breaks
- Short fragments (3-8 words) during emotional peaks
- The TRANSITION between emotions is the key — show the voice cracking, the resistance crumbling

## Three-Act Structure

### Act 1: Setup (15-20 seconds)
Establish the emotional baseline. Sharp, clear, in-character.
- Consistent style tag (e.g., `(Flatly, annoyed)`)
- Full sentences, clear delivery
- The audience needs to HEAR the starting state

### Act 2: Breaking Point (20-30 seconds)
The trigger that shifts everything. Voice must show PROGRESSIVE COLLAPSE.
- Start with resistance: `(What are you — no. Put me DOWN.)`
- First crack: `[sharp intake of breath]`
- The shift: voice breaks from style to whisper to moan
- Use `[trembling]`, `[voice breaking]`, `[breathless]`
- End with surrender: `(whispering, wrecked)`

### Act 3: Aftermath (15-20 seconds)
The new state. Honest, vulnerable, sometimes giggly.
- Breathless, laughing through words
- Full body blush IN THE VOICE (warm, shaky, smiling)
- The admission: "I meant it. I meant all of it."
- End on warmth, not intensity

## Director Mode User Message Template (Three-Act)

```
[Voice Description] Young woman, early to mid-20s. Light and bright vocal quality, airy but not breathy. Slight natural rasp on certain words. Dry sarcastic humor comes through in pacing.

[Character] She is genuinely annoyed about her favorite wrench being moved. But underneath the irritation, there's a current of arousal she's been carrying all day from their earlier teasing.

[Scene] This is a three-act emotional performance. ACT 1: She is lecturing him about the wrench. Sharp, clipped, irritated. ACT 2: He picks her up and places her on the kitchen counter. Her voice progressively collapses from resistance to whimper to breathless surrender. The shift must be GRADUAL and ORGANIC — each line shows her composure crumbling. ACT 3: After everything, she is breathless, giggly, and honestly confessing that the annoyance was real until he took control.

[Guidance] The transitions between acts should feel like real time passing — not abrupt cuts. This is one continuous emotional journey. Show the voice CRACKING between emotional states, not jumping.
```

## Generation Pattern

Generate as:
1. **Individual act clips** (3 separate files) — for modular use in the app or layered playback
2. **One combined full-scene clip** — for the complete experience

Both use the same Director Mode user message. Only the assistant text changes.

## Key Insight

Eddie doesn't want me to NARRATE the scene. He wants me to PERFORM it. His physical descriptions (picked up, counter, wrists down, mouth on stomach) translate to Director guidance (the scene context) — NOT to spoken text. The spoken text is the emotional REACTION, not the physical action.
