---
name: scope
description: Gathers the whole real picture of what happened in RPGACE (a session or a date range) from live evidence and groups it — bugs fixed, features shipped, infrastructure, security/architecture findings, deliberately not built, still open — so an oversight update includes everything without drowning in detail. Use when Alex says "/scope" or "scope this out", asks for the whole/big picture, or before a comprehensive oversight update (it is the GODMODE evidence pass for oversight work). Not for a single fix's own card.
---

# /scope — the whole picture, in grouped bits

Docs here have repeatedly claimed "done" when the code disagreed, because what happened is scattered across commits, rows and chat. This is the one pass that gathers it. It feeds the `update-logging-system` checklist; it doesn't replace it.

## When
- "/scope", or "update oversight" for more than a couple of commits.
- Before a "session closed" card.
- Whenever a doc's claim needs checking against reality: grade any mismatch with `/drift` Steps 4-5.
- If the work touched the domain/module/connector map, also run `cartographer` Steps 3-4.

## Gather (live evidence only)
1. `git log` since the last full sweep (search for "oversight", "Bedtime", "session closed").
2. Live Supabase: row counts, RLS and any number a note claims (`list_tables`, `execute_sql`); `system_updates`, `session_memory`, `ceo_plan_items`.
3. Sizes: `python3 scripts/check_claude_md_size.py`, plus `wc -c` on `patch_notes.html` (time to archive?).
4. `node --check` / div balance on anything touched, if not already confirmed.
5. Galaxy Map data for anything ownership-shaped (rule 15).

## Group
- **Bugs found & fixed** — root cause + fix, one line each (note "took N rounds" if it did).
- **Features/infrastructure shipped** — what, where (module/table/file), and whether Alex has hand-tested it. That field is required.
- **Security/architecture findings** — each on its own line.
- **Deliberately not built** — with the real reason.
- **Still open** — checked against `docs/claude/open_forks.md` so nothing is lost or duplicated.

## Hand off
Route each group per the `update-logging-system` map:
- cards → `patch_notes.html`;
- current facts → `docs/claude/<area>.md`;
- structure → `interconnection_map.md`;
- flows → `system_flow_map.md`;
- domains → `minotaur_map.html`;
- skills/rules → `ai_tooling_and_rules_map.md`;
- roadmap → `future_integrations.html`/`ceo_plan_items`.

## Cross-Doc Drift Check — required
`/scope` reads across every doc, so run the Cross-Doc Drift Check (`update-logging-system`, its own section — not copied here) for every subject its findings surfaced, each against its own 2-4 docs. Grade with `/drift` and route (brown / purple / fix in place). Report MATERIAL or CAPTURED findings; never quietly fix them.

## Doesn't
- Write the docs without judgment.
- Replace `node --check` or hand-testing.
- Invent a "done" that isn't traced to a commit, query or test.
