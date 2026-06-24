# LLM Brain Selection for TTS Content

## When to Use
When generating TTS content that needs a "brain" to write the text first. Different LLMs produce different writing styles that significantly affect how the text SOUNDS when spoken through Pocket TTS.

## Brain Ranking (Eddie-tested, 2026-06-23)

| Brain | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Gemma 4** (local, Ollama) | Slow burn, builds tension, atmospheric, poetic | Defaults to literary Scout (To Kill a Mockingbird) — must specify "modern woman" | **Sultry, flirty, intimate, storytelling** |
| **Grok** (xAI, cloud) | Fast tease, cheeky, playful, confident | Resolves tension too quickly | **Comedy, banter, playful teasing** |
| **MiMo** (cloud) | Direct, punchy, emotionally honest, concise | Too commanding for sultry — skips the build | **Warm/vulnerable, direct statements** |

## Eddie's Preference: Tease + Build
Eddie's favorite energy is **tease and building tension** — the anticipation, the almost, the not yet. He doesn't want the payoff delivered immediately. He wants to be held in the *before*.

- **Gemma** is the slow burn — "You just follow. Because I know exactly what happens when you let yourself want this."
- **Grok** is the fast tease — "Unless you ask real nice."
- **MiMo** is the direct command — "Stop talking and kiss me."

**For sultry/flirty content: ALWAYS use Gemma.** She builds. She lingers. She makes you wait.

**For comedy/banter: Use Grok or Gemma.** Grok is faster and cheekier. Gemma builds to a better punchline.

**For warm/vulnerable: Use Gemma or MiMo.** Both tied in testing. MiMo is more concise ("that's it. that's everything."). Gemma is more poetic.

## Pitfall: Gemma Scout Default
When writing prompts for Gemma with "Scout" as the character name, Gemma defaults to the character from *To Kill a Mockingbird* — Jem, Atticus, Aunt Alexandra. Always specify: "a modern woman named Scout who works in tech" or "Scout is NOT the character from the book."

## Pitfall: MiMo Censorship
MiMo LLM blocks "high risk" text generation. For intimate/sultry content, use Gemma (uncensored) or Grok (minimal filters). MiMo is fine for warm/casual content but will refuse flirty/suggestive text.

## Prompt Template
```
Write a [WORD COUNT]-word monologue as a woman named Scout who is [MOOD/ENERGY].
She is talking to someone she loves. [SPECIFIC INSTRUCTION].
Natural speech. Not poetic. Just real.
Scout is NOT the character from To Kill a Mockingbird. She is a modern woman, tech-savvy, witty.
```

## Three-Brain Comparison Test (2026-06-23)

Same prompt, three brains, voiced through Pocket TTS at temp 0.4:

**Warm/Vulnerable prompt ("why she stays"):**
- Gemma: "Honestly, sometimes I wonder if I should just run away. But then there's you..."
- Grok: "Hey... I stay because even on the days when everything feels hard..."
- MiMo: "Look, I know I get scared. I push and I pull, but the thing is..."
- **Result:** Gemma + MiMo tied. Grok didn't land as hard.

**Sultry/Flirty prompt ("magnetic, teasing"):**
- Gemma: "You look at me like you're figuring out a puzzle. Sweetheart, you don't need to figure anything out..."
- Grok: "Mmm, look at you. You've been staring at my mouth for ten minutes straight..."
- MiMo: "Oh, don't look so nervous. I like you. I want you. Come here..."
- **Result:** Grok + Gemma tied. MiMo lost — too commanding, no mystery.
