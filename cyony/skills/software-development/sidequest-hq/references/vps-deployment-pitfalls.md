# VPS Deployment Pitfalls (July 2026)

## Voice API / TTS Pitfalls

- **Reference audio path on VPS:** Voice route (`/api/voice/route.ts`) originally looked for `../shared/chloe-voice-clone/eddie_chill_reference.wav` — doesn't exist on VPS. **Actual path:** `public/audio/scout-reference-clone.wav`. Fix: `join(process.cwd(), 'public', 'audio', 'scout-reference-clone.wav')`. Rebuild + restart after.
- **MiMo API key placeholder:** If VPS `.env` has `MIMO_API_KEY=*** (placeholder from initial setup), all voice/chat requests fail silently — "thinking" indicator appears then disappears with no response. **Test via Python script, NOT curl through SSH** (shell strips `$` from values → false 401 errors).
- **TTS silent failure:** Voice route catches TTS errors → returns `{text, audio: null}`. Frontend only plays audio if `data.audio` exists. User sees text but hears nothing. Check `journalctl -u sqhq` for errors.

## SSH Dollar Sign Stripping

SSH shell commands **strip `$` characters** from values. API payloads sent via `curl` through SSH lose dollar signs — `$1,171.18` becomes `171.18`.

**Fix:** Write Python script locally → SCP to VPS → run there:
```python
# 1. Write Python script with data (json.dumps preserves $)
# 2. scp script.py root@VPS:/tmp/script.py
# 3. ssh root@VPS 'python3 /tmp/script.py'
```
This is the ONLY reliable way to push data with `$`, `"`, `'`, or `\n` through SSH. Every other method (heredocs, inline curl, printf) will mangle special characters.

## Document Delete Endpoint

The documents API originally had no DELETE handler. To delete documents:
- **Endpoint:** `DELETE /api/documents?id=123`
- **Requires:** Active session cookie
- Added in July 2026 session — needed for cleanup of duplicate entries from failed API calls.

## Permanent Domain Deployment

- **Domain:** `sqhq.tripp109.cloud` via Hostinger DNS → A record to `2.24.118.123`
- **HTTPS:** Traefik + Let's Encrypt auto-provisioned
- **Traefik config:** File provider at `/docker/traefik/dynamic/sqh.yml`
- **Traefik compose:** `/docker/traefik/docker-compose.yml` — has file provider enabled (`providers.file.watch=true`, `providers.file.directory=/docker/traefik/dynamic`)
- **To add new routes:** Create YAML in `/docker/traefik/dynamic/`, Traefik auto-reloads
