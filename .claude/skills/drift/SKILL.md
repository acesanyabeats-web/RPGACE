---
name: drift
description: Checks whether real work matches a real, pinned plan — and separately, how solid that plan actually is to measure against. Splits two questions most drift-checks conflate into one axis apiece (VERDICT: on track/drifted/inconclusive/blocked; BASIS: ratified/provisional/none), then grades any real gap found (MINOR/MATERIAL/CAPTURED). Use this skill whenever Alex says "/drift", or as a real step inside /scope, /commit-archaeologist, or GODMODE whenever one of those needs to check real work against a real stated goal rather than just gathering evidence. Aintergration-adopted (not cloned) from the real third-party tool `did-we-drift` (github.com/olsenbrands/did-we-drift), Aug 11 2026, at Alex's own explicit request. Do NOT use this for a first-time build with no prior plan to check against — there's nothing to drift from yet; that's Tier 0-2 territory on the normal Judgment Funnel.
---

# /drift — did the work stay on course, and how solid is the thing we measured against

Adopted (not cloned) from a real third-party Claude Code skill, `did-we-drift`, whose README Alex pasted in full. Its real, genuinely useful mechanic — kept here, everything else left behind since RPGACE already has its own doc set and conventions a generic tool doesn't know about — is a strict separation of two questions that get conflated in almost every informal "are we on track" check:

**VERDICT** — is the *work* going where it was asked to go? `on track` | `drifted` | `inconclusive` | `blocked`

**BASIS** — how solid is the *thing we're measuring the work against*? `ratified` (a real, specific, pinned goal — a spec file, a named CLAUDE.md section, a task list Alex actually confirmed) | `provisional` (a goal inferred from context, not explicitly confirmed) | `none` (no enumerable goal exists at all)

Keeping these separate matters because they have different fixes. A `drifted` VERDICT on a `ratified` BASIS is a real problem with the work. A `drifted`-looking VERDICT against a `none` BASIS isn't drift at all — it's an unplanned build, and calling it "drift" would blame the work for a planning gap that was never the work's fault. **A messy or missing plan is never itself graded as drift** — it's reported on the BASIS axis, so one real problem never gets counted twice, and the work never gets blamed for a planning gap.

**Source of truth**: this file. If a future session's own summary of `/drift` disagrees with this file, this file wins.

## The procedure, in order

**Step 1 — Pin the baseline.** Find the real, specific thing the work is being checked against — never a paraphrase. This should be a directly quotable, locatable source: a named CLAUDE.md section (e.g. "Open forks that need Alex"), a dated backlog `.txt` (e.g. `alex_critique_and_massive_expansion_spec_2026-08-10.txt`), a `daily_priorities_debate_*.txt` from `/Routine`, or an explicit task list from this session's own `TaskList`. If nothing pinnable exists, BASIS is `none` — say so plainly and stop; don't invent a goal to measure against.

**Step 2 — Build the real work map.** Enumerate the actual sanctioned tasks from the pinned baseline — a real, checkable list, not a vibe. Per did-we-drift's own real finding (worth keeping verbatim): *"without an enumerable list of sanctioned work, 'zero unmapped commits' proves nothing"* — a `/drift` run with no real work map cannot certify `on track` no matter how clean the git log looks, and must report BASIS as `provisional` or `none` instead of pretending otherwise.

**Step 3 — Gather real evidence.** Same standing discipline as every other RPGACE protocol: real `git log`, real file/Supabase state, real deployment status — never a doc's own claim about itself. Reuse `/scope`'s evidence-gathering shape when the drift-check is session-sized; a single-item drift-check (one task, one commit) doesn't need the full `/scope` sweep.

**Step 4 — Compare, classify, grade.** For each item in the work map: does real evidence show it done, partially done, or not started, and does that match what the baseline actually asked for? Any real gap gets one of three grades (kept verbatim from did-we-drift, they're exactly right):
- **MINOR** — the record is wrong (a task marked done with no evidence, a stale date, a doc that says something the code doesn't). The fix is an edit, not new work.
- **MATERIAL** — real work happened outside the plan. The goal itself is still intact. Real options: undo it, shelve it, or adopt it into the baseline (with Alex's confirmation if the baseline is `ratified`).
- **CAPTURED** — the goal itself moved without anyone's real say-so. This is the one that can't be postponed — work stops until it's resolved, same weight as a Tier-3 confirmation gate elsewhere in this project.

**Step 5 — Report, in the same fixed shape every time** (adapted from did-we-drift's own real dashboard format, kept because it's genuinely good — a completion measure that can't overstate itself since it's computed from real row/item status, never hand-set):

```
Baseline: RATIFIED | PROVISIONAL | NONE (source: <file/section>, dated <date>)
Work map: FULL (<n> sanctioned items) | PARTIAL (<what's unmapped>) | n/a
Verdict: ON TRACK | DRIFTED | INCONCLUSIVE | BLOCKED
Findings: <numbered, each with a file:line, commit hash, or a real query result — never an assertion alone>
Grades: <MINOR/MATERIAL/CAPTURED per finding, if any>
Next check due: <a real trigger — next milestone, next /Bedtime, or "on demand">
```

## Wired into /scope, /commit-archaeologist, and GODMODE (Alex's own explicit ask, Aug 11)

- **`/scope`**: whenever `/scope`'s own evidence pass surfaces a doc's claim that doesn't match live state (its own guardrail already half-does this — "this skill's evidence-gathering step doubles as a drift-check"), run Steps 4-5 above on that specific finding instead of just noting the mismatch informally. Gives `/scope`'s existing drift-catches a real grade instead of an ungraded flag.
- **`/commit-archaeologist`**: when reconstructing why code exists surfaces a real divergence between a commit's own stated intent and what actually shipped (or what a doc claims shipped), classify it with Steps 4-5's grade vocabulary rather than leaving it as unstructured narrative — a `commit-archaeologist` finding that a function's real behavior diverged from its introducing commit's stated goal is exactly a MATERIAL or CAPTURED finding in this vocabulary.
- **GODMODE** (CLAUDE.md's own `## GODMODE — maximum-rigor deliberation` section): GODMODE's own "exhaustive evidence-gathering before proposing anything" step can invoke `/drift` Steps 1-4 directly when the question at hand is specifically "does this match what was asked," rather than inventing an ad hoc version each time. This does not change GODMODE's own boundary (still never a permission bypass) — `/drift` only sharpens what GODMODE already does, it doesn't add new authority.

## Worked example — "Live-numbers staleness" (Aug 11, real, not hypothetical)

The `BASIS` a session measures against isn't always a plan file — it can
be a doc's own factual claim about live state, like CLAUDE.md's "Live
numbers" section ("`style_profiles` **0 rows ever**"). This is the same
`/drift` shape, just aimed at a fact instead of a task list:

```
Baseline: RATIFIED (CLAUDE.md "Live numbers," dated Aug 4 per its own header)
Work map: n/a (single-fact check, not a task list)
Verdict: DRIFTED
Findings: 1. Live query (mcp__Supabase__execute_sql, project
             gripopghczmrbrhqtqbm, Aug 11): style_profiles holds 3 rows,
             not 0. CLAUDE.md:9 claim is stale.
Grades: MINOR — the record is wrong, not the underlying system; fix is
        a one-line doc edit, not new work.
Next check due: whenever a future session's own evidence next touches
        this table
```

**When this fires**: any time a session's own real evidence-gathering
(a Supabase query it was already running for another reason, a code
read it was already doing) happens to touch a fact some doc asserts —
check it right there, in the same pass, rather than noting the number
and moving on. This is `/update-logging-system`'s artifact 13
(Aug 11) — mandatory on every real report/push specifically because
it's free: it never triggers a NEW query just to check staleness, only
grades what the session was already going to see. Two candidate
table-vs-table dedup checks were run in the same pass that found this
(`conid_pot`/`content_productions`, `bibliography`/`intel_bibliography`)
and BOTH came back as real, distinct data — not every live-vs-doc check
finds a MINOR; reporting "no drift found" is exactly as valid a `/drift`
outcome as finding one. Full record:
`records/2026-08/archive_diagnostic_and_supabase_dedup_ceo_paranoia_2026-08-11.txt`.

## What this replaces, and what it doesn't

This is the same real shape `/5thDimension`'s Phase 1-2 (built vs. reported reconciliation) already does at whole-project scale, and the same thing rule 4/rule 9's informal "get real evidence before a second attempt" discipline already enforces by hand. `/drift` doesn't replace either — it gives both a shared, precise vocabulary (VERDICT/BASIS/grade) instead of each reinventing its own loose version, which is exactly the rule-8 dedup gap Alex pointed at by asking for this. Reserve full `/5thDimension` for genuinely whole-project questions; `/drift` is right-sized for a single plan, a single spec file, or a single session's own task list.

## Guardrails

- **Never certify `on track` without a real, pinned baseline and a real work map.** A clean git log against no plan proves nothing — say so as `BASIS: none`, not as a false "on track."
- **A messy/missing plan is a BASIS finding, never a VERDICT finding.** Don't grade the work for a planning gap that isn't the work's fault.
- **Findings need real evidence** — a `file:line`, a commit hash, or an actual query result. An assertion without one of these isn't a finding, it's a guess.
- **Scale to the size of what's being checked** — a single task's drift-check is Steps 1-5 in a few lines; a whole session or a whole spec file (like `alex_critique_and_massive_expansion_spec_2026-08-10.txt`) warrants `/scope`'s full evidence-gathering shape first.
- **CAPTURED-grade findings stop work** until Alex resolves them — same weight class as this project's own Tier-3 confirmation gate, not something to note and continue past.
