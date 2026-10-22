---
name: 5thDimension
description: RPGACE's whole-project protocol — reconciles what's actually built (code/git/Supabase) against what's reported done (oversight docs, docs/claude topic files, Chronicles), then debates a prioritised interconnection/rewiring plan against an honest counter-case (don't rewire, or a leaner option), with Council of 5 and Alex's interrogated input keeping it anchored to his goals. Use when Alex says "/5thDimension", asks for a full built-vs-reported audit, or asks how to interconnect or rewire existing infrastructure. Heaviest protocol after /paranoia — never for a single bug or feature (those stay on the omnitrix Judgment Funnel).
---

# /5thDimension — built vs reported, then how to rewire it

Named by Alex July 23 to fight context drift — development that quietly stops tracking his goals because no pass steps back far enough. It's a fixed sequence of other protocols (`omnitrix`, `scope`, `debate`), not a new kind of reasoning.

## Phases
1. **What's actually built** — `/scope` + GODMODE over the code: git log, `rpgace_core.js`, `index.html`, `api/*`, Supabase (`list_tables`, `execute_sql`, `get_advisors`), and the Galaxy Map data (regenerate it first if code changed; `graphify update .` is free). Council of 5 writes Side A module by module, with file/line references.
2. **What's reported done** — the same rigour over the oversight docs (`docs/claude/oversight.md` lists them), the topic files, `system_updates` and `ceo_plan_items`. Council of 5 writes Side B.
3. **Reconcile** — `/debate` A against B wherever they might differ. Settle disputes with a query or a line read. Council of 5 reviews the transcript.
4. **Rewiring debate** — the reconciled picture backs a prioritised step-by-step plan; the other side is a genuine reason not to rewire, or a leaner option. No strawmen.
5. **Alex's input** — real forks become `/interrogation` questions; Aintergration only if a third-party tool is involved. Council of 5 folds in his answers.
6. **Check the run** — did the evidence hold, was the tension real, did the plan stay on his goals rather than tidiness?

Anything built afterwards follows the normal rules: brief first, `/Engineer`, merge and deploy check, same-session logging.

## Guardrails
- Whole-project questions only.
- Every claim on either side cites a commit, file/line or row.
- If there's no real case against rewiring, say so.
- Phases 1-2 can go to a background Fable dispatch when the audit is huge enough to earn it.
