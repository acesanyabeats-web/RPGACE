---
name: scope
description: Gathers the whole real picture of what's happened in RPGACE (this session's work, or a date range) and organizes it into digestible, role-grouped categories - bugs fixed, features shipped, infrastructure built, security findings, and planned-but-not-built items - so an "update oversight" pass can include everything without missing something or drowning in blow-by-blow detail. Use this skill whenever the user says "/scope" or "scope this out", asks to see "the whole picture" or "big picture" of RPGACE's progress, or as the evidence-gathering step before a comprehensive oversight-doc update (pairs with GODMODE - this IS the GODMODE evidence pass for oversight work specifically, not a separate ceremony on top of it). Do NOT use this for a single bug fix or small feature's own patch-notes entry - that's Tier 0/1, handled directly; this is specifically for the "everything, all at once" sweep.
---

# /scope — the whole picture, in digestible grouped bits

RPGACE's oversight docs have repeatedly gone stale or described things as "done" when the code disagreed (CLAUDE.md's own standing warning). The failure mode isn't laziness — it's that "what happened this session" is scattered across git commits, Supabase rows, and scrollback, and no single pass reliably surfaces all of it. This skill is that pass: real evidence, gathered once, organized so each of the six oversight docs can pull exactly the slice it needs.

**Source of truth**: `CLAUDE.md`'s own six-doc list and their individual update conventions (see `## Oversight — now SIX docs`). This skill produces the input to that process; it does not replace it, and CLAUDE.md wins if the two ever disagree.

## When to run this

- The user says "/scope" or "update oversight" for a session covering more than a couple of commits.
- Before a "session ended here" wrap-up card in `patch_notes.html`.
- Whenever a doc's claim needs checking against reality — this skill's evidence-gathering step doubles as a drift-check (three real doc-drift corrections were caught exactly this way on July 20).

## What to gather (real evidence, never a doc's own claim)

1. **Git log since the last full oversight sweep.** Find the last commit whose message reads like a session-end sweep (grep `git log --oneline` for "oversight sweep" / "session end" / "Current state" — CLAUDE.md's own "Current state" section names the date of the last one). Read every commit message since, in order.
2. **Live Supabase state**, not assumed from a doc: `list_tables` for row counts and RLS status, `execute_sql` for anything a patch note claims a specific number about. A count that "sounds right" from memory is not evidence.
3. **File-size/line-count check** on the docs themselves (`wc -l`) — this is the signal for whether `patch_notes.html` or CLAUDE.md needs a declutter/archive pass this round, not just new content appended.
4. **`node --check` / div-balance** on anything touched, if not already confirmed clean during the session's own work.

## Grouping — the "digestible bits" output shape

Don't hand back a flat chronological wall of text. Organize into these categories, each one mapping to what a specific oversight doc (or a specific future reader) actually needs:

- **Bugs found & fixed** — root cause + fix, one line each unless it took a real diagnostic arc (then note that briefly: "took N rounds, real cause was X"). This is what `patch_notes.html` cards are built from.
- **Features/infrastructure shipped** — what's new, which module/table/file it lives in, whether it's been hand-tested yet (always flag honestly — "not yet hand-tested" is a required field, not an omission).
- **Security/architecture findings** — anything discovered that wasn't the original goal but matters (an auth gap, an RLS table, a stale cache-busting version). These get their own line even if unrelated to each other — don't bury a security finding inside an unrelated feature's paragraph.
- **Deliberately not built / explicitly out of scope** — real decisions to hold something back, with the actual reason (cost, risk, "user said personal-visibility only"), not a silent omission. This is what separates "we forgot" from "we chose not to," and the project's own history shows that distinction gets lost if it isn't written down at the time.
- **Still open** — genuinely unresolved items carried forward, cross-checked against `patch_notes.html`'s own "Still Open" section so nothing gets silently dropped or duplicated.

## Handing off to the six docs

Once grouped, route into each doc per its own stated purpose (CLAUDE.md's summary of each is the checklist):
- `patch_notes.html` — Bugs + Features groups become dated cards; a comprehensive top-level summary card when the session is large enough to need one.
- `CLAUDE.md`'s "Current state" — the durable facts a future session needs before doing anything (supersede, don't just append, when a "Prior state" section has gone fully historical).
- `manual.html` — anything that changes the button catalog, Supabase table reference, or roadmap status.
- `system_flow_map.md` — anything that changes an information flow (new data source, new processing step, new output).
- `interconnection_map.md` — one paragraph per new structural touchpoint between modules.
- `minotaur_map.html` — only if a new wing (entrance/hub/exit) was added; internal patches don't belong here.

## What this skill does NOT do

It doesn't write the docs itself in one pass without judgment — Council of 5 still applies to how much detail survives into each doc (a full diagnostic arc might be one line in `patch_notes.html` but deserves more in `CLAUDE.md` if it's now a standing lesson). It doesn't replace `node --check` / real hand-testing. And it doesn't invent a "done" status for anything that hasn't actually been verified — every claim this skill produces must trace back to a real commit, a real Supabase query, or a real test run, per CLAUDE.md's own non-negotiable rule 1.
