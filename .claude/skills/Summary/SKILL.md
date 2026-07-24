---
name: Summary
description: Produces a rigorous, evidence-checked summary of what actually happened across a stretch of work (a session, a multi-step task, a run of several rounds), specifically to restore Alex's context when he's lost track of what was done, decided, or is still open. Combines GODMODE+scope evidence-gathering, a real /5thDimension-style built-vs-reported reconciliation, a /debate on how to present findings, and two Council of 5 passes (one on the debate's quality, one for final recommendations). Use this skill whenever Alex says "/Summary", asks "what happened", "catch me up", "where are we", or otherwise signals he's lost the thread and needs a real, verified recap rather than a recalled-from-memory one. Also invoked as a sub-step by the `Bedtime` sibling skill at session close. Scale the depth to the size of what's being summarized — a single afternoon's small fix does not need the full heavy sequence; a whole multi-round session does.
---

# /Summary — a real, evidence-checked recap when context needs restoring

Alex named this July 24, specifically for the moment he's lost track of what actually happened across a run of work and needs to be caught up — not a recollection from chat scrollback (which he may not have open, or may not trust), but a genuinely re-verified account. Built from the same named protocols as everything else in this project, in a fixed sequence, same "not a new kind of reasoning" design as `/5thDimension` and `/Routine`.

## The procedure, in order

**Step 1 — GODMODE + `/scope` evidence pass.** Reconstruct what actually happened from real sources, not memory: `git log` for the real commit history across the span being summarized, real Supabase state (`system_updates` rows, any tables touched), and the actual six oversight docs' current content. If something in this session's own recollection doesn't match the real evidence, the evidence wins — say so plainly rather than quietly picking whichever is more flattering.

**Step 2 — `/5thDimension`-style reconciliation (Phase 1-2 only, not the full 6-phase run unless the scope genuinely warrants it).** Produce a clean "what's actually built/decided/done" vs. "what's been reported so far" comparison. Most of the time these should already match (this session generated both), but this step exists specifically to catch drift before it compounds.

**Step 3 — `/debate` on presentation.** A real debate — not just a formatting choice — on how the findings should be distributed: which of the six oversight docs (or Chronicles/`system_updates`) each real finding belongs in, per each doc's own established format (patch_notes.html's dated cards, interconnection_map.md's architecture paragraphs, CLAUDE.md's Current State bullets, etc. — see CLAUDE.md's own "Context/logging efficiency rules"). Real tension worth surfacing when it exists: terseness (rule 11, tokens are a design constraint) vs. completeness (nothing real gets silently dropped). Use `/scope` and `/Omnitrix` (Fable optional — see Guardrails) to execute the writing once the debate settles where things go.

**Step 4 — Council of 5 on the debate's quality.** Did the debate surface a real tension, or just perform one? Is the resulting plan proportionate to what actually happened, not padded or under-scoped?

**Step 5 — Council of 5 for recommendations.** The actual output Alex sees: a clean, concise recap of what happened, what's done, what's still open, and what (if anything) needs his input next — the thing that actually answers "catch me up."

## Guardrails

- **Scale to the real size of the thing being summarized.** A `/Summary` for one small fix is Step 1 + a two-sentence recap — running the full 5-step sequence on a one-line change is the exact kind of disproportionate ceremony CLAUDE.md's own Judgment Funnel exists to prevent. Reserve the full sequence for a genuinely large span (a full session, several rounds, a multi-day thread).
- Fable is optional at every step here, same as `/Routine`'s own default — Sonnet-direct is the default per Omnitrix's own rebalance; dispatch Fable only if a step's evidence-gathering is genuinely large enough to earn the cost, and only after checking whether that's actually warranted.
- This skill never invents an answer to a real open question it surfaces — if Step 1's evidence reveals something only Alex can decide, say so and ask, don't guess a default (same standing rule as everywhere else in this project).
- Output goes to Alex directly in chat first (this is a context-recovery tool — he needs the answer, not a pointer to a file) — a durable written record is Step 3's job when the findings are substantial enough to need one (matching CLAUDE.md rule 5's convention), not a mandatory output of every `/Summary` run.
