---
name: colourgradient
description: Renders a real, evidence-checked build-status benchmark for a multi-item plan (a /CEO-tracked plan most of all) as green/yellow/red — green (verified built and live, real file/commit/query evidence), yellow (genuinely in progress — real code exists but incomplete/dormant/unverified), red (not started, zero real evidence). Built entirely as a rendering layer over the /drift skill's own procedure — never a competing evidence-gathering method. Use this skill whenever Alex says "/colourgradient", or asks "where am I on [a multi-build plan]" / wants a benchmark of what's done vs in progress vs not built across several plan items at once. Do NOT use this for a single item's status (that's a plain /drift call) or as a replacement for smoke_test.html (different job — smoke_test.html is Alex's own hand-ticked "does this shipped feature still work," this is a computed-fresh "where does this multi-item PLAN stand right now").
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

**Step 3 — Map VERDICT+evidence to a color, per item:**
- 🟢 **GREEN** — real evidence confirms the item is built, live, and
  (where applicable) wired to its real call sites — not just present as a
  file that nothing calls. A scaffold that exists but is dormant/unwired is
  NOT green (see yellow below).
- 🟡 **YELLOW** — real code/infrastructure exists (not zero), but is
  incomplete, dormant (gated behind a missing key/flag), unwired to its
  real call sites, or unbenchmarked/unverified in a way that matters for
  the item's actual purpose. State exactly what's missing, don't just say
  "in progress."
- 🔴 **RED** — zero real evidence found. State what was checked (the real
  grep patterns / files read / queries run) so a future run isn't repeating
  the same negative search from scratch.
- If Step 2 produced a MATERIAL or CAPTURED `/drift` grade instead of a
  clean done/not-done read, report that grade explicitly alongside the
  color — don't silently fold a CAPTURED finding into a plain red without
  flagging that it needs Alex's resolution first (same weight as `/drift`'s
  own guardrail).

**Step 4 — Aggregate + render.** Produce, in this order:
1. A plain chat report — one line per item, `🟢/🟡/🔴 <item> — <one-line
   evidence citation>` — this is the mandatory default output every time.
2. If Alex's request implies he wants an actual visual artifact (uses words
   like "background highlights," "benchmark I can look at," "visual," or
   directly asks for one) — or if a `/CEO` plan is closing out a real
   milestone worth keeping as a shareable record — publish a self-contained
   HTML artifact via the `Artifact` tool with real green/yellow/red
   background blocks per item (load `artifact-design` first, per that
   tool's own requirement). This step is opt-in, not automatic, per the
   `/debate` resolution logged in the Part 4 record cited above.

**Step 5 — Write the dated record.** Same verbatim-record convention as
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
