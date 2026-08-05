---
name: interrogation
description: When Alex's own explanation of a large or ambiguous idea leaves genuine open forks, Claude asks real, well-scoped questions before building — never guesses at intent for anything consequential, and gives honest pushback if a request would compromise a function's real purpose or output quality. Use this skill whenever Alex says "/interrogation", or whenever a real, multi-subsystem ask (rule 5's "3+ new pieces") contains genuine ambiguity that would change the actual build depending on the answer. Named and defined by Alex Aug 5, inline inside a huge Content/Video Pipeline redesign request. Do NOT use this for a small, clearly-specified task — that's Tier 0/1, handle directly; forcing a question round on an unambiguous ask is its own failure mode.
---

# /interrogation — ask before guessing, on anything that would actually change

Alex's own framing, verbatim intent (Aug 5, defined inline mid-request): *"Feel free to ask me every and any question you need to understand my idea, get my input when a workaround is needed or ambiguity is present, tell me any pushback or changes to plans are needed to make my idea work without mitigating the functions purpose and output quality."*

This is rule 5 ("multi-subsystem asks get spec'd and confirmed first") given a name and made explicit as its own invokable moment, not a new kind of reasoning — the same discipline this project already runs on, triggered deliberately rather than only recognized after the fact.

## When to run it

Any genuinely large or dense spec (a multi-page architecture description, several stacked feature requests, a redesign touching 3+ real subsystems) where — after real evidence-gathering — some part of it still has more than one reasonable reading, and those readings would produce **materially different code**. Not every ambiguity qualifies: a wording choice that doesn't change the build isn't worth a question. The bar is "would the answer change what gets built," not "is there any theoretical uncertainty."

## Procedure

1. **Evidence first, always.** Before asking anything, check what's actually real — grep the real code, query live Supabase, read the actual oversight docs. Many apparent ambiguities resolve on their own once real state is checked (a "critique" turns out to already match existing architecture; a "bug" has a real, checkable root cause). Only questions that survive a real evidence pass are worth asking — asking something the codebase already answers is a wasted round-trip and, worse, signals the evidence pass didn't happen.
2. **Identify the load-bearing forks, not every possible one.** Read the whole spec, list every place a genuinely different interpretation is possible, then keep only the ones where the two readings would lead to different schema, different UX, or different scope. A cosmetic wording question doesn't belong here.
3. **Ask them together, not as a slow drip.** Batch the real questions into one round (or as few as the options tool allows) rather than a question-answer-question cycle that burns Alex's time turn by turn.
4. **State the honest pushback alongside the questions**, not separately or softened. If a specific part of the request would work against its own stated purpose (a UX pattern that would slow down the exact workflow it's meant to speed up, a data model that would lose the exact information Alex just said must never be lost), say so plainly in the same pass — this is what Alex explicitly asked for, not an optional courtesy.
5. **Don't ask about what's already answered.** If Alex's own spec already resolves a question two paragraphs later, or a prior session already settled it, don't re-ask — that's the same discipline as rule 5's "act on the answer he already gave, don't re-ask."
6. **Confirm, then build in the normal Tier 2 shape.** Once real answers land, proceed through the same GODMODE→Council of 5→Omnitrix funnel this project already uses for multi-subsystem work — `/interrogation` replaces guessing at the spec, it doesn't replace the build discipline that follows it.

## Guardrails

- **Never manufacture ambiguity to look thorough.** A spec that's actually clear doesn't get a question forced onto it — same "real cases only, never theater" rule as `/debate` and `/5thDimension`.
- **Never let "I could ask" become "I will stall."** This is a bounded evidence-and-question pass, not a way to avoid committing to a plan. Once real answers are in, build.
- **Scale to the size of the ask.** A two-line feature request doesn't need this skill invoked by name — Tier 1 handling (pull real source, proceed) is correct there. This exists for the genuinely large, dense asks where guessing wrong would mean real, wasted rebuild work.
