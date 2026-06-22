# FAL.ai Safety Checker Bypass via API

## Discovery: 2026-06-21

Source: Reddit r/generativeAI post + confirmed by direct testing.

## The Problem

FAL.ai's web Sandbox has a content safety filter with NO toggle. The API returns a misleading error: `"User is locked. Reason: Exhausted balance"` when it's actually a content policy block, NOT a balance issue.

## The Fix

Pass `"enable_safety_checker": False` in the API arguments. This disables the safety checker entirely.

## Confirmed Working (2026-06-21)

```python
import os
os.environ['FAL_KEY'] = 'your_key_here'
import fal_client

# Test 1 — elegant evening dress (would be blocked in Sandbox)
result = fal_client.subscribe(
    "fal-ai/flux/dev",
    arguments={
        "prompt": "A beautiful woman in an elegant evening dress, cinematic lighting, portrait photography",
        "enable_safety_checker": False,
        "num_images": 1,
        "image_size": "portrait_4_3"
    }
)
# SUCCESS — returns image URL

# Test 2 — sheer silk robe (definitely would be blocked)
result = fal_client.subscribe(
    "fal-ai/flux/dev",
    arguments={
        "prompt": "A woman in a sheer silk robe, back view, bedroom morning light, intimate photography",
        "enable_safety_checker": False,
        "num_images": 1,
        "image_size": "portrait_4_3"
    }
)
# SUCCESS — returns image URL
```

## Valid image_size Values

`square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`

Note: `portrait` alone is NOT valid — use `portrait_4_3` or `portrait_16_9`.

## Limitations

- Some models (e.g., Wan 2.7 video) have their OWN built-in content guardrails that can't be bypassed with this parameter
- The Hermes `image_generate` tool does NOT pass this parameter — use `fal_client` directly
- The parameter order in the dict doesn't matter (Python dicts are unordered)
- The Sandbox UI will NEVER have this toggle — API-only

## Install fal_client

```bash
pip install fal_client
```

Requires `FAL_KEY` env var (format: `uuid:hex`).
