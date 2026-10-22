---
name: cartographer
description: RPGACE's map cross-talk discipline — grounds graphify/Obsidian/Galaxy Map output against system_map_spec.md and the Tier (b) truth docs, runs the trickle-down/up check whenever a change touches the domain/module/connector hierarchy (does it make something upstream or downstream stale, and does Alex need to see it), tags new artifacts Consumer/Developer, and cross-references five sources (minotaur_map.html, Tier b docs, graphify/Obsidian, SELF_KNOWLEDGE, the Galaxy Map) to suggest — never tick — smoke_test.html states. Use when Alex says "/cartographer", when graphify_river_group.py data (RIVER_MODULES/RIVER_FLOWS/EXTERNAL_CONNECTORS) or a module's domain changes, when a new connector or L0 unit appears, or inside /CEO Grounded Mode when a plan item touches the map. Not for routine content-only doc updates (that's update-logging-system).
---

# /cartographer — map cross-talk and trickle checks

Built Aug 13 2026. Alex, verbatim: *"i would like all externals and rpgace self-awareness to talk to each other via these tables and docs to update what new, whats old, and use trckle down/up to also cause updating where needed to be flagged to me too, expanding my original idea further."* Spec: `records/2026-08/galaxy_map_ceo_loop1_spec_paranoia_2026-08-13.txt`.

"River" in the data means one of the 8 app domains: modules declare `domain:`; `graphify_river_group.py` derives `RIVER_MODULES`/`RIVER_FLOWS` from those keys and real calls; Level 1 is `galaxy_map_domain.html`.

## Steps
1. **Ground in `system_map_spec.md`** for the method; the live data is in `graphify_river_group.py`'s tables (`RIVER_MODULES`, `RIVER_FLOWS`, `EXTERNAL_CONNECTORS`, `INTERACTION_TYPE_LABEL`).
2. **Place the change** at a level: L0 unit, domain, module/function, or connector edge. If it doesn't fit, this skill doesn't apply.
3. **Trickle-down/up**: does anything upstream (what this depends on) or downstream (what depends on this) in the map or the Tier (b) docs (`interconnection_map.md`, `system_flow_map.md`, `ai_tooling_and_rules_map.md`) now read stale? Grade it MINOR/MATERIAL/CAPTURED.
4. **Tell Alex**: fix MINOR inline and note it; state MATERIAL/CAPTURED plainly in chat. Also write a `system_map_flags` row (`detected_by`, `map_level`, `change_summary`, `friction_note`, `severity`, `visibility`, `status`, `linked_plan_item_id`) so it isn't lost between sessions.
5. **Visibility tag**: new artifacts get `developer` or `consumer` (`system_map_spec.md` §7). Existing ones haven't been retro-tagged; that's separate work.
6. **Escalate only when the finding calls for it**: `/drift` for goal-vs-baseline, `/paranoia` for maximal scrutiny. `/misunderstanding` is Alex-only.
7. **Baseline reconciliation for `smoke_test.html`** (judgment work, for scopes you're actually touching). Check what each of the five sources says — an existing `/perspective` report counts as evidence within them; a source that doesn't mention the scope is "no signal", not agreement.
   - They agree and a row matches → nothing to do.
   - They agree and there's no row → add one: `status='unverified'`, with `cross_ref_note` and `cross_ref_sources` (jsonb).
   - They conflict, or contradict a row → set `needs_confirm_highlight=true` with a `cross_ref_note` saying which sources disagree.
   Never invent agreement. Only Alex's hand-tick sets `confirmed_working`.

## With /CEO
While a plan is active, any change touching a plan item also runs Steps 3-4 as part of Grounded Mode (see the `CEO` skill).

## Doesn't
- Auto-fix a MATERIAL/CAPTURED finding.
- Replace `update-logging-system`.
- Retro-tag existing artifacts.
`system_map_flags` rows with `status='flagged'` are pulled at session start.
