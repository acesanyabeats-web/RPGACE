---
name: colourgradient
description: Renders a real, evidence-checked build-status benchmark for a multi-item plan (a /CEO-tracked plan most of all) as blue/red/yellow/green/purple — blue (an idea quickly written down, not yet a formal plan), red (a real, specified plan, not built), yellow (genuinely in progress — real code exists but incomplete/dormant/unverified), green (verified built and live, real file/commit/query evidence), purple (Aug 13 — a real REGRESSION: was genuinely green before, real evidence now shows it broken). Built entirely as a rendering layer over the /drift skill's own procedure — never a competing evidence-gathering method. Only green items are ever written into the real Tier a/b/c/d oversight docs; blue/red/yellow/purple route to future_integrations.html instead, per Alex's own explicit rule (a purple item ALSO gets a real error_log.html row, since a regression is a real error, not just an unbuilt idea). Use this skill whenever Alex says "/colourgradient", or asks "where am I on [a multi-build plan]" / wants a benchmark of what's done vs in progress vs not built across several plan items at once. Do NOT use this for a single item's status (that's a plain /drift call) or as a replacement for smoke_test.html (different job — smoke_test.html is Alex's own hand-ticked "does this shipped feature still work," this is a computed-fresh "where does this multi-item PLAN stand right now").
---

# /colourgradient — a real, evidence-checked benchmark of a multi-item plan

Named and defined by Alex Aug 11 2026, inline inside a request to benchmark
the massive-expansion-plan's own 17-item spec after a week of `/CEO`-driven
work on it. Built entirely out of `/drift`'s own procedure — this skill adds
a rendering layer (green/yellow/red) and a whole-plan aggregation step; it
never invents its own evidence-gathering method. If this file and `/drift`'s
own SKILL.md ever disagree on evidence standards, `/drift`'s wins.

## What this is NOT (read this before running it)

- **Not a replacement for `smoke_test.html`.** That doc is Alex's own
  hand-ticked, function/module-granularity "does this ALREADY-SHIPPED thing
  still work when clicked" record — it persists as a standing state between
  sessions and only Alex ticks/unticks it. `/colourgradient` answers a
  different, plan-shaped question — "where does a MULTI-ITEM PLAN currently
  stand, item by item, mid-build" — computed fresh from real evidence every
  time it runs, never hand-ticked, never meant to become a 9th persistent
  oversight doc. Full reasoning for why these don't merge: `records/2026-08/
  massive_expansion_drift_paranoia_colourgradient_2026-08-11.txt`, Part 4.
- **Not a new evidence-gathering method.** Every color this skill assigns
  must clear the exact same bar `/drift`'s own Step 4 already sets — a real
  `file:line`, a commit hash, or a live query result, never a doc's own
  claim about itself. If you can't cite one of those for an item, its color
  is honestly `unknown`/red, not a guessed yellow.
- **Not a standing/automatic job.** On-demand only, by design (matches
  `/investor`'s own precedent as a lens/report rather than a recurring
  task) — Alex invokes it by name when he wants a benchmark. If a future
  session wants this wired into `/CEO` Loop 2 as an automatic per-checkpoint
  run, that's a real, separate decision for Alex to make, not a default this
  skill assumes.

## Procedure

**Step 1 — Pin the plan.** Same as `/drift` Step 1: find the real, specific,
enumerable list of items being benchmarked (a spec file's own named
sections, a `/CEO` plan's work map, a `daily_priorities_debate_*.txt`).
Never invent items or paraphrase the plan from memory — quote/locate it.

**Step 2 — Run `/drift` Steps 2-4 per item.** For every item in the pinned
plan: build the real work map (what would "done" actually look like for
THIS item), gather real evidence (grep/read the actual code, query Supabase,
check git log — never trust a doc's own claim), and classify. This is the
expensive, honest part — do not skip straight to assigning colors without
this step for each item.

**Step 2b — Real 3-axis grounding, where it genuinely applies (G33, Aug 15 2026, Alex's own verbatim ask): "i want colourgradient to also work with all three axes to make it the ultimate smoke test update, use that as grounding tool data (same for possible error logs)."** When the item being benchmarked corresponds to a real G27 external connector (`galaxy_map_externals.html`) or a real G28 skill (`galaxy_map_skills.html`), pull that page's own already-computed AI/UI/Backend axis evidence in as ADDITIONAL grounding for Step 2's `/drift` verdict — never a replacement for it, an extra real citation. A connector/skill that's real-and-verified on 2+ axes is stronger, more specific evidence for green than a single file:line alone; one that's genuinely un-cited on all 3 axes is itself a signal worth noting in the color's evidence trail. **Real, honest scope limit, stated plainly (not claimed as universal coverage)**: not every `ceo_plan_items`/`error_log` row maps cleanly onto one of G27's 13 connectors or G28's 24 skills — this step applies per-row judgment, and a row with no real axis-page counterpart simply skips it and falls back to Step 2's own plain `/drift` evidence, same as before this addition existed.

**Step 3 — Map VERDICT+evidence to a color, per item (4 colors, Aug 11 2026
extension — Alex's own real commitment-level system, not just a build-
status readout):**
- 🔵 **BLUE** — an idea, quickly written down, not yet a real formal plan.
  Real, checkable signal: the source material itself is explicitly
  open-ended/unfinished (e.g. "more ideas to come," no concrete spec written
  yet), not just "not started." Don't confuse this with red — a fully
  specified plan that simply hasn't been built yet is red, not blue.
- 🔴 **RED** — a real, specified plan (a concrete spec exists, whether in a
  compiled doc or a clear verbatim ask), not built. Zero real code/
  infrastructure evidence found for it.
- 🟡 **YELLOW** — real code/infrastructure exists (not zero), but is
  incomplete, dormant (gated behind a missing key/flag), unwired to its
  real call sites, or unbenchmarked/unverified in a way that matters for
  the item's actual purpose. State exactly what's missing, don't just say
  "in progress."
- 🟢 **GREEN** — real evidence confirms the item is built, live, and
  (where applicable) wired to its real call sites — not just present as a
  file that nothing calls. A scaffold that exists but is dormant/unwired is
  NOT green (that's yellow).
- If Step 2 produced a MATERIAL or CAPTURED `/drift` grade instead of a
  clean done/not-done read, report that grade explicitly alongside the
  color — don't silently fold a CAPTURED finding into a plain red without
  flagging that it needs Alex's resolution first (same weight as `/drift`'s
  own guardrail).
- 🟣 **PURPLE** — added Aug 13 2026, real Alex ask ("make things that used
  to work but are now broken purple"). A real REGRESSION: this item's
  `ceo_plan_items.status` was genuinely `green` at some earlier real
  `last_checked_at`, and THIS check finds real evidence it no longer works
  (a broken call site, a failing query, a real error). Never assign purple
  from a guess — same evidence bar as every other color, plus the real
  PRIOR green timestamp/evidence to compare against. Purple is NOT the
  same as red: red never worked yet; purple worked and stopped.
  **Real prior-baseline source (added same day, `/perspective` skill)**: if
  a `perspective_reports` row exists for the item (`status='active'`), its
  `expected_behavior` field IS the real prior-working baseline to compare
  fresh evidence against — read it rather than reconstructing "what it used
  to do" from memory or a stale doc. If no `perspective_reports` row exists
  yet, fall back to whatever real prior evidence `ceo_plan_items` itself
  holds (the same `last_checked_at` evidence this bullet already used before
  `/perspective` existed) — don't block a real purple finding on a baseline
  that hasn't been written yet, just note the gap honestly.
- 🟤 **BROWN** — added Aug 20/21 2026, real Alex ask ("establish what in a
  planned or built update will turn a green into a new colour brown... which
  will archive anything that used to be true that is no longer true").
  A real STALE CLAIM, genuinely different from purple: purple means the
  underlying CODE/FUNCTIONALITY broke; brown means a specific stated
  fact/count/rule in a live oversight doc — a river count, a module total,
  an architecture description — WAS true, and a LATER real change made it
  no longer true, while the feature it describes may still work perfectly
  fine. Confirmed via AskUserQuestion (Alex's own recommended answer):
  "stale claim, not broken code." **Real, worked example this color was
  built from**: `TOTAL_ZONES = 16` in `graphify_river_group.py` was
  correct when written; Aug 18's G49 River-v2 split grew `RIVER_NAME` to
  17 real entries, but nothing forced `TOTAL_ZONES` to move with it —
  found stale 2 days later by a plain file-count check, not a deliberate
  audit. Never assign brown from a guess — same evidence bar as every
  other color: a real OLD value (what the doc said), a real NEW value
  (what's actually true now), and a real, checkable reason the two
  diverged (a specific commit/change, not "probably drifted"). **Real
  archive step, mandatory, not optional**: a brown finding gets a real row
  in `achiever.html`'s Supabase table (`achiever_archive` — `claim_text`,
  `source_doc`/`source_location`, `current_true_value`, plus a real
  error-log-depth breakdown added retroactively per Alex's own direct
  ask, matching `error_log`'s own richness rather than a thin one-liner:
  `rationale` — why the claim went stale, citing the specific real event;
  `backtrack_note` — how/why it went unnoticed until now, same "what
  should have caught this" framing `error_log.backtrack_note` already
  uses; `first_stated_at`/`became_false_at` — real dated timestamps, not
  guessed), the real 12th oversight artifact and layer (e)'s past-tense
  Archive half (see CLAUDE.md's own layer-(e) note) — same "surface it,
  don't just quietly fix it" discipline purple's `error_log` step already
  established. The live doc's own claim gets corrected in the SAME pass
  (same as any other stale-fact fix, rule 6) — brown is the permanent
  RECORD that it was once true, not a replacement for fixing it. **Real
  retroactive batch, Aug 20/21 2026 (Alex's own direct ask, "build
  retroactive entries for achiever... i want them to have the same level
  of breakdown and detail as [error_log's own example]")**: 8 more real,
  already-evidenced stale claims mined from CLAUDE.md's/system_flow_map.md's/
  oracleAppGrounding.SELF_KNOWLEDGE's own real history (the Aug 11 phylum
  renumber, the Aug 13 "Engineer CC"→"OpenMontage CC" rename,
  `style_profiles`'/`taxonomy_proposals`' stale row counts, 3 separate
  stale function/module counts, and the "12 of 21 phyla" progression) —
  never fabricated, each citing the real source doc, the real dated
  window it was true, and the real event that made it false.
  **Real, mandatory removal step (Alex's own direct correction, same
  session): "what gets brown is removed from smoke test, along with all
  other oversight docs that are reporting truth" — not just corrected in
  place, actively REMOVED from every Tier (a)-(d) doc asserting it.**
  Concretely: (1) grep every Tier (a)-(d) doc (`patch_notes.html`,
  `manual.html`, `minotaur_map.html`, `interconnection_map.md`,
  `system_flow_map.md`, `ai_tooling_and_rules_map.md`,
  `oracleAppGrounding.SELF_KNOWLEDGE`, `smoke_test.html`) for the exact
  stale claim; (2) for a doc where the claim is one fact inside a larger
  bullet/entry, rewrite just that fact to the new true value (can't
  delete the whole entry if it holds other still-true content); (3) for
  a `smoke_test_items` row that exists SOLELY to hand-test a now-false
  claim (nothing real left to verify — the fact itself no longer exists),
  DELETE the row outright, not just re-flag it — this is genuinely
  different from purple's `needs_confirm_highlight` treatment, which
  re-flags a row for re-testing because the underlying FEATURE might
  still be fixable; a brown claim has no feature to re-test, only a
  fact that stopped being true. Never delete a `smoke_test_items` row for
  any other reason (a real regression stays purple/re-flagged, never
  silently removed) — this deletion path is brown-specific.

**Step 4 — Route by color (Aug 11 2026, Alex's own explicit rule).** This
is the real, load-bearing addition that makes `/colourgradient` interact
with the rest of the oversight system, not just report to chat:
- **🟢 Green items only** ever get written into the real Tier (a)/(b)/(c)/(d)
  oversight docs (`patch_notes.html`, `manual.html`, `minotaur_map.html`,
  `interconnection_map.md`, `system_flow_map.md`,
  `ai_tooling_and_rules_map.md`, `oracleAppGrounding.SELF_KNOWLEDGE`,
  `smoke_test.html`) — those docs describe what's ACTUALLY TRUE right now,
  and a non-built idea sitting alongside a real shipped feature makes it
  harder to tell the two apart at a glance, per Alex's own direct reasoning.
- **🔵 Blue / 🔴 Red / 🟡 Yellow / 🟣 Purple items route to
  `future_integrations.html` instead** — the real, new "mirror image"
  oversight artifact (built Aug 11 2026), grouped by color, updated whenever
  a `/colourgradient`, `/paranoia`, or `/drift` pass generates a real
  finding and pushes. When an item's color moves to green, it is REMOVED
  from `future_integrations.html` and its real status is added to the
  appropriate Tier doc(s) — an item should never sit in both places
  claiming two different states. **A purple item gets one more real,
  mandatory step (Aug 13, Alex's own ask)**: it also gets a real row in
  `error_log.html`'s Supabase table (`error_log`), since a regression is a
  real error Total Systems should track and eventually resolve, not just an
  unbuilt idea sitting in `future_integrations.html` — the same "surface
  it, don't just log it" discipline `/cartographer` already applies. That
  row carries a real, stable `error_code` (Aug 13, same day 2nd pass —
  `/perspective`'s own Step 5 defines the exact format) so even the
  smallest scope has a trackable identifier once it regresses, and its
  `backtrack_note` doubles as the real "how to possibly fix it" text
  shown alongside the purple card — one diagnosis, cited in both places,
  never written twice. **Aug 15 (G33, "same for possible error logs")**:
  when Step 2b found real G27/G28 axis grounding for this item, that same
  citation goes into the `error_log` row's `rationale`/`backtrack_note`
  too — which axis regressed (a connector that lost its UI trigger, a
  skill that stopped touching backend) is often the sharpest real diagnosis
  available, cheaper to state than re-deriving one from scratch.
- **🟤 Brown items route to `achiever.html` instead — NOT
  `future_integrations.html`** (added Aug 20/21 2026, G54). This is
  deliberately different from purple's own routing: `future_integrations.html`
  is the FUTURE-tense mirror (blue/red/yellow — not yet real), but brown is
  the PAST-tense counterpart (a claim that WAS real and no longer is) —
  the two are opposite directions in time, so they get separate real
  destinations rather than sharing one. A brown item's real archive row
  (`achiever_archive` — `claim_text`/`source_doc`/`became_false_reason`/
  `current_true_value`) is written in the SAME pass the stale claim is
  caught, then the live doc's own claim is corrected — brown is the
  permanent record, not a substitute for the fix.
- `ceo_plan_items.status` is the single shared source of truth both this
  routing step and `future_integrations.html`'s own snapshot render read
  from — never derive the two independently (rule 8).

**Step 5 — Aggregate + render.** Produce, in this order:
1. A plain chat report — one line per item, `🔵/🔴/🟡/🟢 <item> — <one-line
   evidence citation>` — this is the mandatory default output every time.
2. If Alex's request implies he wants an actual visual artifact (uses words
   like "background highlights," "benchmark I can look at," "visual," or
   directly asks for one) — or if a `/CEO` plan is closing out a real
   milestone worth keeping as a shareable record — publish a self-contained
   HTML artifact via the `Artifact` tool with real per-color background
   blocks per item (load `artifact-design` first, per that tool's own
   requirement). This step is opt-in, not automatic, per the `/debate`
   resolution logged in the Part 4 record cited above.

**Step 6 — Write the dated record.** Same verbatim-record convention as
every other RPGACE protocol (rule 5): a `records/YYYY-MM/
<plan-name>_colourgradient_YYYY-MM-DD.txt` capturing the full per-item
evidence trail, not just the final colors — a color with no reasoning
behind it is worthless the next time someone asks "why is this yellow."

## Guardrails

- **A rubber-stamped green is worse than an honest red.** CLAUDE.md's own
  standing caveat about `taxonomy_links`' contaminated 100%-confirm rate is
  the exact failure mode to avoid here — never mark an item green because
  it's PLAUSIBLE it's done; mark it green because real evidence says so.
- **Scale the evidence-gathering to the plan's real size** — a 5-item plan
  doesn't need `/scope`'s full session-sized evidence sweep; a whole spec
  file with 17+ items does. Same guardrail `/drift` already states.
- **This skill never grades Alex's own plan for being incomplete** (a
  `none`-BASIS item, per `/drift`'s vocabulary) as if that were a red flag
  on the WORK — an unratified idea correctly renders as "not yet a plan
  item to grade," not as a red "failure." Conflating the two would repeat
  exactly the mistake `/drift`'s own guardrail exists to prevent.
- **Reserve for genuinely multi-item plans.** A single feature's status is
  a plain `/drift` call, not this skill — applying `/colourgradient`'s full
  aggregation-and-render ceremony to one item is unnecessary overhead, the
  same anti-ceremony discipline every other RPGACE skill applies to itself.
