# RPGACE Local Server

Real infrastructure that runs on Alex's own Windows machine (`%USERPROFILE%\RPGACE`, i.e. `C:\Users\acesa\RPGACE\`) — **not deployed, not hosted, not always-on**. Brought into this repo Aug 27 2026 per Alex's own confirmed ask ("bring the source into this repo, like `scripts/` already works") so a Claude Code session can finally read/edit it directly, rather than it being an invisible black box every session had to reason about from the outside.

**This does not change how it runs.** It still only exists when Alex double-clicks a `.bat` file on his own desktop. No new hosting, no new spend, no new public exposure — `rpgace_core.js`'s `LOCAL_SERVER` constant is still hardcoded to `http://localhost:7842`, reachable only from a browser on the same machine.

## Files

- **`start_server.bat`** — launches `local_server.py`, the actual HTTP server RPGACE's client code talks to on port 7842 (`/reports`, `/watchlist`, `/push-to-supabase` — see `rpgace_core.js`'s `fetchFromLocal`/`fetchWatchlistFromLocal`/`pushLocalToSupabase`).
- **`intel.bat`** — launches `rpgace_intel.py <url>`, the actual Content Intelligence analysis script ("paste a URL, analyse any video" — CLAUDE.md's own "Intel script").
- **`local_server.py`** — real source, brought in Aug 27 2026. An `http.server` on port 7842 serving `/reports`/`/watchlist`/`/stats`/`/push-to-supabase` (reads local JSON from `~/RPGACE/strategy/intel_*.json`, up to 50 most recent) plus a background poller draining a real `intel_jobs` Supabase queue and dispatching to `rpgace_intel.process_url`.
- **`rpgace_intel.py`** — real source, brought in Aug 27 2026. The actual analysis pipeline: yt-dlp download → Whisper transcription → ffmpeg frame extraction → Claude Vision + Claude text analysis (a direct `api.anthropic.com` call, its own separate API key at `~/RPGACE/.anthropic_key` — NOT the same key/path as RPGACE's own `/api/oracle.js` proxy) → deletes the video → saves a report locally and pushes `intel_reports`/`encyclopedia`/`intel_watchlist` rows to Supabase directly.

**Real findings from reading the actual source (not assumed), Aug 27 2026:**
- Both files hardcode Supabase's own `sb_publishable_...` key — checked against `rpgace_core.js`, it's the byte-identical key already public in this same repo (a Supabase *publishable* key, meant to be client-exposed by design). Not a new secret, no rotation needed for this one.
- `local_server.py` disables TLS certificate verification entirely for its outbound Supabase calls (`ssl.CERT_NONE`) — a real, standing security-adjacent choice (likely a Windows cert-store workaround), not fixed in this pass; flagged, not silently carried forward as if it were fine.
- **`/push-to-supabase` has zero deduplication and zero deletion-awareness** — every call blindly re-POSTs every local `intel_*.json` file with no check for "does Supabase already have this" or "was this deleted." This is a real, confirmed (not theoretical) duplicate-row risk on every re-sync, in addition to being the exact mechanism that resurrects a deleted report (see the Aug 27 2026 "delete doesn't stick" fix). A real, scoped follow-up fix for this is tracked in CLAUDE.md's Open Forks / `records/2026-08/`.
- `~/RPGACE/.anthropic_key` (a plaintext API key file this script creates/reads) is never in this repo — confirmed by direct read, nothing in the uploaded source contains a real key value. `.gitignore` in this folder defensively excludes it and the other runtime-data folders (`intel/`, `strategy/`, `transcripts/`, `inbox/`, `processed/`) in case `HOME` is ever pointed at a git checkout.

## Real, standing constraint

Both `.bat` files assume they sit in the SAME directory as `local_server.py`/`rpgace_intel.py` on Alex's machine (`cd /d "%USERPROFILE%\RPGACE"` then `py local_server.py`, a bare relative filename). If Alex ever wants to run these from a checkout of this repo instead of his existing `%USERPROFILE%\RPGACE` folder, the `cd /d` line needs updating to match — not assumed to already work correctly by virtue of living in git now.

## The real residual risk this was meant to close — now confirmed, not just theoretical

The Aug 27 2026 "delete doesn't stick" fix (`records/2026-08/delete_doesnt_stick_tombstone_ceo_spec_2026-08-27.txt`) named an honest, unclosed gap: `local_server.py`'s own `/push-to-supabase` handler was opaque to every prior Claude Code session. Now that the real source is here, that gap is confirmed real, not hypothetical (see "Real findings" above) — `/push-to-supabase` genuinely has no memory of what Supabase already holds or what's been deleted. A real, scoped fix (check `intel_reports` for an existing row per URL before posting; check `intel_reanalysis_pool` for a deletion marker at least as new as the local file's own date) is proposed but not yet built — deliberately, pending Alex's confirmation on the exact approach, same discipline as the original client-side fix.
