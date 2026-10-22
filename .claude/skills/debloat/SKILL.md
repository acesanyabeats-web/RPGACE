---
name: debloat
description: Finds quantified redundancy across a named file family (Galaxy Map pages, oversight docs, CLAUDE.md and its topic files, skill files) or this conversation's own context, and shortens only what an evidence-and-scrutiny pass confirms is safe to shorten without losing information. FILE-FAMILY mode (paranoia-shaped evidence -> drift -> scope confirm -> interrogation -> Council of 5 + commit-archaeologist block by block -> execute -> report) and CONTEXT-OFFLOAD mode (when context feels heavy, write everything load-bearing to docs/session_memory before compaction). Use when Alex says "/debloat", asks to shorten/consolidate docs without losing information, or asks for a redundancy audit; self-invoke CONTEXT-OFFLOAD when context gets heavy. Never shorten what Council of 5 hasn't cleared.
---

# /debloat — shorten only what's proven safe to shorten

Alex, Sep 24 2026, verbatim: *"i want /debloat to use /paranoia /drift /misunderstanding towards me then straight /interrogation with /misunderstanding to answer, then council of 5 on /paranoia and /commit-archaeologist to see what can be shortend without losing any info. also when context window gets to 60% - it should use /debloat to offload context to keep this convo fresh whilst not losing any context."*

`/misunderstanding` is Alex-only and never self-triggered, so "misunderstanding-shaped" below borrows its three-step format as a self-check: quote the target → state what you understood and why → state the plan.

## Mode A — file family
1. **Evidence** (`/paranoia`-shaped): measure, don't guess — byte duplication (hash/`SequenceMatcher`), repeated boilerplate, the same fact stated in 2+ places, story vs fact, stale names, token drift. Report bytes, percentages, counts.
2. **`/drift`**: does the bloat break the family's own stated design (rule 8, rule 16, a doc's role)? Give VERDICT/BASIS/grade.
3. **Scope confirm** to Alex, misunderstanding-shaped; then carry on unless he flags a gap.
4. **`/interrogation`**: only the load-bearing questions (target size, where moved content goes, what may change), batched. Quote his answers back with the resulting plan.
5. **Council of 5 + `commit-archaeologist`, block by block**: why does each block exist? Verdict SAFE TO SHORTEN or MUST STAY, with a reason. Never a blanket verdict for the whole family.
6. **Execute** only the cleared blocks, with the family's own checks:
   - Generated HTML: tag balance, idempotent re-run, `verify_anchors.py`, headless console check.
   - Prose docs: the Cross-Doc Drift Check.
   - Before cutting, freeze an inventory of identifiers and verify it afterwards (pattern: `scripts/check_debloat_coverage.py` — every item must be in a live doc or explicitly listed as archived-only). Move stories to the archive word for word; never delete them.
7. **Report**: before/after sizes, what moved where, what stayed and why, and any information knowingly dropped (should be none). Losing information is worse than not running the pass at all.

## Mode B — context offload (self-monitored)
There's no "60%" hook, so judge when the context is getting heavy (a long session, many tool calls, several decisions).
1. Gather open threads, decisions, files and tables touched, and anything Alex referenced.
2. Write anything durable that exists only in chat into its real doc or row now (rule 6).
3. Write or update a `session_memory` row (`summary`, `key_decisions`, `open_threads`, `referenced_inputs`, `tags`).
4. Report it in one line and keep working.
It never replaces `/Bedtime`.

## Worked examples
- **Galaxy Map pages, Sep 24 2026**: the shared left nav (~374KB of 5.7MB, 99.96% identical) moved to `galaxy_map_shared.css`/`.js` — ~500KB saved. Per-page CSS was mostly unique and stayed. `galaxy_map_current.html`'s 3MB is real content, not bloat. Record: `records/2026-09/debloat_galaxy_map_first_run_2026-09-24.txt`.
- **CLAUDE.md, Oct 22 2026**: 291KB → a 18KB core + `docs/claude/*.md` topic files (~70KB live). The old file is archived word for word; 1,337 identifiers checked by `scripts/check_debloat_coverage.py`. Authored skill files were rewritten with the same rule: procedure and Alex's verbatim words stay, story goes. Record: `records/2026-10/claude_md_debloat_ceo_2026-10-22.txt`.

## Guardrails
- Looking redundant isn't proof. Shorten only blocks Council of 5 cleared.
- Scale to the target: a small obvious overlap is Tier 1.
- Never claim Mode B fires at an exact percentage.
