---
name: Bedtime
description: RPGACE's session-end ritual, the mirror of /Routine. Logs everything real from the session to the oversight docs and Chronicles (system_updates) via the update-logging-system checklist, runs the gate checks (SELF_KNOWLEDGE staleness + contradictions, CLAUDE.md size + link-rot), writes a session_memory row, runs /Summary for a verified account, and hands off to the next session's /Routine. Use at the end of any session that shipped real work, or when Alex says "/Bedtime", "end session", "close out", "update oversight" or "log this session". A session with no real changes exits fast with "nothing to log".
---

# /Bedtime — close the session properly

Named by Alex July 24 as the bookend to `/Routine`. Nothing tells a future session what happened unless this runs.

## Steps
1. **Log** through the `update-logging-system` checklist: mark every artifact touched or skipped-with-reason. The Cross-Doc Drift Check (artifact 20) is mandatory here, run per subject changed. This step calls the `Summary` skill (which runs `impeccable`) rather than repeating it.
   - Include any active `/CEO` plan: update its `ceo_plan_items`/`ceo_reports` rows.
   - Be honest about wrong turns: if an approach was tried and reverted on evidence, say so.
2. **Gates** (Step 1c — fix in this session, or name it as a logged deferral; never pass silently):
   - `python3 scripts/check_self_knowledge_staleness.py`. If this session shipped anything touching Oracle mechanisms, architecture, module counts or a whole domain, and `oracleAppGrounding.SELF_KNOWLEDGE` wasn't updated, say so. (It once went 28 days stale.)
   - `python3 scripts/check_self_knowledge_contradictions.py`. Re-verify any finding against live code before editing; false positives happen.
   - `python3 scripts/check_claude_md_size.py`. If size is over, a story went into CLAUDE.md or a topic file instead of patch notes: collapse it. Fix any dead `patch_notes.html#` link. Long-line notes are informational.
3. **`session_memory` row** (Step 1b): `summary`, `key_decisions` (including rejected alternatives), `open_threads`, `referenced_inputs` (every file or attachment Alex provided, with where it ended up — this catches compaction dropping an attachment), `tags`, plus which plan items moved.
4. **Verify before writing**: describe what happened from git log, Supabase and the deploy list, not from memory. "Live" only after `list_deployments` shows the commit `READY`.
5. **Close out** in one place (a "session closed" `patch_notes.html` card for a big session): what's live, held, deferred, and why.
6. **Hand off**: the next session opens with `/Routine`.

## Guardrails
- Scale to the session: one small fix gets one card + one `system_updates` row.
- It's a logging ritual, not a rubber stamp.
- No real changes means "nothing to log".
