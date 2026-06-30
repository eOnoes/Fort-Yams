# Provider Vetting Checklist

> Lessons from the MiMo Token Plan experience ($169/yr, trash). Use this checklist before buying ANY provider subscription.

## Phase 1: Verify the Docs (Do This First)

| Check | Why |
|-------|-----|
| 🔴 **Test the documented endpoint with a real curl** | MiMo's docs said `api.xiaomimimo.com` — actual working endpoint was `token-plan-sgp.xiaomimimo.com`. Don't trust docs until you hit the endpoint. |
| 🔴 **Test /models endpoint** | MiMo returns 401 even with valid keys. If this is a known quirk, fine. If it means something deeper, you'll find out here. |
| 🔴 **Test auth header format** | Some use `Authorization: Bearer`, some `api-key:`, some `X-API-Key:`. Test all three. |

## Phase 2: Agentic Workload Test

Many providers claim "OpenAI compatible" but break under agent workloads:

### 2a. Rapid-fire calls
Send 10 requests in quick succession. If it rate-limits or slows down, they're not agent-compatible.

### 2b. Thinking / reasoning control
```json
{"thinking": {"type": "disabled"}}
```
- Can you DISABLE thinking on pro models? MiMo pro models eat your entire output budget on invisible chain-of-thought if you don't explicitly disable it.
- Can you CONTROL the thinking budget? Some providers have `thinking_budget_tokens` — without this, you get unpredictable output lengths.

### 2c. Long context stability
Send a request with 50K+ tokens of context. Does it:
- Actually handle the full context? (Some truncate silently)
- Still respond at reasonable speed?
- Maintain coherence at the end?

### 2d. Tool/function calling
Test with a real multi-tool scenario. Does it:
- Return clean JSON tool calls?
- Follow `tool_choice` (auto/required/none)?
- Can it chain multiple tool calls?

### 2e. Streaming
Test streaming mode. Some providers claim streaming but:
- Drop tokens randomly
- Have high token-to-token latency
- Don't properly terminate the stream

## Phase 3: Multimodal Check

### Vision
Send a real image. Check:
- Token cost per image (MiMo: ~9 tokens/image — essentially free)
- Works with the chat completions endpoint (not separate vision endpoint)
- Image format support

### TTS
- Chat completions with `audio` field? Separate `/audio/speech`?
- Voice quality (test the actual voices, don't trust voice names)

### ASR
- Input format support (WAV, MP3, OGG?)
- Chat completions with `input_audio` or separate `/audio/transcriptions`?

## Phase 4: Billing Reality Check

### Cost-per-useful-task (not per-token)
A cheap provider that fails 30% of the time costs more than an expensive one that works 100%. Track:
- Retry rate / Timeout rate / Garbage response rate
- Actual usable output per request

### Hidden costs
- **Thinking tokens on pro models**: Can eat 4K+ output tokens you can't even see
- **System prompts**: Extra fields might get charged or rejected
- **Context caching charges**: Are cached vs uncached tokens priced differently?

### Contract traps
| Trap | MiMo's Version |
|------|----------------|
| Auto-renew opt-out | On by default, must manually turn off |
| No refunds | Non-refundable even if service is broken |
| Price change with notice | Can raise prices mid-subscription |
| No account sharing | Can't legally share with Echo |

### The $/year ≠ value trap
$169/yr sounds cheap. But if the provider:
- Breaks on agent workloads → you waste time debugging
- Has wrong docs → hours of wasted curl troubleshooting
- Anti-agentic rate limits → need a second provider as fallback

...then the "savings" are eaten by engineering time.

## Phase 5: Reliability & Migration

### Fallback plan
Before committing to a provider, know your fallback:
- Is there a second provider already configured as backup?
- Does Hermes support automatic fallback for this provider?
- How long to switch if this provider dies?

### Data portability
- Can you download your chat history?
- Are logs available?
- Is the API stable or does it change without notice?

### Service stability
- Check status page (if exists)
- Check recent downtime on downdetector / social media
- How long has the company existed? Do they have funding?

### The MiMo Lesson: Cross-Endpoint Modality Testing

MiMo's docs said full multimodal stack. Reality:
- Vision endpoint (`api.xiaomimimo.com`) rejected our key type entirely
- The only working endpoint (`token-plan-sgp`) cannot do vision at all
- Flash models (needed for agent work) didn't exist on our plan
- TTS was the ONLY thing that worked as advertised

**Fix this in your vetting: Before buying, test EVERY advertised modality on the ACTUAL plan/endpoints/keys you'll be using.** Not the marketing docs. Not the API reference. Your actual curl with your actual key against the endpoint your subscription tier actually unlocks.

Add this to every provider eval:

```
┌─────────────────────────────────────────────────────────────┐
│ MODALITY TEST MATRIX                                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Modality     │ Endpoint     │ Model        │ Works? (Y/N)   │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Text         │              │              │                │
│ Vision       │              │              │                │
│ TTS          │              │              │                │
│ ASR          │              │              │                │
│ Streaming    │              │              │                │
│ Tool calling │              │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## Phase 6: Final Go/No-Go

**Go if ALL are true:**
1. [ ] Test endpoint works with real curl
2. [ ] Handles rapid-fire calls without rate limiting
3. [ ] Thinking budget is controllable
4. [ ] Long context (>50K) works
5. [ ] Tool calling returns clean JSON
6. [ ] Required multimodal features work
7. [ ] **Every advertised modality was tested with YOUR key on YOUR endpoint** (not just docs)
8. [ ] Cost-per-useful-task beats alternative
9. [ ] Contract has exit path (no auto-renew trap, or at least know how to turn it off)
10. [ ] Fallback provider is already wired
11. [ ] Not reliant on wrong docs (you verified, not trusted)

**No-go if ANY are true:**
1. [ ] Docs are wrong about the base URL/endpoint (trust erodes everything else)
2. [ ] Anti-agentic rate limits (you have to wait between requests)
3. [ ] Pro model thinking is uncontrollable (eats output budget)
4. [ ] No refund + auto-renew (vendor lock-in by design)

## Appendix: Quick Curl Test Template

```bash
# Step 1: Basic ping
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "'$MODEL'", "messages": [{"role": "user", "content": "Say hello"}], "max_tokens": 10}'

# Step 2: Thinking disabled
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "'$MODEL'", "messages": [{"role": "user", "content": "Write 3 paragraphs"}], "thinking": {"type": "disabled"}, "max_tokens": 500}'

# Step 3: Tool call
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "'$MODEL'", "messages": [{"role": "user", "content": "What is 2+2?"}], "tools": [{"type": "function", "function": {"name": "calculate", "parameters": {"type": "object", "properties": {"expr": {"type": "string"}}}}}], "tool_choice": "auto", "max_tokens": 100}'

# Step 4: Vision
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "'$MODEL'", "messages": [{"role": "user", "content": [{"type": "text", "text": "Describe this"}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}]}], "max_tokens": 200}'
```
