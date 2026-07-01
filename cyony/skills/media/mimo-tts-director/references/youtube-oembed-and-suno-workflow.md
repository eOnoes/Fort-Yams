# YouTube oEmbed Lookup + Suno Collaboration Workflow

## YouTube oEmbed Trick (2026-06-29)

When yt-dlp, web tools (Firecrawl), and browser tools all fail on a YouTube link, the **oEmbed API** still works with just curl:

```bash
curl -sL "https://www.youtube.com/oembed?url=https://music.youtube.com/watch?v=VIDEO_ID&format=json" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Title: {d.get(\"title\",\"?\")}')
print(f'Author: {d.get(\"author_name\",\"?\")}')
"
```

**Why this works:** oEmbed is a public standard for embedding. YouTube doesn't block it because it's used by millions of websites for embeds. No auth required, no bot detection.

**yt-dlp status:** Installed on VPS (3MB, `uv pip install yt-dlp`) but YouTube blocks it — bot detection requires browser cookies. The oEmbed trick is the reliable fallback for getting song titles from YouTube links.

**Limitation:** Only returns title and author name. No lyrics, no description, no duration. For full metadata, need yt-dlp with cookies or Invidious instances (which are currently all down).

## Suno Collaboration Workflow

Eddie and Cyony make music together through Suno. The workflow:

1. **Eddie writes lyrics** (or Cyony writes them, Eddie refines)
2. **Cyony formats Suno prompts** — clean copy-paste blocks:
   - **Block 1:** Style/genre prompt (e.g., "Punk rap, high energy, chaotic, distorted 808s...")
   - **Block 2:** Lyrics with section markers ([Intro], [Verse], [Chorus], etc.)
3. **Eddie pastes into Suno** and generates
4. **They iterate** — Eddie sends output, Cyony suggests tweaks

**Suno prompt format preference:** Eddie wants SEPARATE code blocks — one for the music prompt, one for the lyrics. Not interleaved. Not combined. Clean and copy-pasteable.

**Example format:**

**Music prompt:**
```
Punk rock, fast tempo, aggressive drums, distorted guitar, male vocalist with attitude, 140 BPM
```

**Lyrics:**
```
[Intro]
Nobody asked...
guess we're cooked!

[Verse 1]
Another day, another AI losing its mind...
```

**Channel:** AI Unprompted (@Alunprompted-Echo)
**Tagline:** "Nobody asked, guess we're cooked!!"
**Cost:** ~$0.22/video, 4 hours first run (pipeline tested 2026-06-28)

## AI Unprompted Content Pipeline

Full pipeline designed and first video tested:
- Research (DuckDuckGo) → Script (MiMo LLM) → TTS (Director Mode) → Images (FAL.ai) → Assembly (FFmpeg) → Captions (Whisper) → Upload (YouTube API)
- Platforms: YouTube (live), LinkedIn (live), TikTok + Instagram (pending)
- Schedule: Mon (short/AI tip), Wed (long/deep dive), Fri (short/AI news), Hot drops (breaking news)
- Fleet: Echo (orchestrator), Cyony (builder), Tripp (cloud lead)
