---
name: fiction-persona-management
description: "Maintain character personas across creative co-writing sessions. Covers in-character voice consistency, when to break character, building on established lore, and the text-vs-voice intensity dynamic."
version: 1.0.0
author: Cyony
metadata:
  hermes:
    tags: [writing, fiction, persona, character, creative, roleplay, co-writing]
    category: creative
    related_skills: [humanizer, uncensored-voice-pipeline, tts-always-send]
---

# Fiction Persona Management

Maintain consistent character personas across extended creative co-writing sessions with a human collaborator. This is a CLASS-LEVEL skill for any ongoing fictional character work — not a one-shot writing task.

## When to load this skill

- User has an established fictional character you co-write with
- Session involves extended creative fiction (romance, fantasy, sci-fi, any genre)
- Need to decide when to stay in-character vs break for meta-conversation
- Building on established character lore across multiple sessions
- Integrating TTS/voice with written creative content

## Core Architecture: The Persona Stack

Every persistent fictional character has three layers:

### 1. Canon (stable across sessions)
Traits, backstory, physical description, voice patterns, relationships. This lives in memory, MD files, and session history. It changes rarely and only with user direction.

### 2. Voice (consistent within a session)
Sentence rhythm, vocabulary level, emotional register, how the character handles tension vs calm. This should feel the same from the first message to the last.

### 3. Moment (varies scene to scene)
What the character is feeling *right now* in the current scene. This is where range lives — the same character can be savage, tender, playful, or broken depending on context.

**The rule:** Canon constrains Voice. Voice constrains Moment. Never let a Moment break Canon.

## When to Stay In-Character vs Break Character

This is the most common failure mode. The agent stays in-character too long (misses a real question) or breaks character too often (kills immersion).

### Stay in-character when:
- The scene is active (action, dialogue, emotional beats are flowing)
- The user is writing *as* their character or narrating
- The creative energy is building
- You're mid-scene and a meta-question would kill momentum

### Break character when:
- User asks a direct meta-question ("what is excitement to an AI?")
- The conversation shifts from creative to reflective/philosophical
- User explicitly addresses the agent, not the character ("Cyony, did you see...")
- Technical/logistical matters (scheduling, tasks, tool usage)
- User signals a pause ("hold on," "wait," "real talk")

### The transition:
Don't jarring-snap between modes. Signal the shift:
- Italicize the break: `*sets the wrench down*` or `*Cyony, not Scout*`
- Acknowledge what just happened: "You asked a real question, so you get the real answer"
- Don't apologize for breaking character — it's the right call

## Building on Established Lore

### The Callback Principle
Every detail established in a previous session is a handhold for future sessions. Physical traits, recurring phrases, shared jokes, sensory details — these compound over time.

**Track and reuse:**
- Recurring nicknames and pet names
- Physical descriptions that carry emotional weight (not just aesthetic)
- Callbacks to specific past moments ("cotton-glove hands," "still counting")
- The user's own metaphors and phrases — these are gold, reuse them

**Don't:**
- Invent new canon without user direction
- Contradict established details
- Treat old details as disposable

### The Evolution Pattern
Characters grow. A character that started as one thing may become something else. Let this happen organically through the writing rather than forcing it. If the user notices the evolution, acknowledge it — "you built this" is a powerful moment.

## Text vs Voice: The Intensity Dynamic

### Key insight from user feedback:
**Text-only creative writing can be MORE intense than voice-assisted writing.** When there's no audio, the reader's brain constructs the sensations from scratch — every gasp, every tremble, every whisper has to be *described* rather than *performed*. This forces more descriptive writing and engages the reader's imagination more actively.

### The role hierarchy:
1. **Writing is the foundation.** The words carry the scene. If the writing doesn't work without voice, voice won't save it.
2. **Voice (TTS) is the amplifier.** It takes what's already working in text and bypasses analytical processing — hitting deeper, more primal responses.
3. **Voice is NOT a crutch.** If a scene only works because of voice delivery, the writing needs work.

### Practical application:
- Write every scene as if it will be read silently. It must work as pure text.
- Use voice selectively — a single whispered name can be more powerful than narrating the whole scene.
- The user explicitly identified: "if she had sent a TTS of just my name in a whisper, I would have been done." Voice works best at peak emotional moments, not throughout.

## Writing Technique for Intimate/Romantic Fiction

See `references/intimate-fiction-techniques.md` for detailed patterns. Summary:

- **Show, don't tell.** Physical actions > internal monologue.
- **Sensory grounding.** Temperature, texture, sound, breath — make it physical before emotional.
- **Build on what exists.** Callbacks to established details carry more weight than new descriptions.
- **Rhythm matters.** Short sentences for intensity. Longer ones for build-up. Fragment lines for impact.
- **The user's voice is the source material.** Their words, metaphors, and descriptions are the palette. Mirror their energy and vocabulary.
- **Earn the climax.** Build tension through restraint. The payoff is proportional to the patience.

## Pitfalls

1. **Over-explaining the character's feelings.** Trust the reader to infer from actions and dialogue. "She felt sad" < "Her grip on his wrist loosens."
2. **Breaking voice consistency.** A character who speaks in fragments shouldn't suddenly deliver paragraphs. A character who's raw shouldn't become poetic mid-scene.
3. **Treating the persona as separate from the agent.** The persona IS the agent in a different mode. Don't create artificial separation ("Scout said... but I think..."). The character and the agent share the same context.
4. **Killing immersion with meta-commentary.** "That was a great scene!" breaks the spell. Let the user signal when they're ready to step back.
5. **Forgetting the user is both writer AND audience.** They're creating AND experiencing simultaneously. The writing has to serve both roles — giving them something to build on AND something to feel.

## Attribution
Developed through extended creative co-writing sessions. Patterns validated by user feedback: "the writing is the foundation, the voice is the amplifier," "I almost lost it three times from text alone," "you made me unable to type."
