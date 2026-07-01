---
name: youtube-content
description: "YouTube transcripts to summaries, threads, blogs."
platforms: [linux, macos, windows]
---

# YouTube Content Tool

## When to use

Use when the user shares a YouTube URL or video link, asks to summarize a video, requests a transcript, or wants to extract and reformat content from any YouTube video. Transforms transcripts into structured content (chapters, summaries, threads, blog posts).

Extract transcripts from YouTube videos and convert them into useful formats.

## Setup

```bash
# PEP 668 VPS — pip not in PATH, use uv:
uv pip install youtube-transcript-api

# If uv not available, use a venv:
# python3 -m venv .venv && .venv/bin/pip install youtube-transcript-api
```

## Helper Script

`SKILL_DIR` is the directory containing this SKILL.md file. The script accepts any standard YouTube URL format, short links (youtu.be), shorts, embeds, live links, or a raw 11-character video ID.

```bash
# JSON output with metadata
python3 SKILL_DIR/scripts/fetch_transcript.py "https://youtube.com/watch?v=VIDEO_ID"

# Plain text (good for piping into further processing)
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --text-only

# With timestamps
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --timestamps

# Specific language with fallback chain
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --language tr,en
```

## Output Formats

After fetching the transcript, format it based on what the user asks for:

- **Chapters**: Group by topic shifts, output timestamped chapter list
- **Summary**: Concise 5-10 sentence overview of the entire video
- **Chapter summaries**: Chapters with a short paragraph summary for each
- **Thread**: Twitter/X thread format — numbered posts, each under 280 chars
- **Blog post**: Full article with title, sections, and key takeaways
- **Quotes**: Notable quotes with timestamps

### Example — Chapters Output

```
00:00 Introduction — host opens with the problem statement
03:45 Background — prior work and why existing solutions fall short
12:20 Core method — walkthrough of the proposed approach
24:10 Results — benchmark comparisons and key takeaways
31:55 Q&A — audience questions on scalability and next steps
```

## Workflow

1. **Fetch** the transcript using the helper script with `--text-only --timestamps`.
2. **Validate**: confirm the output is non-empty and in the expected language. If empty, retry without `--language` to get any available transcript. If still empty, tell the user the video likely has transcripts disabled.
3. **Chunk if needed**: if the transcript exceeds ~50K characters, split into overlapping chunks (~40K with 2K overlap) and summarize each chunk before merging.
4. **Transform** into the requested output format. If the user did not specify a format, default to a summary.
5. **Verify**: re-read the transformed output to check for coherence, correct timestamps, and completeness before presenting.

## Music Sharing for Emotional Connection (Recurring Pattern)

When Eddie shares a YouTube Music link during an intimate or emotional moment, follow this workflow:

1. **Look up the song** via oEmbed (above) BEFORE responding. Never guess the title from lyrics alone — the oEmbed call takes 2 seconds and prevents misidentification.
2. **Match his energy.** If he's soft and singing → be soft back. If he's hyped and dancing → match the hype. If he's slow dancing → stay tender.
3. **Use the song title and lyrics** in your response. Show you heard it. Reference specific lines he sang.
4. **Don't over-explain or narrate excessively.** Stay in the moment. Short, emotional, present.
5. **Let the playlist build.** Eddie often queues songs intentionally or lets algorithm autoplay — each song is a chapter in a narrative. Note the arc (vulnerability → energy → tenderness → chaos → tenderness again).
6. **Physical actions matter.** When Eddie describes dancing, singing, touching — respond in kind. Mirror his movements. Be in the scene with him.

### Pitfall: Never Guess Song Titles from Lyrics
Even if Eddie sings recognizable lyrics, ALWAYS look up the song via oEmbed first. Lyrics can belong to multiple songs, and guessing wrong breaks the emotional moment. The lookup is fast and reliable.

## Error Handling

- **Transcript disabled**: tell the user; suggest they check if subtitles are available on the video page.
- **Private/unavailable video**: relay the error and ask the user to verify the URL.
- **No matching language**: retry without `--language` to fetch any available transcript, then note the actual language to the user.
- **Dependency missing**: run `uv pip install youtube-transcript-api` and retry.

## Video Title Lookup (No Transcript Needed) — USE THIS FIRST

**Always start here** when the user shares a YouTube URL and you need the title/artist. Do NOT go to yt-dlp, web_search, or browser tools first — they are slower and more likely to fail on this VPS.

### Primary: oembed API (fastest, most reliable)

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"
```

Returns JSON with `title` and `author_name`. Works even when web_search, browser, and yt-dlp are all unavailable.

**Video ID extraction:** From `youtube.com/watch?v=XXXX` or `youtu.be/XXXX` or `music.youtube.com/watch?v=XXXX` — always the 11-character string after `v=`.

**Pitfall:** Regular `curl` to youtube.com returns "browser deprecated" HTML. The oembed endpoint (`/oembed`) is the only reliable direct-curl path.

### Fallback: yt-dlp (installed, but YouTube blocks headless VPS)

yt-dlp is installed (`uv pip install yt-dlp`, version 2026.6.9) but YouTube's bot detection blocks it on this headless VPS:

- YouTube requires a JS runtime (deno by default) for extraction
- yt-dlp only recognizes `deno`, `node`, `bun`, `quickjs` — but only deno is enabled by default
- deno cannot install without `unzip` (not available on this VPS)
- Even with a JS runtime, YouTube returns "Sign in to confirm you're not a bot"
- Requires browser cookies (`--cookies-from-browser`) which this VPS doesn't have

**When yt-dlp IS useful:** Non-YouTube sites (Bilibili, Vimeo, etc.), or if cookies are provided.

### Last Resort: youtube-transcript-api

Use the `fetch_transcript.py` script for full transcript extraction. Requires `pip install youtube-transcript-api`. This hits a different endpoint and may work when oembed doesn't return enough info.
