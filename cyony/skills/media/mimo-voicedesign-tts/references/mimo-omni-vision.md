# MiMo Omni Vision for Image Analysis

Use `mimo-v2-omni` to analyze images (character renders, screenshots, etc.) when other vision providers are unavailable.

## API Pattern

```bash
B64=$(base64 -w 0 /path/to/image.jpg)

curl -s -X POST "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions" \
  -H "api-key: $MIMO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"mimo-v2-omni\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\": \"text\", \"text\": \"Describe this image in detail.\"},
        {\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/jpeg;base64,$B64\"}}
      ]
    }],
    \"thinking\": {\"type\": \"disabled\"}
  }"
```

## Pitfalls

- `file://` URLs are NOT supported — must use `data:image/jpeg;base64,...` or `https://` URLs
- Always send `thinking: {"type": "disabled"}` or the model wastes tokens on reasoning
- Works with jpeg, png, webp — encode to base64 with `base64 -w 0` (no line wrapping)
- The omni model is text-only on some Token Plan tiers — if you get "Not supported model", try `mimo-v2.5` or `mimo-v2.5-pro` won't work (text-only). Vision may simply not be available on your tier.

## Use Cases

- Verifying AI-generated images match text descriptions
- Reading text from screenshots
- Analyzing character renders against voice descriptions
- General image QA when OpenRouter/Gemini vision is unavailable
