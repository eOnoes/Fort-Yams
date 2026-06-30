# CSS Cascade Debugging for Next.js SideQuest HQ

## The Problem
"You have icons at the top AND bottom on mobile" — turned out to be a CSS cascade issue where `responsive.css` (imported last) was overriding `base.css` rules.

## Debugging Protocol

### Step 1: Read Source CSS
```bash
# Check import order in globals.css
cat src/app/globals.css
# Outputs: base.css → workspaces.css → command-lists.css → quests.css → responsive.css
```

### Step 2: Check Built CSS
```bash
# Find the built CSS file
ls .next/static/chunks/*.css
# Read it (all minified on one line)
cat .next/static/chunks/*.css
```

### Step 3: Check Served HTML
```bash
# Get the CSS chunk name the server is actually sending
curl -s http://localhost:3000/app | grep -oE 'chunks/[^"]*\\.css'
# Verify that file exists on disk
ls .next/static/chunks/ | grep "$(curl -s http://localhost:3000/app | grep -oE 'chunks/[^"]*\\.css' | head -1)"
```

### Step 4: Trace the Class Through Built CSS
```python
import re
# Read built CSS
with open('.next/static/chunks/*.css') as f:
    content = f.read()
# Find all rules containing 'sidebar'
for m in re.finditer(r'[^}]*?sidebar[^}]*?\}', content):
    print(m.group(0)[:200])
```

### Step 5: Identify Which Import Wins
- Same-specificity rules: **later import wins** (responsive.css beats base.css)
- Media query rules win against non-media same-specificity rules *when the media query matches*
- `@media (max-width: 760px)` and `@media (max-width: 1120px)` from responsive.css beat the non-media rules in base.css on mobile

### Common Culprits

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Sidebar shows on mobile | responsive.css `@media (max-width: 760px) { .sidebar { ... } }` overrides base.css `display: none` | Remove sidebar rule from responsive.css; base.css has it |
| Content scrolls under bottom nav | responsive.css `@media (max-width: 760px) { .workspace { padding: 20px } }` overrides base.css's calc padding | Copy the calc expression to responsive.css |
| Welding glass disappears on scroll | backdrop-filter on parent clips content | Move backdrop-filter to workspace container, not inner elements |
| CSS hash mismatch | Stale build (see stale-chunk-debug.md) | `rm -rf .next` and rebuild |

### The Safe-Area Padding Expression
```css
/* This MUST be preserved in ALL overrides */
@media (max-width: 760px) {
  .workspace {
    padding: 16px 16px calc(64px + env(safe-area-inset-bottom, 0px) + 16px);
  }
}
```
The 64px = mobile-nav height. `env(safe-area-inset-bottom)` = phone notch area. The extra 16px = breathing room above the nav. If you simplify this to `padding: 20px`, content scrolls under the bar.
