# Model Comparison for Hermes Agentic Work

Based on sessions with user Eddie (2026-06-01 to 2026-06-18), here are notes on model suitability for agentic workflows in Hermes Agent.

## Active Provider Stack (current as of 2026-06-18)

| Role | Provider | Model | Why |
|------|----------|-------|-----|
| **Primary (heavy)** | DeepSeek Direct | `deepseek-v4-flash` | Best coding, agent-native |
| **Vision** | Ollama Cloud | `gemini-3-flash` | Native multimodal |
| **Voice/TTS** | MiMo Token Plan | `mimo-v2.5-tts` | Free with $169/yr sub |
| **Fallback (MiMo)** | MiMo Token Plan | `mimo-v2.5-pro` | Salvaged via thinking: disabled |

## Qwen/Qwen3.7-Max (Former Default)
**Strengths for agentic work:**
- Excellent tool use: reliably parses tool schemas, chains operations, recovers from errors
- 32K context window: handles large files, session logs, skill docs without aggressive compression
- Strong code generation: produces structured outputs (JSON, patches, plans) that follow SOLID-like patterns when prompted
- Good multi-hop reasoning: effective for debug→investigate→fix→validate loops

**Best for:** General agentic tasks involving delegation, web browsing, code edits, and complex reasoning.

## DeepSeek/DeepSeek-V4-Pro (Fallback)
**Strengths:**
- Very strong coding abilities
- Good tool use (slightly behind Qwen 3.7 Max)
- Efficient inference

**Considerations:** Solid fallback when Qwen is unavailable or for pure coding-heavy tasks.

## MoonshotAI/Kimi-K2.6
**Strengths:**
- Extremely long context (up to 256K tokens)
- Excellent for analyzing large codebases or log files
- Good general reasoning

**Considerations:** Tool use may not be as refined as Qwen 3.7 Max; better for analysis-heavy than action-heavy tasks.

## X-AI/Grok-Build-0.1
**Strengths:**
- Reasoning-focused architecture
- Good at following complex instructions
- Strong in math/logic tasks

**Considerations:** May be less optimized for general tool use and agentic looping than Qwen.

## NVIDIA/Nemotron-3-Super-120B-A12B (Backup)
**Strengths:**
- Reliable generalist
- Solid text generation
- Stable performance

**Considerations:** 
- Not primarily optimized for agentic tool use patterns
- May require more explicit prompting for complex tool chains
- Kept as backup per user request for stability

## Tool Use Performance Notes
From observed behavior in session:
- Models vary in how well they handle the "load tools → use → put away" pattern
- Qwen 3.7 Max showed particularly clean tool invocation without context bloat
- Proper tool management is crucial for maintaining reasoning depth across multiple steps

## Recommendation
For most agentic workflows in Hermes Agent (delegation, web research, code modification, multi-step debugging):
**Primary:** Qwen/Qwen3.7-Max
**Fallback:** DeepSeek/DeepSeek-V4-Pro or Nemotron-3-Super-120B-A12B (user preference)