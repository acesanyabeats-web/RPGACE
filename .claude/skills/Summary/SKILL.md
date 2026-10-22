---
name: Summary
description: An evidence-checked recap of what actually happened across a stretch of work (a session, a multi-step task, several rounds), to restore Alex's context — GODMODE+/scope evidence, a built-vs-reported reconciliation, a /debate on where findings belong, and Council of 5 for quality and recommendations. Use when Alex says "/Summary", "what happened", "catch me up", "where are we", or has lost the thread. Also called by /Bedtime. Scale the depth to the size of what's being summarised.
---

# /Summary — a verified recap

Named by Alex July 24 for when he's lost track. The answer must be re-verified from evidence, not recalled from scrollback.

## Steps
1. **Evidence** (GODMODE + `/scope`):
   - `git log` for the span; `system_updates`; `session_memory` (rejected alternatives, attachments); touched tables.
   - For a `/CEO` plan, its `ceo_plan_items`/`ceo_reports` (`evidence`, `status`) are often the most precise account.
   - Fix any plan row or `future_integrations.html` card still stale for shipped work (`update-logging-system` artifact 19).
   - Run the Cross-Doc Drift Check for each subject changed, targeted.
   - Run `impeccable`; log a `design-scan` `system_updates` row only if the result changed.
   - Where memory and evidence disagree, evidence wins — say so.
2. **Reconcile** built vs reported (`/5thDimension` Phases 1-2 only, unless the span is huge).
3. **`/debate` on presentation**: which finding goes in which doc (per the `update-logging-system` map), terseness vs completeness. Then write it.
4. **Council of 5 on the debate**: was the tension real, and is the plan proportionate?
5. **Council of 5 recap for Alex**: what happened, what's done, what's open, what needs him — in plain words.

## Guardrails
- Scale it: a small fix gets Step 1 plus two sentences.
- Fable is optional and rarely worth it here.
- Never invent an answer to an open question; ask Alex.
- Answer in chat first. A `records/` file only when the findings are substantial.
