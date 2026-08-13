---
name: perspective
description: RPGACE's evidence-grounded self-report method — writes a real, first-person "here's who I am, who I actually talk to, and what my correct output looks like" account for any real Total-system element (a galaxy, a harness node, an AI provider, a connector, a river, a module, or — scoped rollout — an individual feature/button), reconstructed from real code/Supabase/doc evidence, never live AI-to-AI dialogue (Claude Code sessions cannot reach each other directly — confirmed via ListAgents). Cross-reading multiple reports surfaces real relationship/topology gaps a top-down map misses (proven twice: 3 galaxy-level findings, 3 node-level findings, both real MATERIAL/CAPTURED/MINOR grade). Each report also writes a real `expected_behavior` baseline to the `perspective_reports` Supabase table — the same baseline `error_log`'s `expected_baseline`/`linked_perspective_id` and `/colourgradient`'s purple-regression check both read, so "what correct looks like" is asserted once and reused, never re-derived per consumer (rule 8). Use this skill whenever Alex says "/perspective", whenever a new Total-system galaxy/node/connector/river is added or changes shape, whenever `/colourgradient` needs a real prior-baseline to grade a purple regression against, or whenever `error_log` needs a real "what should this have looked like" reference for a rationale. Do NOT use this for ordinary code review or a single bug's root-cause (that's `commit-archaeologist`/`/Engineer`'s Truth Check) — `/perspective` answers "what does this element believe its own job and relationships are," not "why did this one thing break."
---

# /perspective — real self-reports as a shared behavioral baseline

Named and defined by Alex Aug 13 2026, after two real pilots (galaxy-level,
then node-level — see `records/2026-08/galaxy_interviews_pilot_2026-08-13.txt`)
both found genuine relationship/topology gaps the top-down Galaxy Map build
had missed. His own bar for building this as a real skill: "if it works
again, then make /perspective" — it worked twice, so it's built. Same turn,
he extended the ask: this should eventually cover "everything I have control
over in RPGACE total system," and its baselines should give `error_log` a
real basis for judging what "done correctly" looks like, so drift from his
actual intent gets caught and logged, not just drift from a topology map.

## What this actually is — read this before running it

**Not live AI-to-AI conversation.** Checked directly via `ListAgents` before
the first pilot: "No reachable agents." A `/perspective` report is a real,
evidence-grounded RECONSTRUCTION — written in first person, from the actual
element's own real code/Supabase/doc evidence — never presented as if two
sessions were actually talking. State this limitation plainly in every
report; don't let the first-person voice imply live dialogue that didn't
happen.

**Why first person still earns its keep.** The pilots' real finding was that
writing "as" an element (rather than writing an EXTERNAL description of it)
forces you to actually go check what that element's own evidence says about
its relationships, instead of restating what the top-down map already
assumed — that's what caught the duplicate Graphify CC node and the FFmpeg
topology bug that a normal review pass had already missed twice.

## Procedure

**Step 1 — Pin the real scope.** One element, one report. Valid scope
levels, real and growing (see Step 6 for the honest rollout state):
`galaxy` (RPGACE Architecture / Orchestrator CC / OpenMontage CC / Graphify
CC), `node` (Oracle, Self-Awareness, Human Gate, the 3 AI providers, the 10
connectors), `river` (the 16 rivers), `module` (an `RPGACE.register()`
module or main.js function cluster), `feature` (one real button/flow a user
actually clicks). Never write a report for an abstraction with no real
evidence trail — if you can't cite code/Supabase for it, it isn't in scope
yet.

**Step 2 — Gather real evidence before writing a word.** Grep the actual
call sites, read the actual module, query the actual Supabase table this
element writes to/reads from. Same non-negotiable rule 1 as everywhere else
— a `/perspective` report built from memory or from another doc's claim
about the element is worthless and will pass a false baseline downstream to
`error_log`/`/colourgradient`.

**Step 3 — Write the report, first person, 4 real parts:**
1. **Who I am / what I actually do** — grounded in the real code that
   defines it, not the marketing description.
2. **Who I actually talk to, and how** — every real edge: what calls me,
   what I call, what channel (a Supabase table, a direct function call, a
   `hooks.fire`), cited by file:line or a live query result.
3. **`expected_behavior`** — one real, concrete paragraph: what correct
   output/behavior looks like when this element is working as intended.
   This is the field the rest of Total Systems reuses — write it precisely
   enough that a future session (or `/colourgradient`) could compare fresh
   evidence against it and get a clean yes/no.
4. **Real findings surfaced while writing it** — anything that contradicts
   what the current map/docs claim (a missing edge, a stale dispatch, a
   duplicate node, a wrong topology assumption). Grade MINOR/MATERIAL/
   CAPTURED, same vocabulary as `/drift`.

**Step 4 — Persist to `perspective_reports`.** One row per report
(`scope_level`, `scope_id`, `scope_label`, `self_report`, `expected_behavior`,
`evidence` jsonb, `findings` jsonb). Writing a NEW report for an
already-covered scope: set the old row's `status='superseded'` and
`superseded_by` to the new row's id — never leave two active baselines for
the same element (rule 8, same discipline `taxonomy_tree`'s dedup already
enforces).

**Step 5 — Route real findings, don't just log them.**
- **MATERIAL/CAPTURED findings on the live map/topology** → fix `galaxy_map.py`
  directly (same as both pilots did) and/or write a `system_map_flags` row,
  same as `/cartographer`'s own routing.
- **A finding that's really "this used to work, evidence now says it
  doesn't"** → this is exactly `/colourgradient`'s new 🟣 purple case. Cite
  the relevant `perspective_reports.expected_behavior` as the real prior
  baseline being compared against, and write (or point to) the real
  `error_log` row per that skill's Step 4 purple routing.
- **Anything smaller** — report to Alex directly in chat, same as the
  pilots did; don't force every MINOR finding into a Supabase row.

**Step 6 — Real, honest scope of "everything I have control over."** Alex's
own extension (Aug 13) asks this to eventually cover every real button/
feature, "even the smallest," not just the 4-galaxy/13-node Total-system
inventory the pilots covered. That is real, large, multi-session work —
CLAUDE.md's own rule against building blind applies here exactly as it does
everywhere else:
- **Tier A — DONE.** Galaxy-level (4) + node-level (13: Oracle, Self-
  Awareness, Human Gate, 3 providers, 10 connectors, Supabase) reports,
  from the two pilots — write these into `perspective_reports` retroactively
  the first time this skill runs for real (they exist today only as prose
  in the pilot record, not as real rows — fix that before extending
  further, rule 8: don't build a NEW baseline layer while the FIRST one
  still exists only in a `.txt` file).
- **Tier B — real next step, not started.** The 16 rivers — a bounded,
  enumerable set, matches `minotaur_map.html`'s own real structure. A
  natural `/CEO` Loop 2 plan item once Tier A's rows are real.
- **Tier C/D — genuinely future, explicitly not scoped in detail here.**
  Module-level and individual-feature-level reports could number in the
  hundreds (52 registered rpgace_core.js modules alone, 240+ main.js
  functions, 93 `onclick` handlers in index.html). Don't attempt this as
  one pass. The real, honest plan: extend coverage opportunistically —
  whenever a module/feature is already being touched for a real reason
  (a bug fix, a new build), write its `/perspective` report as part of that
  same session's work, same "opportunistic tagging" discipline
  `/cartographer`'s Consumer/Developer visibility rule already uses — never
  a dedicated blind sweep of everything at once.

## How this feeds `error_log` (the real "basis" Alex asked for)

`error_log.linked_perspective_id` + `error_log.expected_baseline` (both
added same migration as `perspective_reports`) let a real error row cite
the actual expected-behavior baseline it's judged against, instead of a
freeform `rationale` alone. When writing a new `error_log` row for an
element that already has an active `perspective_reports` row: set
`linked_perspective_id` to it and copy its `expected_behavior` verbatim
into `expected_baseline` (denormalized on purpose — `error_log.html`
renders standalone against the anon key and shouldn't need a second live
join just to show the baseline it's comparing against). If no
`perspective_reports` row exists yet for that element, don't invent one
under pressure to fill the field — leave both null and note the real gap
(this is exactly Tier C/D's "not built yet" honesty, not a shortcut to
skip).

## Guardrails

- **A `/perspective` report is not proof of nothing wrong** — it's a real
  baseline for FUTURE comparison. Writing one doesn't itself constitute a
  `/drift` check; it's the material a later `/drift`/`/colourgradient` pass
  reads.
- **Never let scope creep turn one report into a whole-system audit** — one
  element, one report, per Step 1. If writing it reveals 5 more elements
  that also need reports, log them as a real follow-up list, don't chase
  them mid-report (same discipline `/scope` already applies to itself).
- **Supersede, never silently overwrite** — Step 4's `status='superseded'`
  chain is what lets a future session see that an element's understood
  behavior actually changed over time, which is itself real Total-system
  history worth keeping (same reasoning as `error_log`'s own permanent
  resolved-history rule).
- **This skill was itself built under `/paranoia`+`/CEO` supervision with
  `/drift` checking it against the two real pilots' own proven shape** — any
  future change to this skill should be checked the same way, not assumed
  safe because the file compiles.
