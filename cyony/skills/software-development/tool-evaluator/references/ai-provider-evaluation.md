# AI Provider Evaluation Checklist

When evaluating a new AI provider for a subscription, verify these dimensions BEFORE committing. Based on the MiMo Token Plan experience ($169/yr, trash).

## 1. Docs Accuracy (Verify Before Trusting)

**Don't trust the docs — test the actual endpoint.** MiMo's docs claimed `token-plan-sgp.xiaomimimo.com` but the real working endpoint was `api.xiaomimimo.com`. The docs endpoint returned models list but 401'd on chat completions.

**How to verify:**
```bash
# 1. Check /v1/models endpoint
curl -s https://PROVIDER_URL/v1/models \
  -H "Authorization: Bearer $KEY" | python3 -m json.tool

# 2. Test actual chat completion
curl -s https://PROVIDER_URL/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"MODEL_NAME","messages":[{"role":"user","content":"hello"}]}' | head -c 200

# 3. Test a model that requires specific params (thinking, tools, etc.)
# Provider must accept whatever params their docs say they support
```

## 2. Agent Workload Capability

Most providers optimize for chat, not agent workloads (rapid-fire tool calls, parallel requests, long context maintenance).

**Test sequence:**
- Rapid calls: 10 requests in 30s with different messages
- Tool calling: test function calling with JSON schema
- Thinking/reasoning control: can you DISABLE it? Can you LIMIT it?
- Structured output: JSON mode, response_format with schema

**Red flags:**
- Rate limits measured in RPM (requests per minute) under 60
- Pro model has UNCONTROLLABLE thinking that eats output budget
- No way to disable reasoning/thinking tokens
- Anti-agentic throttling that kicks in after 2-3 fast calls

## 3. Thinking/Reasoning Budget Control

**This is a dealbreaker for agent work.** If the pro model forces thinking on every response, it's useless for rapid tool-calling agents.

**What to test:**
```json
// Does the provider accept this in the request body?
{"thinking": {"type": "disabled"}}
// Or equivalent for non-Anthropic providers
```

**If thinking can't be disabled:** the pro model is one-call-per-minute only, not suitable as a primary agent model.

## 4. Agent Benchmarks > General QA

Ignore the MMLU/GPQA scores. Ask for:
- Function calling accuracy benchmarks
- Tool use reliability percentages
- Multi-turn consistency scores
- Agent-specific evals (SWE-bench, ToolBench, BFCL)

**If they don't publish agent benchmarks, they're not optimizing for agents.**

## 5. Cost-per-Useful-Task > Raw Price

$169/yr for unlimited tokens sounds great until each pro-model call takes 30s and uses 10k+ thinking tokens. Calculate:
- Cost per successful tool call
- Cost per 100 rapid interactions
- How many calls can you get in a minute before hitting limits
- Whether "flash" model actually works for agent work or is too dumb

## 6. Test with a Fallback First

Before committing to any provider:
1. Wire it as a **secondary/fallback** provider alongside your current one
2. Run it for 1-2 weeks in production
3. Only then consider making it primary

**Don't buy a year up front** unless you can verify all of the above first.

## 7. Multimodal Requirements

If you need vision or audio (TTS/ASR):
- Test image input with screenshots — some providers charge per image differently
- Test TTS output quality and latency — not all providers are equal
- Test ASR accuracy with your actual use case (receipts, notes)
- Check if vision works with the flash model or only the pro model

## 8. Stability Signals

- Has the provider been around for 6+ months?
- Are they changing models/endpoints frequently?
- Is there a community (Discord, GitHub) with active discussion?
- Do they have a status page for outages?
- Have other agents/users reported issues with the provider?

## Salvage Strategies (When You're Already Stuck)

If you're already subscribed and the provider is trash (no refund, anti-agentic), here's how to squeeze value out:

1. **Use flash model for TTS/ASR if available** — even if the flagship model is unusable, voice clones might work fine. Voice chains (brain + separate TTS provider) sidestep the core problem.

2. **CLI/API-only access as a fallback bot** — wire it as a dedicated background service for one-off tasks (transcription, image analysis, long-form summaries). Schedule via cron for batch work where latency doesn't matter.

3. **Switch to the flash/cheap model exclusively** — the pro model with uncontrollable thinking is dead weight. Flash may work fine for quick agent calls.

4. **Repurpose for dedicated skill-specific use** — TTS/voice, image vision on flash model, batch document processing via cron, sleepover/background analysis that doesn't block main flow.

5. **Use as a fallback/backup provider** — when main provider rate-limits or goes down, a trash provider is better than nothing.

6. **Chase the refund aggressively** — if docs were provably wrong (wrong endpoint, broken API), argue service not as described. Document thinking control failures. Chargeback via credit card if all else fails — most providers suddenly find refund capability when a chargeback hits.

## Anti-Patterns (What MiMo Did Wrong)

- Lying docs: Endpoint in official docs returned 401 on real requests
- Anti-agentic rate limits: Flash model fine, pro model throttled after 3 calls
- Uncontrollable thinking: Pro model consumed 90%+ of output on reasoning with no way to disable
- No agent benchmarks: Only published MMLU and general QA scores
- Referral bait-and-switch: "20% cash" → "10% credits that expire in 40 days"
- No refund policy for service not as described
- Gateway model agent-hostile: mimo-v2.5-pro (the gateway/smart-routing model) was anti-agentic despite being the default — had to force flash model explicitly
