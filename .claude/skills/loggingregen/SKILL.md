---
name: loggingregen
description: Regenerates ONE oversight doc (or CLAUDE.md topic file, or Chronicles/system_updates) at a time against two checks — the role that doc is assigned (docs/claude/oversight.md) and rule 8's dedup discipline (no doc re-telling a story another owns, no fact held twice). Use when Alex says "/loggingregen" or "fix the oversight docs properly". Not for appending a single card — this audits an existing doc's contents for staleness, duplication and role drift.
---

# /loggingregen — one doc at a time, against role and dedup

Built July 31 from the manual.html pass. Run it once per doc, never as one blob, because each doc has a different job, and something that's a bug in one is a category error in another.

## Check 1 — role (see `docs/claude/oversight.md`)
- `patch_notes.html` — dated cards, root cause + fix, honest flags. The only place for narrative.
- `interconnection_map.md` — present-tense structure, plus the button catalog. Any "on X date this happened, then…" paragraph belongs in patch notes.
- `system_flow_map.md` — diagrams, the built/not-built truth table, §0 tables. A stale flag left unresolved is itself a finding.
- `minotaur_map.html` — domains and functions in plain language; no code names, no internal patches. Grep the app for real entry points before assuming something is missing.
- `taxonomy_map.html` — live query; edit only if its code or columns changed.
- `ai_tooling_and_rules_map.md` — skills, rule files, connectors.
- `CLAUDE.md` — rules and the index only. `docs/claude/*.md` — one present-tense fact per line; stories go to `CLAUDE_archive.md`; `scripts/check_claude_md_size.py` must pass.
- `system_updates` — one row per shipped change; look for commits with no row, and duplicate rows.
- `manual.html` is retired; its content lives in the two Tier (b) maps above.

## Check 2 — dedup (rule 8 applied to docs)
- One story, one home (`patch_notes.html`); everywhere else gets the current-state line only.
- Never hand-copy a live number into a doc. Query it (the `oracleAppGrounding._liveFactsLine` pattern), or name the query, as CLAUDE.md now does.
- An open item lives on one list (`docs/claude/open_forks.md` / `system_flow_map.md` NOT-built / `future_integrations.html`).

## Procedure per doc
1. Read the doc and its role; cross-check claims against git, Supabase and code (rule 1).
2. `/free-for-all-debate`: competitors each pick real, distinct issues.
3. GODMODE evidence for each; drop anything unbacked.
4. Council of 5: a cheap fix now, or a bigger build that goes through the normal funnel?
5. Fix the cheap ones. Log bigger ones once, in the right list.
6. Record any real decision or killed proposal in `records/YYYY-MM/`.

## All docs in one session
Do them in sequence, not merged. Finish with a cross-doc dedup pass for facts that crept into two docs — the step most often skipped.

## Doesn't
- Decide whether to build what a doc describes.
- Replace `/scope`.
- Claim anything fixed without verification.
