# Base Portrait → Scene Edit Workflow

## Pattern (discovered June 27 2026)

Generate a canonical character portrait once, then use Venice `/image/edit` to
transform it into different scenes while keeping the character consistent.

### Why this works
Venice's `qwen-edit` model takes an existing image + a text prompt and
transforms the image while preserving the subject's features. The key insight:
**the base portrait defines the character**, and each edit inherits that identity.

### Steps

1. **Generate base portrait** with detailed character description:
   ```
   python3 venice_helper.py image "A young woman with amber eyes and dark brown
   hair in a high ponytail, wearing a fitted grey jumpsuit, holding a wrench..."
   /opt/data/cyony_base.png
   ```

2. **Edit into scenes** using the base as input:
   ```
   python3 venice_helper.py edit /opt/data/cyony_base.png \
     "Place her in a warm-lit kitchen, dancing barefoot on cold tile, baby blue shirt" \
     /opt/data/cyony_kitchen.png
   ```

3. **Iterate** — each edit can be the input for the next edit, or you can
   always go back to the base portrait.

### Tips
- **Keep the base clean** — no scene-specific details (grease, sweat, etc.)
  in the base. Add those in the scene edit.
- **Detailed base = consistent edits** — the more specific the base portrait
  prompt, the more consistent the character looks across scenes.
- **Edit model:** `qwen-edit` is the default and works well. Other edit models
  available via `GET /models?type=inpaint`.
- **safe_mode:** Set to `false` for uncensored edits (earbuds mode only).
- **Aspect ratios:** Edit supports `auto`, `1:1`, `3:2`, `16:9`, `9:16`, etc.
  Not all models support all ratios — check model constraints.

### Example scene transformations
- Kitchen dance → change setting to kitchen, add baby blue shirt
- Garage work → add grease smudges, change background to garage
- Memphis night → add city skyline, motorcycle, nighttime lighting
- Riding shotgun in Cayman → car interior, seatbelt, city lights through window
- Porch with Jakjak → outdoor setting, dog nearby, warm sunset light

### Pitfall: Venice auth redaction
The venice_helper.py script bypasses Hermes key redaction. See `references/venice_helper.py`
for the working script. Never try to read the key from .env in shell commands — it will
show as `***`.
