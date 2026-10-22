---
name: Routine
description: RPGACE's session-start ritual for deciding today's real work. Team 1 (GODMODE + Council of 5 over live evidence) proposes a Top 10; Team 2 builds the honest case for left-out items; /debate between them; /5thDimension (no Fable) reconciles against what's built and Alex's goals; Council of 5 locks the final Top 10 plus a named drop list. Use at the start of every RPGACE session before diving into a named task, unless Alex says to skip it.
---

# /Routine — today's Top 10, decided by debate

Named by Alex July 23, so "what should today be" doesn't depend on him re-typing the procedure. It's a fixed sequence of existing protocols (GODMODE, Council of 5 and Omnitrix from the `omnitrix` skill; `scope`, `debate`, `5thDimension`).

Run it at session start after CLAUDE.md's session-start checks, unless Alex says skip. It's cheap compared with the day it decides.

## Steps
1. **Team 1's Top 10** — GODMODE evidence over:
   - git log; live code (`rpgace_core.js`, `api/*`, `local_server/`);
   - the oversight docs and `docs/claude/open_forks.md`; `system_updates`; `session_memory`;
   - active `ceo_plans`/`ceo_plan_items` (red/yellow items are backlog, and their `evidence` often names the prerequisite);
   - open `records/` specs; Alex's recent messages.
   Also check:
   - **Self-reported regressions** — new `error_log` rows with `linked_perspective_id`, `smoke_test_items` flipped to `broken`, plan items gone purple. Rank these high.
   - **What Alex did in the app** — recent `journal`, `chronicles_finance`, `posts`, `content_productions`, review-queue decisions, `xp_events` — because `system_updates` only shows Claude Code's work.
   After a gap of a week or more, read the docs properly rather than skimming them.
   Council of 5 ranks ten items, each with a one-line reason.
2. **Team 2** — the strongest honest case for left-out items (cost, risk, staleness, asked for twice, a cheap old item). If there's nothing real, say so.
3. **`/debate`** between the teams: GODMODE, Omnitrix without Fable (allowed but not required), `/scope`. Real attack and defence; Council of 5 cleans up both cases.
4. **`/5thDimension` without Fable** — reconcile against built vs reported, the 48-hour rule, the funnel and what Alex said this session.
5. **Council of 5 lock-in** — the final Top 10 plus an honest list of what was dropped and why.

## Output
The Top 10 in chat (actionable now), plus the full trail in `records/YYYY-MM/daily_priorities_debate_YYYY-MM-DD.txt`. Commit and push it.

## Guardrails
- A planning pass. Start item 1 straight after, briefing Alex first if it's a plan step (rule 18).
- If Alex already answered something in the same message, act on it.
- Once per session unless he asks for a re-plan.
- No theatre: Team 2 and the drop list must be real.
