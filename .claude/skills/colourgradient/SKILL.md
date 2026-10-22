---
name: colourgradient
description: An evidence-checked build-status benchmark for a multi-item plan (a /CEO plan most of all), item by item, in colours — blue (idea, not yet a plan), red (specified, not built), yellow (code exists but incomplete, dormant, unwired or not hand-tested), green (verified built and live), purple (was green, now broken — also an error_log row), brown (a doc claim that was true and became false — archived in achiever_archive and removed everywhere). A rendering layer over /drift's own evidence procedure, never a second method. Only green goes into the Tier a-d docs; blue/red/yellow/purple go to future_integrations.html; brown goes to achiever.html. Use when Alex says "/colourgradient" or asks where a multi-item plan stands. Not for a single item (plain /drift) and not a replacement for smoke_test.html (Alex's hand-ticks).
---

# /colourgradient — where a multi-item plan stands, with evidence

Named by Alex Aug 11 2026. Built on `/drift`; if the two disagree on evidence standards, `/drift` wins.

**Not**: a replacement for `smoke_test.html` (Alex's standing hand-ticks per feature); a new evidence method (every colour needs a `file:line`, commit or live query, never a doc's own claim; no evidence = red); an automatic job (on demand only).

## Procedure
1. **Pin the plan**: the real enumerable list (`ceo_plan_items` for the plan, a spec file's sections). Never paraphrase it from memory.
2. **Run `/drift` Steps 2-4 per item**: what "done" means for this item, live evidence (code, Supabase, git), then classify. Don't skip to colours.
   - 2b. Where the item is a connector (`galaxy_map_externals.html`) or a skill (`galaxy_map_skills.html`), add that page's AI/UI/Backend axis evidence as extra grounding. Skip it where there's no counterpart.
3. **Colour**:
   - 🔵 **blue** — the source itself is open-ended ("more ideas to come"); no concrete spec yet.
   - 🔴 **red** — specified, with no code or infrastructure evidence.
   - 🟡 **yellow** — code exists but is incomplete, dormant (missing key/flag), unwired, or not yet hand-tested by Alex. Say exactly what's missing.
   - 🟢 **green** — built, live, wired to its real call sites, and confirmed. A dormant scaffold is yellow.
   - 🟣 **purple** — was green (prior evidence and timestamp), now broken by fresh evidence. The baseline is the item's `perspective_reports.expected_behavior` if a row exists, otherwise the plan row's own prior evidence. Red never worked; purple worked and stopped.
   - 🟤 **brown** — a stated fact, count or rule WAS true and a later change made it false (the feature may work fine). Needs the old value, the new value and the specific change that diverged them. Alex confirmed the meaning: "stale claim, not broken code". Worked example: `TOTAL_ZONES = 16` went stale when `RIVER_NAME` grew to 17.
   - Report a MATERIAL or CAPTURED `/drift` grade next to the colour, never folded into it.
4. **Route**:
   - Green → the Tier (a)-(d) docs (`patch_notes.html`, `minotaur_map.html`, `interconnection_map.md`, `system_flow_map.md`, `ai_tooling_and_rules_map.md`, `SELF_KNOWLEDGE`, `smoke_test.html`, `docs/claude/*.md`). Remove it from `future_integrations.html`.
   - Blue/red/yellow/purple → `future_integrations.html` (rendered from `ceo_plan_items.status`, the single shared source — rule 8).
   - Purple also → an `error_log` row with a stable `error_code` (format in `/perspective` Step 5); `backtrack_note` doubles as the "how to fix" text; cite any 2b axis evidence in `rationale`.
   - Brown → an `achiever_archive` row (`claim_text`, `source_doc`/`source_location`, `current_true_value`, `rationale` = why it went stale, `backtrack_note` = why nobody noticed, `first_stated_at`/`became_false_at`), written in the same pass. Then correct the claim in place everywhere it's asserted: grep every Tier (a)-(d) doc and topic file; where it's one fact inside a bigger entry, rewrite just that fact. Alex: *"what gets brown is removed from smoke test, along with all other oversight docs that are reporting truth"* — a `smoke_test_items` row that only tested that claim is deleted outright. This deletion path is brown-only; a purple row is re-flagged (`needs_confirm_highlight`), never deleted.
5. **Render**: a chat report, one line per item: `<emoji> <item> — <evidence>`. Publish an HTML artifact only if Alex asks for something visual or a milestone deserves a shareable record (load `artifact-design` first).
6. **Record**: `records/YYYY-MM/<plan>_colourgradient_YYYY-MM-DD.txt` with the per-item evidence trail.

## Guardrails
- An honest red beats a rubber-stamped green.
- Scale evidence-gathering to the plan's size.
- An unratified idea is "not yet a plan item", not a failure.
- Multi-item plans only.
