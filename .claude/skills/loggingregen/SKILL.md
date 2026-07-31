---
name: loggingregen
description: Regenerates ONE oversight doc (or Chronicles/system_updates) at a time against two hard checks — CLAUDE.md's own stated role for that doc, and rule 8's dedup discipline (no doc re-telling a story another doc already owns, no doc holding two copies of the same fact). Use this skill whenever Alex says "/loggingregen", asks to "fix the oversight docs properly", or asks for the same treatment given to manual.html on July 31 to be applied to the rest of the six docs + Chronicles. Do NOT use this for a single dated card append (Tier 0/1 — just write the card in the doc's normal format); this is specifically for auditing an EXISTING doc's own contents for staleness, duplication, and role drift.
---

# /loggingregen — per-doc regeneration against role + dedup

Built July 31 out of the manual.html pass (find real staleness/dedup issues via
`/free-for-all-debate`, fix the cheap ones, kill anything proposed without
real evidence via Council of 5). That pass worked on one doc. This skill is
the same discipline made repeatable, run **once per doc, never as one blob
across all six** — each oversight doc has a different stated role in
CLAUDE.md's `## Oversight — now SIX docs` section, and a finding that's a bug
in one doc (e.g. `patch_notes.html` missing a dated card) is not even a
category error in another (e.g. `interconnection_map.md`, which is never
supposed to hold dated narrative at all).

## The two hard checks, run against every doc in turn

1. **Role check** — does this doc's actual content match the ONE job
   CLAUDE.md assigns it?
   - `patch_notes.html` — dated cards, root cause + fix, honest flags
     ("untested", "scoped down"). The only place narrative/incident detail
     lives.
   - `interconnection_map.md` — present-tense structural reference only.
     Any paragraph narrating a sequence of events ("on July X this happened,
     then Y was found wrong, then Z fixed it") is a role violation — it
     belongs in patch_notes.html, and this file should hold only the
     resulting current-state paragraph.
   - `manual.html` — polished reference: button catalog, Supabase table
     reference, fixed-bugs table, roadmap status. Not a changelog.
   - `taxonomy_map.html` — live document, queries Supabase on load; only
     touch if its own code/columns changed. If nothing in the taxonomy
     schema changed, this doc needs no edit — say so, don't manufacture one.
   - `system_flow_map.md` — Mermaid flow diagrams + the built/not-built
     truth table. A feature isn't "done" here until it's moved from the
     dashed/planned section into a built diagram. A self-flagged stale note
     ("SEE STALE NOTE ABOVE") left unresolved across sessions is itself a
     finding — fix it or don't flag it.
   - `minotaur_map.html` — update ONLY when a wing (new entrance/hub/exit)
     was added. Internal patches inside an existing corridor are a role
     violation here — check `dashDeck._openOversight()` and similar real
     entry points before assuming a new wing is actually needed (the
     Minotaur Sidekick finding, July 31: a proposed new wing turned out to
     already exist as a live dashboard popup — grep the real code before
     trusting the doc's own framing of what's missing).
   - `system_updates` (Chronicles) — one row per real shipped change,
     title/summary/category, written same-session. Check for rows that
     never got written (a commit with no matching row) as well as duplicate
     rows for the same real change.
   - `CLAUDE.md` itself — Current State section states durable FACTS, never
     stories. Any bullet re-narrating "what was tried, what went wrong" is a
     role violation per the file's own July 31 pruning rule — collapse it or
     move it to `CLAUDE_archive.md`.

2. **Dedup check (rule 8, applied to DOCS not just code/data)** — for every
   real fact or finding, is it told in exactly ONE place?
   - The same bug's root-cause story should never appear in full in two
     docs. One owns the narrative (`patch_notes.html`); every other doc
     that touches the same fact gets only the resulting current-state
     line, with no retelling.
   - The same live number (row counts, phyla built, module count) should
     never be hand-copied into a second doc as a frozen snapshot when a
     live query already exists elsewhere (`oracleAppGrounding._liveFactsLine`
     is the working pattern: query live, don't hardcode a number that goes
     stale the moment it's written down twice).
   - A "still open" item should appear on exactly one canonical list
     (CLAUDE.md's "Open forks that need Alex" / `system_flow_map.md`'s
     NOT-built section) — cross-check before adding a new one elsewhere,
     the same discipline `/scope` already applies to "Still open."

## Procedure, per doc

1. **Read the doc in full** (or the section under review) plus CLAUDE.md's
   own one-line description of its role. Never trust the doc's own claims
   about currency — cross-check against real git log / live Supabase / real
   code (same rule 1 as everywhere else in this project).
2. **`/free-for-all-debate`** the doc: pool of individual competitors, each
   picking real, distinct issues in that doc (staleness, role violation,
   duplication, a missing update from a shipped change) — not a manufactured
   two-sided fight if the doc only has one or two real problems.
3. **GODMODE evidence** on every issue raised — grep the real code, check
   the real commit, query the real table. An issue that can't be backed by
   real evidence gets dropped, not carried forward as a "maybe."
4. **Council of 5** on what survives: is this worth fixing now (cheap,
   real, in-scope) or is it a bigger build that needs its own Tier 2/3
   process (Omnitrix/GODMODE/Council of 5 proper, possibly Alex's decision)?
   A finding that reveals "this doc wants to describe a feature that isn't
   built" is a build question for elsewhere, not a doc-editing question here.
5. **Fix what's cheap and real, same pass.** Log anything genuinely bigger
   as a flagged, not-yet-built item in the correct canonical doc — never
   silently drop it, never duplicate it into a second list.
6. **Write the verbatim record** for anything that involved a real decision
   or a killed proposal, same convention as every other spec/debate in this
   project (`pattern: manual_html_minotaur_sidekick_debate_2026-07-31.txt`).

## Running it across all six docs + Chronicles in one session

Do the six (seven, counting Chronicles) doc passes **in sequence, not
merged** — a finding surfaced while reading `patch_notes.html` for its own
role check might be the missing source for an `interconnection_map.md`
paragraph; note it and apply it during that doc's own pass, don't let one
big combined finding-list blur which doc actually owns the fix. At the end,
do one more pass across the CROSS-doc dedup check specifically (a fact that
snuck into two docs during separate per-doc passes, since each pass only
had one doc's contents loaded) — this final cross-check is the step most
likely to be skipped and is the one rule 8 actually cares about most.

## What this skill does NOT do

It doesn't decide whether to BUILD a missing feature a doc describes as
planned — that's Omnitrix's Judgment Funnel, same as any other feature
work. It doesn't replace `/scope` (which gathers evidence for a NEW
session's worth of shipped work); `/loggingregen` audits what's already
written down for docs it might already be wrong about. And it doesn't
invent a "done" status or a "fixed" claim for anything not independently
verified against real code/git/Supabase — same rule 1 as everywhere else.
