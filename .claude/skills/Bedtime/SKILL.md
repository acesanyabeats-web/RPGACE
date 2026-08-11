---
name: Bedtime
description: RPGACE's session-END ritual — the mirror image of the Routine session-start skill. Logs everything real from the session to all seven oversight docs and Chronicles (system_updates), runs the Summary skill to produce a verified, presentable account of the session, and hands off cleanly to the next session's Routine skill. Use this automatically at the end of any session that shipped real work on RPGACE, when Alex says "/Bedtime", "end session", "close out", or "log this session" — this REPLACES the old ad hoc "update oversight" convention with a named, repeatable procedure. Do not run this for a session that made no real changes (nothing to log is a valid, fast exit, not a reason to force ceremony).
---

# /Bedtime — closing out a session for real, not just saying "done"

Alex named this July 24 as the deliberate bookend to `/Routine` (session start). Where `/Routine` decides what today's work should be, `/Bedtime` makes sure that work is actually recorded before the session ends — closing the exact gap CLAUDE.md's own "Oversight logging — NOT automatic" section names: nothing pings a future session about what happened unless this runs.

## The procedure, in order

**Step 1 — Log everything real to oversight + Chronicles.** Not a re-hash of every tool call — a real, evidence-checked account of what shipped, what's still open, and what was deliberately deferred (never silently dropped). Run the actual distribution through the `update-logging-system` sibling skill's dependency map (Aug 6) — a fast checklist, each artifact marked touched or skipped-with-a-real-reason, rather than this step restating its own ad hoc version (that duplication is exactly what let `oracleAppGrounding.SELF_KNOWLEDGE` go stale once — see that skill's own record). This step IS an invocation of the `Summary` skill (sibling skill in this directory) — `/Bedtime` doesn't duplicate that logic, it calls it, which means `Summary`'s own `impeccable` sub-step (July 25) runs here too — a real design scan gets logged as part of closing out, not a separate thing to remember.

**Step 1b — Write a `session_memory` row (Aug 11).** RPGACE's real Supabase-backed replacement for the claude-mem Aintergration ask — same durability the `oracle_dev_suggestions`/`graphify_jobs` session-start checks already lean on, chosen specifically because it survives Claude Code Remote's ephemeral per-session containers where a local tool wouldn't. Insert one row (`summary`, `key_decisions`, `open_threads`, `referenced_inputs`, `tags`) capturing the FULLER texture patch_notes.html's dated card and CLAUDE.md's pruned one-line facts deliberately don't carry — rejected alternatives, small but real asides, and critically, `referenced_inputs`: an explicit, durable record of every file/attachment Alex provided this session, with a one-line description and where it ended up (a spec file, a code change, discarded). This exists specifically to catch the failure mode that prompted its own creation: a compaction summary silently dropping an attached file from its own account, discovered only because Alex asked directly. A future session resuming after a compaction should be able to cross-check `session_memory` against its own compaction summary and catch a drop like that itself, not rely on Alex noticing again.

**Step 2 — Verify before writing.** Same standing rule as everywhere else in this project: check real git log and real Supabase state before describing what happened — don't trust session memory alone, the same discipline `Summary`'s own Step 1 already requires.

**Step 3 — Close out plainly.** State the real session-end status in one clear place (matching the existing "SESSION CLOSED" card convention in patch_notes.html) — what's genuinely live vs. held vs. deferred, and why, so the next session doesn't have to reconstruct it from scattered commits.

**Step 4 — Hand off to `/Routine`.** End with an explicit note that the next session should open with `/Routine` (already a standing CLAUDE.md session-start rule) — `/Bedtime` doesn't re-plan the next session's priorities itself, that's `/Routine`'s job; `/Bedtime` just makes sure `/Routine`'s next run has an accurate, current backlog to work from.

## Guardrails

- **Scale to the real size of the session**, same principle as `Summary`'s own guardrail. A session that shipped one small fix gets a short, real patch_notes card and a `system_updates` row — not the full six-doc sweep with a dedicated debate. A session that shipped several substantial pieces (the shape this skill was actually designed around) gets the real full treatment.
- Nothing gets marked "done" or "live" here without the same verification discipline the rest of this project already uses (checking against real git/Supabase/deployment state) — `/Bedtime` is a logging ritual, not a rubber stamp, and inherits every standing rule about not merging/claiming something live on confirmation alone.
- If a session made no real changes to RPGACE, the correct `/Bedtime` output is "nothing to log" — resist the temptation to manufacture a summary card for its own sake.
