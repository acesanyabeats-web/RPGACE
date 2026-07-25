---
name: Regeneration
description: RPGACE's taxonomy-quality audit pass — sweeps the whole taxonomy tree and the Phylum Path pipeline that feeds it, scores every path for real structural and pedagogical quality, and turns what it finds into a dated report plus a bounded batch of reviewable proposals. Runs a free deterministic SQL tier first, then a bounded AI-judged tier only where the free tier can't reach. Use this skill whenever Alex says "/Regeneration" or "regenerate the taxonomy", asks for a full quality sweep of the tree, asks "what deserves which phylum" across the whole taxonomy, or asks why the tree has drifted. Named by Alex July 25. Do NOT use this to place a single new insight — that is the live placement engine's job (phylumPath.decidePlacementScored), already built and running; Regeneration audits what that engine has already produced, it does not replace it.
---

# /Regeneration — audit the whole tree, one bounded pass at a time

Alex's own framing (July 25, verbatim): *"always uses /scope on taxonomy tree and whole phylum path, all functions buttons and interconnections with other modules and Dom's... and will generate content of taxonomy tree, what deserves which phylum path, how to reorganise phylum or other taxonomy steps."*

The need behind it is real and demonstrated. The live placement engine judges each insight **as it arrives**, against the tree as it stood at that moment. Nothing has ever gone back and judged the tree **as a whole, afterwards**. That gap is measurable: an 85-minute manual review session on July 24-25 found one misplaced node; a single SQL query the next morning found **fourteen** nodes of the same failure class, plus two duplicate names nobody had logged and a literal YouTube video title (channel name included) sitting in the tree as a concept node. Manual review does not scale to 537 nodes. This skill is that missing backward-looking pass.

**Source of truth**: CLAUDE.md wins over this file if they ever disagree. In particular CLAUDE.md rule 4 (*every taxonomy write gets a human checkpoint, no exceptions*) and rule 11 (*token cost is a design constraint*) are not negotiable by this skill, and shape its whole design — see Guardrails.

## What this skill is NOT

Alex's original ask described an agent that "should always work" and "should stop when every path is 9/10 by Council of 5 verdict." Both halves of that are deliberately **not** built, for reasons that are about correctness, not caution:

- **Not always-running.** An agent that continuously rewrites the taxonomy has no human in the loop, which is a direct standing violation of rule 4 — the rule CLAUDE.md itself notes "has caught real garbage twice." Regeneration runs when invoked, produces a report, and stops.
- **Not self-graded-until-9/10.** The score would be produced by the same model class that generated the content being scored. That is self-grading with no independent ground truth, and it is an unbounded stopping condition — a model can disagree with itself between passes and never converge, at real per-pass cost. Regeneration's stopping condition is *"this pass's declared scope is finished"*, and convergence is reported to Alex as a trend across passes, never used to auto-authorize another pass.
- **Not a writer.** Regeneration never writes to `taxonomy_tree`. Its output is a report plus, optionally, `taxonomy_proposals` rows — which land in the existing review queue Alex already uses.

## The three tiers, always run in this order

**Tier 0 — Deterministic structural audit. Zero model calls, zero cost, 100% repeatable.** Pure SQL against `taxonomy_tree`. Run this every single time, in full, before spending anything. It reliably catches:
- `node_type='leaf'` rows that have children (a structural contradiction, and the exact "vocabulary leaf used as a parent" failure the July 25 debate identified — **14 live instances**)
- duplicate `lower(name)` rows (3 live, one of them a 3-way duplicate across different phyla)
- rank-chain violations: `depth > 6`, or a child whose depth is not parent depth + 1
- path integrity: `path` not matching the real parent chain, orphans at depth ≥ 2
- naming-rule-1 violations: names containing `|`, ` - `, a bare year, "Tutorial", a channel/artist name pattern (**this check has real false positives — roughly 5 true positives in 8 flags on the current tree — so its output is a candidate list for the judged tier, never an action list**)
- nodes in phyla outside `phylumPath.ENABLED_PHYLA` (currently 14 nodes in phyla 11/13/16, unreachable in the browse UI)
- empty `explainer` on a leaf

**Tier 1 — Judged placement audit. Bounded, batched by branch.** Only for questions Tier 0 genuinely cannot answer ("is this node in the *right* place", "do these five siblings actually say one thing"). **Batch by subtree, never per node** — send one branch with all its children in a single call and judge them together. This is both ~6x cheaper and strictly better quality, for the same reason `decidePlacementScored`'s `priorLeaves` parameter exists (CLAUDE.md, July 19: judging siblings blind to each other created five overlapping leaves, each individually scored 9/10). Reuse `phylumPath`'s existing prompt discipline and its 5 checks — pedagogical clarity, non-redundancy, practical applicability, structural fit, expansion headroom — do not invent a second scoring rubric (rule 8).

**Tier 2 — Generative: gaps and reorganisation.** "What deserves which phylum", missing branches, proposed merges. Highest cost and most speculative — run last, smallest batch, and only when Alex explicitly asks for it. Never run Tier 2 in the same pass that Tier 0 found unresolved structural defects: reorganising a tree that still contains leaf-parents and duplicates just bakes the defects into a new shape.

## Procedure

1. **`/scope` + GODMODE evidence first.** Real counts from live Supabase, real code read from `rpgace_core.js` — never a number from an oversight doc. Re-read `phylumPath` (the module, ~lines 7030-8833) if anything about the engine's own behavior is load-bearing to the pass.
2. **State the pass scope explicitly before spending anything**: which phyla, which tiers, an estimated token cost. Get Alex's go-ahead on that scope. A pass that silently grows is a rule-11 failure.
3. **Run Tier 0 in full.** Report every finding with the real row ids.
4. **Run Tier 1 on the declared scope only.** Stop at the declared batch count even if findings are still accumulating — the leftover is the next pass's scope, not this pass's overrun.
5. **Write the dated record**: `regeneration_pass_YYYY-MM-DD_NN.txt`, verbatim findings, per rule 5. Chat is not durable storage.
6. **Propose, never apply.** INSERT-shaped recommendations may go into `taxonomy_proposals` (see the landmine below for what may not). Everything else stays a line in the report for Alex to confirm.
7. **Log it** — `patch_notes.html` + a `system_updates` row, same session, per rule 6.

## Guardrails

- **The review queue cannot accept a MOVE, MERGE, or DELETE. Verified in code, July 25.** `taxonomyReviewQueue._openQueue()`'s accept button dispatches on `proposed_steps.engine` to `_acceptConceptFusion`, `_acceptPhylumPathProposal`, or `taxonomyTree._acceptLineage` — **all three of which INSERT**. There is no accept path anywhere in the app that re-parents or removes an existing node. So a "re-parent this node" row written into `taxonomy_proposals` would render as a normal card, and clicking Accept would silently **create a brand-new duplicate node instead of moving anything** — actively making the exact problem worse. Until a real move/merge engine exists in application code, structural fixes of this kind go in the report as a proposed SQL statement for Alex to confirm, and nowhere else.
- **Never write to `taxonomy_tree` from this skill.** Not even a "trivially safe" one-row fix, not even one this skill's own analysis is confident about. Rule 4 has no exception for a rigorous process's own conclusion — the July 25 debate reached a verified single-row fix and still correctly left it unapplied pending Alex's word.
- **A confidence score is evidence for Alex, never authorization.** Same boundary as GODMODE's own: rigor is not permission. No score, from any protocol, moves an item from "proposed" to "applied."
- **Report convergence honestly, including when it doesn't happen.** If a second pass scores the same untouched nodes differently, say so plainly — that is real information about the scorer's reliability, and it is the single most useful thing this skill can tell Alex about whether to trust its own numbers.
- **Cost is declared up front, every pass.** Rough current scale: Tier 0 is free; a full Tier 1 sweep of all 537 nodes batched by branch is roughly 200-250k tokens (~£1-1.50 at standard Sonnet-tier rates); the same sweep done naively per-node is ~1.5M tokens (~£5-6). The naive shape is the one that burned £10 in a session once already. Batch by branch.
