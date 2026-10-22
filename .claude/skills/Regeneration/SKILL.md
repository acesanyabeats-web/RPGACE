---
name: Regeneration
description: RPGACE's taxonomy-quality audit — sweeps the taxonomy tree and the Phylum Path pipeline, scores paths for structural and teaching quality, and produces a dated report plus a bounded batch of reviewable proposals. A free deterministic SQL tier runs first, then a bounded AI-judged tier only where SQL can't reach, then (on request) a generative tier. Use when Alex says "/Regeneration" or "regenerate the taxonomy", or asks for a whole-tree quality sweep or "what deserves which phylum". Not for placing a single new insight (phylumPath.decidePlacementScored does that). Never writes to taxonomy_tree.
---

# /Regeneration — audit the tree, one bounded pass at a time

Alex, July 25, verbatim: *"always uses /scope on taxonomy tree and whole phylum path, all functions buttons and interconnections with other modules and Dom's... and will generate content of taxonomy tree, what deserves which phylum path, how to reorganise phylum or other taxonomy steps."*

The live engine judges each insight on arrival; nothing judged the whole tree afterwards. One SQL query once found 14 nodes of a failure class an 85-minute manual review had found once.

**Current state**: `taxonomy_tree` has 0 rows (wiped Sep 25 2026 for a rebuild around reviewed `jargon_encyclopedia` terms), and tree growth is paused (`taxonomyTree.logic.isPaused()`). Tier 0 has nothing to scan until the rebuild starts; the most useful run now is a Tier 0-style audit of `jargon_encyclopedia` (duplicates, wrong phylum, empty definitions) or of a proposed phylum structure. See `docs/claude/knowledge.md`.

**Not built, on purpose**: always-running (no human in the loop breaks rule 4); self-graded until 9/10 (the scorer grades its own model's output and may never converge); a writer.

## Tiers, always in this order
- **Tier 0 — deterministic SQL, free.** Leaf rows with children; duplicate `lower(name)`; depth > 6 or child depth ≠ parent + 1; `path` not matching the parent chain; orphans; naming-rule-1 hits (`|`, ` - `, a bare year, "Tutorial", channel/artist names — about 5 true positives in 8, so a candidate list only); phyla outside `phylumPath.ENABLED_PHYLA`; leaves with an empty `explainer`. Run it in full every pass.
- **Tier 1 — judged, batched by branch.** "Is this in the right place / do these siblings say one thing": send a whole branch per call (cheaper and better, the same reason `decidePlacementScored` takes `priorLeaves`), using `phylumPath`'s five checks (clarity, non-redundancy, applicability, structural fit, headroom). No second rubric.
- **Tier 2 — generative** (gaps, merges, "what deserves which phylum"). Last, smallest batch, only on request, and never while Tier 0 defects are unresolved.

## Procedure
1. `/scope` + GODMODE: live counts and the real `phylumPath` code.
2. State the scope (phyla, tiers, estimated tokens) and get Alex's go.
3. Tier 0 in full, with row ids.
4. Tier 1 on the declared scope; stop at the batch count — leftovers are the next pass.
5. Record in `records/YYYY-MM/regeneration_pass_YYYY-MM-DD_NN.txt`.
6. Propose, never apply (see below).
7. A `patch_notes.html` card + a `system_updates` row.

## Guardrails
- **The review queue can only INSERT** (`_acceptConceptFusion`, `_acceptPhylumPathProposal`, `taxonomyTree._acceptLineage`). A move/merge/delete written as a `taxonomy_proposals` row would create a duplicate when accepted. Put those in the report as proposed SQL for Alex instead.
- Never write to `taxonomy_tree`, however confident.
- A score is evidence, not authorisation.
- Report honestly if a re-score disagrees with an earlier score.
- Declare cost every pass and batch by branch. Per-node judging is ~6x the cost; that shape burned £10 once.
