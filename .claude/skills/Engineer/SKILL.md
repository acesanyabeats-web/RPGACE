---
name: Engineer
description: RPGACE's build-and-verify loop — one bounded pass takes a declared goal list through /scope+GODMODE evidence, Omnitrix execution (Opus builds, the session reviews, no Fable by default), a Council of 5 report written from the real diff, then an independent Truth Check that re-verifies the report against actual git/file/deployment state before anything is called done. Use when Alex says "/Engineer", or for a full build-verify-report cycle on a real task (every /CEO Loop 2 item). Not for typos or one-function fixes (Tier 0/1), and not a planning ritual (/Routine plans; /Engineer executes an existing goal list).
---

# /Engineer — build it, then prove the report is true

Alex, July 25, verbatim: *"using /Scope, /omnitrix and /5thDimension without fable with opus 5 where needed. then council of 5 all actions into a report for me to read. then verify report against /scope and /godmode to access truth between installed changes and actual changes, then /Debate again back into the first /Debate prompt of this prompt to start a loop."*

The core idea: **a report about what was built is a claim, not evidence.** This project has repeatedly shipped truthful-sounding reports that reality disagreed with (an unmerged "done" fix, a badge fix that never ran live, a migration logged complete that grep proved wasn't, an RLS flip never executed). Stage 5 is the point of the skill.

**Not built, on purpose**: an infinite self-authorising loop (no outside ground truth, and it would re-execute code changes unattended); stopping on a self-assigned score (the placement scorer once rated five duplicate leaves 9/10); certifying "zero bugs" (there's no test suite). The Objective Completion Gate and an explicit UNTESTED label replace those.

## One pass
1. **Goal contract** — a numbered list of goals, each later marked done / not done / descoped-with-reason, each with a Judgment Funnel tier. A Tier 3 goal gets Alex's confirmation before the pass starts.
2. **Evidence** (`/scope` + GODMODE) — `git log`, the real source of every function to be touched (rule 1), live Supabase where data matters, and a grep for a second copy of anything about to be written (rule 8). Galaxy Map data first for ownership questions (rule 15). Never take a number from a doc.
3. **Build** (Omnitrix) — Opus builds, the session reviews line by line. `/5thDimension` only for whole-project goals. If the goal touches the network or makes a user wait, run `/decompress`'s 5-pattern checklist (compress, batch, circuit-break, optimistic UI, cache fragments) and say which apply.
4. **Council of 5 report, written from `git diff`/`git status`**, not from memory: what changed and where, why, anything touched that wasn't planned, residual risk, and the why-not case.
5. **Truth Check** — re-run the commands; don't re-read earlier output. Both directions: every claimed change is in the diff/file/deploy, and every diff hunk is in the report. An unclaimed change is a defect.
   - **5b `/drift` goal check** — `/drift` against the pinned source of the goals (a ratified `/CEO` item, an open-items line, or the Stage 1 contract itself as `provisional`). A CAPTURED finding stops the pass and goes to Alex. Use `/debate` only for a real two-way fork.
   - **5c Self-Consistency Sweep** (rule 17) — grep every hard number (counts, "N of M", percentages) in any doc, card or commit message this pass wrote. Every mention must agree with every other in the same commit, and each must be re-derivable from a live source. Skip explicitly when there are no new numbers. (A card once said "Seven rows" and "21 of 21" for a true value of 9.)
Then apply the gate and stop.

## Objective Completion Gate
- **G1 Syntax** — `python3 scripts/core_source.py check` clean, locally (since CK-8 it joins the `src/` files in memory and runs `node --check`). (CI runs after deploy; it's an alarm, not a gate.)
- **G2 index.html** (if touched) — div balance; every `id="page-X"` inside `#app` before the script; exactly one static script tag (`rpgace_core.min.js`).
- **G3 Module convention** — new code inside `/* ===MODULE:x=== */` markers via `RPGACE.register()`, with a `domain:` key; `python3 scripts/check_module_domains.py` passes.
- **G4 Claim ↔ diff** — Stage 5 is clean both ways.
- **G5 Goals** — every goal resolved; a silently dropped goal fails.
- **G6 Deploy reality** (if merged) — Vercel `list_deployments` shows the commit `READY` in production; for an `/api/*` change, a real HTTP probe where reachable.
- **G7 Ship hygiene** — if `rpgace_core.js` changed: `node scripts/minify_client.js` re-run and `?v=` bumped in `index.html`, same commit.
- **G8 Drift** — 5b VERDICT `on track` (or MINOR fixed inline) against a ratified or labelled-provisional BASIS. CAPTURED fails and goes to Alex.
- **UNTESTED** is required, not a failure: anything that needs Alex's hands is listed with the exact action and what he should see (rule 10). Never rounded up to "verified".
- The Council of 5 quality score is informational only. Say so when it disagrees with the gate.

## Re-looping
Another pass runs automatically only when all of these hold:
- The trigger is an objective gate failure or an unresolved goal (never "could be better").
- There's no new scope.
- **Max 3 passes.**
- **Max 2 attempts per defect** (rule 4) — this overrides the pass cap. The same applies to a repeated identical interrupt/continue cycle (rule 9).
- No Tier 3 action auto-continues.
Use `/debate` between passes only for a real fork.

## Guardrails
- Tier 3 (destructive git, force-push, migrations beyond the CEO additive carve-out, RLS, spending, credentials) always gets an explicit per-instance confirmation. Rigour is not permission.
- Never use a pass's own report as evidence about itself.
- Merge to `main` and confirm the deploy before telling Alex anything is ready to test.
- Taxonomy writes still need a human checkpoint.
- Record each pass in `records/YYYY-MM/engineer_pass_YYYY-MM-DD_NN.txt` (goals, diff summary, report, Truth Check, gates, UNTESTED), then a `patch_notes.html` card and a `system_updates` row (rule 6).
- State the cost up front, and don't grow the pass silently.
