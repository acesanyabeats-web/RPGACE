# RPGACE Local Server

Real infrastructure that runs on Alex's own Windows machine (`%USERPROFILE%\RPGACE`, i.e. `C:\Users\acesa\RPGACE\`) — **not deployed, not hosted, not always-on**. Brought into this repo Aug 27 2026 per Alex's own confirmed ask ("bring the source into this repo, like `scripts/` already works") so a Claude Code session can finally read/edit it directly, rather than it being an invisible black box every session had to reason about from the outside.

**This does not change how it runs.** It still only exists when Alex double-clicks a `.bat` file on his own desktop. No new hosting, no new spend, no new public exposure — `rpgace_core.js`'s `LOCAL_SERVER` constant is still hardcoded to `http://localhost:7842`, reachable only from a browser on the same machine.

## Files

- **`start_server.bat`** — launches `local_server.py`, the actual HTTP server RPGACE's client code talks to on port 7842 (`/reports`, `/watchlist`, `/push-to-supabase` — see `rpgace_core.js`'s `fetchFromLocal`/`fetchWatchlistFromLocal`/`pushLocalToSupabase`).
- **`intel.bat`** — launches `rpgace_intel.py <url>`, the actual Content Intelligence analysis script ("paste a URL, analyse any video" — CLAUDE.md's own "Intel script").
- **`local_server.py`** / **`rpgace_intel.py`** — not yet in this repo as of this commit; real source pending from Alex. Add here once provided, matching the launchers' own real `cd /d "%USERPROFILE%\RPGACE"` + `py <file>.py` invocation.

## Real, standing constraint

Both `.bat` files assume they sit in the SAME directory as `local_server.py`/`rpgace_intel.py` on Alex's machine (`cd /d "%USERPROFILE%\RPGACE"` then `py local_server.py`, a bare relative filename). If Alex ever wants to run these from a checkout of this repo instead of his existing `%USERPROFILE%\RPGACE` folder, the `cd /d` line needs updating to match — not assumed to already work correctly by virtue of living in git now.

## The real residual risk this closes (once the `.py` source lands)

The Aug 27 2026 "delete doesn't stick" fix (`records/2026-08/delete_doesnt_stick_tombstone_ceo_spec_2026-08-27.txt`) named an honest, unclosed gap: `local_server.py`'s own `/push-to-supabase` handler was opaque to every prior Claude Code session, so the client-side deletion-suppression filter (`RPGACE.utils.filterReanalysisSuppressed`) could not account for anything that handler itself might do server-side. Once the real Python source is here, that gap becomes directly inspectable and — if it needs one — fixable.
