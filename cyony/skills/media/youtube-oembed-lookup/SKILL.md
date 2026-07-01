---
name: youtube-oembed-lookup
description: Look up YouTube/YouTube Music video titles without browser or web tools. Uses the public oembed API endpoint which works with just curl.
tags: youtube, music, oembed, lookup, media
triggers:
  - user shares a youtube link
  - user shares a music.youtube link
  - need to identify a youtube video
---

# YouTube oEmbed Lookup

When web tools (Firecrawl, browser) are unavailable, use the YouTube oEmbed API to look up video titles. This works with plain `curl` — no API key required.

## The Command

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"
```

Returns JSON with `title`, `author_name`, and `thumbnail_url`.

## For Multiple Videos

Chain them with `;`:

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID1&format=json"; echo "---"; curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID2&format=json"
```

## Extracting the Video ID

YouTube URLs come in many forms. The video ID is the 11-character string:

| URL Format | Video ID |
|---|---|
| `youtube.com/watch?v=VIDEO_ID` | `VIDEO_ID` |
| `youtu.be/VIDEO_ID` | `VIDEO_ID` |
| `music.youtube.com/watch?v=VIDEO_ID` | `VIDEO_ID` |

Just grab the 11 chars after `v=` or after `youtu.be/`.

## Example

```bash
# Single lookup
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VjKKD5yUnEc&format=json"
# Returns: {"title":"PRIMADONA","author_name":"Sueco - Topic",...}
```

## Pitfalls

- **NEVER guess the song from lyrics alone.** Always run the oEmbed lookup FIRST. Lyrics can match multiple songs (e.g., "I just want you to know who I am" is Goo Goo Dolls "Iris", NOT Radiohead "Creep"). Guessing wrong and getting corrected kills credibility. The lookup takes 2 seconds — there is no reason to skip it.
- Music.youtube.com pages themselves return "Your browser is deprecated" — always use the `www.youtube.com` oembed endpoint
- The oembed endpoint is public and requires NO API key
- Returns 404 for private/deleted videos
- `author_name` often has " - Topic" suffix for auto-generated artist channels
- **yt-dlp is installed but YouTube blocks it** — bot detection requires browser cookies, which this VPS doesn't have. oEmbed is the reliable fallback.
- **oEmbed only returns title + author + thumbnail** — no lyrics, no description, no duration. For full metadata, need yt-dlp with cookies or browser-based extraction.

## When to Use

- User shares a YouTube/Music link and you need the title
- Web tools are down or not configured
- Quick lookup without loading a full page
