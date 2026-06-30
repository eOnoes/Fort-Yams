# Systematic API Endpoint Probing — Methodology

From testing the MiMo API across multiple endpoints (June 2026). Use this pattern when a provider's docs are unreliable and you need to discover what actually works.

## Step 1: Enumerate Available Models

Always start by hitting the `/v1/models` endpoint on every discovered base URL:

```python
r = requests.get(f"{base_url}/models", headers=auth_headers)
# Returns list of model IDs — compare across endpoints
```

This catches:
- Which models actually exist (vs docs claiming models that don't)
- Which regional endpoints expose which model sets
- Key prefix requirements (e.g., `tp-` prefix keys only auth on SGP endpoint)

## Step 2: Discovery Loop — All Models × All Endpoints

Test every known model against every endpoint with a trivial prompt:

```python
endpoints = [("name", "https://.../v1/chat/completions"), ...]
models = ["model-1", "model-2", ...]

for name, url in endpoints:
    for model in models:
        r = requests.post(url, json={"model": model, ...})
        print(f"{name} / {model}: HTTP {r.status_code} / {result[:100]}")
```

Key patterns to test:
- **Case sensitivity** — `MiMo-v2-omni` vs `mimo-v2-omni` (case-sensitive fails with "Param Incorrect")
- **Thinking disabled** — `{"thinking": {"type": "disabled"}}` — test WITH and WITHOUT to see if thinking eats output budget
- **System role** — Does the model accept `role: system`? Some TTS models reject it

## Step 3: Test Vision Specifically

Vision requires `image_url` content type in the messages array. Test each model:

```python
b64 = base64.b64encode(open("image.png", "rb").read()).decode()
r = requests.post(url, json={
    "model": model,
    "messages": [{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": "Describe this image in 5 words."}
        ]
    }]
})
```

Key signals:
- **200 + valid description** = model supports vision
- **200 but "I don't see an image"** = model accepts the request format but can't actually process images
- **400/404 with "No endpoints found"** = model doesn't support vision at all

Note: large images blow up the curl command line ("Argument list too long") — use Python requests with file read instead of inline base64.

## Step 4: Test TTS Reliability

For TTS, call 3-5 times with the same prompt and measure:
- Consistent latency (SD < 1s = good)
- Consistent audio length (same bytes = deterministic, different = variable generation)
- Error rate per model

```python
for i in range(5):
    start = time.time()
    r = requests.post(url, json=tts_payload, timeout=20)
    elapsed = time.time() - start
    audio_len = len(r.json()["choices"][0]["message"]["audio"]["data"])
    print(f"Test {i+1}: {r.status_code}, {elapsed:.1f}s, {audio_len} bytes")
```

## Flags That Docs Are Wrong

1. **Doc says endpoint A does vision, but 401/404** — the key prefix restricts capability per endpoint
2. **Doc says model X is "the best," but model Y is the only one that actually accepts images** — omni vs pro split
3. **Doc claims flash model exists, but endpoint returns "Not supported model"** — flash may not exist in your region/tier
4. **Doc mentions token limits, but you hit different limits in practice** — the actual constraint may be endpoint-specific

## Pitfalls

- **base64 on CLI** — for images >~100KB, `curl` will fail with "Argument list too long." Always write a Python script instead of inline shell.
- **Case sensitivity** — some providers are lenient (OpenAI), others (MiMo) reject wrong casing silently with generic errors. Test lowercase.
- **401 doesn't always mean wrong key** — the key might be valid on a different regional endpoint. Always test the same key on all discovered endpoints.
- **TTS audio field** — format is `audio: {voice, format}`, NOT in the messages array. Response audio is in `choices[0].message.audio.data`.
- **Thinking tokens** — some models eat output budget on internal reasoning even for trivial requests. Always test with and without `thinking: disabled` to understand the overhead.
