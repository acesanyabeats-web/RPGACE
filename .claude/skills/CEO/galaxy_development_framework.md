# Galaxy Development Framework — rules for Galaxy Map / Total-systems mapping work

Reference file for the `CEO` skill; it isn't a skill of its own. Read it for any Galaxy Map or Total-systems mapping work. The full original text with every incident story is in `records/2026-10/galaxy_development_framework_pre_debloat_2026-10-22.md`. Current map facts are in `docs/claude/oversight.md`.

Alex, Aug 13 2026: *"everything that we have done since galaxy map is now part of the galaxy development framework with all the relevant skills"* and *"tomorrow we continue with galaxy to map out everything, this will be the basis for updates and awareness within RPGACE total systems, so claude api and orchestrator CC can use documents for cache to help optimize operations whilst keeping token usage to an absolute minimum."* The `ceo_plans` row "RPGACE Total Systems Galaxy Map" (id `6f8536fd-7d98-4565-9369-c75a149fce8f`) plus later Galaxy plans.

**Cast**:
- `CEO` — plan and execute.
- `cartographer` — map cross-talk and trickle checks.
- `drift` — check work against the baseline.
- `perspective` — the baselines the map draws on; module/feature coverage is a standing sub-effort.
- `misunderstanding` — Alex's own repair tool.
- `paranoia`/`restructure` — advisors.
- `colourgradient` — benchmark.

**Goal**: these docs are a cache Oracle and sessions can trust without re-deriving — present tense, precise, no changelog.

## Rules (R-numbers are cited elsewhere; keep them)
- **R1** Relationships hide in more idioms than direct `RPGACE.modules.X.Y()` calls: the `window.callOracle`/`sendChat` wrap chain, `RPGACE.utils.*`, DOM-id triggers, `window.X = function` overrides, wrapper sections, local aliases (`var rt = RPGACE.modules.x`), `RPGACE.hooks`. Before calling detection done, list which idioms it checks; treat zero relationships as an open question, not proof of isolation.
- **R2** Rivers/domains are a navigation concept, not code structure. Cross-group relationships are normal (all `RPGACE.hooks` pairs cross rivers). Give them their own layer; never force them into same-group edges.
- **R3** When a signal's anchor isn't drawn (e.g. `init`), pin it on ONE evidence-backed stand-in (an existing pairing, else the first in source order), never fanned out.
- **R4** After two disproven hypotheses on a confirmed example, state both and ask Alex. No blind third try (rule 9).
- **R5** Idempotency is verified, not assumed: run every generator twice from fresh processes and compare output (watch for `set()` iteration order).
- **R6** Every "improved" claim cites a real before (`git show HEAD:<file>`) and after.
- **R7** When a new detection/rendering concept ships, check `system_map_spec.md` names it.
- **R8** Open `system_map_flags` don't close themselves: re-check existing flags against current state before hunting for new ones.
- **R9** For something with no UI by design, the test is that the pipeline really ran correctly, repeatedly — not a fake click-test.
- **R10** Scale evidence-grounded write-ups (e.g. `perspective_reports`) with a generator script reading the same detection data the map uses — spot-checked, never hand-written past a couple of examples, never paraphrased.
- **R11** Fix cheap nearby staleness found while mapping, on the spot, with a note.
- **R12** An actor/external bubble (Alex, Oracle, any connector) appears only where evidence shows it, with its real edge count. Alex: *"other externals don't have to be permanent, oracle too tbh."*
- **R13** Navigation runs both ways: entry objects link out/up to the real object that leads there; terminal objects link forward/in, using the existing attribution mechanics. No generic "back" links without an evidenced target.
- **R14** A brand-new "should X integrate with Y" has no baseline to `/drift`; say so and use `/restructure`-style two-sided reasoning instead.
- **R15** The map's computed tables are the first source for "where does X live" (CLAUDE.md rule 15); grep for the detail.
- **R16** Peers get the same treatment. If one unit gets special status, have a stated reason — no privileged L0 gateway. Alex: *"you should always, and i mean ALWAYS, make considerations like this."*
- **R17** Each G-step's Stage 1 names which oversight docs it affects, and its report includes those updates — doc updates are part of the step, not a trailing pass.
- **R18** When a collection grows, grep for any constant summarising its size in the same commit (`TOTAL_ZONES` once went stale against `RIVER_NAME`).
- **R19** Before merging, renaming or deleting a file, grep `scripts/` (and configs) for hardcoded `Path('<name>')`/`open('<name>')`. Staleness detectors should fail loud, not return empty.
- **R20** A generator that names output files from mutable data must delete stale files it no longer produces, every run.
- **R21** Check a function's real return shape (read the `return` or print a sample) before consuming it; names lie (a "count" once returned a tuple).
- **R22** Table first, bubble follows. Alex: *"whenever we update galaxy, it must update the matrix first or create a new one for table reference to bubble system, bubble systems always follow and showcase what on table to keep everything coherent."* The bubble view is computed from the same data as the table (reference: `galaxy_map_decision_matrix.py`'s `build_unified()`); never draw a bubble without a row. Edges follow the same rule (they carry evidence).
- **R23** Logging the docs and updating `ceo_plan_items` are separate actions; do both (`update-logging-system` artifact 19).
- **R24** A doc can be made stale by a change elsewhere: run the targeted Cross-Doc Drift Check (artifact 20), never a full sweep. Prefer rendering a doc from data over hand-asserting it.
- **R25** A Loop 2 item that skips `/Engineer` doesn't get Stage 5/5c for free; name the deviation (CLAUDE.md rule 17).
- **R26** A matrix may cross any one grain (L0 units, domains, modules, decisions, functions) with any evidenced dimension tags; it doesn't have to follow the level ladder.
- **R27** After each build, check whether the map needs touching: (1) `rpgace_core.js` structure changed, (2) the map's own generators or shared detectors changed (`scripts/galaxy_map_*.py`, `graphify_river_group.py`, `perspective_generate_*.py`, `smoke_test_generate_*.py`), (3) a table the map cites as evidence changed shape or count. If none apply, no touch.
- **R28** Every "when to trigger" rule needs a cheap standing check that it was followed. The checks `check_module_domains.py`, `verify_anchors.py` and `verify_edge_evidence_coverage.py` sit in the session-start table.

## Open, not built
- **G26 decisions hierarchy**: Phase 1 is built (human gates, anchor-verified; since ED-4 they render inside each domain on `galaxy_map_domain.html`, the old `galaxy_map_decisions.html` redirects). Phase 2 (`smoke_test.html`/`colourgradient` integration) is not built.
- **ED-4 (Oct 22 2026)**: in-app dimensions live inside their domain (`scripts/galaxy_map_domain_dims.py`); a Dimension page is kept only for something outside the RPGACE app. A new in-app view goes into `galaxy_map_domain_dims.DIMS`, not a new page.
- **G27/G28**: externals touching both UI and backend, and skills as actors — later passes.
- **Taxonomy convergence**: Alex, *"the galaxy development framework will also be a blueprint that combines with taxonomy development later on when i get to it so it becomes a more coherent system."* A future `/CEO` pass.
