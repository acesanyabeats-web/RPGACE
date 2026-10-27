---
name: dev_ops_7
description: RPGACE's plan-while-building protocol. A new ask gets full scrutiny (/paranoia + /free-for-all-debate, checked with /drift, GODMODE and /scope, then /interrogation until no real fork is left) and becomes a /CEO plan — while the already-approved plan keeps being built step by step in the same session, so no approved item is skipped, parked or quietly reshaped by the new one. Use when Alex says "/dev_ops_7", or gives a new large ask while an approved plan is still mid-build. Not for a small fix (Tier 0/1) and never a reason to pause an approved plan.
---

# /dev_ops_7 — plan the next thing while building the approved thing

Alex, Oct 27 2026, verbatim (the bracketed part is this skill): *"[/paranoia and /free-for-all-debate with /drift /godmode /scope and /interrogation into oblivion, then /CEO and plan this while building previous plan so we get things built without task skipping in approved plans] everything in [] should be a new skill called /dev_ops_7 for future building"*.

This adds no new kind of reasoning. It runs existing sibling skills in a fixed order, plus one rule about two plans running at once. The sibling skill files are the source of truth for each step. If this file and CLAUDE.md disagree, CLAUDE.md wins.

## Two tracks, one session

**Track A — the approved plan (build).** Keep executing the ratified `/CEO` plan item by item through `/Engineer` (brief → build → test → ship → log, CLAUDE.md rule 18 and the ship checklist).
- **Never skip, reorder or reshape** an approved item because the new ask is more interesting.
- **If the new ask overlaps an approved item**, record the overlap and build the approved item as approved. The new plan can propose a later change to it.
- **If the new ask makes an approved item wrong** (a CAPTURED finding in /drift), stop that one item and ask Alex. Don't silently rebuild it.

**Track B — the new ask (plan).** Run Loop 1 of `/CEO` for the new ask, between Track A steps (while tests run, while a deploy builds, while waiting on Alex):
1. **Compile**: Alex's words verbatim into a new `records/YYYY-MM/<name>_paranoia_<date>.txt` (rule 5).
2. **/scope + GODMODE**: live evidence (code, Supabase row counts, git). Counts, not guesses.
3. **/paranoia**: what's possible, what it replaces, what it costs. Scale it to the size of the ask; state any deviation.
4. **/free-for-all-debate**: every real shape argued by its own competitor; Council of 5 names a winner and the honest why-not.
5. **/drift**: check the draft against Alex's compiled words *and* against every approved plan still in flight. A conflict with Track A is a finding to show Alex, never a reason to change Track A on your own.
6. **/interrogation into oblivion**: ask every load-bearing fork until none is left, batched (AskUserQuestion, up to 4 per round, as many rounds as real forks remain). Record answers verbatim. Recommended defaults are never substituted for real answers. An unanswered fork is flagged as a default, not assumed.
7. **/CEO Loop 1, Steps 5-6**: a short plan report (items, what each does for Alex, risks, why-not) → Alex approves. Plan rows go to the paste file (`ceo_plan_items` updates stall in the connector).

## Rules
- **Approved work first.** When Track A has a step ready to build and Track B is waiting on Alex, build. When Track B needs Alex, ask in the same message that reports Track A progress.
- **No task skipping.** At the end of every reply, each approved item is one of: built and live (READY), in progress, or not started with a reason. Nothing disappears.
- **One brief per step** (rule 18), unless Alex says "do all".
- **Tier 3 stays Tier 3.** Deletes, RLS loosening, credentials and spending still need Alex's explicit go. Rigour is not authorisation.
- **Scale.** A Track B ask that turns out small (Tier 1) gets a short plan, not the full ceremony. Say so.
