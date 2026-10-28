---
name: update-logging-system
description: The change-type → required-artifact checklist (docs/claude topic files, patch_notes.html, Chronicles/system_updates, interconnection_map.md, system_flow_map.md, minotaur_map.html, taxonomy_map.html, ai_tooling_and_rules_map.md, perspective_map.html, oracleAppGrounding.SELF_KNOWLEDGE, session_lessons.html, achiever/future_integrations, ceo_plan_items, and any skill .md whose behaviour evolved) so a real change updates every doc it should, not just some. Also owns the Cross-Doc Drift Check (artifact 20) — does any OTHER doc still assert something about the subject that just changed — referenced by name from /scope, GODMODE and /commit-archaeologist. Use at the point CLAUDE.md rule 6 requires doc updates (any Tier 2+ change, and always in Bedtime's Step 1). Mark every artifact touched or skipped-with-reason. Not for Tier 0/1 edits.
---

# /update-logging-system — one map, so nothing goes stale by accident

Built Aug 6 after `oracleAppGrounding.SELF_KNOWLEDGE` went stale even though rule 6 already required it to be updated. An obligation stated in prose gets missed; a checklist can be checked. This is the one place the map lives. `Bedtime` Step 1 runs it; other skills point here rather than copying it (rule 8).

"River" in older wording means one of the 8 app domains: every module declares `domain:`; `scripts/check_module_domains.py` checks it; the Galaxy Map derives everything else from those keys.

## The map — change type → artifact(s)
Numbers are cited elsewhere; keep them.

1. **Durable fact changes** → the matching `docs/claude/<area>.md` topic file (one present-tense line + card link; CLAUDE.md itself only for a new rule or landmine) + a `patch_notes.html` dated card + a `system_updates` row.
2. **Architecture change** (new module, connection or data flow) → the domain's `docs/domains/<domain>/interconnections.md` (and `flow.md` for diagrams/truth tables); the root `interconnection_map.md`/`system_flow_map.md` only for cross-domain flows (CK-3/4, Oct 28 2026): a present-tense paragraph, not a changelog.
3. **A flow's built/not-built status changes** → `system_flow_map.md` (the diagram + truth table).
4. **A new domain or function shape** → `minotaur_map.html` (plain language, no code names).
5. **New button or table** → the button catalog (root `interconnection_map.md` for global/dashboard buttons, the domain's `interconnections.md` for domain buttons) / `system_flow_map.md` §0 table reference; roadmap status → `future_integrations.html`.
6. **Taxonomy structure** (columns or query shape) → `taxonomy_map.html`.
7. **Anything Oracle should know** (a domain, mechanism, landmine or major open item) → `oracleAppGrounding.SELF_KNOWLEDGE` in `rpgace_core.js`, naming the owning module or table. Then run `scripts/check_self_knowledge_staleness.py` and `check_self_knowledge_contradictions.py`. Same weight as CLAUDE.md.
8. **New skill, new tool used against RPGACE, or new rule file** → `ai_tooling_and_rules_map.md`.
9. **A skill's behaviour evolves through real use** (a new precedent or guardrail) → that skill's `.md`, the same session.
10. **Code-structure change** in `rpgace_core.js` or `api/*.js` → regenerate the Galaxy Map in order: `python3 scripts/graphify_river_group.py`, every `scripts/galaxy_map*.py` except hub and g13, then `scripts/galaxy_map_hub.py`; commit `graphify-out`. Also `graphify update .` (AST-only, free). If the graph HTML is re-exported: `graphify export html` → `python3 scripts/graphify_recolor.py` → `graphify_river_group.py`, in that order. If `scripts/graphify_to_obsidian.py` re-runs, follow it with `scripts/obsidian_vault_to_html.py`. Skip for doc-only sessions.
11. **A change could make a `minotaur_map.html` section inaccurate** (via `interconnection_map.md`, `taxonomy_placement_rules.txt` or a skill) → check that section and flag it; never auto-rewrite. Skills are dev process and never become map content.
12. **An entry is fully resolved** → move its narrative verbatim to the paired archive (`docs/claude/*.md` and CLAUDE.md → `CLAUDE_archive.md`; `patch_notes.html` → `patch_notes_archive.html`; `ai_tooling_and_rules_map.md` → `records/YYYY-MM/`) and leave one present-tense line. `interconnection_map.md`, `system_flow_map.md` and `minotaur_map.html` never hold narrative; if one does, rewrite it in present tense.
13. **Evidence this session gathered contradicts a doc's claim** → fix the claim in the same pass (a `/drift` MINOR). Only check facts this session actually touched; never blanket re-query.
14. **A table gained rows, schema or a write path** → `scripts/supabase_dedup_scan.py` on that table only (findings only, never auto-merge), or the full pass at `/Bedtime`.
15. **A `/colourgradient`/`/paranoia`/`/drift` finding is blue/red/yellow** → `future_integrations.html` (rendered from `ceo_plan_items`). A finding that turns green leaves there and goes to the tier docs. Multi-step plans render as one plan group with a sub-card per step; anything else goes under its real domain/card/connector.
16. **Adding content to a Tier (a) doc** → check first whether it's already told elsewhere. History belongs in `patch_notes.html`; structure in `interconnection_map.md`/`system_flow_map.md`. Tier (a) gets a pointer, not a second copy.
17. **A `/misunderstanding`, `/drift` finding or real obstacle got resolved** → a `session_lessons.html` card: prompt scope first (Alex's words), then obstacle, reasoning, solution, resulting rule (cite the rule number, don't restate it). This is process, unlike `error_log.html` (code errors) or `patch_notes.html` (what shipped).
18. **A claim that was true became false** (brown) → an `achiever_archive` row (old value, new value, why), the claim corrected everywhere it appears, and any `smoke_test_items` row that only tested that claim deleted, not re-flagged. Procedure: `colourgradient` skill, brown entry.
19. **Shipped work matches an existing `ceo_plan_items` row** → update its status and evidence in the same pass (an `ilike` on the feature name finds it) and drop its `future_integrations.html` card. The file docs and the plan row are separate updates, and the second gets forgotten.
20. **The change altered a subject more than one doc makes claims about** → run the Cross-Doc Drift Check below.

Optional pre-check before marking a doc skipped: one vocabulary-expanded `graphify query` on the topic. An empty result means "check by hand", not "absent".

## The Cross-Doc Drift Check
Why it exists: `/cartographer` checks map friction, brown cleans up a claim already known to be stale, and artifacts 1-19 say which docs to write to — none of them asks which docs already said something about this subject. That gap let `future_integrations.html` keep claiming "Research Lab page confirmed fully intact, untouched" after the page was retired.
1. **Name the subject**, not the change: a count, a module list, a built/not-built state, a file's existence, a plan item's status, a rule's wording.
2. **Targeted lookup**: walk artifacts 1-19 and pick the 2-4 that plausibly claim something about the subject. Grep those for the subject itself (name, number, file). A file name also needs checking in tooling config and Supabase rows.
3. **Grade** with `/drift`'s vocabulary: VERDICT, BASIS, MINOR/MATERIAL/CAPTURED.
4. **Route**: a stale claim → brown (artifact 18); broken code → purple / `error_log`; plain out-of-date → fix it in place.
Never a pairwise sweep of every doc on every push (rule 11). No nameable subject means the check doesn't apply. `/CEO`, `/Summary` and `/Bedtime` point here; `/scope`, GODMODE and `commit-archaeologist` each carry a one-line pointer to this section — never a copy of the artifact rows.

## Run it as a checklist
```
Change: <one line>
[x] docs/claude/<area>.md
[x] patch_notes.html
[x] Chronicles (system_updates)
[ ] interconnection_map.md — skipped, no structural change
[ ] system_flow_map.md — skipped, no status change
[x] SELF_KNOWLEDGE (+ both checks)
[ ] ai_tooling_and_rules_map.md — skipped, no new skill/tool/rule file
[ ] <skill>.md — skipped, no new precedent
[ ] Archive resolved entries — skipped, nothing resolved
[x] Live-fact check on evidence touched this session
[ ] Supabase dedup scan — skipped, no table changed
[x] ceo_plan_items / future_integrations.html status
[x] Galaxy Map regen (code changed)
[x] Cross-Doc Drift Check — subject: <x>; docs: <2-4>; findings: <none/graded>
[x] python3 scripts/check_claude_md_size.py passes
```
Every row gets a mark; every skip gets a reason.

## Guardrails
- Tier 2+ only, except artifacts 12 and 13, which run on every report and push. Alex, Aug 11: *"make this a constantly updating framework when reporting and pushing... to prevent same future problems, always make this happen, always, I'm tired of this"*. Both cost nothing extra.
- Never mark `[x]` without doing it; an honest skip beats a fake tick.
- If an artifact goes stale again, strengthen this skill with evidence (rule 4).
