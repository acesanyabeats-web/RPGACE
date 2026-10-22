---
name: drift
description: Checks whether real work matches a real, pinned plan — and separately, how solid that plan is to measure against. VERDICT (on track / drifted / inconclusive / blocked) and BASIS (ratified / provisional / none) on separate axes, then any gap graded MINOR / MATERIAL / CAPTURED. Use when Alex says "/drift", or inside /scope, commit-archaeologist, GODMODE, /CEO, /Engineer Stage 5b or /colourgradient when work must be checked against a stated goal or a doc's claim checked against live state. Adapted from did-we-drift (Aintergration, Aug 11 2026). Not for a first build with no plan to drift from.
---

# /drift — on course, and against what?

Adapted (not cloned) from the third-party `did-we-drift` (github.com/olsenbrands/did-we-drift), whose README Alex pasted. The idea kept: separate two questions.

- **VERDICT** — is the work going where it was asked? `on track` | `drifted` | `inconclusive` | `blocked`
- **BASIS** — how solid is what we're measuring against? `ratified` (pinned and confirmed: a spec file, a `ceo_plan_items` row, a named doc section) | `provisional` (inferred) | `none` (no enumerable goal)

A messy or missing plan is a BASIS finding, never drift; the work isn't blamed for a planning gap.

## Steps
1. **Pin the baseline** — something quotable and locatable: a `records/` spec, a `ceo_plan_items` row, a named doc section, a `daily_priorities_debate_*.txt`, the session's task list, or a doc's own factual claim. If nothing's pinnable, BASIS is `none`; say so and stop.
2. **Work map** — the enumerable sanctioned items. In did-we-drift's words, *"without an enumerable list of sanctioned work, 'zero unmapped commits' proves nothing"*. No map means BASIS is provisional or none, never a false "on track".
3. **Evidence** — git log, files, Supabase, deploys; never a doc's claim about itself. Use `/scope`'s shape for session-sized checks only.
4. **Compare and grade** each gap:
   - **MINOR** — the record is wrong (a stale count, a "done" with no evidence). Fix by editing.
   - **MATERIAL** — real work happened outside the plan; the goal is intact. Undo, shelve, or adopt (adopting into a ratified plan needs Alex).
   - **CAPTURED** — the goal itself moved without anyone's say-so. Work stops until Alex resolves it.
5. **Report in the fixed shape**:
```
Baseline: RATIFIED | PROVISIONAL | NONE (source: <file/section>, dated <date>)
Work map: FULL (<n> items) | PARTIAL (<what's unmapped>) | n/a
Verdict: ON TRACK | DRIFTED | INCONCLUSIVE | BLOCKED
Findings: <numbered, each with file:line, commit or query result>
Grades: <MINOR/MATERIAL/CAPTURED per finding>
Next check due: <milestone / next /Bedtime / on demand>
```

## Where it's wired
- `/scope`: grade any doc-vs-live mismatch it finds.
- `commit-archaeologist`: grade a gap between a commit's stated intent and what shipped.
- GODMODE: use these steps whenever the question is "does this match what was asked". It adds no new authority.
- Also used by `/Engineer` 5b, `/CEO` loops and Grounded Mode, `/colourgradient`, the Cross-Doc Drift Check, and `/fableomnitrix`.

## Example — a live fact as the baseline
Baseline was CLAUDE.md's "`style_profiles` 0 rows ever" (ratified, Aug 4); a live query showed 3 rows → DRIFTED, MINOR, a one-line doc fix. This is `update-logging-system` artifact 13: when a query you're already running touches a fact a doc asserts, check it right there. "No drift found" is just as valid a result. Since the Oct 22 2026 split, counts aren't kept in prose; CLAUDE.md lists the queries instead.

`/5thDimension` does this at whole-project scale; `/drift` is sized for one plan, spec or session.

## Guardrails
- Never certify "on track" without a pinned baseline and a work map.
- Every finding needs evidence (file:line, commit or query).
- Scale to what's being checked.
- CAPTURED stops work.
