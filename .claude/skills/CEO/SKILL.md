---
name: CEO
description: RPGACE's framework for a large build that spans several sessions — from a pile of ideas, through a plan Alex approves, through execution across many sessions, to items Alex ticks by hand. Two loops: PLANNING (compile -> interrogate -> paranoia-advised drafting -> drift-check -> Council-of-5 report -> Alex approves) and EXECUTION (the approved plan is the /drift baseline; each item is briefed, built through /Engineer, drift-checked, logged). While a plan is active, Grounded Mode keeps it in view on every prompt, backed by Supabase tables ceo_plans/ceo_plan_items/ceo_reports. "/stopCEO"/"/ResumeCEO" pause and resume it. "/CEOfable" is a mode (Fable writes the decisions read-only via /fableomnitrix). Use whenever Alex says "/CEO", "/CEOfable", "/stopCEO" or "/ResumeCEO", or when a build will genuinely take several sessions. Not for a normal Tier 2 feature — that stays on the Omnitrix Judgment Funnel.
---

# /CEO — a multi-session build that doesn't get re-argued every session

Alex, Aug 11 2026, verbatim: *"this is a multi day build, so create a plan, use any of my inputs through /interrogation, then run /paranoia with /engineer, /aintergrations and /restructure as advisors for writing the full list. make sure to use /drift on everything written in this document throughout to make sure nothing is missed, then compile into huge summary report. this report will then be given to me to read and improve, so we change the plan with /drift in mind. the final approved plan will be the original drift file for /Engineer to then execute through multiple days and sessions, with each build going through /drift and /paranoia to make sure everything is being executed as needed. then when steps in plan are complete, they compile into a smoke test document that will be implemented into rpgace as an oversight doc... run this as a new CEO framework that needs an md file."*

It's a fixed sequence of protocols that already exist. The risk it guards against: session 4 no longer knowing what session 1 approved.

**Source of truth**: this file plus the sibling skills it calls (`drift`, `paranoia`, `interrogation`, `Engineer`, `aintergration` via `omnitrix`, `restructure`, `fableomnitrix`). Galaxy-Map-specific rules R1-R28 live in `galaxy_development_framework.md` next to this file.

## Loop 1 — PLANNING (builds nothing)

1. **Compile.** Put every idea in scope into one close-to-verbatim spec file in `records/YYYY-MM/` (rule 5). Merge asks that are secretly the same problem. A live-evidence audit (a `/drift` scan of code/Supabase against doc claims) is an equally valid source; then that audit record is the Step 4 baseline.
2. **`/interrogation`.** Ask Alex about real ambiguity only; never guess at consequential intent; don't question what's already clear.
3. **Draft with `/paranoia`.** Default advisors: `/Engineer` (sketch concrete implementations), `/aintergration` (third-party tools), `/restructure` (changes to the dev skeleton). A plan may name a different cast; record which ran in the spec. Scale: for about five findings or fewer with two or fewer MATERIAL, use `/drift` plus plain scrutiny, keeping `/paranoia`-level scrutiny for the MATERIAL ones — and say so in the report.
   - **Decision layer**: Council of 5 writes verdicts by default; Fable writes them under `/CEOfable`. Every MATERIAL finding handed to the decider must cite live state checked in this pass, never another doc's claim.
4. **`/drift` continuously** against Step 1's source while drafting. MINOR = add the missed item back. CAPTURED = the draft has redefined the goal; stop and re-anchor.
5. **Report.** Grouped (the `/scope` method). Separate: proposed vs already decided vs open forks for Alex. Council of 5 scrutiny — risk, cost, maintainability, Alex's goals, and a mandatory why-NOT case — runs before he sees it.
6. **Alex reads, pushes back, approves.** Nothing is buildable before this. Pushback changes the plan and the report is rewritten.
7. **The approved version is the ratified `/drift` baseline** — not the draft, not chat. Write the plan to `ceo_plans` (status `active`, basis `ratified`) and its items to `ceo_plan_items`.

## Loop 2 — EXECUTION (many sessions)

0. **Brief Alex before each item** (CLAUDE.md rule 18): what it is and where it came from, what changes for him, open choices with a recommendation, what's left out. Wait for his go. If he says "do all", brief once and run the items in order.
1. **Build through `/Engineer`** against the ratified item. A custom dispatch plus an ad hoc review does not replace `/Engineer`'s Stage 5 Truth Check and Self-Consistency Sweep (rule 17); if a shortcut is taken, name it as a deviation in the report.
2. **`/drift` the result** against the item. MINOR → fix the doc. MATERIAL → undo, shelve or adopt (adopting a real change needs Alex). CAPTURED → stop and ask.
3. **Status**: built but not hand-tested = yellow; Alex's hand-confirm = green; a regression = purple (plus an `error_log` row). Completed items get `smoke_test_items` rows that only Alex ticks.
4. **Errors**: a broken item is un-ticked with a note of what broke; `oracleAppGrounding.SELF_KNOWLEDGE` reflects working vs broken. The G109 cascade in `errorLog._capture` already flips smoke rows to broken and green plan items to purple automatically.
5. **Chronicles**: each completion gets a `system_updates` row as well as its `patch_notes.html` card.
6. **Prompt scope first.** Alex, Aug 15: *"ceo framework should also have a step where it records the previous scope of my prompt into the doc to help fill it out."* Every `session_lessons.html` card and `ceo_reports` summary opens with the actual prompt/scope that was active (his words where he gave them), written before the obstacle/reasoning/solution — never back-filled from the fix. That's how a later reader can see when evidence narrowed the scope.

## Grounded Mode

Alex, verbatim: *"from now on CEO framework is grounded to every prompt until the plan is done and smoke tested. this will help continue /drift verification throughout the build phase and iterations along the way to keep larger goals in tact. this will help chase long term goals."*

While any `ceo_plans` row is `active`, on every prompt:
1. If no plan is active (none, paused or dormant), do nothing.
2. Quick relevance check: does the work touch a `ceo_plan_items` row (code, title or file overlap)? If clearly not, say so and carry on.
3. If it does, run `/drift` against that item and update its `status`/`last_verdict`/`evidence`/`last_checked_at`.
4. A CAPTURED finding stops and asks.
5. If the item touches the mapping hierarchy (domain/module/connector), also run `cartographer` Steps 3-4.

**`/stopCEO`** sets `status='paused'` + `paused_at`. Grounded Mode goes quiet and nothing is deleted. **`/ResumeCEO`** sets `active` + `resumed_at`, then runs a `/drift` catch-up over all the plan's items before normal cadence resumes. With several active plans, both take a plan name or id.

Alex, verbatim: *"every prompt in orchestrator is grounded with CEO framework while ceomode is on, when plan is finished and future plans is completely empty, /ceo mode switches off automatically until a plan or report populates the future integrations doc, or /stopceo switches off the mode too until /resumeceo is prompted by me."* Two off states:
- **paused** — manual; stays off until `/ResumeCEO`.
- **dormant** — derived, not stored. All items are green (the plan flips to `complete`) and no non-green item exists in any plan. Any new plan or item makes it active again.

**CEO never appears in the RPGACE app.** Alex: *"ceo should not be present in rpgace, only orchestrator CC since its a development framework only."* There is no pill, toggle or UI. The tables are dev-only data; to know the state, the session queries them and says so in chat. (A `ceoMode` app module was built once and deleted for this reason.)

## `/CEOfable` — a mode of this skill
Alex says "/CEOfable" instead of "/CEO". Two things change:
1. Loop 1's judgment calls and the report's decision section are written by Fable through `/fableomnitrix`. The session still compiles the dossier, following that skill's Step 3 template and fresh-citation rule, and Council of 5 still scrutinises the result before Alex sees it.
2. Loop 2's per-item verdict may be a Fable SUCCESS/NOT-SUCCESS call. It is evidence for `/Engineer` Stage 5, never a replacement.

Everything else is unchanged. Fable reports are logged in `ceo_reports` with `report_type='fable_verdict'`. It's a mode rather than a separate skill because "which steps" and "who decides" vary independently, and a second file would duplicate both loops.

## Supabase datasheet
Alex: *"making a supabase for this would help a lot, and tie all the loose reports and plans together. tie reports to the plans to make datasheet on all of it."*
- `ceo_plans`: `id`, `name`, `source_file`, `status` (compiled | active | paused | complete | absorbed), `basis` (ratified | provisional | none), `created_at`, `ratified_at`, `paused_at`, `resumed_at`, `completed_at`, `notes`.
- `ceo_plan_items`: `id`, `plan_id`, `item_code`, `title`, `status` (blue | red | yellow | green | purple), `basis`, `last_verdict` (on_track | drifted | inconclusive | blocked), `evidence` (file:line, commit or query — never a guess), `last_checked_at`, `created_at`, plus `galaxy_river`/`galaxy_modules`/`galaxy_level`/`galaxy_dimensions`/`galaxy_facet_kind`.
- `ceo_reports`: `id`, `plan_id`, `plan_item_id` (nullable), `report_type` (free text: drift, paranoia, colourgradient, engineer, ceo_loop1, ceo_loop2, fable_verdict), `file_path`, `summary`, `created_at`.
- RLS: `ceo_plans`/`ceo_reports` are anon-read-only; `ceo_plan_items` must stay anon-writable, because the browser's G109 cascade writes it.
- A `status` value is a cache of the last check. If `last_checked_at` is old, re-verify before trusting it. Full prose still goes in `records/` files (rule 5).
- `/colourgradient` and `future_integrations.html` read these rows directly.

## Confirmation model
Alex: *"I don't care if it is not made well first time, I want you to just not drift and report everything truly... just do accept once or accept all etc... just report and log everything truthfully with /drift."*
- **Reduced**: re-asking whether to build an item Alex already approved. `/drift` catches mistakes; it isn't a permission gate.
- **Additive schema changes** for an approved item (`CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, a grant-only policy) go ahead without asking; report them after.
- **Never reduced (Tier 3)**: `DROP`/`TRUNCATE`, unscoped bulk `DELETE`/`UPDATE`, loosening RLS, credentials, spending, force-push, taxonomy writes without a checkpoint. Alex approved the plan, not every consequence of it; a Tier 3 step not named in the plan is a new decision. `/auto` (CLAUDE.md) is a separate, SQL-only override.
- Destructive SQL through the connector usually times out: hand Alex a paste file with a check query.

## Related
- Rule 8 is the deduplication discipline, applied at every step (not a separate skill). For "why does this code exist", use `commit-archaeologist`; there is no `/debug` skill.
- **Ends at `/investor`**: once a real slice of Loop 2 has shipped, run `/investor` on the actual product state (Alex: *"make a plan on how to build this as a product with /investor to make RPGACE a financial success"*).

## Guardrails
- Loop 1 never skips Step 6. The ratified baseline is what Alex approved, not a paraphrase; when unsure, treat it as a `/drift` BASIS question and check.
- CAPTURED always stops and asks.
- Reserve this for genuinely multi-session work.
