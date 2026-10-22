# Oversight docs and the Galaxy Map

What each oversight artifact is for, so a session knows where a fact belongs. Build history of all of this is in `CLAUDE_archive.md`. Rule of thumb: the story goes in `patch_notes.html`, the current fact goes in a topic file, the rule goes in CLAUDE.md.

## Tier (a) — explaining docs, plain language for Alex
- `patch_notes.html` — one dated card per shipped thing (root cause + fix for bugs, honest "untested" flags). The only place incident narrative lives. Errors' full fix timelines live on `error_log.html`; a resolved error gets a short card here.
- `minotaur_map.html` — consumer-facing, organised by domain, one worked example each, plus "The AI Itself". Zero code/table names. Update only when a domain or function changes shape.
- `manual.html` is retired (Sep 23 2026); its content moved to `interconnection_map.md` and `system_flow_map.md` §0.

## Tier (b) — truth docs, checked against code and Supabase
- `interconnection_map.md` — how modules talk; one present-tense paragraph per architectural change, never a changelog. Also holds the button catalog and build workflow.
- `system_flow_map.md` — Mermaid flow diagrams, planned attach points, built/not-built truth table; §0 is the per-table Supabase reference. Read before architectural work.
- `ai_tooling_and_rules_map.md` — every skill (global vs RPGACE-authored), every rule file, and every external connector (canonical connector table). Update when a skill or rule file is added or used against RPGACE.
- `perspective_map.html` — live view of `perspective_reports` grouped by scope with cross-reference links; scaffold rows (`mainjs_function`/`onclick_feature`/`decision`, unverified) sit in their own collapsed section.
- Cross-check order: fix Tier (b) against live state first, then bring Tier (a) in line.

## Layers
- (c) Oracle self-awareness — `oracleAppGrounding.SELF_KNOWLEDGE`.
- Error cascade (G109, live client-side): `window.onerror`/`unhandledrejection` and every red `RPGACE.utils.toast()` (`#CC4A4A`) go through `errorLog._capture` → `error_log` row (deduped by signature), owning module found via `METHOD_MODULE_MAP` (`scripts/generate_method_module_map.py`, ambiguous names never guessed), that module's `perspective_reports` baseline attached (`linked_perspective_id`/`expected_baseline`), its `smoke_test_items` row set `status='broken'` with `broken_note`/`linked_error_id`, and its `ceo_plan_items` row flipped purple only if it was green. Fires `rpgace:error-toast`. It flags; it never diagnoses or fixes. Record `records/2026-08/g109_error_perspective_smoketest_purple_loop_2026-08-26.txt`.
- (d) `smoke_test.html` (Alex's hand-ticks only; sessions write prep notes to `smoke_test_items.code_verified_note`/`code_verified_at`, never their own file, never `status`), `error_log.html` (deduped by signature, backtracked, fix attempts, resolved history kept), `session_lessons.html` (process lessons; each card opens with the prompt scope that was active).
- (e) `future_integrations.html` (live-rendered, plan-first: blue idea / red planned / yellow mid-build) and `achiever.html` (brown = a claim that was true and became false; `achiever_archive`; remove the claim everywhere, including a `smoke_test_items` row that only tested it).
- (f) graphify — `graphify-out/graph.html`, `GRAPH_REPORT.md`, `obsidian-vault/` (`graphify_to_obsidian.py`) — plus the Galaxy Map. A full graphify re-sync was stopped Aug 12 (744 vs 967 nodes unexplained) and not retried.
- `taxonomy_map.html` sits outside the tiers; it reads `taxonomy_tree` live.
- Tense: tiers and layers (c)/(d) hold green, present-tense facts only; (e) holds future and past.
- Chronicles (`#page-chronicles`) shows `system_updates` rows — one per shipped change, written the same session.
- Archives, never current: `patch_notes_archive.html`, `CLAUDE_archive.md`.

## Colour vocabulary (`/colourgradient`)
blue idea · red planned · yellow built, untested/in progress · green verified live · purple regression (also an `error_log` row) · brown stale claim (`achiever_archive`).

## Galaxy Map (`graphify-out/galaxy_map*.html`, generated, never hand-edited)
- Entry `galaxy_map.html` (L0 units), index `galaxy_map_hub.html` (page count computed from `len(PAGES)`). Hierarchy: L0 units → L1 domains (`galaxy_map_domain.html`; old `galaxy_map_river.html` is a redirect) → L2 modules (`galaxy_map_module.html`, one `perspective_reports` row each) → Current(L3) per-function series (`galaxy_map_current.html`). Dimensions pages sit alongside (Externals, UI/Alex, Load, Decisions, Decision Matrix, Dimensions Matrix, Connectors, Oracle, Supabase, Orchestrator CC, OpenMontage CC, Oversight Sync, Loops, Skill Network, Generator Toolchain, Alex Path, Level 6). `DIMENSION_PAGES` feeds the left-nav sidebar.
- Data comes from `scripts/graphify_river_group.py` tables (`RIVER_MODULES` derived from module `domain:` keys, `RIVER_FLOWS`, `DASHBOARD_CARDS`, `EXTERNAL_CONNECTORS`, `EXTERNAL_RIVER_LINKS`) and live regex evidence. Shared page parts: `inject_left_nav()` writes `galaxy_map_shared.css`/`.js`; shared bubble renderers `render_bubble_row`, `render_infra_drilldown`, `build_bubble_ring()`, `build_node_link_web()`; edges via `_curved_edge()` carry evidence, clicked through `_gmInitEdgeInspector()`.
- Rules (full set in `.claude/skills/CEO/SKILL.md` / `galaxy_development_framework.md`): R5 regeneration is idempotent (run twice, byte-identical); R16 no privileged L0 gateway; R17 oversight docs stem from the map; R22 every bubble mirrors a table row.
- Regenerate after code changes: `python3 scripts/graphify_river_group.py`, then every `scripts/galaxy_map*.py` except hub/g13, then `scripts/galaxy_map_hub.py`, then commit `graphify-out`. Check anchors with `python3 scripts/verify_anchors.py`.
- Use the map first for "where does X live / what owns X" questions; grep for the detail it doesn't compute.
- Redesign plan `16633827-90dd-4027-a1f2-624bf3fc4374`: P0, P1 (clickable edge evidence, ~90% coverage per `scripts/verify_edge_evidence_coverage.py`), P2 built; GATE = Alex's hand-test; P3 (one-graph shell) and P4 optional, not started. [P0](../../patch_notes.html#card-2026-09-24-galaxy-map-redesign-p0-complete)
- Known open: `galaxy_map_loops.html`
- Checker/generator scripts: `scripts/verify_anchors.py`, `scripts/gmp_b_consistency_check.py` (`RIVER_FLOWS` vs report `cross_refs`), `scripts/galaxy_map_g13_onclick_coverage_check.py` (onclick features vs `smoke_test_items`, `is_duplicate_flag()`), `scripts/gmr2_generate_cross_refs.py`, `perspective_generate_*.py`, `smoke_test_generate_*.py`, `scripts/galaxy_map_generator_toolchain.py` (catalog page). Orchestrator CC and OpenMontage CC each have their own page (`galaxy_map_orchestrator_cc.html`, `galaxy_map_openmontage_cc.html`) from `scripts/galaxy_map_orchestrator_openmontage.py`. has 10 fragment links missing a filename; G22 isolated modules (`agentsIntoOracle`, `authGate`, `intelBatchList`); "text inputs" Decision-Matrix category not built.
- Pause on new Galaxy Map work (Sep 15) stands unless Alex overrides it for a specific plan.

## Records
- Spec answers, decisions and plan records go in `records/YYYY-MM/*.txt`, verbatim. `ceo_plans`/`ceo_plan_items`/`ceo_reports` hold plan state (`name` column, status red/yellow/green/purple).
