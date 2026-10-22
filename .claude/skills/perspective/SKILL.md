---
name: perspective
description: RPGACE's evidence-grounded self-report method — a first-person "who I am, who I actually talk to, what my correct output looks like" account for one real actor (an L0 unit, a harness node, an AI provider, a connector, a module, or a feature), reconstructed from real code/Supabase evidence, never live AI-to-AI dialogue. Domains (formerly rivers) are not actors and get a third-person synthesis of their modules' reports instead. Each report writes an expected_behavior baseline to perspective_reports, which error_log (linked_perspective_id/expected_baseline) and /colourgradient's purple check reuse. Use when Alex says "/perspective", when an actor is added or changes shape, when /colourgradient needs a prior baseline, or when error_log needs a "what should this have done" reference. Not for code review or a single bug's root cause (commit-archaeologist / /Engineer).
---

# /perspective — self-reports as a shared baseline

Named by Alex Aug 13 2026 after two pilots (galaxy level, node level — `records/2026-08/galaxy_interviews_pilot_2026-08-13.txt`) each found real topology gaps the top-down map had missed. His bar was "if it works again, then make /perspective". He wants it to eventually cover "everything I have control over in RPGACE total system", and to give `error_log` a basis for judging what "done correctly" means.

**Not live dialogue.** Sessions can't reach each other (`ListAgents` shows none). A report is a reconstruction from evidence; say so in every report. First person still earns its keep: writing as the element forces you to check its own evidence instead of restating the map — that's how the duplicate Graphify CC node and the FFmpeg topology bug were caught.

## Procedure
1. **One element, one report.** Scopes: `galaxy`/`l0_unit`, `node`, `module`, `feature`, plus synthesis scopes `domain` (formerly `river`), `level` and `dimension_kind`. Domains aren't actors — never write "I am the Cooking domain"; compile a third-person synthesis citing the module reports inside it (write any that are missing first).
2. **Evidence first**: grep the call sites, read the module, query the tables it reads and writes (rule 1). A baseline built from memory poisons `error_log` and `/colourgradient` downstream.
3. **Write four parts**:
   1. Who I am / what I actually do (from the code).
   2. Who I talk to and how — every edge with its channel (table, direct call, `hooks.fire`), cited by file:line or query.
   3. `expected_behavior` — one concrete paragraph, precise enough that fresh evidence gives a clean yes or no.
   4. Findings that contradict the map or docs, graded MINOR/MATERIAL/CAPTURED.
   Put cross-references in `evidence.cross_refs` (`scripts/gmp_b_consistency_check.py` compares them to `RIVER_FLOWS`).
4. **Persist** to `perspective_reports` (`scope_level`, `scope_id`, `scope_label`, `self_report`, `expected_behavior`, `evidence` jsonb, `findings` jsonb, `status`). Replacing one: set the old row `status='superseded'` and `superseded_by` = the new id. Never leave two active baselines.
5. **Route findings**:
   - Map/topology MATERIAL or CAPTURED → fix the generator data, or write a `system_map_flags` row.
   - "Used to work, now doesn't" (the detector side of purple):
     1. Make an `error_code` `PERSPECTIVE-<SCOPE_ID upper, hyphens>-<NN>` — query `error_log` for the highest existing NN first.
     2. Write the `error_log` row: `error_code`, `linked_perspective_id`, `expected_baseline` (copied verbatim), `rationale` (cited fresh evidence), `backtrack_note` (likely upstream cause — it doubles as the "how to fix" text on the purple card).
     3. If that scope's `ceo_plan_items` row was green, flip it purple with the same evidence.
     This is judgment work a session does. The G109 client cascade (`errorLog._capture`) only attaches baselines and flips rows automatically; it never diagnoses. An Oracle "🧪 Flag to Orchestrator CC" (`oracle_dev_suggestions`) becomes an error only after a session confirms it.
   - Anything smaller → tell Alex in chat.

## Coverage
Every registered module, live domain, L0 unit, level and dimension kind has an active report (built Sep 15-16 and Oct 11 2026). Older `river` reports are superseded by domain reports. Feature-level rows (`mainjs_function`/`onclick_feature`/`decision`) are unverified scaffold, kept apart on `perspective_map.html`. New modules get a report when they're built or next touched — never a blind sweep of everything at once.

## Feeding error_log
When writing an `error_log` row for an element that has an active report, set `linked_perspective_id` and copy `expected_behavior` into `expected_baseline` (denormalised on purpose so `error_log.html` renders without a join). With no report, leave both null and note the gap; don't invent a baseline under pressure.

## Guardrails
- A report is a baseline for later comparison, not proof that nothing is wrong.
- One element per report. If writing it reveals more elements that need reports, list them as follow-ups.
- Supersede, never overwrite.
- Check changes to this skill against the pilots' proven shape.
