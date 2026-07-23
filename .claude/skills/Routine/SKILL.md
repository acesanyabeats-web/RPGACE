---
name: Routine
description: RPGACE's session-start ritual for deciding what today's real work should be. Runs a structured two-team debate (GODMODE+Council-of-5 evidence pass produces Team 1's Top 10 backlog items; Team 2 builds the real case for whichever left-out items deserve priority instead) through /Debate, reconciles the result through /5thDimension, then Council of 5 locks in a final Top 10 for the day. Named and defined by Alex July 23. Use this skill automatically at the start of every session that works on RPGACE, before diving into any specific task Alex names in the same message — it is the standing session-opener, not a one-off he has to ask for by re-typing the whole procedure each time. If Alex opens a session with an explicit different task already named, still run this skill first (it's cheap relative to a full day's work) unless he explicitly says to skip it.
---

# /Routine — the daily Top 10, decided by real debate instead of by whoever spoke first

Alex named this July 23 specifically so the "what should today actually be" question stops depending on him re-typing the same long instruction every session. It packages five already-existing protocols (GODMODE, Council of 5, Omnitrix, `/scope`, `/debate`, `/5thDimension`) into one fixed sequence — same "not a new kind of reasoning, just a fixed sequence of the existing ones" design as `/5thDimension` itself.

**Source of truth**: CLAUDE.md's `## Invokable frameworks` section defines GODMODE/Council of 5/Omnitrix/Aintergration; `scope`, `debate`, and `5thDimension` are sibling skills in this repo's `.claude/skills/` directory. If this file and CLAUDE.md ever disagree, CLAUDE.md wins and this file is stale.

## When to run it

At the start of every RPGACE session, same standing-check status as the existing `oracle_dev_suggestions` pull (CLAUDE.md's "Session-start check" section) — a real, load-bearing step, not a suggestion to skip when busy. Run it before starting on whatever specific task prompted the session, unless Alex explicitly says to skip it that session. It is cheap (evidence-gathering + one debate + one reconciliation pass) relative to the day of work it's deciding.

## The procedure, in order

**Step 1 — Team 1's Top 10.** GODMODE evidence-gathering pass over the real current backlog: git log, live code state (`rpgace_core.js`/`main.js`/`api/*`), the six oversight docs, Chronicles/`system_updates`, any open spec-backlog `.txt` files, and Alex's own most recent messages for anything he raised but wasn't yet built. Council of 5 turns this into Team 1's real, evidence-based Top 10 — things to implement or test *today*, ranked, each with a one-line real reason it's in the list (not a generic priority label).

**Step 2 — Team 2's counter-case.** A genuine second pass over the SAME evidence, specifically hunting for real backlog items Team 1 left out, and building the strongest honest case for why one or more of them should outrank something Team 1 included. This must be a real case (cost, risk, staleness, something Alex asked for twice, a cheap old item nobody picked up) — never a manufactured objection invented just to have one. If a full honest pass finds nothing worth arguing, say so plainly rather than padding the list.

**Step 3 — /Debate.** Run the `debate` skill between Team 1 and Team 2's real positions. Both teams get: GODMODE (harder evidence-gathering mid-round if a claim is contested), Omnitrix **without Fable** as the default (Fable is reserved for cases Omnitrix's own rebalance already names — large exhaustive multi-file audits or explicit background parallelism — not a default research step here; if Fable is at zero usage credits and a team still wants to invoke it, that's allowed but not required, per Alex's own aside), and `/scope` for organized evidence. Real attack rounds, real defense rounds, Council of 5 cleans up both cases per `/debate`'s own procedure — never agreement-then-merge.

**Step 4 — /5thDimension reconciliation, without Fable.** Feed the debate's output through `5thDimension`'s procedure (skip its own Fable-dispatch suggestion in Phase 1-2's evidence gathering — do it inline instead, same "without Fable" default as Step 3) to check the reconciled list against what's actually built vs. reported, and against Alex's real stated goals (the governing 48-hour rule, current Tier-1/2/3 judgment funnel, anything he's said explicitly this session) — not just technical tidiness.

**Step 5 — Final Council of 5 lock-in.** One last Council of 5 pass produces the actual final Top 10 for the day, plus an explicit, honestly-reasoned list of anything real that got dropped (never silently — name what was left out and why, same discipline as every other RPGACE backlog-trimming pass this project does).

## Output

A concise Top 10 presented to Alex in chat (not just a pointer to a file — he needs to be able to act on it immediately), plus the full debate/reasoning trail saved to a dated `.txt` file at the repo root (pattern: `daily_priorities_debate_YYYY-MM-DD.txt`) per the project's "verbatim record in a committed file, chat memory is not durable storage" convention. Commit and push both the record file and any doc updates the run itself decided on, same standing rules as any other RPGACE work (merge to `main` before calling anything ready, log to `patch_notes.html`/`system_updates` if the run itself produces a real decision worth remembering later).

## Guardrails

- This is a planning pass, not a build pass. Running `/Routine` produces a task list; it does not itself implement anything. Move straight into executing item 1 once the list is locked, per Alex's own framing ("get the most productive day in RPGACE history") — don't stall on ceremony once the list exists.
- If Alex answers a blocking question for item 1 (or any item) in the same message that triggers `/Routine`, act on that answer directly rather than re-asking — the skill decides priority, it doesn't override an answer Alex already gave.
- Don't run this twice in one session unless Alex explicitly asks for a re-plan (e.g., new information genuinely changes the picture) — it's a session-opener, not a per-task ritual.
- Same honesty rule as `/debate` and `/5thDimension`: Team 2's case and the final drop-list must be real, not theater. A `/Routine` run that always rubber-stamps Team 1's first draft, or always finds the same "why not" objection regardless of the actual backlog, isn't doing its job.
