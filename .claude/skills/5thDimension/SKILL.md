---
name: 5thDimension
description: RPGACE's meta-protocol for reconciling what's ACTUALLY built (real code/git/Supabase evidence) against what's REPORTED as done (the six oversight docs + Chronicles/system_updates), then turning that reconciled picture into a prioritized, step-by-step interconnection/rewiring plan debated against a genuine counter-case for why NOT to rewire (or a leaner alternative) - all filtered through Council of 5 for quality and Alex's own interrogated input, so development stays anchored to his actual goals instead of drifting session to session. Use this skill whenever the user says "/5thDimension", asks for a full built-vs-reported audit of RPGACE, or asks how to "interconnect" or "rewire" existing RPGACE infrastructure more efficiently. This is the heaviest protocol in the project - reserve it for genuinely large, whole-project questions, never for a single bug fix or feature (those stay on the normal Omnitrix Judgment Funnel in the `omnitrix` skill).
---

# /5thDimension — built vs. reported, then how to rewire it well

Every other protocol in this project (GODMODE, Council of 5, Omnitrix, Aintergration, `/scope`, `/debate`) answers a bounded question about one task. This one exists for the opposite case: when Alex wants the WHOLE picture — what RPGACE actually is right now, versus what the docs and Chronicles say it is, versus what it could be if wired together better — without either side of that gap being guessed at. It is built entirely out of the other named protocols, run in a fixed sequence, not a new kind of reasoning of its own. Named `/5thDimension` per Alex's own request (July 23), specifically to fight context drift: development that quietly stops tracking his actual goals because no one pass ever stepped back far enough to check.

**Source of truth**: `CLAUDE.md`'s `## Invokable frameworks` section defines GODMODE/Council of 5/Omnitrix/Aintergration; `scope` and `debate` (sibling skills in this same directory) define the other two building blocks this protocol sequences. If this file and CLAUDE.md ever disagree, CLAUDE.md wins and this file is stale.

## The procedure, in order

**Phase 1 — What's actually built.** A real `/scope`-style GODMODE evidence pass over the CODE itself: `git log`, the live contents of `rpgace_core.js`/`main.js`/`index.html`, real Supabase state (`list_tables`, `execute_sql`, `get_advisors`). Council of 5 turns this into a clean "Side A: what's actually built" — module by module, with real file/line references, not summarized from memory.

**Phase 2 — What's reported as done.** The same GODMODE rigor, aimed instead at the six oversight docs (`patch_notes.html`, `interconnection_map.md`, `manual.html`, `taxonomy_map.html`, `system_flow_map.md`, `minotaur_map.html`) plus Chronicles/`system_updates`. Council of 5 turns this into "Side B: what's reported as done."

**Phase 3 — Reconcile the drift.** Run `/debate` with Side A attacking Side B's claims (and vice versa) wherever they might not match — a doc claiming something is "shipped" that the code doesn't support, or code that exists but was never logged anywhere. GODMODE + `/scope` settle any factual dispute raised mid-debate (query Supabase, read the actual line) rather than leaving it as an unresolved assertion. Council of 5 reviews the debate transcript for quality before it becomes an input to Phase 4 — same cleanup role it plays inside `/debate` itself.

**Phase 4 — The rewiring debate.** The reconciled, fact-checked picture from Phase 3 becomes ONE side of a second, genuinely different debate: a prioritized, step-by-step plan for interconnecting/rewiring existing RPGACE infrastructure more usefully. The OTHER side is a real, honest counter-case — plausible reasons NOT to rewire, or a leaner/cheaper alternative that gets most of the value for less disruption. Neither side is a strawman; both must survive real interrogation, same as any `/debate` round.

**Phase 5 — Get Alex's actual input.** GODMODE + Omnitrix + `/scope` + Aintergration (if any third-party tool is relevant to the rewiring options) + a real interrogation pass — not a rubber-stamp confirmation, actual open questions where the rewiring plan has a real fork only Alex can resolve. Council of 5 incorporates his answers into the plan.

**Phase 6 — Check the run itself.** A final Council of 5 pass across every framework this run actually used — did GODMODE's evidence hold up, did the debate surface real tension or just perform one, did the rewiring plan stay anchored to Alex's stated goals rather than draining into technical tidiness for its own sake. This is the step that keeps `/5thDimension` honest about its own output, not just RPGACE's.

## What "everything built off this" means

Any real change that comes out of running `/5thDimension` follows the same standing rules as any other RPGACE work — merge to `main` before calling it ready, log to `patch_notes.html` + `system_updates`/Chronicles in the same session, human checkpoint on anything destructive. `/5thDimension` does not grant a shortcut around any of that; it's a bigger evidence-and-debate front end, not a different execution path.

## Guardrails

- This is the heaviest, most expensive protocol available — reserve it for genuinely whole-project questions ("what's built vs. what's claimed, and how should it all connect"), never dispatch it for a single bug or feature. A task that fits Tier 1/2 of the normal Judgment Funnel (see the `omnitrix` skill) should stay there.
- Phase 1/2's evidence-gathering is real work, not a vibe check — if it can't cite an actual commit, file/line, or Supabase row, it doesn't belong in either side.
- Phase 4's counter-case must be a genuine "why not," not a token objection invented to look balanced — if a full pass truly finds no real case against rewiring, say that plainly rather than manufacturing one (same honesty rule `/debate` itself follows).
- Given the real size of this protocol, the evidence-gathering phases (1-2) are natural candidates for a background Fable dispatch per Omnitrix's own rebalance ("large, exhaustive, multi-file/multi-session audits... a dedicated fresh context window has a real edge") rather than run inline — use judgment on when that's worth the quota.
